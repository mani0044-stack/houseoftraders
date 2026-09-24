import React, { useState } from 'react';
import { OptionStrategyBuilder, STRATEGY_PRESETS } from '../components/algos/OptionStrategyBuilder';
import { ConditionBuilder } from '../components/algos/ConditionBuilder';
import { UnderlyingSymbol, TradingMode, ExecutionMode, OptionStrategyType, OptionLeg, EntryCondition, Algorithm } from '../types/algo';
import { useTradingStore } from '../store/useTradingStore';
import { useUIStore } from '../store/useUIStore';
import { useNavigate } from 'react-router-dom';
import { Cpu, ShieldCheck, Play, Layers, Clock } from 'lucide-react';

export const CreateAlgoPage: React.FC = () => {
  const accounts = useTradingStore((s) => s.accounts);
  const addAlgorithm = useTradingStore((s) => s.addAlgorithm);
  const addToast = useUIStore((s) => s.addToast);
  const navigate = useNavigate();

  // Mode Selection: 'OptionSpread' (Default) vs 'TechnicalRules'
  const [builderType, setBuilderType] = useState<'OptionSpread' | 'TechnicalRules'>('OptionSpread');

  // Option Strategy Preset & Legs
  const [strategyType, setStrategyType] = useState<OptionStrategyType>('Bull Call Spread');
  const [legs, setLegs] = useState<OptionLeg[]>([
    { id: 'leg-1', action: 'BUY', optionType: 'CE', strikeSelection: 'ATM', lots: 1 },
    { id: 'leg-2', action: 'SELL', optionType: 'CE', strikeSelection: 'OTM 1', lots: 1 },
  ]);

  // Basic Info
  const [name, setName] = useState<string>('NIFTY Bull Call Spread');
  const [description, setDescription] = useState<string>(
    'Bullish option spread strategy: Buy ATM Call & Sell OTM Call to cap risk and lower premium entry cost.'
  );
  const [underlying, setUnderlying] = useState<UnderlyingSymbol>('NIFTY');
  const [mode] = useState<TradingMode>('Paper');

  // Expiry
  const [expiryType, setExpiryType] = useState<'Nearest' | 'Next' | 'Specific'>('Nearest');

  // Technical Conditions (if Technical Rules mode)
  const [entryConditions, setEntryConditions] = useState<EntryCondition[]>([
    { id: '1', indicator1: 'EMA', period1: 9, operator: 'Crosses Above', indicator2: 'EMA', period2: 21, logicalOp: 'AND' },
  ]);

  // Entry & Exit Timing (AlgoTest Features)
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('Intraday');
  const [entryTime, setEntryTime] = useState<string>('09:20');
  const [exitTime, setExitTime] = useState<string>('15:15');
  const [positionalExitMode, setPositionalExitMode] = useState<'Hold Till Expiry' | 'DTE Exit'>('Hold Till Expiry');
  const [positionalExitDTE, setPositionalExitDTE] = useState<number>(0);
  const [enabledDays, setEnabledDays] = useState<('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[]>([
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri'
  ]);

  // Entry Trigger Mode for Spreads
  const [entryTrigger, setEntryTrigger] = useState<'Market Open (9:20 AM)' | 'Momentum Breakout' | 'Immediate Start'>('Market Open (9:20 AM)');

  // Exit Conditions
  const [stopLossPercent, setStopLossPercent] = useState<number>(15);
  const [targetPercent, setTargetPercent] = useState<number>(30);
  const [trailingStopLossPercent, setTrailingStopLossPercent] = useState<number>(5);

  // Position Sizing
  const [sizingType] = useState<'Fixed Lots' | 'Capital Percent' | 'Risk Percent'>('Fixed Lots');
  const [sizingValue] = useState<number>(2);

  // Account Allocation Matrix
  const [accountAllocations, setAccountAllocations] = useState(
    accounts.map((acc) => ({
      accountId: acc.id,
      accountName: acc.name,
      enabled: true,
      lotsMultiplier: 1,
    }))
  );

  // Risk Limits
  const [maxDailyLoss, setMaxDailyLoss] = useState<number>(15000);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(6);
  const [maxOpenPositions, setMaxOpenPositions] = useState<number>(2);

  const toggleDay = (day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri') => {
    if (enabledDays.includes(day)) {
      if (enabledDays.length > 1) setEnabledDays(enabledDays.filter((d) => d !== day));
    } else {
      setEnabledDays([...enabledDays, day]);
    }
  };

  const handleSelectStrategyType = (type: OptionStrategyType) => {
    setStrategyType(type);
    const preset = STRATEGY_PRESETS.find((p) => p.type === type);
    if (preset) {
      setName(`${underlying} ${preset.label}`);
      setDescription(preset.description);
    }
  };

  const handleAccountToggle = (accId: string) => {
    setAccountAllocations(
      accountAllocations.map((a) => (a.accountId === accId ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const handleMultiplierChange = (accId: string, mult: number) => {
    setAccountAllocations(
      accountAllocations.map((a) => (a.accountId === accId ? { ...a, lotsMultiplier: Math.max(1, mult) } : a))
    );
  };

  const handleSaveStrategy = (startMode?: 'Paper' | 'Live') => {
    if (!name) {
      addToast('Validation Error', 'Please enter a strategy name.', 'error');
      return;
    }

    const assignedAccounts = accountAllocations.filter((a) => a.enabled).map((a) => a.accountId);

    const newAlgo: Algorithm = {
      id: `algo-${Date.now()}`,
      name,
      description,
      underlying,
      strategyType: builderType === 'OptionSpread' ? strategyType : 'Custom Technical Strategy',
      status: startMode ? 'Active' : 'Stopped',
      mode: startMode || mode,
      assignedAccounts,
      accountAllocations,
      tradesToday: 0,
      todaysPnL: 0,
      maxDailyLoss,
      currentExposure: 0,
      maxTradesPerDay,
      maxOpenPositions,
      expiryType,
      legs: builderType === 'OptionSpread' ? legs : undefined,
      timingSettings: {
        entryTime,
        exitTime,
        executionMode,
        positionalExitMode,
        positionalExitDTE,
      },
      daysFilter: {
        enabledDays,
      },
      entryConditions: builderType === 'TechnicalRules' ? entryConditions : undefined,
      exitConditions: {
        stopLossPercent,
        targetPercent,
        trailingStopLossPercent,
        timeExit: exitTime,
      },
      positionSizing: {
        type: sizingType,
        value: sizingValue,
      },
      createdAt: new Date().toISOString().split('T')[0],
    };

    addAlgorithm(newAlgo);
    addToast(
      'Strategy Created',
      `Strategy "${name}" saved ${startMode ? `and activated in ${startMode} mode` : ''}.`,
      'success'
    );
    navigate('/algo-manager');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Easy Strategy Builder
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create multi-leg Option Spreads (Bull Call Spread, Put Spread, Iron Condor) or Technical Algos
          </p>
        </div>

        {/* Builder Mode Switcher */}
        <div className="inline-flex rounded-2xl p-1 bg-white border border-slate-200/90 text-xs font-semibold shadow-xs">
          <button
            type="button"
            onClick={() => setBuilderType('OptionSpread')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              builderType === 'OptionSpread'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Option Spread Strategies
          </button>
          <button
            type="button"
            onClick={() => setBuilderType('TechnicalRules')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              builderType === 'TechnicalRules'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4" /> Technical Indicators Rule
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 1. BASIC INFORMATION & UNDERLYING */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-xs uppercase font-sans font-bold text-blue-600 tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-600" /> 1. Strategy Name & Underlying Asset
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Strategy Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. NIFTY Bull Call Spread"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Underlying Asset</label>
              <select
                value={underlying}
                onChange={(e) => {
                  const newSym = e.target.value as UnderlyingSymbol;
                  setUnderlying(newSym);
                  const preset = STRATEGY_PRESETS.find((p) => p.type === strategyType);
                  if (preset) setName(`${newSym} ${preset.label}`);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold font-sans focus:outline-none focus:border-blue-600"
              >
                <option value="NIFTY">NIFTY</option>
                <option value="BANKNIFTY">BANKNIFTY</option>
                <option value="FINNIFTY">FINNIFTY</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Strategy Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600"
            />
          </div>
        </section>

        {/* 2. OPTION STRATEGY BUILDER / TECHNICAL RULES */}
        {builderType === 'OptionSpread' ? (
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
            <OptionStrategyBuilder
              selectedType={strategyType}
              onSelectType={handleSelectStrategyType}
              legs={legs}
              onChangeLegs={setLegs}
            />
          </section>
        ) : (
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs uppercase font-sans font-bold text-blue-600 tracking-wider">
              Technical Indicator Entry Rules
            </h3>
            <ConditionBuilder conditions={entryConditions} onChange={setEntryConditions} />
          </section>
        )}

        {/* 3. ENTRY & EXIT TIMING */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-xs uppercase font-sans font-bold text-blue-600 tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> 3. Entry & Exit Timing (AlgoTest Mode)
            </h3>
            {/* Execution Mode Toggle */}
            <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200 text-xs font-bold font-sans">
              <button
                type="button"
                onClick={() => setExecutionMode('Intraday')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  executionMode === 'Intraday' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Intraday
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode('Positional')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  executionMode === 'Positional' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Positional
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-sans">
            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Entry Time (IST)</label>
              <input
                type="time"
                value={entryTime}
                onChange={(e) => setEntryTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Exit Time (Square Off)</label>
              <input
                type="time"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Expiry Cycle</label>
              <select
                value={expiryType}
                onChange={(e) => setExpiryType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-sans font-bold focus:outline-none focus:border-blue-600"
              >
                <option value="Nearest">Nearest Expiry (Weekly)</option>
                <option value="Next">Next Expiry (Weekly)</option>
                <option value="Specific">Monthly Expiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Entry Trigger</label>
              <select
                value={entryTrigger}
                onChange={(e) => setEntryTrigger(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-sans font-bold focus:outline-none focus:border-blue-600"
              >
                <option value="Market Open (9:20 AM)">Exact Time Match ({entryTime})</option>
                <option value="Momentum Breakout">Spot Price Breakout</option>
                <option value="Immediate Start">Immediate Auto-Execution</option>
              </select>
            </div>
          </div>

          {/* Positional Holding Rules */}
          {executionMode === 'Positional' && (
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2 font-sans text-xs">
              <span className="font-bold text-blue-900 uppercase tracking-wider text-xs">Positional Multi-Day Exit Rules</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-blue-800 text-[11px] mb-1 font-semibold">Positional Square-Off Mode</label>
                  <select
                    value={positionalExitMode}
                    onChange={(e) => setPositionalExitMode(e.target.value as any)}
                    className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold"
                  >
                    <option value="Hold Till Expiry">Hold Till Expiry Day</option>
                    <option value="DTE Exit">Exit at Specific DTE</option>
                  </select>
                </div>
                {positionalExitMode === 'DTE Exit' && (
                  <div>
                    <label className="block text-blue-800 text-[11px] mb-1 font-semibold">Exit DTE (0 = Expiry Day)</label>
                    <input
                      type="number"
                      min={0}
                      max={7}
                      value={positionalExitDTE}
                      onChange={(e) => setPositionalExitDTE(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-blue-200 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold font-mono-num"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Active Trading Days */}
          <div>
            <label className="block text-xs uppercase font-sans text-slate-500 font-bold mb-2 tracking-wider">
              Active Execution Days
            </label>
            <div className="flex flex-wrap items-center gap-2 font-sans">
              {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const).map((day) => {
                const active = enabledDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. EXIT RULES & RISK MANAGEMENT */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-xs uppercase font-sans font-bold text-blue-600 tracking-wider">
            4. Exit Rules & Target / SL Safeguards
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-sans">
            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Stop Loss (% Premium)</label>
              <input
                type="number"
                value={stopLossPercent}
                onChange={(e) => setStopLossPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Target Profit (% Premium)</label>
              <input
                type="number"
                value={targetPercent}
                onChange={(e) => setTargetPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Trailing SL (%)</label>
              <input
                type="number"
                value={trailingStopLossPercent}
                onChange={(e) => setTrailingStopLossPercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Auto Intraday Exit (IST)</label>
              <input
                type="time"
                value={exitTime}
                onChange={(e) => setExitTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </section>

        {/* 5. MULTI-ACCOUNT ASSIGNMENT MATRIX */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-xs uppercase font-sans font-bold text-blue-600 tracking-wider">
            5. Multi-Account Broker Execution Matrix
          </h3>

          <div className="space-y-2.5">
            {accountAllocations.map((acc) => (
              <div key={acc.accountId} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={acc.enabled}
                    onChange={() => handleAccountToggle(acc.accountId)}
                    className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-bold text-slate-900">{acc.accountName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Lots Multiplier:</span>
                  <input
                    type="number"
                    value={acc.lotsMultiplier}
                    onChange={(e) => handleMultiplierChange(acc.accountId, parseInt(e.target.value) || 1)}
                    disabled={!acc.enabled}
                    min={1}
                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center text-slate-900 disabled:opacity-50 font-mono-num font-bold"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. RISK CAPS */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-xs uppercase font-sans font-bold text-blue-600 tracking-wider">6. Daily Strategy Risk Limits</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Max Daily Loss (₹)</label>
              <input
                type="number"
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Max Trades Per Day</label>
              <input
                type="number"
                value={maxTradesPerDay}
                onChange={(e) => setMaxTradesPerDay(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Max Concurrent Spread Trades</label>
              <input
                type="number"
                value={maxOpenPositions}
                onChange={(e) => setMaxOpenPositions(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </section>

        {/* Final Action Controls */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => handleSaveStrategy()}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSaveStrategy('Paper')}
            className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
          >
            <Play className="w-4 h-4 fill-current" /> Start Paper Trading
          </button>
          <button
            type="button"
            onClick={() => handleSaveStrategy('Live')}
            className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl shadow-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
          >
            <ShieldCheck className="w-4 h-4" /> Start Live Execution
          </button>
        </div>
      </div>
    </div>
  );
};
