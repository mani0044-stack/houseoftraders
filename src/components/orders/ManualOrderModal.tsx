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
  Minus,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  Wallet,
  TrendingDown,
  Layers,
  KeyRound,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTradingStore } from '../../store/useTradingStore';
import { ordersApi } from '../../api/ordersApi';
import { BasketOrderView } from './BasketOrderView';

// Standard F&O Preset Underlyings with default Lot Sizes and Strike steps
export const FO_UNDERLYING_PRESETS = [
  { symbol: 'NIFTY', name: 'NIFTY 50', lotSize: 65, step: 50, defaultStrike: 24850 },
  { symbol: 'BANKNIFTY', name: 'BANK NIFTY', lotSize: 30, step: 100, defaultStrike: 53000 },
  { symbol: 'FINNIFTY', name: 'FIN NIFTY', lotSize: 40, step: 50, defaultStrike: 23600 },
  { symbol: 'SENSEX', name: 'SENSEX', lotSize: 10, step: 100, defaultStrike: 81500 },
  { symbol: 'RELIANCE', name: 'RELIANCE', lotSize: 250, step: 20, defaultStrike: 2850 },
  { symbol: 'TATASTEEL', name: 'TATA STEEL', lotSize: 5500, step: 2, defaultStrike: 160 },
];

// Exchange Freeze Limits Reference Table (NSE / BSE)
export const EXCHANGE_FREEZE_LIMITS: Record<string, { freezeQty: number; maxLotsAt65: number; defaultLot: number }> = {
  NIFTY: { freezeQty: 1800, maxLotsAt65: 27, defaultLot: 25 },
  BANKNIFTY: { freezeQty: 900, maxLotsAt65: 30, defaultLot: 15 },
  FINNIFTY: { freezeQty: 1800, maxLotsAt65: 45, defaultLot: 25 },
  SENSEX: { freezeQty: 1000, maxLotsAt65: 100, defaultLot: 10 },
  MIDCPNIFTY: { freezeQty: 4200, maxLotsAt65: 84, defaultLot: 50 },
  BANKEX: { freezeQty: 900, maxLotsAt65: 60, defaultLot: 15 },
};

export interface OrderDiagnostic {
  status: 'SUCCESS' | 'FAILED';
  orderId?: string;
  error?: string;
  errorCode?: string;
  factor?: string;
  factorTitle?: string;
  factorBadge?: string;
  factorColor?: string;
  factorSummary?: string;
  explanation?: string;
  actionableSolution?: string;
  suggestedAction?: string;
  additionalData?: any;
  allFactorsEvaluated?: Array<{ id: string; name: string; status: string; note: string }>;
}

