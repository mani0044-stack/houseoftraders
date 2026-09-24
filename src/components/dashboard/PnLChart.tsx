import React, { useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { clsx } from 'clsx';

const mockIntradayPnL = [
  { time: '09:15', pnl: 0, cumulative: 0 },
  { time: '09:45', pnl: 1400, cumulative: 1400 },
  { time: '10:30', pnl: -800, cumulative: 600 },
  { time: '11:15', pnl: 4200, cumulative: 4800 },
  { time: '12:00', pnl: 3100, cumulative: 7900 },
  { time: '12:45', pnl: 2500, cumulative: 10400 },
  { time: '13:30', pnl: -1200, cumulative: 9200 },
  { time: '14:15', pnl: 6800, cumulative: 16000 },
  { time: '15:00', pnl: 4500, cumulative: 20500 },
  { time: '15:30', pnl: 950, cumulative: 21450 },
];

export const PnLChart: React.FC = () => {
  const [viewMode, setViewMode] = useState<'cumulative' | 'intraday'>('cumulative');

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">P&L Performance Overview</h3>
          <p className="text-xs text-slate-500 font-mono">Live Intraday Realized & Unrealized P&L Curve</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('cumulative')}
            className={clsx(
              'px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors',
              viewMode === 'cumulative' ? 'bg-[#0F4C3A] text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Cumulative
          </button>
          <button
            onClick={() => setViewMode('intraday')}
            className={clsx(
              'px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors',
              viewMode === 'intraday' ? 'bg-[#0F4C3A] text-white font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Intraday Step
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[260px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockIntradayPnL} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, viewMode === 'cumulative' ? 'Cumulative P&L' : 'Step P&L']}
            />
            <Area
              type="monotone"
              dataKey={viewMode === 'cumulative' ? 'cumulative' : 'pnl'}
              stroke="#059669"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#pnlGreen)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
