import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';
import { logger } from './logger.service';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  initialize(server: import('http').Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      const token = new URL(req.url || '', 'http://localhost').searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Unauthorized');
        return;
      }

      try {
        const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
        ws.userId = payload.id;
        ws.isAlive = true;

        if (!this.clients.has(payload.id)) {
          this.clients.set(payload.id, new Set());
        }
        this.clients.get(payload.id)!.add(ws);

        ws.send(JSON.stringify({ type: 'connected', userId: payload.id }));
        logger.debug(`WebSocket connected: user ${payload.id}`);

        ws.on('pong', () => { ws.isAlive = true; });
        ws.on('close', () => this.removeClient(ws));
        ws.on('message', (data) => this.handleMessage(ws, data));
      } catch {
        ws.close(4001, 'Invalid token');
      }
    });

    // Heartbeat
    setInterval(() => {
      this.wss?.clients.forEach((ws: WebSocket) => {
        const authWs = ws as AuthenticatedWebSocket;
        if (!authWs.isAlive) {
          this.removeClient(authWs);
          return authWs.terminate();
        }
        authWs.isAlive = false;
        authWs.ping();
      });
    }, 30000);
  }

  sendToUser(userId: string, data: object): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const message = JSON.stringify(data);
    userClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  broadcast(data: object): void {
    const message = JSON.stringify(data);
    this.wss?.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  private removeClient(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      this.clients.get(ws.userId)?.delete(ws);
    }
  }

  private handleMessage(ws: AuthenticatedWebSocket, data: import('ws').RawData): void {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // ignore malformed messages
    }
  }

  getConnectedCount(): number {
    return this.wss?.clients.size || 0;
  }
}

export const wsService = new WebSocketService();
