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
    <div className="bg-white border border-[#E3E8E6] rounded-2xl p-5 shadow-xs flex flex-col h-full w-full font-sans">
      <div className="flex items-center justify-between pb-3.5 border-b border-[#E3E8E6]">
        <div>
          <h3 className="text-xs font-bold text-[#12211C] uppercase tracking-wider">P&L Performance Curve</h3>
          <p className="text-xs text-[#6B7C75] font-medium mt-0.5">Live Intraday Realized & Unrealized Performance</p>
        </div>

        <div className="flex items-center gap-3">
          <span className={clsx('text-sm font-bold font-mono-num', totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
            {totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString()}
          </span>

          <div className="flex items-center gap-1 bg-[#F4F7F6] p-1 rounded-xl border border-[#E3E8E6]">
            <button
              onClick={() => setViewMode('cumulative')}
              className={clsx(
                'px-3 py-1 text-xs font-semibold rounded-lg transition-all',
                viewMode === 'cumulative' ? 'bg-white text-[#0F6B5C] shadow-xs' : 'text-[#6B7C75] hover:text-[#12211C]'
              )}
            >
              Cumulative
            </button>
            <button
              onClick={() => setViewMode('intraday')}
              className={clsx(
                'px-3 py-1 text-xs font-semibold rounded-lg transition-all',
                viewMode === 'intraday' ? 'bg-white text-[#0F6B5C] shadow-xs' : 'text-[#6B7C75] hover:text-[#12211C]'
              )}
            >
              Intraday Step
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[260px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={totalPnL >= 0 ? "#0F6B5C" : "#DC2626"} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={totalPnL >= 0 ? "#0F6B5C" : "#DC2626"} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3E8E6" vertical={false} />
            <XAxis dataKey="time" stroke="#6B7C75" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#6B7C75"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#FFFFFF', 
                borderColor: '#E3E8E6', 
                borderRadius: '12px', 
                fontSize: '12px', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' 
              }}
              formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, viewMode === 'cumulative' ? 'Cumulative P&L' : 'Step P&L']}
            />
            <Area
              type="monotone"
              dataKey={viewMode === 'cumulative' ? 'cumulative' : 'pnl'}
              stroke={totalPnL >= 0 ? "#0F6B5C" : "#DC2626"}
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