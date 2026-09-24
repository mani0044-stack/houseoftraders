import React from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTradingStore } from '../../store/useTradingStore';

export const LiveModeModal: React.FC = () => {
  const isLiveModeConfirmOpen = useUIStore((s) => s.isLiveModeConfirmOpen);
  const setLiveModeConfirmOpen = useUIStore((s) => s.setLiveModeConfirmOpen);
  const setTradingMode = useTradingStore((s) => s.setTradingMode);
  const addToast = useUIStore((s) => s.addToast);
  const addActivityLog = useTradingStore((s) => s.addActivityLog);

  if (!isLiveModeConfirmOpen) return null;

  const handleConfirm = () => {
    setTradingMode('Live');
    addToast('LIVE TRADING ENABLED', 'Real money live broker order execution active.', 'warning');
    addActivityLog(
      'Live Trading Enabled',
      'User explicitly enabled LIVE TRADING mode. Real orders will now be transmitted to Angel One broker endpoints.',
      'System',
      'WARNING'
    );
    setLiveModeConfirmOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border-2 border-amber-500 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={() => setLiveModeConfirmOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-amber-600">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">ENABLE LIVE TRADING MODE</h2>
            <p className="text-xs font-mono text-amber-700 font-semibold">REAL CAPITAL RISK WARNING</p>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2 text-sm text-slate-800">
          <p className="font-semibold text-amber-800">ATTENTION: LIVE TRADING MODE</p>
          <p className="text-xs text-slate-700 leading-relaxed">
            This action connects active algorithms directly to connected Angel One trading accounts. 
            Real orders will be placed on the exchange and real capital will be committed.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setLiveModeConfirmOpen(false)}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 border border-slate-200 rounded-lg"
          >
            Stay in Paper Mode
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-md uppercase"
          >
            I UNDERSTAND, ENABLE LIVE
          </button>
        </div>
      </div>
    </div>
  );
};
