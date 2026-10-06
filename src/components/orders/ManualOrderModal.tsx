import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Copy, 
  Layers,
  ArrowRight,
  Users
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTradingStore } from '../../store/useTradingStore';
import { marketApi, InstrumentSearchResult } from '../../api/marketApi';

export interface BasketLeg {
  id: string;
  side: 'BUY' | 'SELL';
  symbol: string;
  searchQuery: string;
  searchResults: InstrumentSearchResult[];
  isSearching: boolean;
  showDropdown: boolean;
  orderType: 'MARKET' | 'LIMIT';
  productType: 'CARRYFORWARD' | 'INTRADAY' | 'DELIVERY';
  quantity: number;
  lotSize: number;
  price: number;
}

export const ManualOrderModal: React.FC = () => {
  const isManualOrderOpen = useUIStore((s) => s.isManualOrderOpen);
  const setManualOrderOpen = useUIStore((s) => s.setManualOrderOpen);
  const addToast = useUIStore((s) => s.addToast);
  
  const accounts = useTradingStore((s) => s.accounts);
  const placeOrder = useTradingStore((s) => s.placeOrder);

  // Execution Mode: 'SINGLE' vs 'BASKET' (Angel One Basket Mode)
  const [orderMode, setOrderMode] = useState<'SINGLE' | 'BASKET'>('SINGLE');
  const [accountId, setAccountId] = useState<string>('ALL');

  // Single Order State
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

  // Basket Order State (Angel One Basket Mode)
  const [basketName, setBasketName] = useState<string>('Angel One Multi-Leg Basket');
  const [basketLegs, setBasketLegs] = useState<BasketLeg[]>([
    {
      id: 'leg-1',
      side: 'BUY',
      symbol: 'NIFTY26SEP2424800CE',
      searchQuery: 'NIFTY26SEP2424800CE',
      searchResults: [],
      isSearching: false,
      showDropdown: false,
      orderType: 'MARKET',
      productType: 'CARRYFORWARD',
      quantity: 50,
      lotSize: 50,
      price: 0.0
    },
    {
      id: 'leg-2',
      side: 'SELL',
      symbol: 'NIFTY26SEP2425000CE',
      searchQuery: 'NIFTY26SEP2425000CE',
      searchResults: [],
      isSearching: false,
      showDropdown: false,
      orderType: 'MARKET',
      productType: 'CARRYFORWARD',
      quantity: 50,
      lotSize: 50,
      price: 0.0
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Debounced search for single order
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

  const activeAccountsCount = accounts.filter((a) => a.isEnabled).length || accounts.length || 1;

  // Single instrument select
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

  // Basket Leg Management
  const handleAddBasketLeg = () => {
    const newLeg: BasketLeg = {
      id: `leg-${Date.now()}`,
      side: 'BUY',
      symbol: 'NIFTY26SEP2424850CE',
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      showDropdown: false,
      orderType: 'MARKET',
      productType: 'CARRYFORWARD',
      quantity: 50,
      lotSize: 50,
      price: 0.0
    };
    setBasketLegs([...basketLegs, newLeg]);
  };

  const handleDuplicateLeg = (legToDup: BasketLeg) => {
    const dup: BasketLeg = {
      ...legToDup,
      id: `leg-${Date.now()}`
    };
    setBasketLegs([...basketLegs, dup]);
  };

  const handleRemoveLeg = (id: string) => {
    if (basketLegs.length <= 1) {
      addToast('Basket Notice', 'Basket must contain at least 1 order leg.', 'warning');
      return;
    }
    setBasketLegs(basketLegs.filter((l) => l.id !== id));
  };

  const handleUpdateLeg = (id: string, updates: Partial<BasketLeg>) => {
    setBasketLegs(basketLegs.map((leg) => (leg.id === id ? { ...leg, ...updates } : leg)));
  };

  // Search instrument for specific basket leg
  const handleLegSearch = async (legId: string, query: string) => {
    handleUpdateLeg(legId, { searchQuery: query, symbol: query, isSearching: true });
    if (!query || query.trim().length < 2) {
      handleUpdateLeg(legId, { searchResults: [], showDropdown: false, isSearching: false });
      return;
    }
    try {
      const results = await marketApi.searchInstruments(query.trim());
      handleUpdateLeg(legId, { searchResults: results, showDropdown: true, isSearching: false });
    } catch {
      handleUpdateLeg(legId, { searchResults: [], showDropdown: false, isSearching: false });
    }
  };

  const handleSelectLegInstrument = (legId: string, inst: InstrumentSearchResult) => {
    const lot = inst.lotsize || (inst.symbol.includes('BANKNIFTY') ? 15 : inst.symbol.includes('FINNIFTY') ? 40 : inst.symbol.includes('NIFTY') ? 50 : 1);
    handleUpdateLeg(legId, {
      symbol: inst.symbol,
      searchQuery: inst.symbol,
      showDropdown: false,
      lotSize: lot,
      quantity: lot
    });
  };

  // Single Order Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
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
        algoName: 'Direct Single Execution'
      });

      const brokerId = res.brokerOrderId || res?.orders?.[0]?.brokerOrderId || 'ANGEL-SMARTAPI-OK';
      const countMsg = accountId === 'ALL' ? `Broadcasted to ALL ${activeAccountsCount} Angel One Accounts.` : `Broker Order ID: ${brokerId}`;

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

  // Basket Order Submit (Angel One Multi-Leg Basket Mode)
  const handleBasketSubmit = async () => {
    if (basketLegs.length === 0) {
      addToast('Validation Error', 'Add at least one order leg to your basket.', 'error');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < basketLegs.length; i++) {
        const leg = basketLegs[i];
        try {
          await placeOrder({
            accountId,
            symbol: leg.symbol.toUpperCase(),
            side: leg.side,
            quantity: leg.quantity,
            orderType: leg.orderType,
            productType: leg.productType,
            price: leg.orderType === 'LIMIT' ? leg.price : 0.0,
            algoId: 'BASKET-EXEC',
            algoName: `${basketName} (Leg ${i + 1})`
          });
          successCount++;
        } catch {
          failedCount++;
        }
      }

      const totalTargetOrders = accountId === 'ALL' ? successCount * activeAccountsCount : successCount;

      addToast(
        'Angel One Basket Transmitted!',
        `Successfully placed ${successCount} Basket Legs (${totalTargetOrders} total orders executed across ${accountId === 'ALL' ? activeAccountsCount + ' Angel One accounts' : 'selected account'}).`,
        failedCount > 0 ? 'warning' : 'success'
      );

      setManualOrderOpen(false);
    } catch (err: any) {
      addToast('Basket Execution Error', 'An error occurred while executing the Angel One basket orders.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-scale font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => setManualOrderOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#062c26] text-emerald-400 border border-emerald-800/80 shadow-xs">
              {orderMode === 'BASKET' ? <ShoppingBag className="w-5 h-5" /> : <Zap className="w-5 h-5 fill-current" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Angel One Order Terminal</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold uppercase">
                  SmartAPI Live
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {orderMode === 'BASKET' ? 'Angel One Basket Order Builder & Multi-Account Fan-Out Router' : 'Direct Live Order Placement via Angel One SmartAPI Router'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setOrderMode('SINGLE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                orderMode === 'SINGLE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Order
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('BASKET')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                orderMode === 'BASKET'
                  ? 'bg-[#062c26] text-emerald-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Basket Mode</span>
            </button>
          </div>
        </div>

        {/* Global Target Account Execution Selector */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200/90 rounded-2xl shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Target Execution Accounts:</span>
          </div>

          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 cursor-pointer outline-none focus:border-emerald-600 shadow-2xs min-w-[220px]"
          >
            <option value="ALL"> Broadcast to ALL Active Accounts ({activeAccountsCount} connected)</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.clientId}) - Margin: ₹{acc.availableMargin.toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {/* Scrollable Content Body */}
        <div className="mt-4 overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-4">
          {orderMode === 'SINGLE' ? (
            /* ================= SINGLE ORDER FORM ================= */
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              {/* BUY / SELL Side Toggle Buttons */}
              <div>
                <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Transaction Side</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSide('BUY')}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
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
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
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
                    placeholder="Search symbol (e.g. NIFTY, BANKNIFTY, RELIANCE, NIFTY26SEP2424850CE)..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-900 font-mono-num font-bold uppercase focus:outline-none focus:border-emerald-600"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  {isSearching && <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin absolute right-3 top-3" />}
                </div>

                {/* Dropdown search results */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                    {searchResults.map((inst, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectInstrument(inst)}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/60 border-b border-slate-100 last:border-b-0 flex items-center justify-between text-xs font-sans"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-emerald-600"
                />
                {/* Quick lot buttons */}
                <div className="flex items-center gap-2 mt-1.5 font-mono-num text-[11px]">
                  <span className="text-slate-400 font-sans text-xs">Lots:</span>
                  {[1, 2, 5, 10].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleQuantityMultiplier(m)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 font-bold transition-colors"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              {/* Submit Single Order Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
                  className={`px-6 py-2.5 text-xs font-bold tracking-wider rounded-xl shadow-xs uppercase transition-all flex items-center gap-2 ${
                    side === 'BUY'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Transmitting Order...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" /> Transmit {side} Order ({accountId === 'ALL' ? `${activeAccountsCount} Accounts` : '1 Account'})
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ================= ANGEL ONE BASKET ORDER MODE ================= */
            <div className="space-y-4">
              {/* Basket Name Bar & Header Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-emerald-950 text-white rounded-2xl">
                <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                  <ShoppingBag className="w-5 h-5 text-emerald-400 shrink-0" />
                  <input
                    type="text"
                    value={basketName}
                    onChange={(e) => setBasketName(e.target.value)}
                    placeholder="Basket Name (e.g., Bull Call Spread, Iron Condor)..."
                    className="bg-emerald-900/60 border border-emerald-700/60 rounded-xl px-3 py-1.5 text-xs font-bold text-white placeholder-emerald-300/60 outline-none focus:border-emerald-400 w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-200 bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-800">
                    Legs: {basketLegs.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddBasketLeg}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add Leg</span>
                  </button>
                </div>
              </div>

              {/* Basket Legs List */}
              <div className="space-y-3">
                {basketLegs.map((leg, idx) => (
                  <div key={leg.id} className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3 hover:border-slate-300 transition-all relative">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-mono font-bold text-slate-700">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">Leg #{idx + 1}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicateLeg(leg)}
                          className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Duplicate Leg"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveLeg(leg.id)}
                          className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Delete Leg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Leg Controls Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      {/* BUY / SELL Side */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Side</label>
                        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateLeg(leg.id, { side: 'BUY' })}
                            className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                              leg.side === 'BUY' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'
                            }`}
                          >
                            BUY
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateLeg(leg.id, { side: 'SELL' })}
                            className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                              leg.side === 'SELL' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'
                            }`}
                          >
                            SELL
                          </button>
                        </div>
                      </div>

                      {/* Leg Symbol Search */}
                      <div className="sm:col-span-6 relative">
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Symbol Search</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={leg.searchQuery || leg.symbol}
                            onChange={(e) => handleLegSearch(leg.id, e.target.value)}
                            onFocus={() => leg.searchQuery.length >= 2 && handleUpdateLeg(leg.id, { showDropdown: true })}
                            placeholder="e.g. NIFTY26SEP2424850CE..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 font-mono-num font-bold uppercase focus:outline-none focus:border-emerald-600"
                          />
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                        </div>

                        {/* Leg Dropdown Autocomplete */}
                        {leg.showDropdown && leg.searchResults.length > 0 && (
                          <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto custom-scrollbar">
                            {leg.searchResults.map((inst, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSelectLegInstrument(leg.id, inst)}
                                className="w-full px-3 py-2 text-left hover:bg-emerald-50/60 border-b border-slate-100 last:border-b-0 flex items-center justify-between text-xs"
                              >
                                <span className="font-bold text-slate-900">{inst.symbol}</span>
                                <span className="text-[10px] font-mono text-slate-500">Lot: {inst.lotsize || 1}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Leg Quantity / Lot Multipliers */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Quantity (Lots: {leg.lotSize})</label>
                        <input
                          type="number"
                          value={leg.quantity}
                          onChange={(e) => handleUpdateLeg(leg.id, { quantity: parseInt(e.target.value, 10) || 0 })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    {/* Advanced Types for Leg */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Order Type:</span>
                        <select
                          value={leg.orderType}
                          onChange={(e) => handleUpdateLeg(leg.id, { orderType: e.target.value as any })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 outline-none"
                        >
                          <option value="MARKET">MARKET</option>
                          <option value="LIMIT">LIMIT</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Product:</span>
                        <select
                          value={leg.productType}
                          onChange={(e) => handleUpdateLeg(leg.id, { productType: e.target.value as any })}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 outline-none"
                        >
                          <option value="CARRYFORWARD">CARRYFORWARD</option>
                          <option value="INTRADAY">INTRADAY</option>
                          <option value="DELIVERY">DELIVERY</option>
                        </select>
                      </div>

                      {leg.orderType === 'LIMIT' && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Price:</span>
                          <input
                            type="number"
                            step="0.05"
                            value={leg.price}
                            onChange={(e) => handleUpdateLeg(leg.id, { price: parseFloat(e.target.value) || 0.0 })}
                            className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-mono-num font-bold text-slate-900 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Basket Execution Summary Bar */}
              <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Basket Ready for Multi-Account Dispatch
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    {basketLegs.length} Legs × {accountId === 'ALL' ? `${activeAccountsCount} Active Angel One Accounts` : '1 Account'} = {basketLegs.length * (accountId === 'ALL' ? activeAccountsCount : 1)} Total Orders
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setManualOrderOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleBasketSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-xs font-bold rounded-xl bg-[#062c26] hover:bg-[#0a423a] text-white flex items-center gap-2 transition-all shadow-md"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Transmitting Basket...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 text-emerald-400" /> Transmit Angel One Basket ({basketLegs.length * (accountId === 'ALL' ? activeAccountsCount : 1)} Orders)
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
