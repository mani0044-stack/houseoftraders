import React from 'react';
import { OptionStrategyType, OptionLeg, StrikeSelection } from '../../types/algo';
import { Plus, Trash2, Shield, TrendingUp, TrendingDown, Activity, Info, CheckCircle2 } from 'lucide-react';

interface OptionStrategyBuilderProps {
  selectedType: OptionStrategyType;
  onSelectType: (type: OptionStrategyType) => void;
  legs: OptionLeg[];
  onChangeLegs: (legs: OptionLeg[]) => void;
}

export interface StrategyPresetInfo {
  type: OptionStrategyType;
  label: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral' | 'Volatile';
  description: string;
  payoffType: 'Defined Risk (Debit)' | 'High Win-Rate (Credit)' | 'Volatility Spike' | 'Rangebound Income';
  defaultLegs: Omit<OptionLeg, 'id'>[];
}

export const STRATEGY_PRESETS: StrategyPresetInfo[] = [
  {
    type: 'Bull Call Spread',
    label: 'Bull Call Spread',
    bias: 'Bullish',
    description: 'Buy lower strike Call & sell higher strike Call. Caps upside cost and max downside risk.',
    payoffType: 'Defined Risk (Debit)',
    defaultLegs: [
      { action: 'BUY', optionType: 'CE', strikeSelection: 'ATM', lots: 1 },
      { action: 'SELL', optionType: 'CE', strikeSelection: 'OTM 1', lots: 1 },
    ],
  },
  {
    type: 'Bull Put Spread',
    label: 'Bull Put Spread',
    bias: 'Bullish',
    description: 'Sell higher strike Put & buy lower strike Put for protection. Collect net credit income.',
    payoffType: 'High Win-Rate (Credit)',
    defaultLegs: [
      { action: 'SELL', optionType: 'PE', strikeSelection: 'ATM', lots: 1 },
      { action: 'BUY', optionType: 'PE', strikeSelection: 'OTM 1', lots: 1 },
    ],
  },
  {
    type: 'Bear Put Spread',
    label: 'Bear Put Spread',
    bias: 'Bearish',
    description: 'Buy higher strike Put & sell lower strike Put. Profit from market downturns with low premium cost.',
    payoffType: 'Defined Risk (Debit)',
    defaultLegs: [
      { action: 'BUY', optionType: 'PE', strikeSelection: 'ATM', lots: 1 },
      { action: 'SELL', optionType: 'PE', strikeSelection: 'OTM 1', lots: 1 },
    ],
  },
  {
    type: 'Bear Call Spread',
    label: 'Bear Call Spread',
    bias: 'Bearish',
    description: 'Sell lower strike Call & buy higher strike Call. Profit when market stays flat or moves down.',
    payoffType: 'High Win-Rate (Credit)',
    defaultLegs: [
      { action: 'SELL', optionType: 'CE', strikeSelection: 'ATM', lots: 1 },
      { action: 'BUY', optionType: 'CE', strikeSelection: 'OTM 1', lots: 1 },
    ],
  },
  {
    type: 'Long Straddle',
    label: 'Long Straddle',
    bias: 'Volatile',
    description: 'Buy ATM Call & ATM Put simultaneously. Profit from massive price breakout in either direction.',
    payoffType: 'Volatility Spike',
    defaultLegs: [
      { action: 'BUY', optionType: 'CE', strikeSelection: 'ATM', lots: 1 },
      { action: 'BUY', optionType: 'PE', strikeSelection: 'ATM', lots: 1 },
    ],
  },
  {
    type: 'Short Straddle',
    label: 'Short Straddle',
    bias: 'Neutral',
    description: 'Sell ATM Call & ATM Put. Maximum decay income when market stays completely rangebound.',
    payoffType: 'Rangebound Income',
    defaultLegs: [
      { action: 'SELL', optionType: 'CE', strikeSelection: 'ATM', lots: 1 },
      { action: 'SELL', optionType: 'PE', strikeSelection: 'ATM', lots: 1 },
    ],
  },
  {
    type: 'Long Strangle',
    label: 'Long Strangle',
    bias: 'Volatile',
    description: 'Buy OTM Call & OTM Put. Cheaper entry cost to capitalize on big earnings or event moves.',
    payoffType: 'Volatility Spike',
    defaultLegs: [
      { action: 'BUY', optionType: 'CE', strikeSelection: 'OTM 1', lots: 1 },
      { action: 'BUY', optionType: 'PE', strikeSelection: 'OTM 1', lots: 1 },
    ],
  },
  {
    type: 'Short Strangle',
    label: 'Short Strangle',
    bias: 'Neutral',
    description: 'Sell OTM Call & OTM Put. High probability theta decay strategy for wide market range.',
    payoffType: 'Rangebound Income',
    defaultLegs: [
      { action: 'SELL', optionType: 'CE', strikeSelection: 'OTM 1', lots: 1 },
      { action: 'SELL', optionType: 'PE', strikeSelection: 'OTM 1', lots: 1 },
    ],
  },
  {
    type: 'Iron Condor',
    label: 'Iron Condor',
    bias: 'Neutral',
    description: '4-leg spread: Sell OTM Put/Call + Buy outer wing Put/Call. Risk-capped rangebound strategy.',
    payoffType: 'Rangebound Income',
    defaultLegs: [
      { action: 'BUY', optionType: 'PE', strikeSelection: 'OTM 2', lots: 1 },
      { action: 'SELL', optionType: 'PE', strikeSelection: 'OTM 1', lots: 1 },
      { action: 'SELL', optionType: 'CE', strikeSelection: 'OTM 1', lots: 1 },
      { action: 'BUY', optionType: 'CE', strikeSelection: 'OTM 2', lots: 1 },
    ],
  },
  {
    type: 'Iron Butterfly',
    label: 'Iron Butterfly',
    bias: 'Neutral',
    description: '4-leg spread: Sell ATM Put/Call + Buy outer wing Put/Call. Maximum reward on tight pin.',
    payoffType: 'Rangebound Income',
    defaultLegs: [
      { action: 'BUY', optionType: 'PE', strikeSelection: 'OTM 1', lots: 1 },
      { action: 'SELL', optionType: 'PE', strikeSelection: 'ATM', lots: 1 },
      { action: 'SELL', optionType: 'CE', strikeSelection: 'ATM', lots: 1 },
      { action: 'BUY', optionType: 'CE', strikeSelection: 'OTM 1', lots: 1 },
    ],
  },
  {
    type: 'Custom Multi-Leg',
    label: 'Custom Multi-Leg Strategy',
    bias: 'Neutral',
    description: 'Build your own custom multi-leg options strategy from scratch.',
    payoffType: 'Defined Risk (Debit)',
    defaultLegs: [
      { action: 'BUY', optionType: 'CE', strikeSelection: 'ATM', lots: 1 },
    ],
  }
];

