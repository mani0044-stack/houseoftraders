import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { StatusBadge } from '../common/StatusBadge';
import { DataTable, TableHeader, TableRow, TableCell } from '../common/DataTable';
import { Play, Square, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ActiveAlgosTable: React.FC = () => {
  const algos = useTradingStore((s) => s.algos);
  const updateAlgoStatus = useTradingStore((s) => s.updateAlgoStatus);
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Algorithms</h3>
          <p className="text-xs text-slate-500 font-mono">Live Options Trading Algos Status</p>
        </div>
        <button
          onClick={() => navigate('/algo-manager')}
          className="text-xs font-semibold text-[#0F4C3A] hover:underline flex items-center gap-1"
        >
          <span>Manage All ({algos.length})</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <DataTable>
        <TableHeader>
          <tr>
            <th className="px-3 py-2 text-left">Algo Name</th>
            <th className="px-3 py-2 text-left">Underlying</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Trades Today</th>
            <th className="px-3 py-2 text-right">P&L</th>
            <th className="px-3 py-2 text-right">Risk Used</th>
            <th className="px-3 py-2 text-center">Action</th>
          </tr>
        </TableHeader>
        <tbody>
          {algos.map((algo) => {
            const riskPct = Math.round((algo.currentExposure / (algo.maxDailyLoss * 10)) * 100);
            return (
              <TableRow key={algo.id}>
                <TableCell className="font-semibold text-slate-900">
                  {algo.name}
                  <div className="text-[10px] text-slate-500 font-normal">{algo.strategyType}</div>
                </TableCell>
                <TableCell className="font-mono text-slate-700">{algo.underlying}</TableCell>
                <TableCell>
                  <StatusBadge status={algo.status} size="sm" />
                </TableCell>
                <TableCell className="text-right text-slate-700">{algo.tradesToday}</TableCell>
                <TableCell className={`text-right font-bold ${algo.todaysPnL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  ₹{algo.todaysPnL.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs text-slate-500">{riskPct}%</span>
                    <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${riskPct > 80 ? 'bg-red-600' : riskPct > 50 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                        style={{ width: `${Math.min(100, riskPct)}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {algo.status === 'Active' ? (
                      <button
                        onClick={() => updateAlgoStatus(algo.id, 'Stopped')}
                        className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                        title="Stop Algo"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => updateAlgoStatus(algo.id, 'Active')}
                        className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                        title="Start Algo"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </DataTable>
    </div>
  );
};
