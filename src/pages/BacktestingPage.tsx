import React, { useState } from 'react';
import { BacktestForm } from '../components/backtest/BacktestForm';
import { BacktestParams, BacktestResult } from '../types/backtest';
import { backtestApi } from '../api/backtestApi';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { MetricCard } from '../components/common/MetricCard';
import { DataTable, TableHeader, TableRow, TableCell } from '../components/common/DataTable';
import { TrendingUp, Award, AlertTriangle, Activity, Calendar, Zap, Shield, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';
import { useTradingStore } from '../store/useTradingStore';
import { useUIStore } from '../store/useUIStore';
import { useNavigate } from 'react-router-dom';

export const BacktestingPage: React.FC = () => {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);

  const addAlgorithm = useTradingStore((s) => s.addAlgorithm);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  const handleRun = (params: BacktestParams) => {
    setLoading(true);
    backtestApi.runBacktest(params).then((data) => {
      setResult(data);
      setLoading(false);
    });
  };

  const handleDeployAlgo = () => {
    if (!result) return;
    const p = result.params;
    const newAlgo = {
      id: `algo-deploy-${Date.now()}`,
      name: p.strategyName || `${p.underlying} Strategy`,
      description: `Deployed from Backtest simulation (${p.executionMode} mode, ${p.legs.length} legs). Net Backtest P&L: ₹${result.netPnL.toLocaleString()}`,
      underlying: p.underlying,
      strategyType: `${p.legs.length}-Leg Custom Strategy`,
      status: 'Active' as const,
      mode: 'Paper' as const,
      assignedAccounts: [],
      accountAllocations: [],
      tradesToday: 0,
      todaysPnL: 0,
      maxDailyLoss: p.overallRisk?.overallSLValue || 15000,
      currentExposure: 0,
      maxTradesPerDay: 6,
      maxOpenPositions: 2,
      expiryType: 'Nearest' as const,
      legs: p.legs,
      timingSettings: p.timingSettings,
      daysFilter: p.daysFilter,
      overallRisk: p.overallRisk,
      exitConditions: {
        stopLossPercent: p.overallRisk?.overallSLValue,
        targetPercent: p.overallRisk?.overallTargetValue,
      },
      positionSizing: {
        type: 'Fixed Lots' as const,
        value: p.positionSizeLots,
      },
      createdAt: new Date().toISOString().split('T')[0],
    };

    addAlgorithm(newAlgo);
    addToast('Strategy Deployed', `Strategy "${newAlgo.name}" deployed to Algo Manager in Paper Mode!`, 'success');
    navigate('/algo-manager');
  };

  const filteredTrades = result?.trades.filter((t) => {
    if (tradeFilter === 'WIN') return t.pnl >= 0;
    if (tradeFilter === 'LOSS') return t.pnl < 0;
    return true;
  }) || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#0F4C3A]" /> AlgoTest Options Backtesting & Strategy Engine
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Simulate Intraday/Positional Multi-Leg Strategies, Entry/Exit Timings, and OTM Strike Options
          </p>
        </div>

        {result && (
          <button
            type="button"
            onClick={handleDeployAlgo}
            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-mono flex items-center gap-1.5 transition-all"
          >
            <PlayCircle className="w-4 h-4" /> Deploy to Algo Manager (Paper/Live)
          </button>
        )}
      </div>

      {/* AlgoTest Form Configurator */}
      <BacktestForm onRunBacktest={handleRun} isLoading={loading} />

      {/* Backtest Results Dashboard */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <MetricCard
              title="Net Backtest P&L"
              value={`₹${result.netPnL.toLocaleString()}`}
              valueColor={result.netPnL >= 0 ? 'profit' : 'loss'}
              change={result.netPnLPercent}
              icon={TrendingUp}
            />
            <MetricCard
              title="Win Rate"
              value={`${result.winRate}%`}
              valueColor="profit"
              icon={Award}
              subtext={`${result.winningTrades}W / ${result.losingTrades}L`}
            />
            <MetricCard
              title="Max Drawdown"
              value={`₹${result.maxDrawdown.toLocaleString()}`}
              valueColor="loss"
              change={-result.maxDrawdownPercent}
              icon={AlertTriangle}
            />
            <MetricCard
              title="Profit Factor"
              value={result.profitFactor}
              valueColor="brand"
              subtext="Gross Win / Loss"
            />
            <MetricCard
              title="Sharpe Ratio"
              value={result.sharpeRatio}
              valueColor="brand"
              subtext="Risk-Adjusted Return"
            />
            <MetricCard
              title="Expectancy"
              value={`₹${result.expectancy}`}
              valueColor={result.expectancy >= 0 ? 'profit' : 'loss'}
              subtext="P&L per trade"
            />
            <MetricCard
              title="Win / Loss Streak"
              value={`${result.maxWinningStreak}W / ${result.maxLosingStreak}L`}
              icon={Activity}
            />
          </div>

          {/* Equity Curve Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs h-[340px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase font-mono font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0F4C3A]" /> Cumulative Equity Curve & Capital Drawdown
              </h3>
              <span className="text-[11px] font-mono text-slate-500">Starting: ₹{result.params.startingCapital.toLocaleString()}</span>
            </div>
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.equityCurve}>
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F4C3A" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0F4C3A" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Portfolio Equity']}
                  />
                  <Area type="monotone" dataKey="equity" stroke="#0F4C3A" strokeWidth={2.5} fill="url(#equityGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Returns Heatmap Matrix (AlgoTest Feature) */}
          {result.monthlyReturnsMatrix && result.monthlyReturnsMatrix.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0F4C3A]" /> Monthly Returns Heatmap Matrix (AlgoTest Style)
                </h3>
                <span className="text-[11px] text-slate-500">Color-coded breakdown by month</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2 px-2 text-left">Year</th>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                        <th key={m} className="py-2 px-2">{m}</th>
                      ))}
                      <th className="py-2 px-2 text-right">Total P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.monthlyReturnsMatrix.map((yr) => (
                      <tr key={yr.year} className="border-b border-slate-100">
                        <td className="py-2.5 px-2 text-left font-bold text-slate-900">{yr.year}</td>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => {
                          const val = yr.months[m] || 0;
                          const isPos = val > 0;
                          const isNeg = val < 0;
                          return (
                            <td key={m} className="py-2.5 px-1">
                              {val === 0 ? (
                                <span className="text-slate-400 font-normal">-</span>
                              ) : (
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                    isPos ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {isPos ? '+' : ''}₹{(val / 1000).toFixed(1)}k
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className={`py-2.5 px-2 text-right font-bold ${yr.totalPnL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          ₹{yr.totalPnL.toLocaleString()} ({yr.totalPnLPercent}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Day of Week Stats Grid */}
          {result.dayOfWeekStats && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 font-mono">
              <h3 className="text-xs uppercase font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#0F4C3A]" /> Day-of-Week Performance Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {result.dayOfWeekStats.map((st) => (
                  <div key={st.day} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                      <span>{st.day}</span>
                      <span className="text-[10px] text-slate-500">{st.trades} Trades</span>
                    </div>
                    <div className={`text-xs font-bold ${st.netPnL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      ₹{st.netPnL.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500">Win Rate: {st.winRate}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trade Executions Log with Filters & Leg Details */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs uppercase font-bold text-slate-900">Historical Strategy Trade Executions</h3>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTradeFilter('ALL')}
                  className={`px-3 py-1 rounded transition-all ${tradeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                >
                  All ({result.trades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTradeFilter('WIN')}
                  className={`px-3 py-1 rounded transition-all ${tradeFilter === 'WIN' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
                >
                  Profitable
                </button>
                <button
                  type="button"
                  onClick={() => setTradeFilter('LOSS')}
                  className={`px-3 py-1 rounded transition-all ${tradeFilter === 'LOSS' ? 'bg-red-600 text-white' : 'text-slate-600'}`}
                >
                  Losses
                </button>
              </div>
            </div>

            <DataTable>
              <TableHeader>
                <tr>
                  <th className="px-3 py-2 text-left">Entry Time</th>
                  <th className="px-3 py-2 text-left">Exit Time</th>
                  <th className="px-3 py-2 text-left">Strategy Symbol</th>
                  <th className="px-3 py-2 text-center">Mode</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Entry (₹)</th>
                  <th className="px-3 py-2 text-right">Exit (₹)</th>
                  <th className="px-3 py-2 text-center">Exit Reason</th>
                  <th className="px-3 py-2 text-right">Trade P&L</th>
                </tr>
              </TableHeader>
              <tbody>
                {filteredTrades.map((trd) => {
                  const isExpanded = expandedTradeId === trd.id;
                  return (
                    <React.Fragment key={trd.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setExpandedTradeId(isExpanded ? null : trd.id)}
                      >
                        <TableCell className="text-slate-600 text-xs">{trd.entryTime}</TableCell>
                        <TableCell className="text-slate-600 text-xs">{trd.exitTime}</TableCell>
                        <TableCell className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                          {trd.symbol}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${trd.executionMode === 'Positional' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                            {trd.executionMode}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-slate-800">{trd.quantity}</TableCell>
                        <TableCell className="text-right text-slate-700">₹{trd.entryPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-slate-700">₹{trd.exitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            trd.exitReason === 'Target Profit' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                            trd.exitReason === 'Stop Loss' || trd.exitReason === 'Overall SL' ? 'bg-red-50 text-red-700 border-red-300' :
                            'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            {trd.exitReason}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-bold ${trd.pnl >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          ₹{trd.pnl.toLocaleString()}
                        </TableCell>
                      </TableRow>

                      {/* Leg Breakdown Expanded Row */}
                      {isExpanded && trd.legsBreakdown && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={9} className="p-3">
                            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                              <span className="font-bold text-slate-700 uppercase">Option Legs Execution Details:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {trd.legsBreakdown.map((lg, idx) => (
                                  <div key={idx} className="p-2 rounded border border-slate-200 bg-slate-50 flex justify-between items-center">
                                    <div>
                                      <span className={`font-bold ${lg.action === 'BUY' ? 'text-emerald-700' : 'text-red-600'}`}>{lg.action}</span> {lg.symbol}
                                      <div className="text-[10px] text-slate-500">Entry: ₹{lg.entryPrice} → Exit: ₹{lg.exitPrice}</div>
                                    </div>
                                    <div className={`font-bold ${lg.pnl >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                      ₹{lg.pnl}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </DataTable>
          </div>
        </div>
      )}
    </div>
  );
};

