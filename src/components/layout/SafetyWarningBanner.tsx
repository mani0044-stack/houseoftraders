import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTradingStore } from '../../store/useTradingStore';

export const SafetyWarningBanner: React.FC = () => {
  const tradingMode = useTradingStore((s) => s.tradingMode);

  if (tradingMode !== 'Live') return null;

  return (
    <div className="relative bg-amber-500 text-amber-950 font-semibold px-4 py-1.5 text-xs flex items-center justify-between z-30 tracking-wide font-sans border-b border-amber-600/30 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.4)]">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" style={{ animationDuration: '2s' }} />
        <span>LIVE TRADING MODE — Orders executed on live broker endpoints</span>
      </div>
      <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        REAL CAPITAL AT RISK
      </span>
    </div>
  );
};