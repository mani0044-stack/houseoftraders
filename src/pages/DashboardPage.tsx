import React from 'react';
import { MetricCard } from '../components/common/MetricCard';
import { PnLChart } from '../components/dashboard/PnLChart';
import { ActiveAlgosTable } from '../components/dashboard/ActiveAlgosTable';
import { AccountOverviewTable } from '../components/dashboard/AccountOverviewTable';
import { RecentOrdersPanel } from '../components/dashboard/RecentOrdersPanel';
import { SystemAlertsPanel } from '../components/dashboard/SystemAlertsPanel';
import { useTradingStore } from '../store/useTradingStore';
import { 
  Wallet, 
  TrendingUp, 
  Briefcase, 
  Cpu, 
  Users, 
  ShieldAlert, 
  Wifi,
  DollarSign
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const accounts = useTradingStore((s) => s.accounts);
  const algos = useTradingStore((s) => s.algos);
  const positions = useTradingStore((s) => s.positions);
  const wsConnected = useTradingStore((s) => s.wsConnected);
  const wsLatencyMs = useTradingStore((s) => s.wsLatencyMs);

  const totalCapital = accounts.reduce((acc, a) => acc + a.totalCapital, 0);
  const totalMargin = accounts.reduce((acc, a) => acc + a.availableMargin, 0);
  const todaysPnL = accounts.reduce((acc, a) => acc + a.todaysPnL, 0);
  const activeAlgosCount = algos.filter((a) => a.status === 'Active').length;
  const activeAccountsCount = accounts.filter((a) => a.isEnabled).length;
  const openPositionsCount = positions.filter((p) => p.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Algorithmic Options Trading Overview</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Multi-Account Real-Time Terminal & Execution Monitor</p>
        </div>
      </div>

      {/* Top 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard
          title="Total Capital"
          value={`₹${(totalCapital / 100000).toFixed(2)}L`}
          icon={Wallet}
          subtext="Combined Portfolio"
        />
        <MetricCard
          title="Avail. Margin"
          value={`₹${(totalMargin / 100000).toFixed(2)}L`}
          icon={DollarSign}
          subtext="Broker Liquidity"
        />
        <MetricCard
          title="Today's P&L"
          value={`₹${todaysPnL.toLocaleString()}`}
          valueColor={todaysPnL >= 0 ? 'profit' : 'loss'}
          change={1.84}
          icon={TrendingUp}
        />
        <MetricCard
          title="Open Positions"
          value={openPositionsCount}
          icon={Briefcase}
          subtext="Active Contracts"
        />
        <MetricCard
          title="Active Algos"
          value={`${activeAlgosCount} / ${algos.length}`}
          valueColor="brand"
          icon={Cpu}
          subtext="Execution Engine"
        />
        <MetricCard
          title="Active Accounts"
          value={`${activeAccountsCount} / ${accounts.length}`}
          icon={Users}
          subtext="Angel One Connected"
        />
        <MetricCard
          title="Daily Risk Used"
          value="43%"
          valueColor="neutral"
          icon={ShieldAlert}
          subtext="Cap: ₹50,000"
        />
        <MetricCard
          title="WebSocket"
          value={wsConnected ? `${wsLatencyMs}ms` : 'Off'}
          valueColor={wsConnected ? 'profit' : 'loss'}
          icon={Wifi}
          subtext="Live Ticker Feed"
        />
      </div>

      {/* P&L Performance Chart */}
      <div className="h-[340px]">
        <PnLChart />
      </div>

      {/* Active Algorithms & Account Overview Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveAlgosTable />
        <AccountOverviewTable />
      </div>

      {/* Recent Orders & System Risk Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentOrdersPanel />
        <SystemAlertsPanel />
      </div>
    </div>
  );
};
