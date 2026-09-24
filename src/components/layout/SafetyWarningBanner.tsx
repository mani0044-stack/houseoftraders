import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTradingStore } from '../../store/useTradingStore';

export const SafetyWarningBanner: React.FC = () => {
  const tradingMode = useTradingStore((s) => s.tradingMode);

  if (tradingMode !== 'Live') return null;

  return (
    <div className="bg-amber-500 text-amber-950 font-semibold px-4 py-1.5 text-xs flex items-center justify-between z-30 tracking-wide font-sans border-b border-amber-600/30">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>LIVE TRADING MODE — Orders executed on live broker endpoints</span>
      </div>
      <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
        REAL CAPITAL AT RISK
      </span>
    </div>
  );
};
