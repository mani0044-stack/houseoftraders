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
  DollarSign,
  Sparkles,
  ArrowUpRight,
  Zap
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const accounts = useTradingStore((s) => s.accounts);
  const algos = useTradingStore((s) => s.algos);
  const positions = useTradingStore((s) => s.positions);
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
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider border border-blue-100">
              {tradingMode} MODE
            </span>
            <span className="text-xs text-slate-400 font-medium">• Live Angel SmartAPI Feed</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 font-sans">
            House of Traders Terminal
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Multi-Account Options Algorithmic Execution & Portfolio Intelligence
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-right">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Today's Total P&L</div>
            <div className={`text-lg font-bold font-mono-num ${todaysPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {todaysPnL >= 0 ? '+' : ''}₹{todaysPnL.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Top 8 Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard
          title="Total Capital"
          value={`₹${(totalCapital / 100000).toFixed(2)}L`}
          icon={Wallet}
          subtext="Combined Capital"
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
          subtext="Angel Connected"
        />
        <MetricCard
          title="Daily Risk"
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
          subtext="Live Feed Ping"
        />
      </div>

      {/* P&L Performance Chart */}
      <div className="h-[360px]">
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
