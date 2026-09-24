import React from 'react';
import { ShieldAlert, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTradingStore } from '../../store/useTradingStore';

export const EmergencyStopModal: React.FC = () => {
  const isEmergencyStopOpen = useUIStore((s) => s.isEmergencyStopOpen);
  const setEmergencyStopOpen = useUIStore((s) => s.setEmergencyStopOpen);
  const emergencyStopAll = useTradingStore((s) => s.emergencyStopAll);
  const addToast = useUIStore((s) => s.addToast);

  if (!isEmergencyStopOpen) return null;

  const handleConfirm = () => {
    emergencyStopAll();
    addToast('EMERGENCY STOP EXECUTED', 'All algorithms stopped, open positions liquidated, execution killed.', 'error');
    setEmergencyStopOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border-2 border-red-500 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={() => setEmergencyStopOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-red-600">
          <div className="p-3 bg-red-50 rounded-xl border border-red-200">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wide uppercase text-slate-900">EMERGENCY STOP ALL TRADING</h2>
            <p className="text-xs font-mono text-red-600 font-semibold">GLOBAL SYSTEM KILL SWITCH</p>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 space-y-2 text-sm text-slate-800">
          <p className="font-semibold text-red-700">Executing this action will immediately:</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
            <li>Stop ALL active algorithms across ALL connected Angel One accounts.</li>
            <li>Cancel ALL pending and open market orders across brokers.</li>
            <li>Market exit ALL open positions to flatten current risk exposure.</li>
            <li>Disable auto-execution until manual system reset.</li>
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setEmergencyStopOpen(false)}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-md uppercase tracking-wide"
          >
            CONFIRM EMERGENCY STOP ALL
          </button>
        </div>
      </div>
    </div>
  );
};
