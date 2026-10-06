import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { StatusBadge } from '../common/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export const RecentOrdersPanel: React.FC = () => {
  const orders = useTradingStore((s) => s.orders);
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-[#E3E8E6] rounded-2xl p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3.5 border-b border-[#E3E8E6] mb-1">
        <div>
          <h3 className="text-xs font-bold text-[#12211C] uppercase tracking-wider">Recent Orders</h3>
          <p className="text-xs text-[#6B7C75] font-medium">Live Broker Order Stream</p>
        </div>
        <button
          onClick={() => navigate('/orders')}
          className="text-xs font-semibold text-[#0F6B5C] hover:text-[#0B5347] hover:underline flex items-center gap-1"
        >
          <span>All Orders</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
        {orders.slice(0, 5).map((order) => (
          <div
            key={order.id}
            className="py-3 border-b border-[#E3E8E6] last:border-b-0 text-xs font-sans"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-[#12211C] text-sm min-w-0 truncate">{order.symbol}</span>
              <span className={`font-bold font-mono-num shrink-0 ${order.side === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {order.side} {order.quantity} QTY
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="text-[11px] text-[#6B7C75] font-medium min-w-0 truncate">
                {order.accountName} • {order.timestamp}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[#12211C] font-bold font-mono-num">₹{order.price}</span>
                <StatusBadge status={order.status} size="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};