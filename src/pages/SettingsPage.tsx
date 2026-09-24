import React, { useState } from 'react';
import { Lock, Save, ShieldCheck, Bell, Wifi, Trash2, AlertTriangle } from 'lucide-react';
import { useUIStore } from '../store/useUIStore';
import { useTradingStore } from '../store/useTradingStore';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

export const SettingsPage: React.FC = () => {
  const addToast = useUIStore((s) => s.addToast);
  const accounts = useTradingStore((s) => s.accounts);
  const algos = useTradingStore((s) => s.algos);

  const [backendUrl, setBackendUrl] = useState<string>(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api');
  const [wsUrl, setWsUrl] = useState<string>(import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws');
  const [soundAlerts, setSoundAlerts] = useState<boolean>(true);
  const [autoKillOnDisconnect, setAutoKillOnDisconnect] = useState<boolean>(true);
  const [defaultDailyLossCap, setDefaultDailyLossCap] = useState<number>(50000);

  const [isResetAlgosModalOpen, setIsResetAlgosModalOpen] = useState<boolean>(false);
  const [isResetAccountsModalOpen, setIsResetAccountsModalOpen] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Settings Saved', 'Platform settings updated successfully.', 'success');
  };

  const handleClearAllAlgos = () => {
    algos.forEach((a) => useTradingStore.getState().deleteAlgorithm(a.id));
    addToast('All Strategies Reset', 'All algorithms and option spread strategies deleted.', 'warning');
  };

  const handleClearAllAccounts = () => {
    accounts.forEach((acc) => useTradingStore.getState().deleteAccount(acc.id));
    addToast('All Accounts Reset', 'All broker trading accounts deleted.', 'warning');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Platform Configuration & Settings</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Backend REST API, WebSocket Endpoints & System Preferences</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API & WEBSOCKET ENDPOINTS */}
        <section className="card-premium p-5 space-y-4">
          <h3 className="text-xs uppercase font-bold text-blue-700 flex items-center gap-2 tracking-wider">
            <Wifi className="w-4 h-4 text-blue-600" /> Backend API & WebSocket Connectivity
          </h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">FastAPI Backend Base URL</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8000/api"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-mono-num"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">WebSocket Ticker Stream URL</label>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="ws://localhost:8000/ws"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-mono-num"
              />
            </div>
          </div>
        </section>

        {/* DEFAULT RISK PARAMETERS */}
        <section className="card-premium p-5 space-y-4">
          <h3 className="text-xs uppercase font-bold text-blue-700 flex items-center gap-2 tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-600" /> Default Risk Caps
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Default Daily Loss Cap (₹)</label>
              <input
                type="number"
                value={defaultDailyLossCap}
                onChange={(e) => setDefaultDailyLossCap(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all font-mono-num"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                checked={autoKillOnDisconnect}
                onChange={(e) => setAutoKillOnDisconnect(e.target.checked)}
                className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-slate-800 font-medium">Emergency Kill Algos on WS Disconnect</span>
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section className="card-premium p-5 space-y-4">
          <h3 className="text-xs uppercase font-bold text-blue-700 flex items-center gap-2 tracking-wider">
            <Bell className="w-4 h-4 text-blue-600" /> Toast & Audio Alerts
          </h3>

          <div className="flex items-center gap-3 text-xs">
            <input
              type="checkbox"
              checked={soundAlerts}
              onChange={(e) => setSoundAlerts(e.target.checked)}
              className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-slate-800 font-medium">Play Audio Sound Chime on Order Executions & Risk Alerts</span>
          </div>
        </section>

        {/* DANGER ZONE - ACCOUNT & STRATEGY DELETION */}
        <section className="card-premium p-5 space-y-4 border-rose-200 bg-rose-50/30">
          <h3 className="text-xs uppercase font-bold text-rose-700 flex items-center gap-2 tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Danger Zone & Account Management
          </h3>
          <p className="text-xs text-slate-600">
            Purge strategies or delete all broker accounts in one click.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsResetAlgosModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold bg-white text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-4 h-4" /> Delete All Strategies ({algos.length})
            </button>

            <button
              type="button"
              onClick={() => setIsResetAccountsModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold bg-white text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-4 h-4" /> Delete All Accounts ({accounts.length})
            </button>
          </div>
        </section>

        {/* SECURITY NOTE */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-3 text-xs text-slate-800">
          <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900">Strict Security & Confidentiality Policy</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              House of Traders frontend never stores broker API keys, TOTP seeds, PINs, or JWT tokens in localStorage or cookies. All broker authentication and execution requests pass through secure backend REST & WebSocket proxies.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm tracking-wider flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </form>

      {/* Confirmation Modals for Bulk Deletion */}
      <ConfirmationModal
        isOpen={isResetAlgosModalOpen}
        onClose={() => setIsResetAlgosModalOpen(false)}
        onConfirm={handleClearAllAlgos}
        title="Delete All Strategies?"
        description="This action will delete all active, paper, and stopped option strategies permanently."
        confirmText="Delete All Strategies"
        confirmVariant="danger"
      />

      <ConfirmationModal
        isOpen={isResetAccountsModalOpen}
        onClose={() => setIsResetAccountsModalOpen(false)}
        onConfirm={handleClearAllAccounts}
        title="Delete All Accounts?"
        description="This action will delete all Angel One SmartAPI trading accounts from the system."
        confirmText="Delete All Accounts"
        confirmVariant="danger"
      />
    </div>
  );
};

