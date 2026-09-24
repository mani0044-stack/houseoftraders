import React from 'react';
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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col h-full">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base text-slate-900 font-sans">{symbol}</span>
          <span className="text-xs text-slate-500 font-semibold px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">NSE FO</span>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={clsx(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                timeframe === tf ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator Toggles */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => onIndicatorsChange({ ...indicators, ema9: !indicators.ema9 })}
            className={clsx('px-2.5 py-1 rounded-lg border font-semibold transition-colors', indicators.ema9 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200')}
          >
            EMA 9
          </button>
          <button
            onClick={() => onIndicatorsChange({ ...indicators, ema21: !indicators.ema21 })}
            className={clsx('px-2.5 py-1 rounded-lg border font-semibold transition-colors', indicators.ema21 ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-600 border-slate-200')}
          >
            EMA 21
          </button>
          <button
            onClick={() => onIndicatorsChange({ ...indicators, vwap: !indicators.vwap })}
            className={clsx('px-2.5 py-1 rounded-lg border font-semibold transition-colors', indicators.vwap ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200')}
          >
            VWAP
          </button>
          <button
            onClick={() => onIndicatorsChange({ ...indicators, rsi: !indicators.rsi })}
            className={clsx('px-2.5 py-1 rounded-lg border font-semibold transition-colors', indicators.rsi ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200')}
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
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(0)} />
            <Tooltip
              contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
              formatter={(val: any, name: any) => [`₹${Number(val).toFixed(2)}`, String(name).toUpperCase()]}
            />
            
            <Area type="monotone" dataKey="close" stroke="#2563EB" strokeWidth={2.5} fill="url(#chartBg)" name="Price" />
            
            {indicators.ema9 && <Line type="monotone" dataKey="ema9" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="EMA 9" />}
            {indicators.ema21 && <Line type="monotone" dataKey="ema21" stroke="#8B5CF6" strokeWidth={1.5} dot={false} name="EMA 21" />}
            {indicators.vwap && <Line type="monotone" dataKey="vwap" stroke="#F59E0B" strokeWidth={1.5} dot={false} name="VWAP" />}
            
            <Bar dataKey="volume" fill="#E2E8F0" opacity={0.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Subchart for RSI if toggled */}
      {indicators.rsi && (
        <div className="h-28 border-t border-slate-100 pt-2 mt-2">
          <div className="text-[10px] uppercase font-sans text-slate-400 font-semibold mb-1">RSI (14) Indicator Subchart</div>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={candles} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <YAxis stroke="#94A3B8" fontSize={10} domain={[0, 100]} tickCount={3} />
              <Line type="monotone" dataKey="rsi" stroke="#16A34A" strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
