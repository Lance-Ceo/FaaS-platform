import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../lib/logger';
import type { WsEventType } from '@faas/shared-types';

interface WsClient {
  ws: WebSocket;
  userId: string;
  subscriptions: Set<string>; // functionIds or 'all'
}

class WebSocketManager {
  private clients: Map<string, WsClient> = new Map();
  private wss: WebSocketServer | null = null;

  initialize(server: import('http').Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    logger.info('WebSocket server initialized');
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    // Extract token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    let userId: string;
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
      userId = payload.sub;
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    const clientId = `${userId}-${Date.now()}`;
    const client: WsClient = { ws, userId, subscriptions: new Set(['all']) };
    this.clients.set(clientId, client);

    logger.info({ userId, clientId }, 'WebSocket client connected');

    // Send welcome message
    this.sendToClient(ws, 'ping', { message: 'Connected to FaaS Platform' });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(clientId, msg);
      } catch {
        logger.warn({ clientId }, 'Invalid WebSocket message');
      }
    });

    ws.on('close', () => {
      this.clients.delete(clientId);
      logger.info({ userId, clientId }, 'WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ userId, clientId, err: err.message }, 'WebSocket error');
      this.clients.delete(clientId);
    });

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, 'ping', { ts: Date.now() });
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);
  }

  private handleMessage(clientId: string, msg: { type: string; payload?: unknown }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (msg.type) {
      case 'subscribe':
        if (typeof (msg.payload as { functionId?: string })?.functionId === 'string') {
          client.subscriptions.add((msg.payload as { functionId: string }).functionId);
        }
        break;
      case 'unsubscribe':
        if (typeof (msg.payload as { functionId?: string })?.functionId === 'string') {
          client.subscriptions.delete((msg.payload as { functionId: string }).functionId);
        }
        break;
      case 'pong':
        // Client heartbeat response
        break;
    }
  }

  private sendToClient(ws: WebSocket, type: WsEventType, payload: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
    }
  }

  /** Broadcast to all connected clients */
  broadcast(type: WsEventType, payload: unknown): void {
    const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  /** Send to specific user */
  sendToUser(userId: string, type: WsEventType, payload: unknown): void {
    const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    for (const client of this.clients.values()) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  /** Send log to subscribers of a function */
  sendFunctionLog(functionId: string, log: unknown): void {
    const message = JSON.stringify({ type: 'log', payload: log, timestamp: new Date().toISOString() });
    for (const client of this.clients.values()) {
      if (
        client.ws.readyState === WebSocket.OPEN &&
        (client.subscriptions.has('all') || client.subscriptions.has(functionId))
      ) {
        client.ws.send(message);
      }
    }
  }

  get connectedClients(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
