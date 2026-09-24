import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { useUIStore } from '../store/useUIStore';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { DataTable, TableHeader, TableRow, TableCell } from '../components/common/DataTable';
import { Gamepad2 } from 'lucide-react';

export const PaperTradingPage: React.FC = () => {
  const algos = useTradingStore((s) => s.algos);
  const tradingMode = useTradingStore((s) => s.tradingMode);
  const setTradingMode = useTradingStore((s) => s.setTradingMode);
  const updateAlgoStatus = useTradingStore((s) => s.updateAlgoStatus);
  const setLiveModeConfirmOpen = useUIStore((s) => s.setLiveModeConfirmOpen);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dedicated Paper Trading Sandbox</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Risk-Free Algorithm Testing with Real Market Ticks</p>
        </div>

        {/* Global Paper/Live Mode Status Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-[#0F4C3A] border border-emerald-200 text-xs font-mono font-bold flex items-center gap-1.5">
            <Gamepad2 className="w-4 h-4" />
            <span>ACTIVE MODE: {tradingMode.toUpperCase()}</span>
          </div>

          <button
            onClick={() => {
              if (tradingMode === 'Paper') {
                setLiveModeConfirmOpen(true);
              } else {
                setTradingMode('Paper');
              }
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold font-mono border transition-all ${
              tradingMode === 'Paper'
                ? 'bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-600'
                : 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
            }`}
          >
            {tradingMode === 'Paper' ? 'Switch to LIVE Trading' : 'Switch to Paper Mode'}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          title="Virtual Capital"
          value="₹10,00,000"
          icon={Gamepad2}
          subtext="Simulated Margin"
        />
        <MetricCard
          title="Paper P&L"
          value="₹34,850"
          valueColor="profit"
          change={3.48}
        />
        <MetricCard
          title="Paper Trades"
          value="42"
          subtext="Simulated Executions"
        />
        <MetricCard
          title="Sandbox Win Rate"
          value="68%"
          valueColor="profit"
        />
        <MetricCard
          title="Paper Drawdown"
          value="₹4,200"
          valueColor="loss"
        />
      </div>

      {/* Paper Strategy Control Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Paper Trading Strategies</h3>

        <DataTable>
          <TableHeader>
            <tr>
              <th className="px-3 py-2 text-left">Strategy Name</th>
              <th className="px-3 py-2 text-left">Underlying</th>
              <th className="px-3 py-2 text-left">Mode</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Today's Trades</th>
              <th className="px-3 py-2 text-right">Paper P&L</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </TableHeader>
          <tbody>
            {algos.map((algo) => (
              <TableRow key={algo.id}>
                <TableCell className="font-bold text-slate-900">{algo.name}</TableCell>
                <TableCell className="font-mono text-slate-700">{algo.underlying}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${algo.mode === 'Paper' ? 'bg-emerald-50 text-[#0F4C3A]' : 'bg-amber-50 text-amber-800'}`}>
                    {algo.mode}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={algo.status} size="sm" />
                </TableCell>
                <TableCell className="text-right text-slate-800">{algo.tradesToday}</TableCell>
                <TableCell className={`text-right font-bold ${algo.todaysPnL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  ₹{algo.todaysPnL.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {algo.status === 'Active' ? (
                    <button
                      onClick={() => updateAlgoStatus(algo.id, 'Stopped')}
                      className="px-3 py-1 text-xs font-semibold rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white"
                    >
                      Stop Paper
                    </button>
                  ) : (
                    <button
                      onClick={() => updateAlgoStatus(algo.id, 'Active')}
                      className="px-3 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-600 hover:text-white"
                    >
                      Start Paper
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      </div>
    </div>
  );
};
