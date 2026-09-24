import React, { useState } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, Bar } from 'recharts';
import { Candle, Timeframe, TechnicalIndicatorState } from '../../types/market';
import { clsx } from 'clsx';

interface TradingChartProps {
  candles: Candle[];
  symbol: string;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  indicators: TechnicalIndicatorState;
  onIndicatorsChange: (ind: TechnicalIndicatorState) => void;
}

const timeframes: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1H', '1D'];

export const TradingChart: React.FC<TradingChartProps> = ({
  candles = [],
  symbol,
  timeframe,
  onTimeframeChange,
  indicators,
  onIndicatorsChange
}) => {

  return (
    <div className="bg-[#111827] border border-[#1F293D] rounded-xl p-4 shadow-sm flex flex-col h-full">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1F293D]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-gray-100 font-mono">{symbol}</span>
          <span className="text-xs text-gray-400 font-mono">NSE FO</span>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-[#162032] p-1 rounded-lg border border-[#1F293D]">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={clsx(
                'px-2 py-0.5 text-xs font-mono font-medium rounded transition-colors',
                timeframe === tf ? 'bg-brand text-white font-semibold' : 'text-gray-400 hover:text-gray-200'
              )}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator Toggles */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => onIndicatorsChange({ ...indicators, ema9: !indicators.ema9 })}
            className={clsx('px-2 py-1 rounded border', indicators.ema9 ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 font-bold' : 'bg-[#162032] text-gray-400 border-[#1F293D]')}
          >
            EMA 9
          </button>
          <button
            onClick={() => onIndicatorsChange({ ...indicators, ema21: !indicators.ema21 })}
            className={clsx('px-2 py-1 rounded border', indicators.ema21 ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold' : 'bg-[#162032] text-gray-400 border-[#1F293D]')}
          >
            EMA 21
          </button>
          <button
            onClick={() => onIndicatorsChange({ ...indicators, vwap: !indicators.vwap })}
            className={clsx('px-2 py-1 rounded border', indicators.vwap ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold' : 'bg-[#162032] text-gray-400 border-[#1F293D]')}
          >
            VWAP
          </button>
          <button
            onClick={() => onIndicatorsChange({ ...indicators, rsi: !indicators.rsi })}
            className={clsx('px-2 py-1 rounded border', indicators.rsi ? 'bg-profit-bg text-profit border-profit/40 font-bold' : 'bg-[#162032] text-gray-400 border-[#1F293D]')}
          >
            RSI
          </button>
        </div>
      </div>

      {/* Main Interactive Candle/Area Chart */}
      <div className="flex-1 min-h-[380px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={candles} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="chartBg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(0)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', borderColor: '#1F293D', borderRadius: '8px', fontSize: '12px' }}
              formatter={(val: any, name: any) => [`₹${Number(val).toFixed(2)}`, String(name).toUpperCase()]}
            />
            
            <Area type="monotone" dataKey="close" stroke="#3B82F6" strokeWidth={2} fill="url(#chartBg)" name="Price" />
            
            {indicators.ema9 && <Line type="monotone" dataKey="ema9" stroke="#60A5FA" strokeWidth={1.5} dot={false} name="EMA 9" />}
            {indicators.ema21 && <Line type="monotone" dataKey="ema21" stroke="#A855F7" strokeWidth={1.5} dot={false} name="EMA 21" />}
            {indicators.vwap && <Line type="monotone" dataKey="vwap" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="VWAP" />}
            
            <Bar dataKey="volume" fill="#1E293B" opacity={0.3} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Subchart for RSI if toggled */}
      {indicators.rsi && (
        <div className="h-28 border-t border-[#1F293D] pt-2 mt-2">
          <div className="text-[10px] uppercase font-mono text-gray-400 font-semibold mb-1">RSI (14) Indicator Subchart</div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" vertical={false} />
              <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} tickCount={3} />
              <Line type="monotone" dataKey="rsi" stroke="#10B981" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
