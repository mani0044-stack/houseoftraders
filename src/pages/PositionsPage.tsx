import React, { useState, useEffect, useMemo } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { useUIStore } from '../store/useUIStore';
import { PositionTable } from '../components/positions/PositionTable';
import { 
  Filter, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ShieldCheck, 
  Search, 
  AlertOctagon,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

export const PositionsPage: React.FC = () => {
  const positions = useTradingStore((s) => s.positions);
  const accounts = useTradingStore((s) => s.accounts);
  const fetchPositions = useTradingStore((s) => s.fetchPositions);
  const fetchAccounts = useTradingStore((s) => s.fetchAccounts);
  const exitAllPositions = useTradingStore((s) => s.exitAllPositions);
  const addToast = useUIStore((s) => s.addToast);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [underlyingFilter, setUnderlyingFilter] = useState<string>('ALL');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');

  // Loading & Modal States
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExitingAll, setIsExitingAll] = useState<boolean>(false);
  const [confirmExitAll, setConfirmExitAll] = useState<boolean>(false);

  // Auto-fetch on mount
  useEffect(() => {
    fetchPositions();
    fetchAccounts();
  }, [fetchPositions, fetchAccounts]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchPositions(), fetchAccounts()]);
      addToast('Positions Synced', 'Successfully refreshed active positions from broker.', 'info');
    } catch {
      addToast('Sync Warning', 'Could not refresh some broker positions.', 'warning');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open Positions & Statistics
  const openPositions = useMemo(() => positions.filter((p) => p.status === 'OPEN'), [positions]);
  const closedPositions = useMemo(() => positions.filter((p) => p.status === 'CLOSED'), [positions]);

  const totalUnrealizedPnL = useMemo(() => {
    return openPositions.reduce((acc, p) => acc + (Number(p.unrealizedPnL) || 0), 0);
  }, [openPositions]);

  const totalRealizedPnL = useMemo(() => {
    return closedPositions.reduce((acc, p) => acc + (Number(p.realizedPnL) || 0), 0);
  }, [closedPositions]);

  const totalInvestedCapital = useMemo(() => {
    return openPositions.reduce((acc, p) => acc + (Number(p.averagePrice) || 0) * Math.abs(Number(p.quantity) || 0), 0);
  }, [openPositions]);

  const returnPercentage = totalInvestedCapital > 0 
    ? ((totalUnrealizedPnL / totalInvestedCapital) * 100).toFixed(2)
    : '0.00';

  const longCount = openPositions.filter((p) => (Number(p.quantity) || 0) > 0).length;
  const shortCount = openPositions.filter((p) => (Number(p.quantity) || 0) < 0).length;

  // Filtered positions
  const filtered = useMemo(() => {
    return positions.filter((p) => {
      // Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      // Account filter
      if (accountFilter !== 'ALL' && p.accountId !== accountFilter) return false;
      // Underlying filter
      if (underlyingFilter !== 'ALL' && p.underlying !== underlyingFilter) return false;
      // Product Type filter
      if (productTypeFilter !== 'ALL') {
        const prod = (p.productType || 'CARRYFORWARD').toUpperCase();
        if (productTypeFilter === 'CARRYFORWARD' && !['CARRYFORWARD', 'NRML'].includes(prod)) return false;
        if (productTypeFilter === 'INTRADAY' && !['INTRADAY', 'MIS', 'DAY'].includes(prod)) return false;
      }
      // Search query (matches strike, underlying, symbol, account name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const sym = (p.symbol || '').toLowerCase();
        const und = (p.underlying || '').toLowerCase();
        const acc = (p.accountName || '').toLowerCase();
        const strikeStr = p.strike ? String(p.strike) : '';
        const optType = (p.type || '').toLowerCase();
        const exp = (p.expiry || '').toLowerCase();
        return (
          sym.includes(q) ||
          und.includes(q) ||
          acc.includes(q) ||
          strikeStr.includes(q) ||
          optType.includes(q) ||
          exp.includes(q)
        );
      }
      return true;
    });
  }, [positions, statusFilter, accountFilter, underlyingFilter, productTypeFilter, searchQuery]);

  // Handle Global Close All Open Positions
  const handleExecuteExitAll = async () => {
    setIsExitingAll(true);
    try {
      const res = await exitAllPositions(accountFilter === 'ALL' ? undefined : accountFilter);
      if (res && res.success) {
        addToast(
          'Positions Closed Successfully',
          res.message || `Successfully squared off ${res.closedCount || openPositions.length} open market positions.`,
          'success'
        );
      } else {
        addToast(
          'Exit Notice',
          res?.message || 'Some positions could not be closed. Please verify broker order book.',
          'warning'
        );
      }
    } catch (err: any) {
      addToast('Exit Error', err.message || 'An error occurred while closing open positions.', 'error');
    } finally {
      setIsExitingAll(false);
      setConfirmExitAll(false);
      await Promise.all([fetchPositions(), fetchAccounts()]);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">
              Market Positions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {openPositions.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time multi-account options & futures exposure, strike metrics, and one-click square-off.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Refresh positions and live LTP"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {/* Close All Open Positions Button */}
          <button
            type="button"
            onClick={() => setConfirmExitAll(true)}
            disabled={openPositions.length === 0 || isExitingAll}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm uppercase tracking-wider ${
              openPositions.length === 0 || isExitingAll
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 active:scale-[0.99] cursor-pointer'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Close All Open Positions ({openPositions.length})</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unrealized P&L */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Open P&L
            </span>
            <div className={`p-2 rounded-xl ${totalUnrealizedPnL >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {totalUnrealizedPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className={`text-2xl font-extrabold font-mono ${totalUnrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalUnrealizedPnL >= 0 ? '+' : ''}₹{Math.abs(totalUnrealizedPnL).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className={`text-xs font-bold font-mono ${totalUnrealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ({totalUnrealizedPnL >= 0 ? '+' : ''}{returnPercentage}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-medium">
            Based on live market LTP across {openPositions.length} active positions
          </div>
        </div>

        {/* Realized P&L */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Booked Realized P&L
            </span>
            <div className={`p-2 rounded-xl ${totalRealizedPnL >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className={`text-2xl font-extrabold font-mono ${totalRealizedPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalRealizedPnL >= 0 ? '+' : ''}₹{Math.abs(totalRealizedPnL).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-medium">
            From {closedPositions.length} squared-off contracts today
          </div>
        </div>

        {/* Open Positions Count & Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active Positions
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-slate-900">
            {openPositions.length} <span className="text-xs font-normal text-slate-500 font-sans">Open Contracts</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-bold font-mono">
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {longCount} Long (Buy)
            </span>
            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              {shortCount} Short (Sell)
            </span>
          </div>
        </div>

        {/* Account Exposure */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Connected Accounts
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-slate-900">
            {accounts.filter((a) => a.isEnabled).length} <span className="text-xs font-normal text-slate-500 font-sans">Active Broker Accounts</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-medium">
            Angel One SmartAPI with static-IP proxy routing
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search strike (e.g. 24850), CE/PE, symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="ALL">All Accounts ({accounts.length})</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.clientId})
              </option>
            ))}
          </select>

          {/* Underlying Filter */}
          <select
            value={underlyingFilter}
            onChange={(e) => setUnderlyingFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="ALL">All Underlyings</option>
            <option value="NIFTY">NIFTY</option>
            <option value="BANKNIFTY">BANKNIFTY</option>
            <option value="FINNIFTY">FINNIFTY</option>
            <option value="SENSEX">SENSEX</option>
          </select>

          {/* Product Type Filter */}
          <select
            value={productTypeFilter}
            onChange={(e) => setProductTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold outline-none cursor-pointer hover:border-slate-300"
          >
            <option value="ALL">All Product Types</option>
            <option value="CARRYFORWARD">Carryforward (NRML)</option>
            <option value="INTRADAY">Intraday (MIS)</option>
          </select>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setStatusFilter('OPEN')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'OPEN'
                ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Open ({openPositions.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('CLOSED')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'CLOSED'
                ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Closed ({closedPositions.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({positions.length})
          </button>
        </div>
      </div>

      {/* Positions Table */}
      <PositionTable positions={filtered} onExitComplete={handleManualRefresh} />

      {/* Exit All Positions Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmExitAll}
        onClose={() => setConfirmExitAll(false)}
        onConfirm={handleExecuteExitAll}
        title="EXIT ALL OPEN POSITIONS"
        description={`Are you sure you want to execute MARKET square-off orders for all ${openPositions.length} active positions across all connected accounts? This will offset your positions immediately.`}
        confirmText={isExitingAll ? 'Exiting All...' : `Close All ${openPositions.length} Positions`}
        confirmVariant="danger"
        isLoading={isExitingAll}
      />
    </div>
  );
};
