import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { StatusBadge } from '../common/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export const RecentOrdersPanel: React.FC = () => {
  const orders = useTradingStore((s) => s.orders);
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Orders</h3>
          <p className="text-xs text-slate-500 font-medium">Live Broker Order Stream</p>
        </div>
        <button
          onClick={() => navigate('/orders')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
        >
          <span>All Orders</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
        {orders.slice(0, 5).map((order) => (
          <div
            key={order.id}
            className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 transition-colors flex items-center justify-between text-xs font-sans"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-bold font-mono-num ${order.side === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {order.side} {order.quantity} QTY
                </span>
                <span className="font-bold text-slate-900">{order.symbol}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                {order.accountName} • {order.timestamp}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-900 font-bold font-mono-num">₹{order.price}</span>
              <StatusBadge status={order.status} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
