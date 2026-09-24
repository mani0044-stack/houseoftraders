import React, { useState } from 'react';
import { BacktestParams } from '../../types/backtest';
import { UnderlyingSymbol, ExecutionMode, OptionLeg, OptionStrategyType } from '../../types/algo';
import { OptionStrategyBuilder, STRATEGY_PRESETS } from '../algos/OptionStrategyBuilder';
import { Play, Clock, Calendar, ShieldAlert, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { useTradingStore } from '../../store/useTradingStore';

interface BacktestFormProps {
  onRunBacktest: (params: BacktestParams) => void;
  isLoading: boolean;
}

export const BacktestForm: React.FC<BacktestFormProps> = ({ onRunBacktest, isLoading }) => {
  const algos = useTradingStore((s) => s.algos);

  const [strategyId, setStrategyId] = useState<string>(algos[0]?.id || 'algo-1');
  const [strategyType, setStrategyType] = useState<OptionStrategyType>('Short Straddle');
  const [underlying, setUnderlying] = useState<UnderlyingSymbol>('NIFTY');

  // Execution Mode & Timing (AlgoTest Features)
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('Intraday');
  const [entryTime, setEntryTime] = useState<string>('09:20');
  const [exitTime, setExitTime] = useState<string>('15:15');
  const [positionalExitMode, setPositionalExitMode] = useState<'Hold Till Expiry' | 'DTE Exit'>('Hold Till Expiry');
  const [positionalExitDTE, setPositionalExitDTE] = useState<number>(0);

  // Trading Days Filter & DTE Range
  const [enabledDays, setEnabledDays] = useState<('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[]>([
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri'
  ]);
  const [minDTE, setMinDTE] = useState<number>(0);
  const [maxDTE, setMaxDTE] = useState<number>(7);

  // Strategy Legs
  const [legs, setLegs] = useState<OptionLeg[]>([
    { id: 'leg-1', action: 'SELL', optionType: 'CE', strikeSelection: 'ATM', lots: 1 },
    { id: 'leg-2', action: 'SELL', optionType: 'PE', strikeSelection: 'ATM', lots: 1 },
  ]);

  // Overall Risk Controls
  const [overallSLType, setOverallSLType] = useState<'Amount' | 'Percentage' | 'None'>('Amount');
  const [overallSLValue, setOverallSLValue] = useState<number>(5000);
  const [overallTargetType, setOverallTargetType] = useState<'Amount' | 'Percentage' | 'None'>('Amount');
  const [overallTargetValue, setOverallTargetValue] = useState<number>(10000);
  const [squareOffType, setSquareOffType] = useState<'Partial Square-Off' | 'Complete Square-Off'>('Complete Square-Off');

  // Dates & Capital
  const [startDate, setStartDate] = useState<string>('2026-06-01');
  const [endDate, setEndDate] = useState<string>('2026-09-20');
  const [startingCapital, setStartingCapital] = useState<number>(500000);
  const [positionSizeLots, setPositionSizeLots] = useState<number>(2);
  const [brokeragePerLot, setBrokeragePerLot] = useState<number>(20);
  const [slippagePercent, setSlippagePercent] = useState<number>(0.1);

  const [showAdvanced, setShowAdvanced] = useState<boolean>(true);

  const toggleDay = (day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri') => {
    if (enabledDays.includes(day)) {
      if (enabledDays.length > 1) setEnabledDays(enabledDays.filter(d => d !== day));
    } else {
      setEnabledDays([...enabledDays, day]);
    }
  };

  const handleSelectStrategy = (algoId: string) => {
    setStrategyId(algoId);
    const selected = algos.find(a => a.id === algoId);
    if (selected) {
      setUnderlying(selected.underlying);
      if (selected.legs && selected.legs.length > 0) {
        setLegs(selected.legs);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunBacktest({
      strategyId,
      strategyName: `${underlying} ${strategyType} (${executionMode})`,
      underlying,
      startDate,
      endDate,
      expiryType: 'Nearest',
      startingCapital,
      brokeragePerLot,
      slippagePercent,
      positionSizeLots,
      executionMode,
      timingSettings: {
        entryTime,
        exitTime,
        executionMode,
        positionalExitMode,
        positionalExitDTE,
      },
      daysFilter: {
        enabledDays,
        minDTE,
        maxDTE,
      },
      legs,
      overallRisk: {
        overallSLType,
        overallSLValue,
        overallTargetType,
        overallTargetValue,
        squareOffType,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6">
      {/* Top Bar: Execution Mode & Quick Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#0F4C3A]" /> AlgoTest Strategy Backtest Engine
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Configure Intraday/Positional trades, Entry/Exit times, OTM 1-15 legs, and Days filter
          </p>
        </div>

        {/* Intraday vs Positional Toggle */}
        <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setExecutionMode('Intraday')}
            className={`px-4 py-2 rounded-lg transition-all ${
              executionMode === 'Intraday'
                ? 'bg-[#0F4C3A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚡ Intraday Trade
          </button>
          <button
            type="button"
            onClick={() => setExecutionMode('Positional')}
            className={`px-4 py-2 rounded-lg transition-all ${
              executionMode === 'Positional'
                ? 'bg-[#0F4C3A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📅 Positional Trade
          </button>
        </div>
      </div>

      {/* Basic Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        <div>
          <label className="block uppercase text-slate-500 font-semibold mb-1">Underlying Asset</label>
          <select
            value={underlying}
            onChange={(e) => setUnderlying(e.target.value as UnderlyingSymbol)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-[#0F4C3A]"
          >
            <option value="NIFTY">NIFTY (Lot Size: 25)</option>
            <option value="BANKNIFTY">BANKNIFTY (Lot Size: 15)</option>
            <option value="FINNIFTY">FINNIFTY (Lot Size: 40)</option>
            <option value="MIDCPNIFTY">MIDCPNIFTY (Lot Size: 50)</option>
            <option value="SENSEX">SENSEX (Lot Size: 10)</option>
            <option value="BANKEX">BANKEX (Lot Size: 15)</option>
          </select>
        </div>

        <div>
          <label className="block uppercase text-slate-500 font-semibold mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#0F4C3A]" /> Entry Time
          </label>
          <input
            type="time"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-[#0F4C3A]"
          />
        </div>

        <div>
          <label className="block uppercase text-slate-500 font-semibold mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-red-600" /> Exit Time
          </label>
          <input
            type="time"
            value={exitTime}
            onChange={(e) => setExitTime(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-[#0F4C3A]"
          />
        </div>

        <div>
          <label className="block uppercase text-slate-500 font-semibold mb-1">Starting Capital (₹)</label>
          <input
            type="number"
            value={startingCapital}
            onChange={(e) => setStartingCapital(parseFloat(e.target.value) || 100000)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-[#0F4C3A]"
          />
        </div>
      </div>

      {/* Positional Specific Controls */}
      {executionMode === 'Positional' && (
        <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#0F4C3A] uppercase">Positional Holding & Expiry Rules</span>
            <span className="text-[11px] text-slate-500">Hold positions across multi-day sessions</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 mb-1">Square-Off Mode</label>
              <select
                value={positionalExitMode}
                onChange={(e) => setPositionalExitMode(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-semibold"
              >
                <option value="Hold Till Expiry">Hold Till Expiry Day</option>
                <option value="DTE Exit">Exit at Specific DTE (Days to Expiry)</option>
              </select>
            </div>
            {positionalExitMode === 'DTE Exit' && (
              <div>
                <label className="block text-slate-600 mb-1">Exit DTE (0 = Expiry Day)</label>
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={positionalExitDTE}
                  onChange={(e) => setPositionalExitDTE(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trading Days & Date Range Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs">
        <div>
          <label className="block uppercase text-slate-600 font-bold mb-2 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#0F4C3A]" /> Active Trading Days
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const).map((day) => {
              const active = enabledDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    active
                      ? 'bg-[#0F4C3A] text-white border-[#0F4C3A]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block uppercase text-slate-500 font-semibold mb-1">Backtest Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900"
            />
          </div>
          <div>
            <label className="block uppercase text-slate-500 font-semibold mb-1">Backtest End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Option Strategy & Legs Configurator (OTM 1 to 15, ITM 1 to 15, CP) */}
      <div className="pt-2">
        <OptionStrategyBuilder
          selectedType={strategyType}
          onSelectType={setStrategyType}
          legs={legs}
          onChangeLegs={setLegs}
        />
      </div>

      {/* Advanced Overall Strategy Risk & Cost Accordion */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-mono text-xs font-bold text-slate-800"
        >
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#0F4C3A]" /> Overall Strategy Risk Management & Friction Costs
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 bg-white space-y-4 font-mono text-xs border-t border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block uppercase text-slate-500 font-semibold mb-1">Overall Strategy SL</label>
                <div className="flex gap-2">
                  <select
                    value={overallSLType}
                    onChange={(e) => setOverallSLType(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-900 font-semibold"
                  >
                    <option value="Amount">Amount (₹)</option>
                    <option value="Percentage">Capital (%)</option>
                    <option value="None">None</option>
                  </select>
                  {overallSLType !== 'None' && (
                    <input
                      type="number"
                      value={overallSLValue}
                      onChange={(e) => setOverallSLValue(parseFloat(e.target.value) || 0)}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-900 font-bold text-center"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block uppercase text-slate-500 font-semibold mb-1">Overall Target Profit</label>
                <div className="flex gap-2">
                  <select
                    value={overallTargetType}
                    onChange={(e) => setOverallTargetType(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-900 font-semibold"
                  >
                    <option value="Amount">Amount (₹)</option>
                    <option value="Percentage">Capital (%)</option>
                    <option value="None">None</option>
                  </select>
                  {overallTargetType !== 'None' && (
                    <input
                      type="number"
                      value={overallTargetValue}
                      onChange={(e) => setOverallTargetValue(parseFloat(e.target.value) || 0)}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-900 font-bold text-center"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block uppercase text-slate-500 font-semibold mb-1">Square-Off Logic</label>
                <select
                  value={squareOffType}
                  onChange={(e) => setSquareOffType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 font-semibold"
                >
                  <option value="Complete Square-Off">Complete Square-Off (Exit All Legs)</option>
                  <option value="Partial Square-Off">Partial Square-Off (Exit Single Leg)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block uppercase text-slate-500 font-semibold mb-1">Position Lots</label>
                <input
                  type="number"
                  min={1}
                  value={positionSizeLots}
                  onChange={(e) => setPositionSizeLots(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block uppercase text-slate-500 font-semibold mb-1">Brokerage per Lot (₹)</label>
                <input
                  type="number"
                  value={brokeragePerLot}
                  onChange={(e) => setBrokeragePerLot(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block uppercase text-slate-500 font-semibold mb-1">Slippage (%)</label>
                <input
                  type="number"
                  step="0.05"
                  value={slippagePercent}
                  onChange={(e) => setSlippagePercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 font-bold"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Run Backtest Submit Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="px-8 py-3 text-xs font-bold bg-[#0F4C3A] hover:bg-[#0A3A2A] text-white rounded-xl shadow-md hover:shadow-lg uppercase tracking-wider flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
        >
          <Play className="w-4 h-4 fill-current text-emerald-400" />
          <span>{isLoading ? 'Simulating Historical Data...' : 'START ALGOTEST BACKTEST'}</span>
        </button>
      </div>
    </form>
  );
};

