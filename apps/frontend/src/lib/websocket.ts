import type { WsMessage, WsEventType } from '@faas/shared-types';

type WsHandler = (payload: unknown) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Map<WsEventType, Set<WsHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  private token: string | null = null;

  connect(token: string): void {
    this.token = token;
    this.reconnectAttempts = 0;
    this.createConnection();
  }

  private createConnection(): void {
    if (!this.token) return;

    // Always use the current page's host so the Vite proxy (/ws) works in dev
    // and the real NGINX proxy works in production — no hardcoded port.
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;           // e.g. localhost:3002 in dev
    const url = `${protocol}//${host}/ws?token=${this.token}`;

    console.log('[WS] Connecting to', url);

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error('[WS] Failed to create WebSocket', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        const handlers = this.handlers.get(msg.type);
        handlers?.forEach((h) => h(msg.payload));
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Disconnected', event.code, event.reason);
      // 1000 = normal close, 4001 = auth error — don't reconnect
      if (event.code !== 1000 && event.code !== 4001) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error', err);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnects) {
      console.warn('[WS] Max reconnect attempts reached');
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.createConnection();
    }, delay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.maxReconnects = 0; // prevent reconnect on intentional disconnect
    this.ws?.close(1000, 'Client disconnect');
    this.ws = null;
    this.token = null;
  }

  on(type: WsEventType, handler: WsHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  subscribe(functionId: string): void {
    this.send({ type: 'subscribe', payload: { functionId } });
  }

  unsubscribe(functionId: string): void {
    this.send({ type: 'unsubscribe', payload: { functionId } });
  }

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();
