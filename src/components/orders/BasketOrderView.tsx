import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useTradingStore } from '../../store/useTradingStore';
import { useUIStore } from '../../store/useUIStore';
import { ordersApi, BasketLegItem, BasketOrderResponse } from '../../api/ordersApi';
import { FO_UNDERLYING_PRESETS } from './ManualOrderModal';

interface StrategyTemplate {
  name: string;
  description: string;
  createLegs: (symbol: string, atmStrike: number, step: number) => BasketLegItem[];
}

const STRATEGY_PRESETS: StrategyTemplate[] = [
  {
    name: 'Bull Call Spread',
    description: 'Buy ATM Call + Sell OTM Call for directional upside with capped risk',
    createLegs: (symbol, atm, step) => [
      {
        symbol,
        strike: atm,
        option_type: 'CE',
        transaction_type: 'BUY',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
      {
        symbol,
        strike: atm + step * 3,
        option_type: 'CE',
        transaction_type: 'SELL',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
    ],
  },
  {
    name: 'Bear Put Spread',
    description: 'Buy ATM Put + Sell OTM Put for directional downside with capped risk',
    createLegs: (symbol, atm, step) => [
      {
        symbol,
        strike: atm,
        option_type: 'PE',
        transaction_type: 'BUY',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
      {
        symbol,
        strike: atm - step * 3,
        option_type: 'PE',
        transaction_type: 'SELL',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
    ],
  },
  {
    name: 'Short Straddle',
    description: 'Sell ATM Call + Sell ATM Put to capture premium theta decay',
    createLegs: (symbol, atm) => [
      {
        symbol,
        strike: atm,
        option_type: 'CE',
        transaction_type: 'SELL',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
      {
        symbol,
        strike: atm,
        option_type: 'PE',
        transaction_type: 'SELL',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
    ],
  },
  {
    name: 'Short Strangle',
    description: 'Sell OTM Call + Sell OTM Put for high probability range-bound decay',
    createLegs: (symbol, atm, step) => [
      {
        symbol,
        strike: atm + step * 4,
        option_type: 'CE',
        transaction_type: 'SELL',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
      {
        symbol,
        strike: atm - step * 4,
        option_type: 'PE',
        transaction_type: 'SELL',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
    ],
  },
  {
    name: 'Iron Condor',
    description: '4-Leg defined risk market-neutral spread (Sell Strangle + Buy Wings)',
    createLegs: (symbol, atm, step) => [
      {
        symbol,
        strike: atm + step * 6,
        option_type: 'CE',
        transaction_type: 'BUY',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
      {
        symbol,
        strike: atm + step * 3,
        option_type: 'CE',
        transaction_type: 'SELL',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
      {
        symbol,
        strike: atm - step * 3,
        option_type: 'PE',
        transaction_type: 'SELL',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
      {
        symbol,
        strike: atm - step * 6,
        option_type: 'PE',
        transaction_type: 'BUY',
        lots: 1,
        order_type: 'MARKET',
        price: 0,
        product_type: 'INTRADAY',
        exchange: 'NFO',
      },
    ],
  },
];

export const BasketOrderView: React.FC = () => {
  const accounts = useTradingStore((s) => s.accounts);
  const fetchOrders = useTradingStore((s) => s.fetchOrders);
  const fetchPositions = useTradingStore((s) => s.fetchPositions);
  const addToast = useUIStore((s) => s.addToast);
  const setManualOrderOpen = useUIStore((s) => s.setManualOrderOpen);

  // Configuration
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [basketName, setBasketName] = useState<string>('Custom Multi-Leg Basket');
  const [symbol, setSymbol] = useState<string>('NIFTY');
  const [expiry, setExpiry] = useState<string>('');
  const [availableExpiries, setAvailableExpiries] = useState<string[]>([]);
  const [hedgeFirst, setHedgeFirst] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Legs State
  const activePreset = FO_UNDERLYING_PRESETS.find((p) => p.symbol === symbol) || FO_UNDERLYING_PRESETS[0];
  const lotSize = activePreset.lotSize;
  const strikeStep = activePreset.step;
  const defaultAtmStrike = activePreset.defaultStrike;

  const [legs, setLegs] = useState<BasketLegItem[]>([
    {
      symbol: 'NIFTY',
      strike: 24850,
      option_type: 'CE',
      transaction_type: 'BUY',
      lots: 1,
      order_type: 'MARKET',
      price: 0,
      product_type: 'INTRADAY',
      exchange: 'NFO',
    },
    {
      symbol: 'NIFTY',
      strike: 25050,
      option_type: 'CE',
      transaction_type: 'SELL',
      lots: 1,
      order_type: 'MARKET',
      price: 0,
      product_type: 'INTRADAY',
      exchange: 'NFO',
    },
  ]);

  // Execution State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [executionResponse, setExecutionResponse] = useState<BasketOrderResponse | null>(null);

  // Fetch live expiries for selected symbol
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/v1/options/expiries?underlying=${encodeURIComponent(symbol)}`)
      .then((res) => res.json())
      .then((dates: string[]) => {
        if (isMounted && Array.isArray(dates) && dates.length > 0) {
          setAvailableExpiries(dates);
          if (!expiry || !dates.includes(expiry)) {
            setExpiry(dates[0]);
          }
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [symbol]);

  // Handle Underlying Change
  const handleSelectUnderlying = (newSymbol: string) => {
    setSymbol(newSymbol);
    const found = FO_UNDERLYING_PRESETS.find((p) => p.symbol === newSymbol) || FO_UNDERLYING_PRESETS[0];
    // Update existing legs' symbol and default strike
    setLegs((prev) =>
      prev.map((leg, idx) => ({
        ...leg,
        symbol: newSymbol,
        strike: found.defaultStrike + (idx % 2 === 0 ? 0 : found.step * 2),
      }))
    );
  };

  // Apply Strategy Template
  const handleApplyTemplate = (tpl: StrategyTemplate) => {
    setSelectedTemplate(tpl.name);
    setBasketName(`${symbol} ${tpl.name}`);
    const newLegs = tpl.createLegs(symbol, defaultAtmStrike, strikeStep);
    setLegs(newLegs);
    addToast('Template Applied', `${tpl.name} configured with ${newLegs.length} legs.`, 'info');
  };

  // Leg Management
  const handleUpdateLeg = (index: number, updates: Partial<BasketLegItem>) => {
    setLegs((prev) => prev.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  };

  const handleAdjustLegStrike = (index: number, direction: number) => {
    setLegs((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const curStrike = Number(l.strike) || defaultAtmStrike;
        return { ...l, strike: Math.max(10, curStrike + direction * strikeStep) };
      })
    );
  };

  const handleAddLeg = () => {
    const lastLeg = legs[legs.length - 1];
    const newLeg: BasketLegItem = {
      symbol,
      strike: lastLeg?.strike ? Number(lastLeg.strike) + strikeStep : defaultAtmStrike,
      option_type: lastLeg?.option_type || 'CE',
      transaction_type: lastLeg?.transaction_type === 'BUY' ? 'SELL' : 'BUY',
      lots: lastLeg?.lots || 1,
      order_type: lastLeg?.order_type || 'MARKET',
      price: 0,
      product_type: 'INTRADAY',
      exchange: 'NFO',
    };
    setLegs((prev) => [...prev, newLeg]);
  };

  const handleDuplicateLeg = (index: number) => {
    const toDup = legs[index];
    if (!toDup) return;
    setLegs((prev) => [
      ...prev.slice(0, index + 1),
      { ...toDup },
      ...prev.slice(index + 1),
    ]);
  };

  const handleDeleteLeg = (index: number) => {
    if (legs.length <= 1) {
      addToast('Cannot Delete', 'A basket must have at least one order leg.', 'warning');
      return;
    }
    setLegs((prev) => prev.filter((_, i) => i !== index));
  };

  // Summary Metrics
  const summary = useMemo(() => {
    let totalLots = 0;
    let buyLegsCount = 0;
    let sellLegsCount = 0;
    let netPremiumEst = 0;

    legs.forEach((leg) => {
      const lLots = Number(leg.lots) || 1;
      totalLots += lLots;
      if (leg.transaction_type === 'BUY') {
        buyLegsCount++;
        if (leg.price) netPremiumEst -= leg.price * lLots * lotSize;
      } else {
        sellLegsCount++;
        if (leg.price) netPremiumEst += leg.price * lLots * lotSize;
      }
    });

    return {
      totalLegs: legs.length,
      totalLots,
      totalQuantity: totalLots * lotSize,
      buyLegsCount,
      sellLegsCount,
      netPremiumEst,
    };
  }, [legs, lotSize]);

  // Submit Basket Order
  const handleExecuteBasket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (legs.length === 0) {
      addToast('Empty Basket', 'Please add at least one leg to the basket.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setExecutionResponse(null);

    const formattedOrders: BasketLegItem[] = legs.map((leg) => ({
      symbol: leg.symbol || symbol,
      expiry: expiry || undefined,
      strike: leg.option_type === 'FUT' ? null : Number(leg.strike),
      option_type: leg.option_type,
      transaction_type: leg.transaction_type,
      order_type: leg.order_type,
      product_type: leg.product_type || 'INTRADAY',
      lots: Number(leg.lots) || 1,
      price: leg.order_type === 'MARKET' ? 0 : Number(leg.price) || 0,
      exchange: leg.exchange || 'NFO',
    }));

    try {
      const response = await ordersApi.placeBasketOrder({
        accountId: selectedAccountId,
        basketName: basketName.trim() || `${symbol} Basket`,
        hedge_first: hedgeFirst,
        orders: formattedOrders,
      });

      setExecutionResponse(response);

      if (response.status === 'SUCCESS') {
        addToast(
          'Basket Executed Successfully',
          `All ${response.successfulOrders} legs filled across ${selectedAccountId === 'ALL' ? 'active accounts' : 'target account'}.`,
          'success'
        );
        fetchOrders();
        fetchPositions();
      } else if (response.status === 'PARTIAL') {
        addToast(
          'Basket Partially Executed',
          `${response.successfulOrders} legs succeeded, ${response.failedOrders} legs failed. Check individual leg responses below.`,
          'warning'
        );
        fetchOrders();
        fetchPositions();
      } else {
        addToast('Basket Execution Failed', `All legs failed execution. Check errors below.`, 'error');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.message || 'Failed to communicate with broker API.';
      addToast('Basket Execution Error', errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleExecuteBasket} className="p-6 overflow-y-auto space-y-5 flex-1">
      {/* Account & Basket Info Header Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Account Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Target Account</span>
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="ALL">ALL ACTIVE ACCOUNTS (Multi-Broker)</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.clientId})
              </option>
            ))}
          </select>
        </div>

        {/* Basket Label */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Basket Identifier / Name</span>
          </label>
          <input
            type="text"
            value={basketName}
            onChange={(e) => setBasketName(e.target.value)}
            placeholder="e.g. NIFTY Iron Condor Weekly"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Strategy Templates Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Pre-Built Strategy Templates</span>
          </label>
          <span className="text-[10px] text-slate-400">One-click multi-leg auto-configuration</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {STRATEGY_PRESETS.map((tpl) => (
            <button
              type="button"
              key={tpl.name}
              onClick={() => handleApplyTemplate(tpl)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                selectedTemplate === tpl.name
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
              }`}
              title={tpl.description}
            >
              <span>{tpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Underlying & Expiry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Underlying Chips */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Underlying Index / Asset</label>
          <div className="flex flex-wrap gap-1.5">
            {FO_UNDERLYING_PRESETS.map((p) => (
              <button
                type="button"
                key={p.symbol}
                onClick={() => handleSelectUnderlying(p.symbol)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  symbol === p.symbol
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Contract Expiry</span>
          </label>
          {availableExpiries.length > 0 ? (
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {availableExpiries.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          )}
        </div>
      </div>

      {/* SEBI Margin Optimizer Banner / Hedge-First Checkbox */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-emerald-950">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <label htmlFor="hedge-first-toggle" className="font-bold cursor-pointer text-emerald-950 flex items-center gap-1.5">
              <span>Hedge-First Execution (Exchange Margin Optimizer)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-900">
                RECOMMENDED
              </span>
            </label>
            <input
              id="hedge-first-toggle"
              type="checkbox"
              checked={hedgeFirst}
              onChange={(e) => setHedgeFirst(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
            Automatically routes all <strong>BUY (Long Hedge)</strong> legs to Angel One SmartAPI before executing{' '}
            <strong>SELL (Short)</strong> legs. This drastically reduces initial intraday margin requirements and prevents
            RMS order rejection.
          </p>
        </div>
      </div>

      {/* Legs List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Basket Strategy Legs ({legs.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Lot Size: {lotSize}</span>
          </div>

          <button
            type="button"
            onClick={handleAddLeg}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Leg</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {legs.map((leg, index) => {
            const isBuy = leg.transaction_type === 'BUY';
            const legQty = (Number(leg.lots) || 1) * lotSize;

            return (
              <div
                key={index}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 hover:border-slate-300 transition-all shadow-2xs"
              >
                {/* Leg Index & Buy/Sell Toggle */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>

                  <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0 w-36">
                    <button
                      type="button"
                      onClick={() => handleUpdateLeg(index, { transaction_type: 'BUY' })}
                      className={`py-1 rounded-lg text-xs font-extrabold transition-all ${
                        isBuy ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateLeg(index, { transaction_type: 'SELL' })}
                      className={`py-1 rounded-lg text-xs font-extrabold transition-all ${
                        !isBuy ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                {/* Contract Instrument: CE / PE / FUT */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0 w-28">
                    {(['CE', 'PE', 'FUT'] as const).map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => handleUpdateLeg(index, { option_type: type })}
                        className={`py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                          leg.option_type === type
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {/* Strike Price Control */}
                  {leg.option_type !== 'FUT' ? (
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustLegStrike(index, -1)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-bold"
                        title={`Decrease by ${strikeStep}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={leg.strike || defaultAtmStrike}
                        onChange={(e) => handleUpdateLeg(index, { strike: Number(e.target.value) })}
                        className="w-20 text-xs font-mono font-extrabold text-slate-800 text-center focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAdjustLegStrike(index, 1)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-bold"
                        title={`Increase by ${strikeStep}`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600">
                      {symbol} FUT
                    </div>
                  )}
                </div>

                {/* Lots & Order Type */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Lots */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Lots:</span>
                    <input
                      type="number"
                      min="1"
                      value={leg.lots || 1}
                      onChange={(e) => handleUpdateLeg(index, { lots: Math.max(1, Number(e.target.value)) })}
                      className="w-10 text-xs font-mono font-extrabold text-slate-800 text-center focus:outline-none"
                    />
                    <span className="text-[10px] font-mono text-blue-600 font-bold">({legQty})</span>
                  </div>

                  {/* Order Type */}
                  <select
                    value={leg.order_type}
                    onChange={(e) => handleUpdateLeg(index, { order_type: e.target.value as any })}
                    className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="MARKET">MKT</option>
                    <option value="LIMIT">LMT</option>
                  </select>

                  {/* Limit Price if LIMIT */}
                  {leg.order_type === 'LIMIT' && (
                    <input
                      type="number"
                      step="0.05"
                      placeholder="₹ Price"
                      value={leg.price || ''}
                      onChange={(e) => handleUpdateLeg(index, { price: Number(e.target.value) })}
                      className="w-18 bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-mono font-extrabold text-slate-800 focus:outline-none"
                    />
                  )}
                </div>

                {/* Action Buttons: Duplicate & Delete */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleDuplicateLeg(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                    title="Duplicate leg"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteLeg(index)}
                    disabled={legs.length <= 1}
                    className={`p-1.5 rounded-lg transition-colors ${
                      legs.length <= 1
                        ? 'opacity-30 cursor-not-allowed text-slate-300'
                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title="Delete leg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Basket Metric Summary Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-slate-800 shadow-md">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Legs</div>
            <div className="text-base font-extrabold font-mono text-white flex items-center gap-1.5">
              <span>{summary.totalLegs} Legs</span>
              <span className="text-xs text-slate-400">
                ({summary.buyLegsCount} Buy / {summary.sellLegsCount} Sell)
              </span>
            </div>
          </div>

          <div className="border-l border-slate-800 pl-6">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Quantity</div>
            <div className="text-base font-extrabold font-mono text-emerald-400">
              {summary.totalQuantity} <span className="text-xs text-slate-400 font-sans">Shares ({summary.totalLots} Lots)</span>
            </div>
          </div>

          <div className="border-l border-slate-800 pl-6 hidden sm:block">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Execution Routing</div>
            <div className="text-xs font-bold text-indigo-300 flex items-center gap-1 mt-0.5">
              <Zap className="w-3.5 h-3.5" />
              <span>{hedgeFirst ? 'BUY First -> Margin Reduced' : 'Sequential Order'}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estimated Premium</div>
          <div className="text-sm font-extrabold font-mono">
            {summary.netPremiumEst === 0 ? (
              <span className="text-slate-300">At Market LTP</span>
            ) : summary.netPremiumEst > 0 ? (
              <span className="text-emerald-400 flex items-center gap-1 justify-end">
                <TrendingUp className="w-4 h-4" />
                <span>+ ₹{Math.abs(summary.netPremiumEst).toLocaleString('en-IN')} (Net Credit)</span>
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1 justify-end">
                <TrendingDown className="w-4 h-4" />
                <span>- ₹{Math.abs(summary.netPremiumEst).toLocaleString('en-IN')} (Net Debit)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Execution Results View */}
      {executionResponse && (
        <div
          className={`p-4 rounded-2xl border text-xs space-y-3 animate-fadeIn ${
            executionResponse.status === 'SUCCESS'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : executionResponse.status === 'PARTIAL'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2.5">
            <div className="flex items-center gap-2">
              {executionResponse.status === 'SUCCESS' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              )}
              <div>
                <span className="font-extrabold text-sm uppercase">
                  Basket Execution {executionResponse.status}
                </span>
                <span className="ml-2 font-mono text-[11px] opacity-80">
                  {executionResponse.successfulOrders}/{executionResponse.totalOrders} Legs Filled
                </span>
              </div>
            </div>

            <span className="font-mono text-[10px] opacity-70">
              {executionResponse.timestamp}
            </span>
          </div>

          {/* Granular per-leg results table */}
          <div className="space-y-1.5">
            {executionResponse.results.map((res, i) => {
              const isLegOk = res.status === 'SUCCESS';
              return (
                <div
                  key={i}
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${
                    isLegOk
                      ? 'bg-white/80 border-emerald-200 text-emerald-950'
                      : 'bg-white/80 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        res.order.transaction_type === 'BUY'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {res.order.transaction_type}
                    </span>
                    <span className="font-bold">
                      {res.order.symbol} {res.order.strike ? `${res.order.strike} ${res.order.option_type}` : 'FUT'}
                    </span>
                    <span className="text-[11px] opacity-75 font-mono">
                      ({res.order.lots} Lot{res.order.lots > 1 ? 's' : ''})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {res.order_id && (
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                        ID: {res.order_id}
                      </span>
                    )}

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        isLegOk ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {res.status}
                    </span>
                  </div>

                  {res.message && !isLegOk && (
                    <div className="w-full text-[10px] text-rose-700 font-mono mt-1 pl-2">
                      Error: {res.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || legs.length === 0}
          className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
            isSubmitting
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 shadow-emerald-600/20 active:scale-[0.99]'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4.5 h-4.5 animate-spin" />
              <span>Executing {legs.length} Basket Legs via SmartAPI...</span>
            </>
          ) : (
            <>
              <Zap className="w-4.5 h-4.5" />
              <span>
                Execute Basket ({legs.length} Legs • {summary.totalQuantity} Shares)
              </span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
