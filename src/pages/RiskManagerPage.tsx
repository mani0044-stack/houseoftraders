import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { useUIStore } from '../store/useUIStore';
import { RiskProgressBar } from '../components/risk/RiskProgressBar';
import { ShieldAlert, Power, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';

export const RiskManagerPage: React.FC = () => {
  const riskLimit = useTradingStore((s) => s.riskLimit);
  const accounts = useTradingStore((s) => s.accounts);
  const algos = useTradingStore((s) => s.algos);
  const setEmergencyStopOpen = useUIStore((s) => s.setEmergencyStopOpen);
  const toggleAccountStatus = useTradingStore((s) => s.toggleAccountStatus);
  const updateAlgoStatus = useTradingStore((s) => s.updateAlgoStatus);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Risk Management & System Safeguards</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time Capital Protection & Automated Kill Switches</p>
        </div>

        <button
          onClick={() => setEmergencyStopOpen(true)}
          className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold font-sans text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 border border-rose-500 transition-all shrink-0"
        >
          <ShieldAlert className="w-5 h-5 animate-pulse" /> EMERGENCY STOP ALL TRADING
        </button>
      </div>

      {/* Global Risk Progress Bars */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Global Account Risk Usage
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <RiskProgressBar
            label="Daily Loss Cap"
            current={riskLimit.currentDailyLoss}
            max={riskLimit.maxDailyLoss}
            isCurrency
          />
          <RiskProgressBar
            label="Total Exposure Cap"
            current={riskLimit.currentTotalExposure}
            max={riskLimit.maxTotalExposure}
            isCurrency
          />
          <RiskProgressBar
            label="Open Positions Cap"
            current={riskLimit.currentOpenPositions}
            max={riskLimit.maxOpenPositions}
            unit=" pos"
          />
          <RiskProgressBar
            label="Trades Per Day Cap"
            current={riskLimit.currentTradesCount}
            max={riskLimit.maxTradesPerDay}
            unit=" trades"
          />
        </div>
      </div>

      {/* Account-level Risk Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">Broker Account Specific Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between font-sans">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900">{acc.name}</h4>
                  <StatusBadge status={acc.status} size="sm" />
                </div>
                <p className="text-xs font-mono-num text-slate-500 font-medium mt-1">Margin: ₹{acc.availableMargin.toLocaleString()}</p>
              </div>

              <button
                onClick={() => toggleAccountStatus(acc.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 ${
                  acc.isEnabled ? 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-500 hover:text-slate-950' : 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{acc.isEnabled ? 'Disable Execution' : 'Enable'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Algo-level Risk Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">Algorithm Kill Switches</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {algos.map((algo) => (
            <div key={algo.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between font-sans">
              <div>
                <h4 className="font-bold text-xs text-slate-900">{algo.name}</h4>
                <p className="text-[11px] text-slate-500 font-mono-num font-medium mt-0.5">Underlying: {algo.underlying}</p>
              </div>

              {algo.status === 'Active' ? (
                <button
                  onClick={() => updateAlgoStatus(algo.id, 'Stopped')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-600 hover:text-white transition-colors"
                >
                  Stop Algo
                </button>
              ) : (
                <StatusBadge status={algo.status} size="sm" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
