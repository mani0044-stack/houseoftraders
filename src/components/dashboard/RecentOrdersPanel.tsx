import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { StatusBadge } from '../common/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export const RecentOrdersPanel: React.FC = () => {
  const orders = useTradingStore((s) => s.orders);
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Orders</h3>
          <p className="text-xs text-slate-500 font-mono">Live Broker Order Stream</p>
        </div>
        <button
          onClick={() => navigate('/orders')}
          className="text-xs font-semibold text-[#0F4C3A] hover:underline flex items-center gap-1"
        >
          <span>All Orders</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
        {orders.slice(0, 5).map((order) => (
          <div
            key={order.id}
            className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between text-xs font-mono"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold ${order.side === 'BUY' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {order.side} {order.quantity} QTY
                </span>
                <span className="font-semibold text-slate-900">{order.symbol}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {order.accountName} • {order.timestamp}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-800 font-bold">₹{order.price}</span>
              <StatusBadge status={order.status} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
