import React, { useState } from 'react';
import { TradingAccount } from '../../types/account';
import { StatusBadge } from '../common/StatusBadge';
import { Lock, ShieldCheck, Power, Trash2, RefreshCw, Edit, AlertTriangle, MoreVertical } from 'lucide-react';
import { useTradingStore } from '../../store/useTradingStore';
import { useUIStore } from '../../store/useUIStore';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface AccountCardProps {
  account: TradingAccount;
  onViewDetails?: (account: TradingAccount) => void;
}

// Masks a client ID for display, e.g. "ANGEL1234589" -> "ANGEL-****89"
function maskClientId(clientId: string): string {
  if (!clientId || clientId.length <= 6) return clientId;
  const visibleStart = clientId.slice(0, Math.min(5, clientId.length - 2));
  const visibleEnd = clientId.slice(-2);
  const maskLength = Math.max(clientId.length - visibleStart.length - visibleEnd.length, 4);
  return `${visibleStart}${'*'.repeat(maskLength)}${visibleEnd}`;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, onViewDetails }) => {
  const toggleAccountStatus = useTradingStore((s) => s.toggleAccountStatus);
  const deleteAccount = useTradingStore((s) => s.deleteAccount);
  const testConnection = useTradingStore((s) => s.testConnection);
  const setAddAccountOpen = useUIStore((s) => s.setAddAccountOpen);
  const addToast = useUIStore((s) => s.addToast);

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const isAuthRequired = account.status === 'Disconnected' || account.status === 'Error';
  const isProfit = account.todaysPnL >= 0;

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
    addToast('Account Deleted', `Trading account ${account.name} (${maskClientId(account.clientId)}) was deleted.`, 'warning');
  };

  return (
    <>

      <div className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${
        isAuthRequired ? 'border-amber-300 ring-2 ring-amber-200/60' : 'border-slate-200/90 hover:border-slate-300'
      }`}>
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 tracking-tight font-sans">{account.name}</h3>
                <StatusBadge status={account.status} size="sm" />
              </div>
              <p className="text-xs font-mono-num text-slate-500 font-medium mt-0.5">
                Client ID: <span className="text-slate-800 font-bold" title="Masked for security">{maskClientId(account.clientId)}</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-[11px] font-semibold text-blue-700 shrink-0 font-sans">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{account.broker}</span>
            </div>
          </div>

          {/* Auth Required Alert Banner */}
          {isAuthRequired && (
            <div className="mt-3.5 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 font-sans">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-amber-950">Authentication Required</span>
                <p className="text-[11px] text-amber-800 mt-0.5 font-medium leading-relaxed">
                  Broker session is not authenticated. Please test connection or update API Key, PIN, and TOTP secret.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-2.5 py-1.5 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>Test Connection</span>
                  </button>
                  <button
                    onClick={() => setAddAccountOpen(true, account)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit Secrets</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Credentials Status Badges */}
          <div className="mt-4 flex flex-wrap gap-2 pt-3.5 border-t border-slate-100">
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-sans font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
              <Lock className="w-3 h-3 text-blue-600" /> API Key: Configured
            </div>
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-sans font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
              <Lock className="w-3 h-3 text-blue-600" /> TOTP Secret: Configured
            </div>
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-sans font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
              <Lock className="w-3 h-3 text-blue-600" /> PIN: Configured
            </div>
          </div>

          {/* Financial Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Available Margin</span>
              <p className="text-base font-bold font-mono-num text-slate-900 mt-0.5">
                ₹{account.availableMargin.toLocaleString()}
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border transition-colors ${
              isProfit ? 'bg-emerald-50/60 border-emerald-200/60' : 'bg-rose-50/60 border-rose-200/60'
            }`}>
              <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Today's P&L</span>
              <p className={`text-base font-bold font-mono-num mt-0.5 ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isProfit ? '+' : ''}₹{account.todaysPnL.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Active Algos & Positions info */}
          <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500 font-sans font-medium">
            <span>Open Positions: <strong className="text-slate-900 font-mono-num font-bold">{account.openPositionsCount}</strong></span>
            <span>Assigned Algos: <strong className="text-slate-900 font-mono-num font-bold">{account.assignedAlgosCount}</strong></span>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono-num font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{account.lastHeartbeat}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isAuthRequired && (
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="p-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors flex items-center gap-1"
                title="Test Broker Session Connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              </button>
            )}

            <button
              onClick={() => setAddAccountOpen(true, account)}
              className="p-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors flex items-center gap-1"
              title="Edit Account Credentials"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>

            {onViewDetails && (
              <button
                onClick={() => onViewDetails(account)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors"
              >
                Details
              </button>
            )}

            <button
              onClick={() => toggleAccountStatus(account.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 ${
                account.isEnabled
                  ? 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-500 hover:text-slate-950'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-600 hover:text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{account.isEnabled ? 'Disable' : 'Enable'}</span>
            </button>

            {/* Delete moved into a kebab menu to keep it out of the primary action row */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200/80 hover:text-slate-700 transition-colors"
                title="More options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {isMenuOpen && (
                <>
                  {/* click-outside overlay */}
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 bottom-full mb-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 animate-fade-scale">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDeleteModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Account
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={`Delete Account "${account.name}"?`}
        description={`Are you sure you want to delete trading account ${maskClientId(account.clientId)}? It will be removed from all active strategy matrices.`}
        confirmText="Delete Account"
        confirmVariant="danger"
      />
    </>
  );
};