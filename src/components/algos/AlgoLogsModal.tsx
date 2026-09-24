import React from 'react';
import { X, Terminal } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const AlgoLogsModal: React.FC = () => {
  const selectedAlgoForLogs = useUIStore((s) => s.selectedAlgoForLogs);
  const setSelectedAlgoForLogs = useUIStore((s) => s.setSelectedAlgoForLogs);

  if (!selectedAlgoForLogs) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        <button
          onClick={() => setSelectedAlgoForLogs(null)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-[#0F4C3A] border border-emerald-200">
            <Terminal className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{selectedAlgoForLogs.name} — Real-time Execution Logs</h2>
            <p className="text-xs text-slate-500 font-mono">Strategy Signal & Risk Check Trace</p>
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto bg-slate-950 text-slate-200 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 custom-scrollbar shadow-inner">
          <p className="text-slate-400">[SYSTEM] Listening for live websocket ticks on {selectedAlgoForLogs.underlying}...</p>
          <p className="text-emerald-400">[SIGNAL] 14:22:04.120 - Entry condition met: EMA(9) crossed above EMA(21) & RSI(14)=62.4 & Price &gt; VWAP.</p>
          <p className="text-blue-400">[RISK] 14:22:04.350 - Checked global daily loss limit (₹0 / ₹50,000) - APPROVED.</p>
          <p className="text-blue-400">[RISK] 14:22:04.400 - Checked account margin allocation for Main Angel Alpha - APPROVED.</p>
          <p className="text-slate-100">[ORDER] 14:22:04.500 - Transmitted BUY 150 {selectedAlgoForLogs.underlying}24SEP24850CE @ MARKET to Angel One API.</p>
          <p className="text-emerald-400">[BROKER] 14:22:05.100 - Execution response: FILLED @ 142.50. Broker Order ID: ANGEL-20260921-9981.</p>
          <p className="text-amber-400">[POSITION] 14:22:05.150 - Position opened. Trailing stop loss set at 12% below entry.</p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={() => setSelectedAlgoForLogs(null)}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-lg"
          >
            Close Logs
          </button>
        </div>
      </div>
    </div>
  );
};
