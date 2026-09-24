import React, { useState, useEffect } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { TickerCard } from '../components/market/TickerCard';
import { TradingChart } from '../components/market/TradingChart';
import { TradingViewChart } from '../components/market/TradingViewChart';
import { UnderlyingSymbol } from '../types/algo';
import { Candle, Timeframe, TechnicalIndicatorState } from '../types/market';
import { marketApi } from '../api/marketApi';
import { LineChart, BarChart2 } from 'lucide-react';

export const LiveMarketPage: React.FC = () => {
  const marketQuotes = useTradingStore((s) => s.marketQuotes);

  const [selectedSymbol, setSelectedSymbol] = useState<UnderlyingSymbol>('NIFTY');
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [chartEngine, setChartEngine] = useState<'tradingview' | 'algoengine'>('tradingview');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicatorState>({
    ema9: true,
    ema21: true,
    vwap: true,
    rsi: false,
    macd: false,
    supertrend: false,
  });

  const currentQuote = marketQuotes[selectedSymbol];
  const currentLtp = currentQuote?.ltp;

  useEffect(() => {
    marketApi.getCandles(selectedSymbol, timeframe).then((data) => setCandles(data || []));
  }, [selectedSymbol, timeframe]);

  // Update latest candle close price in chart dynamically when live market tick arrives
  useEffect(() => {
    if (!currentLtp || candles.length === 0) return;
    setCandles((prevCandles) => {
      if (prevCandles.length === 0) return prevCandles;
      const lastIndex = prevCandles.length - 1;
      const lastCandle = prevCandles[lastIndex];
      if (lastCandle.close === currentLtp) return prevCandles;

      const updatedCandle: Candle = {
        ...lastCandle,
        close: currentLtp,
        high: Math.max(lastCandle.high, currentLtp),
        low: Math.min(lastCandle.low, currentLtp),
        ema9: Math.round(currentLtp * 0.998 * 100) / 100,
        ema21: Math.round(currentLtp * 0.995 * 100) / 100,
        vwap: Math.round(currentLtp * 0.997 * 100) / 100,
      };

      const copy = [...prevCandles];
      copy[lastIndex] = updatedCandle;
      return copy;
    });
  }, [currentLtp]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Live Market Terminal</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time Quotes & Interactive Chart Analysis</p>
        </div>

        {/* Engine Switcher */}
        <div className="bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-1 font-sans text-xs">
          <button
            onClick={() => setChartEngine('tradingview')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-all ${
              chartEngine === 'tradingview' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>TradingView Pro</span>
          </button>
          <button
            onClick={() => setChartEngine('algoengine')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-all ${
              chartEngine === 'algoengine' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>AlgoEngine Native</span>
          </button>
        </div>
      </div>

      {/* Top Quotes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.values(marketQuotes).map((quote) => (
          <TickerCard
            key={quote.symbol}
            quote={quote}
            isSelected={selectedSymbol === quote.symbol}
            onClick={() => setSelectedSymbol(quote.symbol as UnderlyingSymbol)}
          />
        ))}
      </div>

      {/* Main Interactive Candlestick Chart */}
      <div className="h-[580px]">
        {chartEngine === 'tradingview' ? (
          <TradingViewChart symbol={selectedSymbol} timeframe={timeframe} height="100%" />
        ) : (
          <TradingChart
            candles={candles}
            symbol={selectedSymbol}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            indicators={indicators}
            onIndicatorsChange={setIndicators}
          />
        )}
      </div>
    </div>
  );
};
