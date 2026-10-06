import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SafetyWarningBanner } from './SafetyWarningBanner';
import { EmergencyStopModal } from '../common/EmergencyStopModal';
import { LiveModeModal } from '../common/LiveModeModal';
import { AddAccountModal } from '../accounts/AddAccountModal';
import { ManualOrderModal } from '../orders/ManualOrderModal';
import { OptionContractDrawer } from '../options/OptionContractDrawer';
import { OrderDetailsDrawer } from '../orders/OrderDetailsDrawer';
import { useUIStore } from '../../store/useUIStore';
import { useTradingStore } from '../../store/useTradingStore';
import { useMarketData } from '../../hooks/useMarketData';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const Layout: React.FC = () => {
  useMarketData();
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  const fetchAccounts = useTradingStore((s) => s.fetchAccounts);
  const fetchPositions = useTradingStore((s) => s.fetchPositions);
  const fetchOrders = useTradingStore((s) => s.fetchOrders);

  React.useEffect(() => {
    fetchAccounts();
    fetchPositions();
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen flex flex-col antialiased bg-[#F4F7F6] text-[#12211C] selection:bg-[#0F6B5C]/20 selection:text-[#0F3D33]">
      <SafetyWarningBanner />

      <div className="flex flex-1 relative">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />

          <main className="flex-1 p-4 md:p-6 overflow-y-auto min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Global Modals & Drawers */}
      <EmergencyStopModal />
      <LiveModeModal />
      <AddAccountModal />
      <ManualOrderModal />
      <OptionContractDrawer />
      <OrderDetailsDrawer />

      {/* Global Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? X : AlertTriangle;
          const bgStyle =
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-amber-50 border-amber-200 text-amber-700';

          return (
            <div
              key={toast.id}
              className={`p-3 rounded-lg border shadow-lg flex items-start gap-3 pointer-events-auto transition-all animate-slide-in ${bgStyle}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold uppercase tracking-wider">{toast.title}</h4>
                <p className="text-xs font-sans text-slate-600 mt-0.5 leading-tight">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};