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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Open Market Positions</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Real-time P&L Tracking & Position Square-off Control</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white border border-slate-200/90 shadow-xs text-xs font-sans">
            <span className="text-slate-500 font-semibold">Total Open P&L:</span>{' '}
            <strong className={`text-base font-mono-num font-bold ${totalUnrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalUnrealizedPnL >= 0 ? '+' : ''}₹{totalUnrealizedPnL.toLocaleString()}
            </strong>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-wrap items-center gap-3 text-xs font-sans shadow-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-bold mr-2 uppercase text-[11px] tracking-wider">
          <Filter className="w-3.5 h-3.5 text-blue-600" /> Filters:
        </div>

        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold outline-none cursor-pointer hover:border-slate-300"
        >
          <option value="ALL">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <select
          value={underlyingFilter}
          onChange={(e) => setUnderlyingFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold outline-none cursor-pointer hover:border-slate-300"
        >
          <option value="ALL">All Underlyings</option>
          <option value="NIFTY">NIFTY</option>
          <option value="BANKNIFTY">BANKNIFTY</option>
          <option value="FINNIFTY">FINNIFTY</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold outline-none cursor-pointer hover:border-slate-300"
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
