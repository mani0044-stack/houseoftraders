import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { StatusBadge } from '../common/StatusBadge';
import { Play, Square, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ActiveAlgosTable: React.FC = () => {
  const algos = useTradingStore((s) => s.algos);
  const updateAlgoStatus = useTradingStore((s) => s.updateAlgoStatus);
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-[#E3E8E6] rounded-2xl p-5 shadow-xs flex flex-col">
      <div className="flex items-center justify-between pb-3.5 border-b border-[#E3E8E6] mb-1">
        <div>
          <h3 className="text-xs font-bold text-[#12211C] uppercase tracking-wider">Active Algorithms</h3>
          <p className="text-xs text-[#6B7C75] font-medium">Live Execution Status & Risk Limits</p>
        </div>
        <button
          onClick={() => navigate('/algo-manager')}
          className="text-xs font-semibold text-[#0F6B5C] hover:text-[#0B5347] hover:underline flex items-center gap-1"
        >
          <span>Manage All ({algos.length})</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col">
        {algos.map((algo) => {
          const riskPct = Math.round((algo.currentExposure / (algo.maxDailyLoss * 10)) * 100);
          return (
            <div
              key={algo.id}
              className="py-3 border-b border-[#E3E8E6] last:border-b-0 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#12211C] truncate">{algo.name}</div>
                    <div className="text-[10px] text-[#6B7C75] font-medium">{algo.strategyType}</div>
                  </div>
                  <div className={`text-sm font-bold font-mono-num shrink-0 ${algo.todaysPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {algo.todaysPnL >= 0 ? '+' : ''}₹{algo.todaysPnL.toLocaleString()}
                  </div>
                </div>

                <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1.5">
                  <span className="text-xs font-mono-num font-semibold text-[#12211C]">{algo.underlying}</span>
                  <StatusBadge status={algo.status} size="sm" />
                  <span className="text-xs text-[#6B7C75] font-mono-num">{algo.tradesToday} trades</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs font-mono-num text-[#6B7C75]">{riskPct}%</span>
                    <div className="w-12 h-1.5 rounded-full bg-[#E3E8E6] overflow-hidden">
                      <div
                        className={`h-full ${riskPct > 80 ? 'bg-rose-600' : riskPct > 50 ? 'bg-amber-500' : 'bg-[#0F6B5C]'}`}
                        style={{ width: `${Math.min(100, riskPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {algo.status === 'Active' ? (
                  <button
                    onClick={() => updateAlgoStatus(algo.id, 'Stopped')}
                    className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors"
                    title="Stop Algo"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={() => updateAlgoStatus(algo.id, 'Active')}
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors"
                    title="Start Algo"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};