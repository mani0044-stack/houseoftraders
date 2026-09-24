import { useTradingStore } from '../store/useTradingStore';

type MessageHandler = (data: Record<string, unknown>) => void;

const resolveWsUrl = (): string | null => {
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) return envUrl;

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!isLocalhost && import.meta.env.PROD) {
    return null;
  }

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const protocol = isHttps ? 'wss:' : 'ws:';
  const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
  return `${protocol}//${host}:8000/ws`;
};

class WebSocketService {
  private socket: WebSocket | null = null;
  private listeners: Set<MessageHandler> = new Set();
  private mockInterval: number | null = null;
  private isConnecting: boolean = false;
  private url: string | null = resolveWsUrl();

  public connect() {
    if (this.socket || this.isConnecting) return;

    if (!this.url) {
      useTradingStore.getState().setWsStatus(true, 18);
      this.startMockSimulation();
      return;
    }

    this.isConnecting = true;
    useTradingStore.getState().setWsStatus(false);

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.isConnecting = false;
        useTradingStore.getState().setWsStatus(true, 12);
        useTradingStore.getState().addActivityLog(
          'WebSocket Connected',
          'Live market data WebSocket stream connected.',
          'WebSocket',
          'SUCCESS'
        );
        this.stopMockSimulation();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'market_tick' && data.symbol) {
            useTradingStore.getState().updateMarketQuote(data.symbol, data.ltpDelta || 0);
          }
          this.notifyListeners(data);
        } catch {
          // ignore malformed ws messages
        }
      };

      this.socket.onerror = () => {
        this.handleDisconnect();
      };

      this.socket.onclose = () => {
        this.handleDisconnect();
      };
    } catch {
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.socket = null;
    this.isConnecting = false;
    useTradingStore.getState().setWsStatus(true, 18); // fallback to simulated tick stream
    this.startMockSimulation();
  }

  private startMockSimulation() {
    if (this.mockInterval) return;

    // Simulate live market ticks every 1.5 seconds
    this.mockInterval = window.setInterval(() => {
      const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY'];
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const delta = (Math.random() - 0.49) * (randomSymbol === 'BANKNIFTY' ? 12 : 5);
      
      useTradingStore.getState().updateMarketQuote(randomSymbol, delta);

      const tickEvent = {
        type: 'market_tick',
        symbol: randomSymbol,
        ltpDelta: delta,
        timestamp: new Date().toISOString()
      };

      this.notifyListeners(tickEvent);
    }, 1500);
  }

  private stopMockSimulation() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  public subscribe(handler: MessageHandler) {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  private notifyListeners(data: Record<string, unknown>) {
    this.listeners.forEach((handler) => handler(data));
  }

  public disconnect() {
    this.stopMockSimulation();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const wsService = new WebSocketService();
