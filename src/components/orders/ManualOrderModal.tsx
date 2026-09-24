import React, { useState, useEffect } from 'react';
import { X, Zap, Search, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTradingStore } from '../../store/useTradingStore';
import { marketApi, InstrumentSearchResult } from '../../api/marketApi';

export const ManualOrderModal: React.FC = () => {
  const isManualOrderOpen = useUIStore((s) => s.isManualOrderOpen);
  const setManualOrderOpen = useUIStore((s) => s.setManualOrderOpen);
  const addToast = useUIStore((s) => s.addToast);
  
  const accounts = useTradingStore((s) => s.accounts);
  const placeOrder = useTradingStore((s) => s.placeOrder);

  const [accountId, setAccountId] = useState<string>('ALL');
  const [symbol, setSymbol] = useState<string>('NIFTY26SEP2424850CE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(50);
  const [lotSize, setLotSize] = useState<number>(50);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [productType, setProductType] = useState<'CARRYFORWARD' | 'INTRADAY' | 'DELIVERY'>('CARRYFORWARD');
  const [price, setPrice] = useState<number>(0.0);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Debounced instrument search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await marketApi.searchInstruments(searchQuery.trim());
        setSearchResults(results);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isManualOrderOpen) return null;

  const handleSelectInstrument = (inst: InstrumentSearchResult) => {
    setSymbol(inst.symbol);
    setSearchQuery(inst.symbol);
    setShowDropdown(false);

    const lot = inst.lotsize || (inst.symbol.includes('BANKNIFTY') ? 15 : inst.symbol.includes('FINNIFTY') ? 40 : inst.symbol.includes('NIFTY') ? 50 : 1);
    setLotSize(lot);
    setQuantity(lot);
  };

  const handleQuantityMultiplier = (multiplier: number) => {
    setQuantity(lotSize * multiplier);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) {
      addToast('Validation Error', 'Please select or enter a valid trading symbol.', 'error');
      return;
    }

    if (quantity <= 0) {
      addToast('Validation Error', 'Quantity must be greater than 0.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await placeOrder({
        accountId,
        symbol: symbol.toUpperCase(),
        side,
        quantity,
        orderType,
        productType,
        price: orderType === 'LIMIT' ? price : 0.0,
        algoId: 'MANUAL-EXEC',
        algoName: 'Direct Manual Execution'
      });

      const brokerId = res.brokerOrderId || res?.orders?.[0]?.brokerOrderId || 'LIVE-BROKER-SENT';
      const countMsg = res.count ? `Across ${res.count} active accounts.` : `Broker Order ID: ${brokerId}`;

      addToast(
        'Angel One Order Transmitted',
        `${side} ${quantity} ${symbol} @ ${orderType}. ${countMsg}`,
        'success'
      );

      setManualOrderOpen(false);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || 'Failed transmitting order to Angel One SmartAPI';
      addToast('Angel One Order Error', errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-scale">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={() => setManualOrderOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">Angel One Order Terminal</h2>
            <p className="text-xs text-slate-500 font-medium">Transmits live market/limit orders via SmartAPI</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Target Account Selector */}
          <div>
            <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Target Account Execution</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-sans font-bold focus:outline-none focus:border-blue-600"
            >
              <option value="ALL"> Broadcast Order to ALL Active Accounts ({accounts.filter(a => a.isEnabled).length})</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.clientId}) - Margin: ₹{acc.availableMargin.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* BUY / SELL Side Toggle Buttons */}
          <div>
            <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Transaction Side</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`py-2.5 px-4 rounded-xl font-bold font-sans text-xs uppercase tracking-wider transition-all border ${
                  side === 'BUY'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.01]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                BUY (LONG)
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`py-2.5 px-4 rounded-xl font-bold font-sans text-xs uppercase tracking-wider transition-all border ${
                  side === 'SELL'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm scale-[1.01]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                SELL (SHORT)
              </button>
            </div>
          </div>

          {/* Instrument Search Autocomplete */}
          <div className="relative">
            <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Symbol Search (SmartAPI)</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery || symbol}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSymbol(e.target.value);
                }}
                onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                placeholder="Search symbol (e.g., NIFTY, BANKNIFTY, RELIANCE, NIFTY26SEP2424850CE)..."
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-900 font-mono-num font-bold uppercase focus:outline-none focus:border-blue-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              {isSearching && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin absolute right-3 top-3" />}
            </div>

            {/* Dropdown search results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                {searchResults.map((inst, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectInstrument(inst)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/60 border-b border-slate-100 last:border-b-0 flex items-center justify-between text-xs font-sans"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{inst.symbol}</span>
                      <span className="text-[10px] text-slate-500 ml-2 font-mono">({inst.exchange})</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 font-mono-num">Lot: {inst.lotsize || 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Order Type & Product Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Order Type</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as 'MARKET' | 'LIMIT')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-sans font-bold focus:outline-none focus:border-blue-600"
              >
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Product Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-sans font-bold focus:outline-none focus:border-blue-600"
              >
                <option value="CARRYFORWARD">CARRYFORWARD (NRML)</option>
                <option value="INTRADAY">INTRADAY (MIS)</option>
                <option value="DELIVERY">DELIVERY (CNC)</option>
              </select>
            </div>
          </div>

          {/* Quantity & Lot Multipliers */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs uppercase text-slate-500 font-bold tracking-wider">Quantity (Units)</label>
              <span className="text-[11px] text-slate-500 font-mono-num font-semibold">Lot Size: {lotSize}</span>
            </div>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              min={1}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
            />
            {/* Quick lot buttons */}
            <div className="flex items-center gap-2 mt-1.5 font-mono-num text-[11px]">
              <span className="text-slate-400 font-sans text-xs">Lots:</span>
              {[1, 2, 5, 10].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleQuantityMultiplier(m)}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 hover:bg-blue-50 hover:border-blue-200 text-slate-700 font-bold"
                >
                  {m}x ({lotSize * m})
                </button>
              ))}
            </div>
          </div>

          {/* Price (If LIMIT order) */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Limit Price (₹)</label>
              <input
                type="number"
                step="0.05"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0.0)}
                placeholder="0.00"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setManualOrderOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 text-xs font-bold font-sans tracking-wider rounded-xl shadow-xs uppercase transition-all flex items-center gap-2 ${
                side === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Transmitting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" /> Transmit {side} Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
