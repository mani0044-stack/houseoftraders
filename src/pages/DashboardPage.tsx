import React from 'react';
import { clsx } from 'clsx';
import logoImg from '../assets/logo.png';
import { PnLChart } from '../components/dashboard/PnLChart';
import { ActiveAlgosTable } from '../components/dashboard/ActiveAlgosTable';
import { AccountOverviewTable } from '../components/dashboard/AccountOverviewTable';
import { RecentOrdersPanel } from '../components/dashboard/RecentOrdersPanel';
import { SystemAlertsPanel } from '../components/dashboard/SystemAlertsPanel';
import { useTradingStore } from '../store/useTradingStore';

interface StatTileProps {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'profit' | 'loss' | 'brand';
  change?: number;
}

const StatTile: React.FC<StatTileProps> = ({ label, value, tone = 'neutral', change }) => {
  const valueColor =
    tone === 'profit'
      ? 'text-emerald-600'
      : tone === 'loss'
      ? 'text-rose-600'
      : tone === 'brand'
      ? 'text-[#0F6B5C]'
      : 'text-[#12211C]';

  return (
    <div
      className="p-3.5 rounded-xl bg-[#F4F7F6] border border-[#E3E8E6]
                 transition-all duration-300
                 hover:bg-white hover:border-[#0F6B5C] hover:shadow-[0_6px_16px_-8px_rgba(15,107,92,0.3)]"
    >
      <span className="text-[10px] uppercase text-[#6B7C75] font-bold tracking-wider">{label}</span>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <p className={clsx('text-xl font-bold font-mono-num', valueColor)}>{value}</p>
        {typeof change === 'number' && (
          <span
            className={clsx(
              'text-xs font-semibold font-mono-num px-2 py-0.5 rounded-md border shrink-0',
              change >= 0
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80'
                : 'text-rose-700 bg-rose-50 border-rose-200/80'
            )}
          >
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const accounts = useTradingStore((s) => s.accounts);
  const algos = useTradingStore((s) => s.algos);
  const positions = useTradingStore((s) => s.positions);
  const riskLimit = useTradingStore((s) => s.riskLimit);
  const wsConnected = useTradingStore((s) => s.wsConnected);
  const wsLatencyMs = useTradingStore((s) => s.wsLatencyMs);
  const tradingMode = useTradingStore((s) => s.tradingMode);

  const totalCapital = accounts.reduce((acc, a) => acc + a.totalCapital, 0);
  const totalMargin = accounts.reduce((acc, a) => acc + a.availableMargin, 0);
  const todaysPnL = accounts.reduce((acc, a) => acc + a.todaysPnL, 0);
  const activeAlgosCount = algos.filter((a) => a.status === 'Active').length;
  const activeAccountsCount = accounts.filter((a) => a.isEnabled).length;
  const openPositionsCount = positions.filter((p) => p.status === 'OPEN').length;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
     
      {/* Top Welcome & Market Overview Banner */}
<div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
  <div className="flex items-center gap-4">
    <img src={logoImg} alt="House of Traders Logo" className="w-16 h-16 object-contain shrink-0" />
    
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#E8F3F0] text-[#0F6B5C] text-[11px] font-bold uppercase tracking-wider border border-[#0F6B5C]/20">
                {tradingMode} MODE
              </span>
              <span className="text-xs text-[#6B7C75] font-medium">• Live Angel SmartAPI Feed</span>
            </div>
            <h1 className="text-2xl font-bold text-[#12211C] tracking-tight mt-1 font-sans">
              House of Traders Terminal
            </h1>
            <p className="text-xs text-[#6B7C75] mt-1 font-medium">
              Multi-Account Options Algorithmic Execution & Portfolio Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-8 py-3 min-w-[220px] rounded-xl bg-[#F4F7F6] border border-[#E3E8E6] text-right">
            <div className="text-[10px] text-[#6B7C75] font-semibold uppercase tracking-wider">Today's Total P&L</div>
            <div className={`text-lg font-bold font-mono-num ${todaysPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {todaysPnL >= 0 ? '+' : ''}₹{todaysPnL.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Account Overview + P&L Performance, side by side (chart column wider) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-5">
        <div
          className="bg-white border border-[#E3E8E6] rounded-2xl p-5 shadow-xs
                     transition-all duration-300
                     hover:bg-[#FBFDFC] hover:border-[#0F6B5C] hover:shadow-[0_10px_28px_-10px_rgba(15,107,92,0.28)]"
        >
          <h3 className="text-xs font-bold text-[#6B7C75] uppercase tracking-wider mb-4">Account Overview</h3>

          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Total Capital" value={`₹${(totalCapital / 100000).toFixed(2)}L`} />
            <StatTile label="Avail. Margin" value={`₹${(totalMargin / 100000).toFixed(2)}L`} />
            <StatTile
              label="Today's P&L"
              value={`₹${todaysPnL.toLocaleString()}`}
              tone={todaysPnL >= 0 ? 'profit' : 'loss'}
              change={1.84}
            />
            <StatTile label="Open Positions" value={openPositionsCount} />
            <StatTile label="Active Algos" value={`${activeAlgosCount} / ${algos.length}`} tone="brand" />
            <StatTile label="Active Accounts" value={`${activeAccountsCount} / ${accounts.length}`} />
            <StatTile
              label="Daily Risk"
              value={`${riskLimit.maxDailyLoss > 0 ? Math.round((riskLimit.currentDailyLoss / riskLimit.maxDailyLoss) * 100) : 0}%`}
              tone="neutral"
            />
            <StatTile
              label="WebSocket"
              value={wsConnected ? `${wsLatencyMs}ms` : 'Off'}
              tone={wsConnected ? 'profit' : 'loss'}
            />
          </div>
        </div>

        <div className="min-h-[360px] flex">
          <PnLChart />
        </div>
      </div>

      {/* Row 1: three cards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.3fr)_minmax(0,1fr)] gap-5 items-start">
        <ActiveAlgosTable />
        <AccountOverviewTable />
        <RecentOrdersPanel />
      </div>

      {/* Row 2: full-width System & Risk */}
      <div>
        <SystemAlertsPanel />
      </div>
    </div>
  );
};