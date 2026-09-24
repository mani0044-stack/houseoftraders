import React, { useEffect, useRef } from 'react';

interface TradingViewMiniWidgetProps {
  symbol: string;
}

export const TradingViewMiniWidget: React.FC<TradingViewMiniWidgetProps> = ({ symbol }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const getTvSymbol = (sym: string): string => {
    const cleanSym = sym.toUpperCase();
    if (cleanSym === 'NIFTY') return 'NSE:NIFTY';
    if (cleanSym === 'BANKNIFTY') return 'NSE:BANKNIFTY';
    if (cleanSym === 'FINNIFTY') return 'NSE:CNXFINANCE';
    return cleanSym.includes(':') ? cleanSym : `NSE:${cleanSym}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: '5m',
      width: '100%',
      isTransparent: false,
      height: '350',
      symbol: getTvSymbol(symbol),
      showIntervalTabs: true,
      displayMode: 'single',
      locale: 'en',
      colorTheme: 'dark'
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol]);

  return (
    <div className="w-full bg-[#111827] rounded-xl overflow-hidden border border-[#1F293D] p-2 shadow-xs">
      <div className="tradingview-widget-container" ref={containerRef} />
    </div>
  );
};
