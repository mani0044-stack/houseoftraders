import React, { useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { useUIStore } from '../store/useUIStore';
import { OrderTable } from '../components/orders/OrderTable';
import { OrderStatus } from '../types/order';
import { Plus, Zap, Layers } from 'lucide-react';
import { clsx } from 'clsx';

const tabs: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All Orders', value: 'ALL' },
  { label: 'Open Orders', value: 'OPEN' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export const OrdersPage: React.FC = () => {
  const orders = useTradingStore((s) => s.orders);
  const setManualOrderOpen = useUIStore((s) => s.setManualOrderOpen);
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');

  const filtered = orders.filter((o) => {
    if (activeTab !== 'ALL' && o.status !== activeTab) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Orders & Execution Book</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Live Broker Orders Stream, Single & Angel One Basket Orders</p>
        </div>

        <button
          onClick={() => setManualOrderOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Place Order / Basket</span>
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 bg-white border border-slate-200/90 p-1.5 rounded-2xl w-fit shadow-xs">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={clsx(
              'px-4 py-2 text-xs font-semibold rounded-xl transition-all',
              activeTab === tab.value
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Order Table */}
      <OrderTable orders={filtered} />
    </div>
  );
};
