import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { useUIStore } from '../store/useUIStore';
import { AccountCard } from '../components/accounts/AccountCard';
import { Plus, ShieldCheck } from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const accounts = useTradingStore((s) => s.accounts);
  const setAddAccountOpen = useUIStore((s) => s.setAddAccountOpen);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Multi-Account Broker Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Angel One SmartAPI Connections & Margin Allocation</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => useTradingStore.getState().fetchAccounts()}
            className="px-3.5 py-2.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors shrink-0 font-sans"
            title="Fetch latest margins from Angel One"
          >
            Refresh Margins
          </button>

          <button
            onClick={() => setAddAccountOpen(true)}
            className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all uppercase tracking-wider shrink-0 font-sans"
          >
            <Plus className="w-4 h-4" /> Add Trading Account
          </button>
        </div>
      </div>

      {/* Accounts Grid */}
      {accounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => (
            <AccountCard key={acc.id} account={acc} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans">No Broker Accounts Configured</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
              Add your Angel One SmartAPI credentials to start multi-account option spread execution.
            </p>
          </div>
          <button
            onClick={() => setAddAccountOpen(true)}
            className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            Add First Account
          </button>
        </div>
      )}
    </div>
  );
};
