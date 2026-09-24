import { useEffect } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { wsService } from '../services/websocket';

export function useMarketData() {
  const marketQuotes = useTradingStore((s) => s.marketQuotes);
  const wsConnected = useTradingStore((s) => s.wsConnected);
  const wsLatencyMs = useTradingStore((s) => s.wsLatencyMs);

  useEffect(() => {
    wsService.connect();
  }, []);

  return { marketQuotes, wsConnected, wsLatencyMs };
}