export const OptionStrategyBuilder: React.FC<OptionStrategyBuilderProps> = ({
  selectedType,
  onSelectType,
  legs,
  onChangeLegs,
}) => {
  const currentPreset = STRATEGY_PRESETS.find((p) => p.type === selectedType) || STRATEGY_PRESETS[0];

  const handleSelectPreset = (preset: StrategyPresetInfo) => {
    onSelectType(preset.type);
    const generatedLegs: OptionLeg[] = preset.defaultLegs.map((leg, index) => ({
      ...leg,
      id: `leg-${Date.now()}-${index}`,
    }));
    onChangeLegs(generatedLegs);
  };

  const handleAddLeg = () => {
    const newLeg: OptionLeg = {
      id: `leg-${Date.now()}`,
      action: 'BUY',
      optionType: 'CE',
      strikeSelection: 'ATM',
      lots: 1,
    };
    onChangeLegs([...legs, newLeg]);
  };

  const handleRemoveLeg = (id: string) => {
    if (legs.length <= 1) return;
    onChangeLegs(legs.filter((l) => l.id !== id));
  };

  const handleUpdateLeg = (id: string, updated: Partial<OptionLeg>) => {
    onChangeLegs(legs.map((l) => (l.id === id ? { ...l, ...updated } : l)));
  };

  const getBiasIcon = (bias: StrategyPresetInfo['bias']) => {
    switch (bias) {
      case 'Bullish':
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />;
      case 'Bearish':
        return <TrendingDown className="w-3.5 h-3.5 text-red-600" />;
      case 'Volatile':
        return <Activity className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Strategy Preset Selector Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs uppercase font-mono font-bold text-slate-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#0F4C3A]" /> Select Option Strategy Template
          </label>
          <span className="text-[11px] font-mono text-slate-500">Pick a preset to auto-configure legs</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {STRATEGY_PRESETS.map((preset) => {
            const isSelected = selectedType === preset.type;
            return (
              <button
                key={preset.type}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-50/80 border-[#0F4C3A] ring-2 ring-[#0F4C3A]/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-slate-900 tracking-tight">{preset.label}</span>
                    <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      {getBiasIcon(preset.bias)}
                      {preset.bias}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-slate-600 font-medium">
                  {preset.payoffType}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Strategy Description & Visual Payoff Info */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0F4C3A]" />
            <h4 className="font-bold text-xs text-slate-900 uppercase font-mono">{currentPreset.label} Overview</h4>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-[#0F4C3A]">
            {currentPreset.payoffType}
          </span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed font-sans">{currentPreset.description}</p>

        <div className="pt-2 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-mono text-slate-500">Active Legs Breakdown:</span>
          {legs.map((leg, idx) => (
            <span
              key={leg.id || idx}
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                leg.action === 'BUY'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-red-50 text-red-800 border-red-300'
              }`}
            >
              {leg.action} {leg.lots}x {leg.strikeSelection} {leg.optionType}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Multi-Leg Interactive Configurator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs uppercase font-mono font-bold text-slate-800">Configure Strategy Legs</h4>
          <button
            type="button"
            onClick={handleAddLeg}
            className="px-2.5 py-1 text-xs font-semibold text-[#0F4C3A] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Leg
          </button>
        </div>

        <div className="space-y-2">
          {legs.map((leg, index) => (
            <div
              key={leg.id}
              className="p-3 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold text-[11px] w-5">#{index + 1}</span>

                {/* BUY / SELL Toggle */}
                <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => handleUpdateLeg(leg.id, { action: 'BUY' })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      leg.action === 'BUY'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateLeg(leg.id, { action: 'SELL' })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      leg.action === 'SELL'
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    SELL
                  </button>
                </div>

                {/* Call / Put Toggle */}
                <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => handleUpdateLeg(leg.id, { optionType: 'CE' })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      leg.optionType === 'CE'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    CE (Call)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateLeg(leg.id, { optionType: 'PE' })}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      leg.optionType === 'PE'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    PE (Put)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Strike Selector */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 uppercase">Strike Selection</label>
                  <select
                    value={leg.strikeSelection}
                    onChange={(e) => handleUpdateLeg(leg.id, { strikeSelection: e.target.value as StrikeSelection })}
                    className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0F4C3A]"
                  >
                    <option value="ATM">ATM (At The Money)</option>
                    <optgroup label="Out Of The Money (OTM 1 to 15)">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <option key={`otm-${i + 1}`} value={`OTM ${i + 1}`}>
                          OTM {i + 1}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="In The Money (ITM 1 to 15)">
                      {Array.from({ length: 15 }).map((_, i) => (
                        <option key={`itm-${i + 1}`} value={`ITM ${i + 1}`}>
                          ITM {i + 1}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Advanced Strike Types">
                      <option value="Closest Premium">Closest Premium (CP)</option>
                      <option value="ATM %">ATM % Offset</option>
                      <option value="Straddle Width %">Straddle Width %</option>
                    </optgroup>
                  </select>
                </div>

                {leg.strikeSelection === 'Closest Premium' && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5 uppercase">Premium (₹)</label>
                    <input
                      type="number"
                      value={leg.targetPremium || 100}
                      onChange={(e) => handleUpdateLeg(leg.id, { targetPremium: parseFloat(e.target.value) || 50 })}
                      className="w-16 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-center text-xs text-slate-900 font-bold focus:outline-none focus:border-[#0F4C3A]"
                    />
                  </div>
                )}

                {/* Lots Input */}
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5 uppercase">Lots</label>
                  <input
                    type="number"
                    value={leg.lots}
                    onChange={(e) => handleUpdateLeg(leg.id, { lots: Math.max(1, parseInt(e.target.value) || 1) })}
                    min={1}
                    className="w-16 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-center text-xs text-slate-900 font-bold focus:outline-none focus:border-[#0F4C3A]"
                  />
                </div>

                {/* Remove Leg Button */}
                <button
                  type="button"
                  onClick={() => handleRemoveLeg(leg.id)}
                  disabled={legs.length <= 1}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="Remove Leg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Leg Level Risk Management (AlgoTest Leg SL, TP, Re-entry) */}
              <div className="w-full pt-2 mt-1 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">Leg SL:</span>
                  <select
                    value={leg.riskSettings?.slType || 'None'}
                    onChange={(e) =>
                      handleUpdateLeg(leg.id, {
                        riskSettings: {
                          slType: e.target.value as any,
                          slValue: leg.riskSettings?.slValue || 25,
                          tpType: leg.riskSettings?.tpType || 'None',
                          tpValue: leg.riskSettings?.tpValue || 50,
                          reEntryType: leg.riskSettings?.reEntryType || 'None',
                          reEntryCount: leg.riskSettings?.reEntryCount || 0,
                        },
                      })
                    }
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 text-[11px]"
                  >
                    <option value="None">None</option>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Points">Points (pts)</option>
                    <option value="Underlying Points">Spot Points</option>
                    <option value="Underlying Percentage">Spot %</option>
                  </select>
                  {leg.riskSettings?.slType && leg.riskSettings.slType !== 'None' && (
                    <input
                      type="number"
                      value={leg.riskSettings.slValue}
                      onChange={(e) =>
                        handleUpdateLeg(leg.id, {
                          riskSettings: {
                            ...leg.riskSettings!,
                            slValue: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-14 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center font-bold text-slate-900 text-[11px]"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">Leg Target:</span>
                  <select
                    value={leg.riskSettings?.tpType || 'None'}
                    onChange={(e) =>
                      handleUpdateLeg(leg.id, {
                        riskSettings: {
                          slType: leg.riskSettings?.slType || 'None',
                          slValue: leg.riskSettings?.slValue || 25,
                          tpType: e.target.value as any,
                          tpValue: leg.riskSettings?.tpValue || 50,
                          reEntryType: leg.riskSettings?.reEntryType || 'None',
                          reEntryCount: leg.riskSettings?.reEntryCount || 0,
                        },
                      })
                    }
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 text-[11px]"
                  >
                    <option value="None">None</option>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Points">Points (pts)</option>
                    <option value="Underlying Points">Spot Points</option>
                  </select>
                  {leg.riskSettings?.tpType && leg.riskSettings.tpType !== 'None' && (
                    <input
                      type="number"
                      value={leg.riskSettings.tpValue}
                      onChange={(e) =>
                        handleUpdateLeg(leg.id, {
                          riskSettings: {
                            ...leg.riskSettings!,
                            tpValue: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-14 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center font-bold text-slate-900 text-[11px]"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">Re-Entry / Re-Execute:</span>
                  <select
                    value={leg.riskSettings?.reEntryType || 'None'}
                    onChange={(e) =>
                      handleUpdateLeg(leg.id, {
                        riskSettings: {
                          slType: leg.riskSettings?.slType || 'None',
                          slValue: leg.riskSettings?.slValue || 25,
                          tpType: leg.riskSettings?.tpType || 'None',
                          tpValue: leg.riskSettings?.tpValue || 50,
                          reEntryType: e.target.value as any,
                          reEntryCount: leg.riskSettings?.reEntryCount || 1,
                        },
                      })
                    }
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-800 text-[11px]"
                  >
                    <option value="None">No Re-Entry</option>
                    <option value="Re-Entry Immediate">Re-Entry Immediate</option>
                    <option value="Re-Entry ASYM">Re-Entry ASYM</option>
                    <option value="Re-Execute">Re-Execute</option>
                  </select>
                  {leg.riskSettings?.reEntryType && leg.riskSettings.reEntryType !== 'None' && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[10px]">Max:</span>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={leg.riskSettings.reEntryCount || 1}
                        onChange={(e) =>
                          handleUpdateLeg(leg.id, {
                            riskSettings: {
                              ...leg.riskSettings!,
                              reEntryCount: parseInt(e.target.value) || 1,
                            },
                          })
                        }
                        className="w-10 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-bold text-slate-900 text-[11px]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
