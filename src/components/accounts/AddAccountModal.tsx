import React, { useState, useEffect } from 'react';
import { X, Lock, ShieldCheck, RefreshCw, HelpCircle } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTradingStore } from '../../store/useTradingStore';
import { BrokerName } from '../../types/account';

export const AddAccountModal: React.FC = () => {
  const isAddAccountOpen = useUIStore((s) => s.isAddAccountOpen);
  const editingAccount = useUIStore((s) => s.editingAccount);
  const setAddAccountOpen = useUIStore((s) => s.setAddAccountOpen);
  const addAccount = useTradingStore((s) => s.addAccount);
  const updateAccountCredentials = useTradingStore((s) => s.updateAccountCredentials);
  const addToast = useUIStore((s) => s.addToast);

  const [name, setName] = useState<string>('');
  const [broker, setBroker] = useState<BrokerName>('Angel One');
  const [clientId, setClientId] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [totpSecret, setTotpSecret] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (editingAccount) {
      setName(editingAccount.name || '');
      setBroker((editingAccount.broker as BrokerName) || 'Angel One');
      setClientId(editingAccount.clientId || '');
    } else {
      setName('');
      setBroker('Angel One');
      setClientId('');
    }
    setApiKey('');
    setApiSecret('');
    setPin('');
    setTotpSecret('');
  }, [editingAccount, isAddAccountOpen]);

  if (!isAddAccountOpen) return null;

  const isEditMode = !!editingAccount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !clientId) {
      addToast('Validation Error', 'Please enter account name and Client ID.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        broker,
        clientId,
        apiKey,
        apiSecret,
        pin,
        totpSecret
      };

      const result = isEditMode
        ? await updateAccountCredentials(editingAccount.id, payload)
        : await addAccount(payload);

      if (result.status === 'Connected') {
        addToast('Account Connected', `Angel One account ${name} (${result.clientId}) connected successfully! Margin: ₹${result.availableMargin.toLocaleString()}`, 'success');
      } else {
        addToast('Account Saved (Auth Required)', `Saved ${name}. Verify API key, PIN, & TOTP secret.`, 'warning');
      }

      setAddAccountOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed connecting account.';
      addToast('Connection Error', msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-scale">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={() => setAddAccountOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight font-sans">
              {isEditMode ? `Update Credentials: ${editingAccount.name}` : 'Add Angel One Trading Account'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isEditMode ? 'Re-authenticate or update broker secrets' : 'Secure backend API credential configuration'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Account Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Primary Angel"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Broker Name</label>
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value as BrokerName)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
              >
                <option value="Angel One">Angel One</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Broker Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. A123456"
                disabled={isEditMode}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num font-bold focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">Account PIN (MPIN)</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={isEditMode ? "Leave blank to keep unchanged" : "4-digit MPIN"}
                required={!isEditMode}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Secure Backend Note */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-2.5 text-xs text-slate-700">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-900">Zero Frontend Secret Exposure:</span>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-medium">
                API Keys, TOTP Secrets, & PINs are sent directly over encrypted TLS to the backend API vault. They are never stored in localStorage or rendered in the DOM.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">SmartAPI Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEditMode ? "Leave blank to keep unchanged" : "SmartAPI App Key"}
                required={!isEditMode}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-slate-500 font-bold mb-1 tracking-wider">TOTP Secret Key</label>
              <input
                type="password"
                value={totpSecret}
                onChange={(e) => setTotpSecret(e.target.value)}
                placeholder={isEditMode ? "Leave blank to keep unchanged" : "Base32 TOTP Key"}
                required={!isEditMode}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono-num focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">
              <strong className="text-slate-800">Troubleshooting Authentication:</strong> The TOTP Secret key must be a valid Base32 string from your Angel One SmartAPI 2FA setup.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddAccountOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Authenticating SmartAPI...
                </>
              ) : isEditMode ? (
                'Save & Re-authenticate'
              ) : (
                'Configure & Connect Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
