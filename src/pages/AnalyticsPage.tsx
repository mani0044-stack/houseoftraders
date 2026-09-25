import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { MetricCard } from '../components/common/MetricCard';
import { AlertCircle, BarChart2 } from 'lucide-react';
import { useTradingStore } from '../store/useTradingStore';

export const AnalyticsPage: React.FC = () => {
  const orders = useTradingStore((s) => s.orders);
  const positions = useTradingStore((s) => s.positions);

  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
  const closedPositions = positions.filter((p) => p.status === 'CLOSED');

  const totalTradesCount = completedOrders.length;
  let grossProfit = 0;
  let grossLoss = 0;
  let winningCount = 0;
  let losingCount = 0;

  closedPositions.forEach((p) => {
    if (p.realizedPnL > 0) {
      grossProfit += p.realizedPnL;
      winningCount++;
    } else if (p.realizedPnL < 0) {
      grossLoss += Math.abs(p.realizedPnL);
      losingCount++;
    }
  });

  const netPnL = grossProfit - grossLoss;
  const winRate = totalTradesCount > 0 ? Math.round((winningCount / totalTradesCount) * 100) : 0;
  const avgWinLossRatio = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';

  const winLossData = [
    { name: `Winning Trades (${winningCount})`, value: winningCount, color: '#16A34A' },
    { name: `Losing Trades (${losingCount})`, value: losingCount, color: '#DC2626' },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Algorithmic Performance Analytics</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Deep Portfolio Diagnostics & Strategy Attribution</p>
        </div>
      </div>

      {/* Disclaimer Alert */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-center gap-2.5 shadow-xs font-normal">
        <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
        <span>NOTICE: Historical performance and backtested statistics do not guarantee future returns.</span>
      </div>

      {/* Analytics KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard title="Total Net P&L" value={`₹${netPnL.toLocaleString()}`} valueColor={netPnL >= 0 ? 'profit' : 'loss'} />
        <MetricCard title="Gross Profit" value={`₹${grossProfit.toLocaleString()}`} valueColor="profit" />
        <MetricCard title="Gross Loss" value={`₹${grossLoss.toLocaleString()}`} valueColor="loss" />
        <MetricCard title="Win Rate" value={`${winRate}%`} valueColor={winRate >= 50 ? 'profit' : 'neutral'} />
        <MetricCard title="Avg Win / Loss" value={avgWinLossRatio} valueColor="brand" />
        <MetricCard title="Completed Trades" value={totalTradesCount} valueColor="neutral" />
      </div>

      {/* Charts Grid */}
      {totalTradesCount > 0 || closedPositions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily PnL Bar Chart */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 h-[320px] flex flex-col shadow-xs font-sans">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-800 mb-3">Realized P&L Breakdown</h3>
            <div className="flex-1 min-h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={closedPositions.map((p, i) => ({ day: `Trade ${i+1}`, pnl: p.realizedPnL }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {closedPositions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.realizedPnL >= 0 ? '#16A34A' : '#DC2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win / Loss Pie Chart */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 h-[320px] flex flex-col shadow-xs font-sans">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-800 mb-3">Trade Win / Loss Distribution</h3>
            <div className="flex-1 min-h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={winLossData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans">No Performance Analytics Data</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
              Diagnostic graphs and win/loss performance charts will populate dynamically as algorithm trades complete.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};


