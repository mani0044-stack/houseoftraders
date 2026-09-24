import axiosClient from './axiosClient';
import { MarketQuote, Candle, Timeframe } from '../types/market';
import { UnderlyingSymbol } from '../types/algo';
import { INITIAL_MARKET_QUOTES } from '../services/mockData';

export interface InstrumentSearchResult {
  symbol: string;
  token: string;
  name: string;
  exchange: string;
  expiry?: string;
  strike?: number;
  lotsize?: number;
}

export const marketApi = {
  getQuotes: async (): Promise<Record<string, MarketQuote>> => {
    try {
      const res = await axiosClient.get<Record<string, MarketQuote>>('/market/quotes');
      return res.data;
    } catch {
      return INITIAL_MARKET_QUOTES;
    }
  },

  searchInstruments: async (query: string): Promise<any[]> => {
    try {
      const res = await axiosClient.get<any[]>('/market/search', { params: { q: query } });
      return res.data || [];
    } catch {
      return [];
    }
  },

  getCandles: async (symbol: UnderlyingSymbol, timeframe: Timeframe = '5m'): Promise<Candle[]> => {
    try {
      const res = await axiosClient.get<Candle[]>(`/market/candles`, { params: { symbol, timeframe } });
      return res.data;
    } catch {
      const now = Date.now();
      const basePrice = symbol === 'BANKNIFTY' ? 53200 : symbol === 'FINNIFTY' ? 23640 : 24865;
      const candles: Candle[] = [];
      let currentPrice = basePrice - 180;

      for (let i = 60; i >= 0; i--) {
        const timeStr = new Date(now - i * 5 * 60 * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const delta = (Math.random() - 0.48) * (symbol === 'BANKNIFTY' ? 40 : 20);
        const open = currentPrice;
        const close = Math.round((open + delta) * 100) / 100;
        const high = Math.round((Math.max(open, close) + Math.random() * 15) * 100) / 100;
        const low = Math.round((Math.min(open, close) - Math.random() * 15) * 100) / 100;
        const volume = Math.round(Math.random() * 50000 + 10000);

        candles.push({
          timestamp: now - i * 5 * 60 * 1000,
          time: timeStr,
          open,
          high,
          low,
          close,
          volume,
          ema9: Math.round((close * 0.998) * 100) / 100,
          ema21: Math.round((close * 0.995) * 100) / 100,
          vwap: Math.round((close * 0.997) * 100) / 100,
          rsi: Math.round((45 + Math.random() * 25) * 100) / 100,
        });

        currentPrice = close;
      }

      return candles;
    }
  }
};

