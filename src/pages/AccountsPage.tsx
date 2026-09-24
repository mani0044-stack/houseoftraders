import React from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { useUIStore } from '../store/useUIStore';
import { AccountCard } from '../components/accounts/AccountCard';
import { Plus, ShieldCheck } from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const accounts = useTradingStore((s) => s.accounts);
  const setAddAccountOpen = useUIStore((s) => s.setAddAccountOpen);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0F4C3A]" /> Multi-Account Broker Management
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Angel One SmartAPI Connections & Margin Allocation</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => useTradingStore.getState().fetchAccounts()}
            className="px-3 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors shrink-0 font-mono"
            title="Fetch latest margins from Angel One"
          >
            Refresh Margins
          </button>

          <button
            onClick={() => setAddAccountOpen(true)}
            className="px-4 py-2.5 text-xs font-bold bg-[#0F4C3A] hover:bg-[#0A3A2A] text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors uppercase tracking-wider shrink-0"
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
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0F4C3A] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Broker Accounts Configured</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Add your Angel One SmartAPI credentials to start multi-account option spread execution.
            </p>
          </div>
          <button
            onClick={() => setAddAccountOpen(true)}
            className="px-4 py-2 text-xs font-bold bg-[#0F4C3A] hover:bg-[#0A3A2A] text-white rounded-lg shadow-sm"
          >
            Add First Account
          </button>
        </div>
      )}
    </div>
  );
};
