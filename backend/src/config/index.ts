import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dealcash-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || '',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    platformFeePercent: parseFloat(process.env.PLATFORM_FEE_PERCENT || '5'),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  agent: {
    cronSchedule: process.env.AGENT_CRON || '*/2 * * * *', // every 2 minutes
  },
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
};
