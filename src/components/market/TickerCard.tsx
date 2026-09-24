import React from 'react';
import { MarketQuote } from '../../types/market';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { clsx } from 'clsx';

interface TickerCardProps {
  quote: MarketQuote;
  isSelected?: boolean;
  onClick?: () => void;
}

export const TickerCard: React.FC<TickerCardProps> = ({ quote, isSelected, onClick }) => {
  const isPositive = quote.change >= 0;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white border rounded-xl p-4 cursor-pointer transition-all shadow-xs relative overflow-hidden',
        isSelected ? 'border-[#0F4C3A] ring-2 ring-[#0F4C3A]/20 bg-emerald-50/30' : 'border-slate-200 hover:border-slate-300'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-base text-slate-900 font-mono tracking-tight">{quote.symbol}</span>
        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-600 animate-pulse" /> {quote.lastUpdated}
        </span>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className={`text-2xl font-bold font-mono-num ${isPositive ? 'text-emerald-700' : 'text-red-600'}`}>
          {quote.ltp.toFixed(2)}
        </span>
        <span className={`text-xs font-semibold font-mono-num px-2 py-0.5 rounded border ${isPositive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
          {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent}%)
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-[10px] font-mono text-slate-500">
        <div>
          <span>Open</span>
          <p className="text-slate-800 font-semibold">{quote.open.toFixed(1)}</p>
        </div>
        <div>
          <span>High</span>
          <p className="text-emerald-700 font-semibold">{quote.high.toFixed(1)}</p>
        </div>
        <div>
          <span>Low</span>
          <p className="text-red-600 font-semibold">{quote.low.toFixed(1)}</p>
        </div>
        <div>
          <span>P.Close</span>
          <p className="text-slate-800 font-semibold">{quote.prevClose.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
};
