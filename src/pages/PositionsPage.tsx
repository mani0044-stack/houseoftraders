import React, { useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { PositionTable } from '../components/positions/PositionTable';
import { Filter } from 'lucide-react';

export const PositionsPage: React.FC = () => {
  const positions = useTradingStore((s) => s.positions);
  const accounts = useTradingStore((s) => s.accounts);

  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [underlyingFilter, setUnderlyingFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');

  const filtered = positions.filter((p) => {
    if (accountFilter !== 'ALL' && p.accountId !== accountFilter) return false;
    if (underlyingFilter !== 'ALL' && p.underlying !== underlyingFilter) return false;
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    return true;
  });

  const openPositions = positions.filter((p) => p.status === 'OPEN');
  const totalUnrealizedPnL = openPositions.reduce((acc, p) => acc + p.unrealizedPnL, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Open Market Positions</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Real-time P&L Tracking & Execution Control</p>
        </div>

        <div className="flex items-center gap-3 font-mono">
          <div className="px-3.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500 font-semibold">Total Open P&L:</span>{' '}
            <strong className={`text-sm ${totalUnrealizedPnL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              ₹{totalUnrealizedPnL.toLocaleString()}
            </strong>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs font-mono shadow-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold mr-2">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </div>

        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 outline-none"
        >
          <option value="ALL">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={underlyingFilter}
          onChange={(e) => setUnderlyingFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 outline-none"
        >
          <option value="ALL">All Underlyings</option>
          <option value="NIFTY">NIFTY</option>
          <option value="BANKNIFTY">BANKNIFTY</option>
          <option value="FINNIFTY">FINNIFTY</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open Positions Only</option>
          <option value="CLOSED">Closed Positions Only</option>
        </select>
      </div>

      {/* Positions Table */}
      <PositionTable positions={filtered} />
    </div>
  );
};
