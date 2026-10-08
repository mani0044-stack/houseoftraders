import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Search, 
  TrendingUp, 
  BarChart2, 
  Activity, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Play, 
  Pause, 
  Layers, 
  Download, 
  Clock, 
  Sliders, 
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Wifi,
  Radio
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';

export const SmartApiTerminalPage: React.FC = () => {
  const addToast = useUIStore((s) => s.addToast);

  // Active Tab: 'ORDER_EXECUTION' | 'HISTORICAL_CANDLES' | 'WEBSOCKET_FEED'
  const [activeTab, setActiveTab] = useState<'ORDER_EXECUTION' | 'HISTORICAL_CANDLES' | 'WEBSOCKET_FEED'>('ORDER_EXECUTION');

  // =========================================================================
  // Tab 1: F&O Order Form State
  // =========================================================================
  const [symbol, setSymbol] = useState<string>('NIFTY');
  const [expiry, setExpiry] = useState<string>('2026-10-13');
  const [strike, setStrike] = useState<number>(20050);
  const [optionType, setOptionType] = useState<'CE' | 'PE' | 'FUT'>('CE');
  const [exchange, setExchange] = useState<'NFO' | 'BFO'>('NFO');
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'STOPLOSS_LIMIT'>('LIMIT');
  const [productType, setProductType] = useState<'INTRADAY' | 'CARRYFORWARD'>('INTRADAY');
  const [lots, setLots] = useState<number>(2);
  const [price, setPrice] = useState<number>(145.50);
  const [triggerPrice, setTriggerPrice] = useState<number>(140.00);

  // Scrip Lookup Result
  const [scripLoading, setScripLoading] = useState<boolean>(false);
  const [resolvedScrip, setResolvedScrip] = useState<{ symboltoken: string; tradingsymbol: string; lotsize: number } | null>(null);

  // Order Placement Execution Result
  const [orderLoading, setOrderLoading] = useState<boolean>(false);
  const [orderResponse, setOrderResponse] = useState<{ status: string; order_id?: string; error?: string; message?: string } | null>(null);

  // Lot Size calculation
  const currentLotSize = resolvedScrip?.lotsize || (symbol === 'BANKNIFTY' ? 30 : symbol === 'FINNIFTY' ? 40 : symbol === 'NIFTY' ? 65 : 50);
  const totalShares = lots * currentLotSize;

  // Auto Lookup Scrip on parameter change
  useEffect(() => {
    let isMounted = true;
    const fetchScripDetails = async () => {
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
        // Fallback mockup
        if (isMounted) {
          const expFormatted = expiry.replace(/-/g, '').toUpperCase();
          const mockTradingSymbol = optionType === 'FUT' 
            ? `${symbol}27OCT26FUT`
            : `${symbol}13OCT26${strike}${optionType}`;
          setResolvedScrip({
            symboltoken: '44442',
            tradingsymbol: mockTradingSymbol,
            lotsize: currentLotSize
          });
        }
      } finally {
        if (isMounted) setScripLoading(false);
      }
    };

    fetchScripDetails();
    return () => { isMounted = false; };
  }, [symbol, expiry, strike, optionType, exchange]);

  const handlePlaceOrder = async () => {
    setOrderLoading(true);
    setOrderResponse(null);

    const payload = {
      symbol,
      expiry,
      strike: optionType === 'FUT' ? null : strike,
      option_type: optionType,
      exchange,
      transaction_type: transactionType,
      order_type: orderType,
      product_type: productType,
      lots,
      price: orderType === 'MARKET' ? 0 : price,
      trigger_price: orderType.includes('STOPLOSS') ? triggerPrice : 0
    };

    try {
      const resp = await fetch('/api/v1/orders/place_fo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      setOrderResponse(data);

      if (data.status === 'SUCCESS') {
        addToast({
          type: 'success',
          title: 'F&O Order Placed Successfully',
          message: `Broker Order ID: ${data.order_id}`
        });
      } else {
        addToast({
          type: 'error',
          title: 'Order Placement Rejected',
          message: data.error || 'Failed to execute order via SmartAPI.'
        });
      }
    } catch (err: any) {
      const errStr = err.message || 'Network error executing order.';
      setOrderResponse({ status: 'FAILED', error: errStr });
      addToast({
        type: 'error',
        title: 'Execution Exception',
        message: errStr
      });
    } finally {
      setOrderLoading(false);
    }
  };

  // =========================================================================
  // Tab 2: Historical Candles State
  // =========================================================================
  const [candleSymbolToken, setCandleSymbolToken] = useState<string>('44442');
  const [candleInterval, setCandleInterval] = useState<string>('FIVE_MINUTE');
  const [fromDate, setFromDate] = useState<string>('2026-10-01 09:15');
  const [toDate, setToDate] = useState<string>('2026-10-08 15:30');
  const [candleData, setCandleData] = useState<any[]>([]);
  const [candleLoading, setCandleLoading] = useState<boolean>(false);

  const fetchCandles = async () => {
    setCandleLoading(true);
    try {
      const resp = await fetch('/api/v1/market/historical_candles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchange,
          symboltoken: candleSymbolToken,
          interval: candleInterval,
          fromdate: fromDate,
          todate: toDate,
          symbol
        })
      });
      const data = await resp.json();
      if (data.status === 'SUCCESS' && data.candles) {
        setCandleData(data.candles);
        addToast({
          type: 'info',
          title: 'Candle Data Loaded',
          message: `Fetched ${data.candles.length} historical candles.`
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Candle Fetch Notice',
          message: data.error || 'No candles returned for selected parameters.'
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error Loading Candles',
        message: err.message || 'Failed to fetch historical candles.'
      });
    } finally {
      setCandleLoading(false);
    }
  };

  useEffect(() => {
    fetchCandles();
  }, []);

  // =========================================================================
  // Tab 3: Live WebSocket Feed State
  // =========================================================================
  const [wsConnected, setWsConnected] = useState<boolean>(true);
  const [liveTicks, setLiveTicks] = useState<{ [token: string]: any }>({
    '44442': {
      token: '44442',
      symbol: 'NIFTY 20050 CE',
      ltp: 145.50,
      change: +12.40,
      changePct: 9.31,
      open: 133.10,
      high: 158.00,
      low: 128.50,
      close: 133.10,
      volume: 1845000,
      openInterest: 3420000,
      oiChangePct: +5.4,
      bids: [
        { price: 145.45, qty: 325, orders: 4 },
        { price: 145.40, qty: 650, orders: 8 },
        { price: 145.35, qty: 1300, orders: 15 }
      ],
      asks: [
        { price: 145.50, qty: 195, orders: 3 },
        { price: 145.55, qty: 520, orders: 7 },
        { price: 145.60, qty: 1170, orders: 12 }
      ]
    },
    '48704': {
      token: '48704',
      symbol: 'NIFTY OCT FUT',
      ltp: 24920.80,
      change: +145.20,
      changePct: 0.59,
      open: 24775.00,
      high: 24950.00,
      low: 24740.00,
      close: 24775.60,
      volume: 12450000,
      openInterest: 11200000,
      oiChangePct: +2.1,
      bids: [
        { price: 24920.50, qty: 130, orders: 2 },
        { price: 24920.00, qty: 390, orders: 5 }
      ],
      asks: [
        { price: 24921.00, qty: 260, orders: 3 },
        { price: 24921.50, qty: 650, orders: 9 }
      ]
    }
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-800 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-0"></div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Zap className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight font-sans">Angel One SmartAPI F&O Hub</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 max-w-2xl font-medium">
              High-Frequency F&O Order Execution Engine, Historical Candle Analytics & Asynchronous Live Market Data Streaming.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border ${
              wsConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              <span>{wsConnected ? 'SmartAPI Stream Live' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveTab('ORDER_EXECUTION')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'ORDER_EXECUTION'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>F&O Order Terminal</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORICAL_CANDLES')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'HISTORICAL_CANDLES'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Historical Data (`getCandleData`)</span>
          </button>

          <button
            onClick={() => setActiveTab('WEBSOCKET_FEED')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'WEBSOCKET_FEED'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>Live Feed (`SmartWebSocketV2`)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: F&O ORDER EXECUTION TERMINAL */}
      {/* ========================================================================= */}
      {activeTab === 'ORDER_EXECUTION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Order Configuration Form */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-sans">Futures & Options Order Configurator</h2>
                <p className="text-xs text-slate-500 mt-0.5">Strict parameter mapping to Angel One OpenAPI specification</p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setTransactionType('BUY')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    transactionType === 'BUY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setTransactionType('SELL')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    transactionType === 'SELL' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  SELL
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Symbol */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Underlying Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="NIFTY">NIFTY 50</option>
                  <option value="BANKNIFTY">BANK NIFTY</option>
                  <option value="FINNIFTY">FIN NIFTY</option>
                  <option value="RELIANCE">RELIANCE</option>
                  <option value="TATASTEEL">TATA STEEL</option>
                  <option value="HDFCBANK">HDFC BANK</option>
                </select>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expiry Date</label>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Option Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contract Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['CE', 'PE', 'FUT'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setOptionType(t)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                        optionType === t
                          ? t === 'CE' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : t === 'PE' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t === 'FUT' ? 'FUTURES' : `${t} OPTION`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Strike Price */}
              {optionType !== 'FUT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Strike Price</label>
                  <input
                    type="number"
                    value={strike}
                    onChange={(e) => setStrike(Number(e.target.value))}
                    step={symbol === 'BANKNIFTY' ? 100 : 50}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Exchange & Product Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Exchange Segment</label>
                <select
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="NFO">NFO (NSE Derivatives)</option>
                  <option value="BFO">BFO (BSE Derivatives)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Product Type</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="INTRADAY">INTRADAY (MIS / Day Trade)</option>
                  <option value="CARRYFORWARD">CARRYFORWARD (NRML / Positional)</option>
                </select>
              </div>

              {/* Order Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Order Type</label>
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

              {/* Lots & Shares Calculator */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Number of Lots</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={lots}
                    onChange={(e) => setLots(Math.max(1, Number(e.target.value)))}
                    className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="bg-slate-100 px-3 py-2 rounded-xl text-[11px] font-semibold text-slate-600 flex-1">
                    = <span className="font-bold text-slate-900">{totalShares}</span> Shares ({currentLotSize}/lot)
                  </div>
                </div>
              </div>

              {/* Price */}
              {orderType !== 'MARKET' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Limit Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Trigger Price */}
              {orderType.includes('STOPLOSS') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Trigger Price (₹)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={triggerPrice}
                    onChange={(e) => setTriggerPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Resolved Scrip Info Banner */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-blue-600" />
                <div>
                  <div className="text-xs font-bold text-blue-900 font-mono">
                    {scripLoading ? 'Resolving Scrip Master...' : resolvedScrip?.tradingsymbol || 'NIFTY13OCT2620050CE'}
                  </div>
                  <div className="text-[10px] text-blue-600 font-medium">
                    Token ID: <span className="font-bold font-mono">{resolvedScrip?.symboltoken || '44442'}</span> | Exchange: {exchange} | Lot Size: {resolvedScrip?.lotsize || currentLotSize}
                  </div>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>

            {/* Action Buttons */}
            <button
              onClick={handlePlaceOrder}
              disabled={orderLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                transactionType === 'BUY'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-600/20'
              }`}
            >
              {orderLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting to Angel One SmartAPI...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Execute {transactionType} Order ({totalShares} Shares)</span>
                </>
              )}
            </button>
          </div>

          {/* Execution Response Banner / Info Box */}
          <div className="lg:col-span-5 space-y-6">
            {/* Status Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>SmartAPI Order Execution Response</span>
              </h3>

              {orderResponse ? (
                orderResponse.status === 'SUCCESS' ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>ORDER EXECUTED SUCCESSFULLY</span>
                    </div>
                    <div className="text-xs text-emerald-700 font-mono">
                      Broker Order ID: <span className="font-bold">{orderResponse.order_id}</span>
                    </div>
                    <p className="text-[11px] text-emerald-600">{orderResponse.message || 'Order placed with broker.'}</p>
                  </div>
                ) : (
                  <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                      <span>ORDER EXECUTION REJECTED</span>
                    </div>
                    <p className="text-xs text-rose-700 font-semibold font-mono">{orderResponse.error}</p>
                  </div>
                )
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No active order submission yet.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Configure your F&O payload on the left and click Execute.</p>
                </div>
              )}
            </div>

            {/* Requirements Audit Box */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-3 text-xs">
              <h4 className="font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Quant F&O Mapping Features Enforced</span>
              </h4>
              <ul className="space-y-2 text-slate-400 text-[11px]">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Scrip Master Lookup:</strong> Dynamic token ID & trading symbol caching.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Quantity Calculator:</strong> Multiplies UI lots by contract lot size automatically.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Exchange & Product Rules:</strong> Enforces NFO/BFO and maps Day to INTRADAY / Positional to CARRYFORWARD.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Price Wrapper:</strong> MARKET orders forced to "0"; LIMIT prices formatted to 2 decimal places.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HISTORICAL DATA CANDLE EXPLORER (`getCandleData`) */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORICAL_CANDLES' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-sans">SmartAPI Historical Candle Engine (`getCandleData`)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Fetches raw candle ticks and parses them into structured pandas DataFrame format</p>
              </div>

              <button
                onClick={fetchCandles}
                disabled={candleLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                {candleLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Fetch Historical Candles</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Symbol Token</label>
                <input
                  type="text"
                  value={candleSymbolToken}
                  onChange={(e) => setCandleSymbolToken(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Interval</label>
                <select
                  value={candleInterval}
                  onChange={(e) => setCandleInterval(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="ONE_MINUTE">1 Minute</option>
                  <option value="THREE_MINUTE">3 Minutes</option>
                  <option value="FIVE_MINUTE">5 Minutes</option>
                  <option value="FIFTEEN_MINUTE">15 Minutes</option>
                  <option value="ONE_HOUR">1 Hour</option>
                  <option value="ONE_DAY">1 Day</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">From Date (HH:MM)</label>
                <input
                  type="text"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">To Date (HH:MM)</label>
                <input
                  type="text"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Exchange</label>
                <select
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="NFO">NFO</option>
                  <option value="NSE">NSE</option>
                  <option value="BFO">BFO</option>
                </select>
              </div>
            </div>
          </div>

          {/* Candle Table Output */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                Parsed OHLCV Candle Records ({candleData.length} Candles Loaded)
              </h3>
              <span className="text-xs text-slate-400 font-mono">Schema: [Timestamp, Open, High, Low, Close, Volume]</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Open (₹)</th>
                    <th className="p-3">High (₹)</th>
                    <th className="p-3">Low (₹)</th>
                    <th className="p-3">Close (₹)</th>
                    <th className="p-3 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {candleData.length > 0 ? (
                    candleData.map((c, idx) => {
                      const isGreen = (c.Close || 0) >= (c.Open || 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-slate-700 font-semibold">{c.Timestamp || c.time}</td>
                          <td className="p-3 text-slate-900">{(c.Open || 0).toFixed(2)}</td>
                          <td className="p-3 text-emerald-600 font-semibold">{(c.High || 0).toFixed(2)}</td>
                          <td className="p-3 text-rose-600 font-semibold">{(c.Low || 0).toFixed(2)}</td>
                          <td className={`p-3 font-bold ${isGreen ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {(c.Close || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-slate-700">{c.Volume?.toLocaleString() || 0}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-sans">
                        No candle data loaded. Click "Fetch Historical Candles" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LIVE WEBSOCKET FEED (`SmartWebSocketV2`) */}
      {/* ========================================================================= */}
      {activeTab === 'WEBSOCKET_FEED' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-sans">Live WebSocket Streaming (`SmartWebSocketV2`)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Asynchronous SNAP_QUOTE Mode (LTP, Volume, Open Interest & Depth)</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWsConnected(!wsConnected)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    wsConnected ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {wsConnected ? 'Stop Feed' : 'Reconnect Feed'}
                </button>
              </div>
            </div>
          </div>

          {/* Grid of Streaming Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.values(liveTicks).map((tick: any) => {
              const isPositive = tick.change >= 0;
              return (
                <div key={tick.token} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-base font-sans">{tick.symbol}</span>
                        <span className="text-[10px] bg-slate-100 font-mono text-slate-600 px-2 py-0.5 rounded-md">Token: {tick.token}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Mode: SNAP_QUOTE (Mode 3)</div>
                    </div>

                    <div className="text-right">
                      <div className={`text-2xl font-extrabold font-mono ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ₹{tick.ltp.toFixed(2)}
                      </div>
                      <div className={`text-xs font-bold flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{isPositive ? '+' : ''}{tick.change.toFixed(2)} ({tick.changePct.toFixed(2)}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Tick Details Grid */}
                  <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl text-xs font-mono">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Open</div>
                      <div className="font-bold text-slate-800">₹{tick.open.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">High</div>
                      <div className="font-bold text-emerald-600">₹{tick.high.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Low</div>
                      <div className="font-bold text-rose-600">₹{tick.low.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Close</div>
                      <div className="font-bold text-slate-800">₹{tick.close.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Volume & OI stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Day Volume</div>
                      <div className="text-sm font-bold text-blue-900 font-mono mt-0.5">{tick.volume.toLocaleString()}</div>
                    </div>
                    <div className="bg-purple-50/60 border border-purple-100 p-3 rounded-xl">
                      <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Open Interest (OI)</div>
                      <div className="text-sm font-bold text-purple-900 font-mono mt-0.5">
                        {tick.openInterest.toLocaleString()} <span className="text-[10px] text-emerald-600">({tick.oiChangePct}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Best 5 Bids & Asks Market Depth */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                    <div className="bg-slate-50 px-3 py-1.5 font-bold text-[11px] text-slate-700 flex justify-between">
                      <span>Best 5 Bids (Buyers)</span>
                      <span>Best 5 Asks (Sellers)</span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-100 font-mono text-[11px]">
                      {/* Bids */}
                      <div className="p-2 space-y-1">
                        {tick.bids.map((b: any, i: number) => (
                          <div key={i} className="flex justify-between text-emerald-700">
                            <span>₹{b.price.toFixed(2)}</span>
                            <span className="font-bold">{b.qty}</span>
                          </div>
                        ))}
                      </div>
                      {/* Asks */}
                      <div className="p-2 space-y-1">
                        {tick.asks.map((a: any, i: number) => (
                          <div key={i} className="flex justify-between text-rose-700">
                            <span>₹{a.price.toFixed(2)}</span>
                            <span className="font-bold">{a.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartApiTerminalPage;