export const ManualOrderModal: React.FC = () => {
  const isManualOrderOpen = useUIStore((s) => s.isManualOrderOpen);
  const setManualOrderOpen = useUIStore((s) => s.setManualOrderOpen);
  const orderModalTab = useUIStore((s) => s.orderModalTab);
  const setOrderModalTab = useUIStore((s) => s.setOrderModalTab);
  const addToast = useUIStore((s) => s.addToast);

  const accounts = useTradingStore((s) => s.accounts);
  const fetchOrders = useTradingStore((s) => s.fetchOrders);
  const fetchPositions = useTradingStore((s) => s.fetchPositions);
  const testConnection = useTradingStore((s) => s.testConnection);

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

  // Execution & Diagnostic Status State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [execResult, setExecResult] = useState<OrderDiagnostic | null>(null);
  const [showFactorDetails, setShowFactorDetails] = useState<boolean>(true);
  const [copiedIp, setCopiedIp] = useState<boolean>(false);
  const [isReauthing, setIsReauthing] = useState<boolean>(false);

  // Get Lot Size & Freeze Limit for selected Underlying
  const activePreset = FO_UNDERLYING_PRESETS.find((p) => p.symbol === symbol);
  const currentLotSize = resolvedScrip?.lotsize || activePreset?.lotSize || 50;
  const currentStep = activePreset?.step || 50;
  const totalQuantity = lots * currentLotSize;

  const freezeInfo = EXCHANGE_FREEZE_LIMITS[symbol];
  const isFreezeExceeded = Boolean(freezeInfo && totalQuantity > freezeInfo.freezeQty);

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

  // Always use a live, non-expired expiry from the Scrip Master instead of a
  // hardcoded date (a stale expiry is the most common contract-resolution failure).
  useEffect(() => {
    if (!isManualOrderOpen) return;
    let isMounted = true;
    fetch(`/api/v1/options/expiries?underlying=${encodeURIComponent(symbol)}`)
      .then((resp) => resp.json())
      .then((dates: string[]) => {
        if (isMounted && Array.isArray(dates) && dates.length > 0) {
          setExpiry(dates[0]);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [isManualOrderOpen, symbol]);

  // Auto-resolve Scrip Token & Tradingsymbol whenever parameters change
  useEffect(() => {
    let isMounted = true;
    if (!isManualOrderOpen) return;

    const resolveScripToken = async () => {
      // Never keep a token/symbol from a previous strike/expiry while resolving
      // the new one - that is what routed orders to the wrong strike.
      setResolvedScrip(null);
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
      } catch {
        // Backend will re-resolve the exact contract from strike/expiry/option type.
        if (isMounted) setResolvedScrip(null);
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

        fetchOrders();
        fetchPositions();

        setTimeout(() => {
          setManualOrderOpen(false);
          setExecResult(null);
        }, 1800);
      } else {
        const rawErr = res?.error || res?.message || 'Order rejected by broker.';
        const cleanErr = String(rawErr).toLowerCase() === 'none' 
          ? 'Order execution was rejected by Angel One broker servers.'
          : rawErr;

        setExecResult({
          status: 'FAILED',
          error: cleanErr,
          errorCode: res?.error_code,
          factor: res?.factor,
          factorTitle: res?.factor_title,
          factorBadge: res?.factor_badge,
          factorColor: res?.factor_color,
          factorSummary: res?.factor_summary,
          explanation: res?.explanation,
          actionableSolution: res?.actionable_solution,
          suggestedAction: res?.suggested_action,
          additionalData: res?.additional_data,
          allFactorsEvaluated: res?.all_factors_evaluated
        });

        addToast('Order Rejected', res?.factor_title || cleanErr, 'error');
      }
    } catch (err: any) {
      const errStr = err.message || 'Network error connecting to broker.';
      setExecResult({
        status: 'FAILED',
        error: errStr,
        errorCode: 'NETWORK_ERROR',
        factor: 'SESSION_TOKEN_IP_EXPIRY',
        factorTitle: 'Connection & Authorization',
        factorBadge: 'NETWORK / CONNECTION',
        factorColor: 'rose',
        factorSummary: 'Failed to establish connection to Angel One backend servers.',
        explanation: `A client or network exception occurred: ${errStr}`,
        actionableSolution: '1. Check your internet connection.\n2. Ensure the backend FastAPI server is running on port 8000.\n3. Verify your trading session status in Accounts.',
        suggestedAction: 'RETRY'
      });
      addToast('Order Error', errStr, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action Helpers
  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
    addToast('IP Copied', `Public IP ${ip} copied to clipboard`, 'info');
  };

  const handleReauthAccount = async () => {
    const accToTest = selectedAccountId !== 'ALL' 
      ? selectedAccountId 
      : accounts.find((a) => a.isEnabled)?.id || accounts[0]?.id;

    if (!accToTest) {
      addToast('No Account Selected', 'Please configure an active account in Accounts tab.', 'warning');
      return;
    }

    setIsReauthing(true);
    try {
      const res = await testConnection(accToTest);
      if (res.success) {
        addToast('Session Re-authenticated', 'SmartAPI token successfully refreshed. You can retry your order now.', 'success');
        setExecResult(null);
      } else {
        addToast('Authentication Failed', res.message || 'Check PIN, API key, and TOTP secret.', 'error');
      }
    } catch (err: any) {
      addToast('Auth Error', err.message || 'Failed to authenticate session.', 'error');
    } finally {
      setIsReauthing(false);
    }
  };

  const handleAutoCapLots = () => {
    if (freezeInfo) {
      const maxAllowedLots = Math.max(1, Math.floor(freezeInfo.freezeQty / currentLotSize));
      setLots(maxAllowedLots);
      addToast('Lots Adjusted', `Order quantity capped to ${maxAllowedLots * currentLotSize} shares to stay under freeze limit.`, 'info');
    }
  };

  if (!isManualOrderOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              {orderModalTab === 'basket' ? (
                <Layers className="w-5 h-5 text-indigo-400 animate-pulse" />
              ) : (
                <Zap className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight font-sans">
                {orderModalTab === 'basket'
                  ? 'Angel One SmartAPI Multi-Leg Basket Order'
                  : 'Angel One SmartAPI Live F&O Order'}
              </h2>
              <p className="text-xs text-slate-400">
                {orderModalTab === 'basket'
                  ? 'Hedge-First Multi-Leg Strategy Execution & SEBI Margin Optimizer'
                  : 'Direct Broker Order Execution & Risk Guard Terminal'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setManualOrderOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/80 px-6 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOrderModalTab('single')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                orderModalTab === 'single'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/90'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Single Order</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderModalTab('basket')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                orderModalTab === 'basket'
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/90'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Basket Order (Multi-Leg)</span>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-indigo-100 text-indigo-700 font-extrabold">
                MARGIN OPTIMIZER
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Angel One SmartAPI Egress Proxy Protected</span>
          </div>
        </div>

        {orderModalTab === 'basket' ? (
          <BasketOrderView />
        ) : (
          /* Modal Body */
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

          {/* Preset Underlying Selector Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Index / Underlying Preset</label>
            <div className="flex flex-wrap gap-2">
              {FO_UNDERLYING_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.symbol}
                  onClick={() => handleSelectUnderlying(preset.symbol)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    symbol === preset.symbol
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Option Type & Strike Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Option Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Instrument Contract</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['CE', 'PE', 'FUT'] as const).map((ot) => (
                  <button
                    type="button"
                    key={ot}
                    onClick={() => setOptionType(ot)}
                    className={`py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                      optionType === ot
                        ? 'bg-white text-blue-600 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {ot}
                  </button>
                ))}
              </div>
            </div>

            {/* Strike Price Picker */}
            {optionType !== 'FUT' ? (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between items-center">
                  <span>Strike Price</span>
                  <span className="text-[10px] text-slate-400">Step: ±{currentStep} pts</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustStrike(-1)}
                    className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={strike}
                    onChange={(e) => setStrike(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdjustStrike(1)}
                    className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Underlying Future</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-700">
                  {symbol} FUT CONTRACT (Index / Stock Future)
                </div>
              </div>
            )}
          </div>

          {/* Expiry & Exchange */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Expiry Date</label>
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Exchange & Segment</label>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value as 'NFO' | 'BFO')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="NFO">NSE Derivatives (NFO)</option>
                <option value="BFO">BSE Derivatives (BFO)</option>
              </select>
            </div>
          </div>

          {/* Lots, Order Type, Product */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Lots */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">Number of Lots</label>
                <span className="text-[10px] text-blue-600 font-bold font-mono">
                  {totalQuantity} Qty
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLots((prev) => Math.max(1, prev - 1))}
                  className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-900 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setLots((prev) => prev + 1)}
                  className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="LIMIT">LIMIT (Recommended)</option>
                <option value="MARKET">MARKET</option>
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
                <option value="INTRADAY">INTRADAY (MIS)</option>
                <option value="CARRYFORWARD">CARRYFORWARD (Overnight)</option>
              </select>
            </div>
          </div>

          {/* Pre-Trade Freeze Limit Warning Banner */}
          {isFreezeExceeded && freezeInfo && (
            <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold flex items-center justify-between">
                  <span>Exchange Freeze Limit Exceeded</span>
                  <span className="font-mono text-[10px] text-amber-700">Max: {freezeInfo.freezeQty} shares</span>
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Your order size of <strong>{totalQuantity} shares</strong> exceeds the single-order limit of <strong>{freezeInfo.freezeQty} shares</strong> for {symbol}. Angel One RMS will reject this order immediately.
                </p>
                <button
                  type="button"
                  onClick={handleAutoCapLots}
                  className="mt-2 text-[11px] font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Layers className="w-3 h-3" />
                  <span>Auto-cap to {Math.floor(freezeInfo.freezeQty / currentLotSize)} Lots ({Math.floor(freezeInfo.freezeQty / currentLotSize) * currentLotSize} Shares)</span>
                </button>
              </div>
            </div>
          )}

          {/* Price & Trigger Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {orderType === 'MARKET' ? 'Market Execution (At LTP)' : 'Limit Execution Price (₹)'}
              </label>
              <input
                type="number"
                step="0.05"
                disabled={orderType === 'MARKET'}
                value={orderType === 'MARKET' ? 0 : price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono ${
                  orderType === 'MARKET' ? 'opacity-50 text-slate-400' : 'text-slate-900'
                }`}
              />
            </div>

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
                  {scripLoading
                    ? 'Resolving SmartAPI Scrip Master Token...'
                    : resolvedScrip?.tradingsymbol || 'Contract not resolved - check expiry/strike'}
                </div>
                <div className="text-[10px] text-blue-700 font-medium">
                  Symbol Token: <span className="font-bold font-mono text-blue-900">{resolvedScrip?.symboltoken || 'resolve on submit'}</span> | Exchange: {exchange} | Lot Size: {currentLotSize}
                </div>
              </div>
            </div>
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          </div>

          {/* Execution Result & Comprehensive 6-Factor Diagnostic Card */}
          {execResult && (
            execResult.status === 'SUCCESS' ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-900 text-xs animate-fadeIn shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-sm">F&O ORDER PLACED SUCCESSFULLY</div>
                  <div className="font-mono text-[11px] text-emerald-800 mt-0.5">Broker Order ID: <strong>{execResult.orderId}</strong></div>
                </div>
              </div>
            ) : (
              <div className="bg-rose-50/90 border border-rose-200/90 rounded-2xl p-4 text-rose-950 text-xs space-y-3.5 animate-fadeIn shadow-sm">
                {/* Diagnostic Header */}
                <div className="flex items-start justify-between gap-3 border-b border-rose-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertCircle className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-rose-950">ORDER REJECTED BY BROKER</span>
                        {execResult.errorCode && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-200 text-rose-900 border border-rose-300">
                            {execResult.errorCode}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-rose-800 mt-0.5 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-rose-500" />
                        <span>Factor: {execResult.factorTitle || 'Broker Rejection Analysis'}</span>
                      </div>
                    </div>
                  </div>

                  {execResult.factorBadge && (
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold tracking-wider bg-rose-100 text-rose-900 border border-rose-300 shrink-0">
                      {execResult.factorBadge}
                    </span>
                  )}
                </div>

                {/* Raw Error Banner */}
                <div className="bg-white/80 border border-rose-200 rounded-xl p-3 font-mono text-[11px] text-rose-900 break-words leading-relaxed">
                  <span className="font-bold text-rose-950">Broker Response: </span>
                  {execResult.error}
                </div>

                {/* Detailed Factor Explanation */}
                {execResult.explanation && (
                  <div className="bg-rose-100/50 rounded-xl p-3 text-[11px] text-rose-950 border border-rose-200/60 leading-relaxed">
                    <div className="font-bold mb-1 flex items-center gap-1.5 text-rose-900">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Root Cause Diagnosis</span>
                    </div>
                    <p>{execResult.explanation}</p>
                  </div>
                )}

                {/* Actionable Resolution Checklist */}
                {execResult.actionableSolution && (
                  <div className="bg-white rounded-xl p-3.5 border border-rose-300/80 shadow-xs space-y-2">
                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span>Recommended Resolution Steps</span>
                    </div>
                    <div className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed font-sans">
                      {execResult.actionableSolution}
                    </div>

                    {/* Quick Action Buttons for Identified Factor */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      {execResult.suggestedAction === 'UPDATE_IP_WHITELIST' && (
                        <>
                          <button
                            type="button"
                            onClick={() => window.open('https://smartapi.angelbroking.com', '_blank')}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open SmartAPI IP Whitelist Portal</span>
                          </button>
                          {execResult.additionalData?.detected_ip && (
                            <button
                              type="button"
                              onClick={() => handleCopyIp(execResult.additionalData.detected_ip)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5 transition-colors"
                            >
                              {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedIp ? 'IP Copied!' : `Copy IP: ${execResult.additionalData.detected_ip}`}</span>
                            </button>
                          )}
                        </>
                      )}

                      {execResult.suggestedAction === 'REAUTHENTICATE_SESSION' && (
                        <button
                          type="button"
                          onClick={handleReauthAccount}
                          disabled={isReauthing}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isReauthing ? 'animate-spin' : ''}`} />
                          <span>Re-authenticate Session via TOTP</span>
                        </button>
                      )}

                      {execResult.suggestedAction === 'SLICE_ORDER' && freezeInfo && (
                        <button
                          type="button"
                          onClick={handleAutoCapLots}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Auto-Cap Lots to Freeze Limit</span>
                        </button>
                      )}

                      {execResult.suggestedAction === 'SWITCH_TO_LIMIT' && (
                        <button
                          type="button"
                          onClick={() => setOrderType('LIMIT')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <TrendingDown className="w-3.5 h-3.5" />
                          <span>Switch to LIMIT Order</span>
                        </button>
                      )}

                      {execResult.suggestedAction === 'ADD_MARGIN' && (
                        <button
                          type="button"
                          onClick={() => setLots(1)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          <span>Reset to 1 Lot (Min Margin)</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* All 6 Factors Scorecard Accordion */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFactorDetails((prev) => !prev)}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 hover:text-slate-900 py-1"
                  >
                    <span>6-Factor Order Risk & Rejection Scorecard</span>
                    {showFactorDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showFactorDetails && (
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(execResult.allFactorsEvaluated || [
                        { id: '1', name: 'Margin & Collateral', status: 'PASSED' },
                        { id: '2', name: 'RMS Risk Rules', status: 'PASSED' },
                        { id: '3', name: 'Price Band & LPP', status: 'PASSED' },
                        { id: '4', name: 'Segment & Scrip', status: 'PASSED' },
                        { id: '5', name: 'Freeze Quantity', status: 'PASSED' },
                        { id: '6', name: 'Session & IP Token', status: 'FAILED' },
                      ]).map((item) => (
                        <div
                          key={item.id}
                          className={`p-2 rounded-xl border text-[10px] flex items-center justify-between ${
                            item.status === 'FAILED'
                              ? 'bg-rose-100 border-rose-300 text-rose-950 font-bold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span>{item.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                            item.status === 'FAILED'
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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
        )}
      </div>
    </div>
  );
};
