import React, { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  symbol: string;
  timeframe?: string;
  height?: string | number;
}

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => void;
    };
  }
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  timeframe = '5m',
  height = '100%',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = useRef<string>(`tv-chart-${Math.random().toString(36).substring(2, 9)}`);

  // Map timeframe to TradingView interval string
  const getInterval = (tf: string): string => {
    switch (tf) {
      case '1m': return '1';
      case '3m': return '3';
      case '5m': return '5';
      case '15m': return '15';
      case '30m': return '30';
      case '1H': return '60';
      case '1D': return 'D';
      default: return '5';
    }
  };

  // Map symbol to official TradingView ticker
  const getTvSymbol = (sym: string): string => {
    const cleanSym = sym.toUpperCase();
    if (cleanSym === 'NIFTY') return 'NSE:NIFTY';
    if (cleanSym === 'BANKNIFTY') return 'NSE:BANKNIFTY';
    if (cleanSym === 'FINNIFTY') return 'NSE:CNXFINANCE';
    return cleanSym.includes(':') ? cleanSym : `NSE:${cleanSym}`;
  };

  useEffect(() => {
    let script: HTMLScriptElement | null = null;

    const initWidget = () => {
      if (window.TradingView && containerRef.current) {
        containerRef.current.innerHTML = `<div id="${containerId.current}" style="height:100%;width:100%;"></div>`;
        new window.TradingView.widget({
          autosize: true,
          symbol: getTvSymbol(symbol),
          interval: getInterval(timeframe),
          timezone: 'Asia/Kolkata',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#FFFFFF',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerId.current,
          hide_side_toolbar: false,
          studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
        });
      }
    };

    if (window.TradingView) {
      initWidget();
    } else {
      script = document.createElement('script');
      script.id = 'tradingview-widget-script';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.onload = initWidget;
      document.head.appendChild(script);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, timeframe]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-xs" style={{ height }}>
      <div ref={containerRef} className="w-full h-full min-h-[420px]" />
    </div>
  );
};
