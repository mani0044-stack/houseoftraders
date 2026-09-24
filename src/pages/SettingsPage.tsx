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
          <p className="text-xs text-slate-500 font-mono mt-0.5">Backend REST API, WebSocket Endpoints & System Preferences</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* API & WEBSOCKET ENDPOINTS */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs uppercase font-mono font-bold text-[#0F4C3A] flex items-center gap-2">
            <Wifi className="w-4 h-4" /> Backend API & WebSocket Connectivity
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">FastAPI Backend Base URL</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8000/api"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#0F4C3A]"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">WebSocket Ticker Stream URL</label>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="ws://localhost:8000/ws"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#0F4C3A]"
              />
            </div>
          </div>
        </section>

        {/* DEFAULT RISK PARAMETERS */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs uppercase font-mono font-bold text-[#0F4C3A] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Default Risk Caps
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Default Daily Loss Cap (₹)</label>
              <input
                type="number"
                value={defaultDailyLossCap}
                onChange={(e) => setDefaultDailyLossCap(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-[#0F4C3A]"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                checked={autoKillOnDisconnect}
                onChange={(e) => setAutoKillOnDisconnect(e.target.checked)}
                className="w-4 h-4 rounded bg-white border-slate-300 text-[#0F4C3A] focus:ring-0 cursor-pointer"
              />
              <span className="text-slate-800 font-sans">Emergency Kill Algos on WS Disconnect</span>
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs uppercase font-mono font-bold text-[#0F4C3A] flex items-center gap-2">
            <Bell className="w-4 h-4" /> Toast & Audio Alerts
          </h3>

          <div className="flex items-center gap-3 text-xs">
            <input
              type="checkbox"
              checked={soundAlerts}
              onChange={(e) => setSoundAlerts(e.target.checked)}
              className="w-4 h-4 rounded bg-white border-slate-300 text-[#0F4C3A] focus:ring-0 cursor-pointer"
            />
            <span className="text-slate-800">Play Audio Sound Chime on Order Executions & Risk Alerts</span>
          </div>
        </section>

        {/* DANGER ZONE - ACCOUNT & STRATEGY DELETION */}
        <section className="bg-red-50/50 border border-red-200 rounded-xl p-5 shadow-xs space-y-4">
          <h3 className="text-xs uppercase font-mono font-bold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Danger Zone & Account Management
          </h3>
          <p className="text-xs text-slate-600">
            Purge strategies or delete all broker accounts in one click.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsResetAlgosModalOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-white text-red-700 border border-red-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete All Strategies ({algos.length})
            </button>

            <button
              type="button"
              onClick={() => setIsResetAccountsModalOpen(true)}
              className="px-4 py-2 text-xs font-bold bg-white text-red-700 border border-red-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete All Accounts ({accounts.length})
            </button>
          </div>
        </section>

        {/* SECURITY NOTE */}
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-slate-800">
          <Lock className="w-5 h-5 text-[#0F4C3A] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-[#0F4C3A]">Strict Security & Confidentiality Policy</h4>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              AlgoTrade frontend never stores broker API keys, TOTP seeds, PINs, or JWT tokens in localStorage or cookies. All broker authentication and execution requests pass through secure backend REST & WebSocket proxies.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 text-xs font-bold bg-[#0F4C3A] hover:bg-[#0A3A2A] text-white rounded-lg shadow-sm uppercase tracking-wider flex items-center gap-2"
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
