/**
 * WebSocket service with auto-reconnect and exponential backoff.
 */
import type { SensorUpdate } from '../types';

type MessageHandler = (data: SensorUpdate) => void;
type StatusHandler = (status: 'connected' | 'disconnected' | 'reconnecting') => void;

const WS_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WS_URL) || 'ws://localhost:8000/ws/live';
const MAX_RETRIES = 10;

class WebSocketService {
  private ws: WebSocket | null = null;
  private retries = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private intentionallyClosed = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.intentionallyClosed = false;
    this._connect();
  }

  disconnect() {
    this.intentionallyClosed = true;
    this._clearTimers();
    this.ws?.close();
    this.ws = null;
    this._notifyStatus('disconnected');
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private _connect() {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.retries = 0;
        this._notifyStatus('connected');
        this._startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SensorUpdate;
          this.messageHandlers.forEach(h => h(data));
        } catch (_) { /* ignore malformed */ }
      };

      this.ws.onerror = () => {
        // onerror is always followed by onclose
      };

      this.ws.onclose = () => {
        this._clearTimers();
        if (this.intentionallyClosed) return;
        this._scheduleReconnect();
      };
    } catch (_) {
      this._scheduleReconnect();
    }
  }

  private _scheduleReconnect() {
    if (this.retries >= MAX_RETRIES) {
      this._notifyStatus('disconnected');
      return;
    }
    this._notifyStatus('reconnecting');
    const delay = Math.min(1000 * Math.pow(2, this.retries), 30000);
    this.retries++;
    this.reconnectTimer = setTimeout(() => this._connect(), delay);
  }

  private _startPing() {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 10000);
  }

  private _clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private _notifyStatus(status: 'connected' | 'disconnected' | 'reconnecting') {
    this.statusHandlers.forEach(h => h(status));
  }
}

export const wsService = new WebSocketService();
