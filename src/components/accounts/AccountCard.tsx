import React, { useState } from 'react';
import { TradingAccount } from '../../types/account';
import { StatusBadge } from '../common/StatusBadge';
import { Lock, Activity, ShieldCheck, Power, Trash2, RefreshCw, Edit, AlertTriangle } from 'lucide-react';
import { useTradingStore } from '../../store/useTradingStore';
import { useUIStore } from '../../store/useUIStore';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface AccountCardProps {
  account: TradingAccount;
  onViewDetails?: (account: TradingAccount) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, onViewDetails }) => {
  const toggleAccountStatus = useTradingStore((s) => s.toggleAccountStatus);
  const deleteAccount = useTradingStore((s) => s.deleteAccount);
  const testConnection = useTradingStore((s) => s.testConnection);
  const setAddAccountOpen = useUIStore((s) => s.setAddAccountOpen);
  const addToast = useUIStore((s) => s.addToast);

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const isAuthRequired = account.status === 'Disconnected' || account.status === 'Error';

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await testConnection(account.id);
      if (res.success) {
        addToast('Connection Successful', `Connected to Angel One SmartAPI for ${account.name}. Margin: ₹${(res.availableMargin ?? 0).toLocaleString()}`, 'success');
      } else {
        addToast('Authentication Failed', res.message || 'Check your Client ID, MPIN, API Key, and TOTP secret key.', 'error');
      }
    } catch (err: any) {
      addToast('Connection Error', err?.message || 'Failed connecting to Angel One.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = () => {
    deleteAccount(account.id);
    addToast('Account Deleted', `Trading account ${account.name} (${account.clientId}) was deleted.`, 'warning');
  };

  return (
    <>
      <div className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all flex flex-col justify-between ${
        isAuthRequired ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200 hover:border-slate-300'
      }`}>
        <div>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 tracking-tight">{account.name}</h3>
                <StatusBadge status={account.status} size="sm" />
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Client ID: <span className="text-slate-800 font-semibold">{account.clientId}</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-mono text-[#0F4C3A]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{account.broker}</span>
            </div>
          </div>

          {/* Auth Required Alert Banner */}
          {isAuthRequired && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-amber-950">Authentication Required</span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Broker session is not authenticated. Please test connection or update API Key, PIN, and TOTP secret.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded shadow-xs flex items-center gap-1"
                  >
                    {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    <span>Test Connection</span>
                  </button>
                  <button
                    onClick={() => setAddAccountOpen(true, account)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit Secrets</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Credentials Status Badges */}
          <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Lock className="w-3 h-3 text-[#0F4C3A]" /> API Key: Configured
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Lock className="w-3 h-3 text-[#0F4C3A]" /> TOTP Secret: Configured
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Lock className="w-3 h-3 text-[#0F4C3A]" /> PIN: Configured
            </div>
          </div>

          {/* Financial Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase text-slate-500 font-semibold">Available Margin</span>
              <p className="text-sm font-bold font-mono-num text-slate-900 mt-0.5">
                ₹{account.availableMargin.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase text-slate-500 font-semibold">Today's P&L</span>
              <p className={`text-sm font-bold font-mono-num mt-0.5 ${account.todaysPnL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                ₹{account.todaysPnL.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Active Algos & Positions info */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Open Positions: <strong className="text-slate-800">{account.openPositionsCount}</strong></span>
            <span>Assigned Algos: <strong className="text-slate-800">{account.assignedAlgosCount}</strong></span>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            <Activity className="w-3 h-3 text-emerald-600 animate-pulse" />
            <span>Heartbeat: {account.lastHeartbeat}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isAuthRequired && (
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="p-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1 font-mono"
                title="Test Broker Session Connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              onClick={() => setAddAccountOpen(true, account)}
              className="p-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1"
              title="Edit Account Credentials"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>

            {onViewDetails && (
              <button
                onClick={() => onViewDetails(account)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 rounded-md transition-colors"
              >
                Details
              </button>
            )}

            <button
              onClick={() => toggleAccountStatus(account.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors flex items-center gap-1 ${
                account.isEnabled
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-500 hover:text-slate-950'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{account.isEnabled ? 'Disable' : 'Enable'}</span>
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 transition-colors"
              title="Delete Account"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={`Delete Account "${account.name}"?`}
        description={`Are you sure you want to delete trading account ${account.clientId}? It will be removed from all active strategy matrices.`}
        confirmText="Delete Account"
        confirmVariant="danger"
      />
    </>
  );
};
