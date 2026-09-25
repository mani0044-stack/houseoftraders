import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { clsx } from 'clsx';
import { useTradingStore } from '../../store/useTradingStore';

export const PnLChart: React.FC = () => {
  const [viewMode, setViewMode] = useState<'cumulative' | 'intraday'>('cumulative');
  const positions = useTradingStore((s) => s.positions);

  // Generate intraday data points based on actual position P&L or baseline
  const totalPnL = positions.reduce((acc, p) => acc + (p.unrealizedPnL || 0) + (p.realizedPnL || 0), 0);

  const chartData = positions.length > 0 ? [
    { time: '09:15', pnl: 0, cumulative: 0 },
    { time: '12:00', pnl: Math.round(totalPnL * 0.4), cumulative: Math.round(totalPnL * 0.4) },
    { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), pnl: totalPnL, cumulative: totalPnL }
  ] : [
    { time: '09:15', pnl: 0, cumulative: 0 },
    { time: '11:30', pnl: 0, cumulative: 0 },
    { time: '13:45', pnl: 0, cumulative: 0 },
    { time: '15:30', pnl: 0, cumulative: 0 },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col h-full font-sans">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">P&L Performance Curve</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Live Intraday Realized & Unrealized Performance</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={() => setViewMode('cumulative')}
            className={clsx(
              'px-3 py-1 text-xs font-semibold rounded-lg transition-all',
              viewMode === 'cumulative' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Cumulative
          </button>
          <button
            onClick={() => setViewMode('intraday')}
            className={clsx(
              'px-3 py-1 text-xs font-semibold rounded-lg transition-all',
              viewMode === 'intraday' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Intraday Step
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[260px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={totalPnL >= 0 ? "#2563EB" : "#DC2626"} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={totalPnL >= 0 ? "#2563EB" : "#DC2626"} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#94A3B8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#FFFFFF', 
                borderColor: '#E5E7EB', 
                borderRadius: '12px', 
                fontSize: '12px', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' 
              }}
              formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, viewMode === 'cumulative' ? 'Cumulative P&L' : 'Step P&L']}
            />
            <Area
              type="monotone"
              dataKey={viewMode === 'cumulative' ? 'cumulative' : 'pnl'}
              stroke={totalPnL >= 0 ? "#2563EB" : "#DC2626"}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#pnlGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
