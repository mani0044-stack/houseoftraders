import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const OrderDetailsDrawer: React.FC = () => {
  const selectedOrder = useUIStore((s) => s.selectedOrder);
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);

  if (!selectedOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border-l border-slate-200 w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${selectedOrder.side === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {selectedOrder.side}
                </span>
                <h3 className="font-bold text-lg text-slate-900 font-mono">{selectedOrder.symbol}</h3>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Broker ID: <span className="text-slate-800 font-semibold">{selectedOrder.brokerOrderId}</span>
              </p>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Core Info Cards */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase text-slate-500 font-semibold">Quantity</span>
              <p className="text-sm font-bold font-mono text-slate-900 mt-0.5">{selectedOrder.quantity} QTY</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase text-slate-500 font-semibold">Order Price</span>
              <p className="text-sm font-bold font-mono text-slate-900 mt-0.5">₹{selectedOrder.price.toFixed(2)}</p>
            </div>
          </div>

          {selectedOrder.rejectionReason && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 space-y-1">
              <span className="font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Rejection Reason:</span>
              <p className="text-slate-800">{selectedOrder.rejectionReason}</p>
            </div>
          )}

          {/* Order Timeline Stream */}
          <div className="mt-6">
            <h4 className="text-xs uppercase font-mono font-semibold text-slate-700 mb-3">Order Audit Timeline</h4>
            <div className="space-y-4 border-l-2 border-slate-200 pl-4 font-mono text-xs">
              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-[#0F4C3A]" />
                <p className="font-bold text-slate-900">1. Strategy Signal Generated</p>
                <p className="text-[11px] text-slate-500">Triggered by {selectedOrder.algoName} @ {selectedOrder.timeline.signalTime}</p>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <p className="font-bold text-slate-900">2. Risk Check Passed</p>
                <p className="text-[11px] text-slate-500">RMS Exposure & Margin approved @ {selectedOrder.timeline.riskApprovedTime}</p>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-blue-600" />
                <p className="font-bold text-slate-900">3. Transmitted to Angel One</p>
                <p className="text-[11px] text-slate-500">SmartAPI endpoint @ {selectedOrder.timeline.brokerSubmittedTime}</p>
              </div>

              {selectedOrder.timeline.completedTime && (
                <div className="relative">
                  <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <div className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <p className="font-bold text-emerald-700">4. Order Execution Completed</p>
                  <p className="text-[11px] text-slate-500">FILLED @ {selectedOrder.timeline.completedTime}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => setSelectedOrder(null)}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
