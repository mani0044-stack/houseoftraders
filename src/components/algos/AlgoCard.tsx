import React, { useState } from 'react';
import { Algorithm } from '../../types/algo';
import { StatusBadge } from '../common/StatusBadge';
import { Play, Square, Pause, Copy, Edit, FileText, Layers, Trash2, Zap } from 'lucide-react';
import { algosApi } from '../../api/algosApi';
import { useTradingStore } from '../../store/useTradingStore';
import { useUIStore } from '../../store/useUIStore';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface AlgoCardProps {
  algo: Algorithm;
  onEdit?: (algo: Algorithm) => void;
}

export const AlgoCard: React.FC<AlgoCardProps> = ({ algo, onEdit }) => {
  const updateAlgoStatus = useTradingStore((s) => s.updateAlgoStatus);
  const deleteAlgorithm = useTradingStore((s) => s.deleteAlgorithm);
  const setSelectedAlgoForLogs = useUIStore((s) => s.setSelectedAlgoForLogs);
  const addToast = useUIStore((s) => s.addToast);
  const refreshOrders = useTradingStore((s) => s.fetchOrders);
  const refreshPositions = useTradingStore((s) => s.fetchPositions);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const handleDuplicate = () => {
    addToast('Strategy Duplicated', `Created copy of strategy "${algo.name}".`, 'info');
  };

  const handleDelete = () => {
    deleteAlgorithm(algo.id);
    addToast('Strategy Deleted', `Strategy "${algo.name}" was permanently removed.`, 'warning');
  };

  const handleExecuteSignal = async () => {
    setIsExecuting(true);
    try {
      const res = await algosApi.executeAlgo(algo.id);
      if (res.success) {
        addToast(
          'Algo Order Transmitted',
          `Executed signal for ${algo.name}. Broker Order ID: ${res.order.broker_order_id} (${res.order.mode})`,
          'success'
        );
        refreshOrders();
        refreshPositions();
      } else {
        addToast('Execution Blocked', res.message, 'warning');
      }
    } catch {
      addToast('Execution Failed', 'Failed to transmit algo order to broker.', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 tracking-tight">{algo.name}</h3>
                <StatusBadge status={algo.status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{algo.description}</p>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-mono text-[#0F4C3A]">
              <Layers className="w-3 h-3" />
              <span>{algo.underlying}</span>
            </div>
          </div>

          {/* Strategy Meta Pills */}
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#0F4C3A] font-semibold border border-emerald-200">
              {algo.strategyType}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Mode: {algo.mode}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Expiry: {algo.expiryType}
            </span>
          </div>

          {/* Legs Visualization Pills if available */}
          {algo.legs && algo.legs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1 items-center">
              <span className="text-[10px] text-slate-400 font-mono">Legs:</span>
              {algo.legs.map((leg, idx) => (
                <span
                  key={leg.id || idx}
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    leg.action === 'BUY'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-red-50 text-red-800 border-red-300'
                  }`}
                >
                  {leg.action} {leg.lots}x {leg.strikeSelection} {leg.optionType}
                </span>
              ))}
            </div>
          )}

          {/* Financial Metrics */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase text-slate-500 font-semibold">Today's P&L</span>
              <p className={`text-sm font-bold font-mono-num mt-0.5 ${algo.todaysPnL >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                ₹{algo.todaysPnL.toLocaleString()}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase text-slate-500 font-semibold">Trades Today</span>
              <p className="text-sm font-bold font-mono-num text-slate-900 mt-0.5">
                {algo.tradesToday} trades
              </p>
            </div>
          </div>

          {/* Exposure vs Max Loss */}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">Current Exposure:</span>
              <span className="text-slate-800">₹{algo.currentExposure.toLocaleString()} / ₹{(algo.maxDailyLoss * 10).toLocaleString()}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-[#0F4C3A]"
                style={{ width: `${Math.min(100, (algo.currentExposure / (algo.maxDailyLoss * 10)) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedAlgoForLogs(algo)}
              className="p-1.5 rounded bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
              title="View Strategy Logs"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDuplicate}
              className="p-1.5 rounded bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
              title="Duplicate Strategy"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {onEdit && (
              <button
                onClick={() => onEdit(algo)}
                className="p-1.5 rounded bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200"
                title="Edit Strategy"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-1.5 rounded bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 transition-colors"
              title="Delete Strategy"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExecuteSignal}
              disabled={isExecuting}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1 shadow-sm"
              title="Transmit Algo Order to Broker"
            >
              <Zap className="w-3.5 h-3.5 fill-current" /> {isExecuting ? 'Sending...' : 'Run Order'}
            </button>
            {algo.status === 'Active' ? (
              <>
                <button
                  onClick={() => updateAlgoStatus(algo.id, 'Paused')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-500 hover:text-slate-950 transition-colors flex items-center gap-1"
                >
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
                <button
                  onClick={() => updateAlgoStatus(algo.id, 'Stopped')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" /> Stop
                </button>
              </>
            ) : (
              <button
                onClick={() => updateAlgoStatus(algo.id, 'Active')}
                className="px-4 py-1.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5" /> Start Strategy
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={`Delete Strategy "${algo.name}"?`}
        description="Are you sure you want to delete this option strategy? All associated parameters and trade allocations will be deleted permanently."
        confirmText="Delete Strategy"
        confirmVariant="danger"
      />
    </>
  );
};
