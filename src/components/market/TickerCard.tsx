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
        'bg-white border rounded-2xl p-4.5 cursor-pointer transition-all shadow-xs relative overflow-hidden group',
        isSelected ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-slate-900 font-sans tracking-tight">{quote.symbol}</span>
        <span className="text-[10px] text-slate-400 font-mono font-medium flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-500 animate-pulse" /> {quote.lastUpdated}
        </span>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <span className={`text-2xl font-bold font-mono-num tracking-tight ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
          ₹{quote.ltp.toFixed(2)}
        </span>
        <span className={`text-xs font-semibold font-mono-num px-2 py-0.5 rounded-md border shrink-0 flex items-center gap-1 ${isPositive ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80' : 'text-rose-700 bg-rose-50 border-rose-200/80'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
          {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent}%)
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-100 text-[10px] font-mono-num text-slate-400">
        <div>
          <span>Open</span>
          <p className="text-slate-800 font-bold mt-0.5">₹{quote.open.toFixed(1)}</p>
        </div>
        <div>
          <span>High</span>
          <p className="text-emerald-600 font-bold mt-0.5">₹{quote.high.toFixed(1)}</p>
        </div>
        <div>
          <span>Low</span>
          <p className="text-rose-600 font-bold mt-0.5">₹{quote.low.toFixed(1)}</p>
        </div>
        <div>
          <span>P.Close</span>
          <p className="text-slate-800 font-bold mt-0.5">₹{quote.prevClose.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
};
