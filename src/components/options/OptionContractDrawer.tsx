import React from 'react';
import { X, Zap, BarChart2 } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTradingStore } from '../../store/useTradingStore';
import { TradingViewMiniWidget } from '../market/TradingViewMiniWidget';
import { ordersApi } from '../../api/ordersApi';

export const OptionContractDrawer: React.FC = () => {
  const selectedContract = useUIStore((s) => s.selectedContract);
  const setSelectedContract = useUIStore((s) => s.setSelectedContract);
  const addToast = useUIStore((s) => s.addToast);
  const addActivityLog = useTradingStore((s) => s.addActivityLog);
  const refreshPositions = useTradingStore((s) => s.fetchPositions);
  const refreshOrders = useTradingStore((s) => s.fetchOrders);

  if (!selectedContract) return null;

  const handleOrderSubmit = async (side: 'BUY' | 'SELL') => {
    try {
      const res = await ordersApi.createOrder({
        symbol: selectedContract.symbol,
        side,
        quantity: 50,
        orderType: 'MARKET',
        price: selectedContract.ltp,
        algoId: 'MANUAL-01',
        algoName: 'Manual Option Chain Execution'
      });

      addToast(
        `Broker Order Executed (${res.mode || 'LIVE'})`,
        `${side} 50 ${selectedContract.symbol} @ ₹${res.price || selectedContract.ltp}. Broker ID: ${res.brokerOrderId}`,
        'success'
      );

      addActivityLog(
        'Broker Order Executed',
        `${side} ${selectedContract.symbol} via ${res.mode || 'LIVE'} broker engine. ID: ${res.brokerOrderId}`,
        'Order',
        'SUCCESS'
      );

      refreshPositions();
      refreshOrders();
    } catch (err: any) {
      addToast(
        'Order Execution Error',
        err?.response?.data?.detail || 'Failed to submit order to broker',
        'error'
      );
    } finally {
      setSelectedContract(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-scale">
      <div className="bg-white border-l border-slate-200 w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold font-sans ${selectedContract.type === 'CE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {selectedContract.type}
                </span>
                <h3 className="font-bold text-lg text-slate-900 font-sans">{selectedContract.symbol}</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Expiry: <span className="text-slate-800 font-bold">{selectedContract.expiry}</span> • Strike: <span className="text-slate-800 font-bold">{selectedContract.strike}</span>
              </p>
            </div>

            <button
              onClick={() => setSelectedContract(null)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Price & Spread */}
          <div className="mt-5 p-4.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Last Traded Price</span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className={`text-3xl font-bold font-mono-num ${selectedContract.type === 'CE' ? 'text-emerald-600' : 'text-rose-600'}`}>
                ₹{selectedContract.ltp.toFixed(2)}
              </span>
              <span className={`text-xs font-semibold font-mono-num px-2.5 py-1 rounded-md border ${selectedContract.change >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                {selectedContract.change >= 0 ? '+' : ''}{selectedContract.change.toFixed(2)} ({selectedContract.changePercent}%)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3.5 border-t border-slate-200/80 text-xs font-mono-num">
              <div>
                <span className="text-slate-500">Bid (Qty):</span>
                <p className="text-emerald-600 font-bold mt-0.5">₹{selectedContract.bidPrice} <span className="text-slate-400 text-[10px]">({selectedContract.bidQty})</span></p>
              </div>
              <div>
                <span className="text-slate-500">Ask (Qty):</span>
                <p className="text-rose-600 font-bold mt-0.5">₹{selectedContract.askPrice} <span className="text-slate-400 text-[10px]">({selectedContract.askQty})</span></p>
              </div>
            </div>
          </div>

          {/* Option Greeks Grid */}
          <div className="mt-5">
            <h4 className="text-xs uppercase font-sans font-bold text-slate-700 mb-2.5 tracking-wider">Option Greeks & IV</h4>
            <div className="grid grid-cols-2 gap-2.5 font-mono-num text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 font-sans text-xs">Delta (Δ):</span>
                <p className="text-blue-600 font-bold text-base mt-0.5">{selectedContract.greeks.delta}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 font-sans text-xs">Gamma (Γ):</span>
                <p className="text-blue-600 font-bold text-base mt-0.5">{selectedContract.greeks.gamma}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 font-sans text-xs">Theta (Θ):</span>
                <p className="text-rose-600 font-bold text-base mt-0.5">{selectedContract.greeks.theta}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 font-sans text-xs">Vega (ν):</span>
                <p className="text-emerald-600 font-bold text-base mt-0.5">{selectedContract.greeks.vega}</p>
              </div>
            </div>
          </div>

          {/* Volume & OI stats */}
          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs font-mono-num text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Open Interest (OI):</span>
              <span className="font-bold text-slate-900">{selectedContract.openInterest.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Change in OI:</span>
              <span className={selectedContract.changeOI >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                {selectedContract.changeOI >= 0 ? '+' : ''}{selectedContract.changeOI.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Total Volume:</span>
              <span className="font-bold text-slate-900">{selectedContract.volume.toLocaleString()}</span>
            </div>
          </div>

          {/* TradingView Technical Analysis */}
          <div className="mt-5">
            <h4 className="text-xs uppercase font-sans font-bold text-slate-700 mb-2 flex items-center gap-1.5 tracking-wider">
              <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
              <span>TradingView Analysis ({selectedContract.underlying})</span>
            </h4>
            <TradingViewMiniWidget symbol={selectedContract.underlying} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOrderSubmit('BUY')}
            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-sans text-xs tracking-wider shadow-sm uppercase transition-colors flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4 fill-current" /> BUY CONTRACT
          </button>
          <button
            onClick={() => handleOrderSubmit('SELL')}
            className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold font-sans text-xs tracking-wider shadow-sm uppercase transition-colors flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4 fill-current" /> SELL CONTRACT
          </button>
        </div>
      </div>
    </div>
  );
};
