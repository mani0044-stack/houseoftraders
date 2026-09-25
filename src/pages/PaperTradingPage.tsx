import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { useUIStore } from '../store/useUIStore';
import { MetricCard } from '../components/common/MetricCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { DataTable, TableHeader, TableRow, TableCell } from '../components/common/DataTable';
import { Gamepad2, Play, Square, ArrowRightLeft } from 'lucide-react';

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
          <p className="text-xs text-slate-500 mt-0.5 font-normal">Risk-Free Algorithm Testing with Real Market Ticks</p>
        </div>

        {/* Global Paper/Live Mode Status Badge */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center gap-1.5">
            <Gamepad2 className="w-4 h-4 text-blue-600" />
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-xs ${
              tradingMode === 'Paper'
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            {tradingMode === 'Paper' ? 'Switch to LIVE Trading' : 'Switch to Paper Mode'}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-sans">
        <MetricCard
          title="Virtual Capital"
          value="₹10,00,000"
          icon={Gamepad2}
          subtext="Simulated Margin"
        />
        <MetricCard
          title="Paper P&L"
          value={`₹${algos.filter((a) => a.mode === 'Paper').reduce((acc, a) => acc + a.todaysPnL, 0).toLocaleString()}`}
          valueColor={algos.filter((a) => a.mode === 'Paper').reduce((acc, a) => acc + a.todaysPnL, 0) >= 0 ? "profit" : "loss"}
        />
        <MetricCard
          title="Paper Trades"
          value={algos.filter((a) => a.mode === 'Paper').reduce((acc, a) => acc + a.tradesToday, 0)}
          subtext="Simulated Executions"
        />
        <MetricCard
          title="Paper Algos"
          value={algos.filter((a) => a.mode === 'Paper').length}
          valueColor="brand"
          subtext="Active Sandbox Spreads"
        />
        <MetricCard
          title="Paper Drawdown"
          value="₹0"
          valueColor="neutral"
        />
      </div>

      {/* Paper Strategy Control Grid */}
      <div className="card-premium p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Paper Trading Strategies</h3>

        <DataTable>
          <TableHeader>
            <tr>
              <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Strategy Name</th>
              <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Underlying</th>
              <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Mode</th>
              <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Status</th>
              <th className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">Today's Trades</th>
              <th className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">Paper P&L</th>
              <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-slate-600">Actions</th>
            </tr>
          </TableHeader>
          <tbody>
            {algos.map((algo) => (
              <TableRow key={algo.id}>
                <TableCell className="font-semibold text-slate-900">{algo.name}</TableCell>
                <TableCell className="font-mono-num text-slate-700 text-xs">{algo.underlying}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${algo.mode === 'Paper' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                    {algo.mode}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={algo.status} size="sm" />
                </TableCell>
                <TableCell className="text-right text-slate-800 font-mono-num">{algo.tradesToday}</TableCell>
                <TableCell className={`text-right font-bold font-mono-num ${algo.todaysPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{algo.todaysPnL.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {algo.status === 'Active' ? (
                    <button
                      onClick={() => updateAlgoStatus(algo.id, 'Stopped')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white transition-colors flex items-center gap-1 mx-auto"
                    >
                      <Square className="w-3 h-3" /> Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => updateAlgoStatus(algo.id, 'Active')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1 mx-auto"
                    >
                      <Play className="w-3 h-3" /> Start
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

