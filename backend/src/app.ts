import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';

import { config } from './config';
import { logger } from './services/logger.service';
import { wsService } from './services/websocket.service';
import { aiAgentService } from './services/ai-agent.service';
import { prisma } from './services/prisma.service';
import { errorHandler, notFound } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import listingRoutes from './routes/listing.routes';
import paymentRoutes from './routes/payment.routes';
import agentRoutes from './routes/agent.routes';
import dashboardRoutes from './routes/dashboard.routes';

const app = express();
const server = http.createServer(app);

// Security
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stripe webhook needs raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Logging & body parsing
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    wsClients: wsService.getConnectedCount(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// WebSocket
wsService.initialize(server);

// AI Agent cron job
if (config.nodeEnv !== 'test') {
  cron.schedule(config.agent.cronSchedule, async () => {
    try {
      await aiAgentService.runAgentCycle();
    } catch (err) {
      logger.error('Agent cron error:', err);
    }
  });
  logger.info(`AI Agent scheduled: ${config.agent.cronSchedule}`);
}

const PORT = config.port;

async function start(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    server.listen(PORT, () => {
      logger.info(`DealCash API running on port ${PORT} [${config.nodeEnv}]`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});

if (require.main === module) {
  start();
}

export { app, server };
