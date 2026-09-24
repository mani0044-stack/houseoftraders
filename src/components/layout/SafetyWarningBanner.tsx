import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTradingStore } from '../../store/useTradingStore';

export const SafetyWarningBanner: React.FC = () => {
  const tradingMode = useTradingStore((s) => s.tradingMode);

  if (tradingMode !== 'Live') return null;

  return (
    <div className="bg-warning text-gray-950 font-bold px-4 py-1.5 text-xs flex items-center justify-between shadow-md z-30 uppercase tracking-wider font-mono">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 fill-current shrink-0 animate-bounce" />
        <span>LIVE TRADING MODE ACTIVE — ORDERS ARE BEING SENT DIRECTLY TO BROKER ENDPOINTS</span>
      </div>
      <span className="text-[10px] bg-gray-950 text-warning px-2 py-0.5 rounded font-mono">
        REAL CAPITAL AT RISK
      </span>
    </div>
  );
};
