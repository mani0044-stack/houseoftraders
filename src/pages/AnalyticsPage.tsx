import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { MetricCard } from '../components/common/MetricCard';
import { AlertCircle } from 'lucide-react';

const mockDailyPnL = [
  { day: 'Mon', pnl: 14200 },
  { day: 'Tue', pnl: -4100 },
  { day: 'Wed', pnl: 22400 },
  { day: 'Thu', pnl: 8900 },
  { day: 'Fri', pnl: 18450 },
];

const winLossData = [
  { name: 'Winning Trades (64%)', value: 32, color: '#059669' },
  { name: 'Losing Trades (36%)', value: 18, color: '#DC2626' },
];

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Algorithmic Performance Analytics</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Deep Portfolio Diagnostics & Strategy Attribution</p>
        </div>
      </div>

      {/* Disclaimer Alert */}
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2 font-mono shadow-xs">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>NOTICE: Historical performance and backtested statistics do not guarantee future returns.</span>
      </div>

      {/* Analytics KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard title="Total Net P&L" value="₹59,850" valueColor="profit" change={11.97} />
        <MetricCard title="Gross Profit" value="₹78,400" valueColor="profit" />
        <MetricCard title="Gross Loss" value="₹18,550" valueColor="loss" />
        <MetricCard title="Win Rate" value="64%" valueColor="profit" />
        <MetricCard title="Avg Win / Loss" value="2.14" valueColor="brand" />
        <MetricCard title="Max Drawdown" value="₹6,200" valueColor="loss" />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily PnL Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs h-[300px] flex flex-col">
          <h3 className="text-xs uppercase font-mono font-bold text-slate-900 mb-2">Daily Realized P&L Breakdown</h3>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockDailyPnL}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="pnl">
                  {mockDailyPnL.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#059669' : '#DC2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win / Loss Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs h-[300px] flex flex-col">
          <h3 className="text-xs uppercase font-mono font-bold text-slate-900 mb-2">Trade Win / Loss Distribution</h3>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={winLossData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
