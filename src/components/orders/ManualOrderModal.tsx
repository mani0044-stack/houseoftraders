import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw, 
  Database,
  Users,
  Plus,
  Minus
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTradingStore } from '../../store/useTradingStore';
import { ordersApi } from '../../api/ordersApi';

// Standard F&O Preset Underlyings with default Lot Sizes and Strike steps
export const FO_UNDERLYING_PRESETS = [
  { symbol: 'NIFTY', name: 'NIFTY 50', lotSize: 65, step: 50, defaultStrike: 24850 },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY', lotSize: 30, step: 100, defaultStrike: 53000 },
  { symbol: 'FINNIFTY', name: 'FIN NIFTY', lotSize: 40, step: 50, defaultStrike: 23600 },
  { symbol: 'SENSEX', name: 'SENSEX', lotSize: 10, step: 100, defaultStrike: 81500 },
  { symbol: 'RELIANCE', name: 'RELIANCE', lotSize: 250, step: 20, defaultStrike: 2850 },
  { symbol: 'TATASTEEL', name: 'TATA STEEL', lotSize: 5500, step: 2, defaultStrike: 160 },
];

export const ManualOrderModal: React.FC = () => {
  const isManualOrderOpen = useUIStore((s) => s.isManualOrderOpen);
  const setManualOrderOpen = useUIStore((s) => s.setManualOrderOpen);
  const addToast = useUIStore((s) => s.addToast);

  const accounts = useTradingStore((s) => s.accounts);
  const fetchOrders = useTradingStore((s) => s.fetchOrders);
  const fetchPositions = useTradingStore((s) => s.fetchPositions);

  // Form State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [symbol, setSymbol] = useState<string>('NIFTY');
  const [expiry, setExpiry] = useState<string>('2026-10-13');
  const [strike, setStrike] = useState<number>(24850);
  const [optionType, setOptionType] = useState<'CE' | 'PE' | 'FUT'>('CE');
  const [exchange, setExchange] = useState<'NFO' | 'BFO'>('NFO');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'STOPLOSS_LIMIT'>('LIMIT');
  const [productType, setProductType] = useState<'INTRADAY' | 'CARRYFORWARD'>('INTRADAY');
  const [lots, setLots] = useState<number>(1);
  const [price, setPrice] = useState<number>(145.50);
  const [triggerPrice, setTriggerPrice] = useState<number>(140.00);

  // Scrip Master Resolution State
  const [scripLoading, setScripLoading] = useState<boolean>(false);
  const [resolvedScrip, setResolvedScrip] = useState<{ symboltoken: string; tradingsymbol: string; lotsize: number } | null>(null);

  // Execution Status State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [execResult, setExecResult] = useState<{ status: 'SUCCESS' | 'FAILED'; orderId?: string; error?: string } | null>(null);

  // Get Lot Size for selected Underlying
  const activePreset = FO_UNDERLYING_PRESETS.find((p) => p.symbol === symbol);
  const currentLotSize = resolvedScrip?.lotsize || activePreset?.lotSize || 50;
  const currentStep = activePreset?.step || 50;
  const totalQuantity = lots * currentLotSize;

  // Handle Underlying preset selection
  const handleSelectUnderlying = (presetSymbol: string) => {
    setSymbol(presetSymbol);
    const found = FO_UNDERLYING_PRESETS.find((p) => p.symbol === presetSymbol);
    if (found) {
      setStrike(found.defaultStrike);
    }
  };

  // Adjust strike price by step
  const handleAdjustStrike = (direction: number) => {
    setStrike((prev) => Math.max(10, prev + direction * currentStep));
  };

  // Auto-resolve Scrip Token & Tradingsymbol whenever parameters change
  useEffect(() => {
    let isMounted = true;
    if (!isManualOrderOpen) return;

    const resolveScripToken = async () => {
      setScripLoading(true);
      try {
        const resp = await fetch('/api/v1/market/lookup_scrip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            expiry,
            strike: optionType === 'FUT' ? null : strike,
            option_type: optionType,
            exchange
          })
        });
        const data = await resp.json();
        if (isMounted && data.status === 'SUCCESS' && data.data) {
          setResolvedScrip(data.data);
        }
      } catch (err) {
        // Fallback representation
        if (isMounted) {
          const formattedTradingSymbol = optionType === 'FUT'
            ? `${symbol}27OCT26FUT`
            : `${symbol}13OCT26${strike}${optionType}`;
          setResolvedScrip({
            symboltoken: '44442',
            tradingsymbol: formattedTradingSymbol,
            lotsize: currentLotSize
          });
        }
      } finally {
        if (isMounted) setScripLoading(false);
      }
    };

    resolveScripToken();
    return () => { isMounted = false; };
  }, [isManualOrderOpen, symbol, expiry, strike, optionType, exchange]);

  // Submit Order Execution
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setExecResult(null);

    const payload = {
      accountId: selectedAccountId,
      symbol,
      expiry,
      strike: optionType === 'FUT' ? null : strike,
      option_type: optionType,
      exchange,
      transaction_type: side,
      order_type: orderType,
      product_type: productType,
      lots,
      price: orderType === 'MARKET' ? 0 : price,
      trigger_price: orderType.includes('STOPLOSS') ? triggerPrice : 0,
      tradingsymbol: resolvedScrip?.tradingsymbol,
      symboltoken: resolvedScrip?.symboltoken
    };

    try {
      const res = await ordersApi.placeFoOrder(payload);

      if (res && res.status === 'SUCCESS') {
        const orderId = res.order_id || res.data?.orderid || 'EXECUTED';
        setExecResult({ status: 'SUCCESS', orderId });
        addToast('F&O Order Executed', `Broker Order ID: ${orderId}`, 'success');

        // Sync orders and positions
        fetchOrders();
        fetchPositions();

        // Auto close modal after 1.8 seconds on success
        setTimeout(() => {
          setManualOrderOpen(false);
          setExecResult(null);
        }, 1800);
      } else {
        const errMsg = res?.error || res?.message || 'Order placement failed on Angel One.';
        setExecResult({ status: 'FAILED', error: errMsg });
        addToast('Order Rejected', errMsg, 'error');
      }
    } catch (err: any) {
      const errStr = err.message || 'Network error connecting to broker.';
      setExecResult({ status: 'FAILED', error: errStr });
      addToast('Order Error', errStr, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isManualOrderOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight font-sans">Angel One SmartAPI Live F&O Order</h2>
              <p className="text-xs text-slate-400">Direct Broker Order Execution Terminal</p>
            </div>
          </div>

          <button
            onClick={() => setManualOrderOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmitOrder} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Account & Side Selector Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Account Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Target Trading Account</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">ALL ACTIVE ACCOUNTS (Multi-Broker Sync)</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.clientId})
                  </option>
                ))}
              </select>
            </div>

            {/* Side Switcher (BUY vs SELL) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Transaction Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all border ${
                    side === 'BUY'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  BUY (LONG)
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`py-2 rounded-xl text-xs font-extrabold transition-all border ${
                    side === 'SELL'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  SELL (SHORT)
                </button>
              </div>
            </div>
          </div>

          {/* Preset Underlyings Bar */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Underlying Instrument</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {FO_UNDERLYING_PRESETS.map((preset) => (
                <button
                  key={preset.symbol}
                  type="button"
                  onClick={() => handleSelectUnderlying(preset.symbol)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    symbol === preset.symbol
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Contract Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Contract Type (CE / PE / FUT) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Contract Type</label>
              <div className="grid grid-cols-3 gap-1">
                {(['CE', 'PE', 'FUT'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOptionType(t)}
                    className={`py-2 rounded-xl text-xs font-extrabold transition-all border ${
                      optionType === t
                        ? t === 'CE' ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-bold' : t === 'PE' ? 'bg-rose-50 border-rose-400 text-rose-700 font-bold' : 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Expiry Date</label>
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            {/* Strike Price (Hidden for Futures) */}
            {optionType !== 'FUT' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Strike Price</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAdjustStrike(-1)}
                    className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-200"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={strike}
                    onChange={(e) => setStrike(Number(e.target.value))}
                    step={currentStep}
                    className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdjustStrike(1)}
                    className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Contract</label>
                <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                  FUTURES (NFO)
                </div>
              </div>
            )}
          </div>

          {/* Exchange, Order & Product Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Exchange */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Exchange</label>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="NFO">NFO (NSE Derivatives)</option>
                <option value="BFO">BFO (BSE Derivatives)</option>
              </select>
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
                <option value="STOPLOSS_LIMIT">STOPLOSS LIMIT</option>
              </select>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Product Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="INTRADAY">INTRADAY (MIS / Day Trade)</option>
                <option value="CARRYFORWARD">CARRYFORWARD (NRML / Positional)</option>
              </select>
            </div>
          </div>

          {/* Quantity Lots & Price Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Lots Counter & Share Calculator */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Lots Counter</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLots((prev) => Math.max(1, prev - 1))}
                  className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-200"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, Number(e.target.value)))}
                  className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setLots((prev) => prev + 1)}
                  className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[10px] text-blue-600 font-semibold mt-1">
                = <span className="font-extrabold">{totalQuantity}</span> Shares ({currentLotSize}/lot)
              </div>
            </div>

            {/* Price (If LIMIT) */}
            {orderType !== 'MARKET' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Limit Price (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Execution Price</label>
                <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-500">
                  MARKET (Price = 0)
                </div>
              </div>
            )}

            {/* Trigger Price (If STOPLOSS) */}
            {orderType.includes('STOPLOSS') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Trigger Price (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  value={triggerPrice}
                  onChange={(e) => setTriggerPrice(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>
            )}
          </div>

          {/* Resolved Scrip Token Badge */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-xs font-extrabold text-blue-950 font-mono">
                  {scripLoading ? 'Resolving SmartAPI Scrip Master Token...' : resolvedScrip?.tradingsymbol || `${symbol}13OCT26${strike}${optionType}`}
                </div>
                <div className="text-[10px] text-blue-700 font-medium">
                  Symbol Token: <span className="font-bold font-mono text-blue-900">{resolvedScrip?.symboltoken || '44442'}</span> | Exchange: {exchange} | Lot Size: {currentLotSize}
                </div>
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          </div>

          {/* Execution Result Banner */}
          {execResult && (
            execResult.status === 'SUCCESS' ? (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold">F&O ORDER PLACED SUCCESSFULLY</div>
                  <div className="font-mono text-[11px]">Broker Order ID: <strong>{execResult.orderId}</strong></div>
                </div>
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center gap-3 text-rose-900 text-xs animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <div className="font-bold">ORDER REJECTED BY BROKER</div>
                  <div className="font-mono text-[11px] text-rose-700">{execResult.error}</div>
                </div>
              </div>
            )
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                side === 'BUY'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-600/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  <span>Submitting to Angel One SmartAPI...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4.5 h-4.5" />
                  <span>Place {side} Order ({totalQuantity} Shares)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
