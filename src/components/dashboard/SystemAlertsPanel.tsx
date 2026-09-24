import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { AlertCircle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SystemAlertsPanel: React.FC = () => {
  const activityLogs = useTradingStore((s) => s.activityLogs);
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">System & Risk Audit Stream</h3>
          <p className="text-xs text-slate-500 font-medium">Real-time Risk Audit Stream</p>
        </div>
        <button
          onClick={() => navigate('/activity-logs')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          View Full Audit Log
        </button>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
        {activityLogs.slice(0, 5).map((log) => {
          const Icon = log.severity === 'ERROR' ? ShieldAlert : log.severity === 'WARNING' ? AlertCircle : log.severity === 'SUCCESS' ? CheckCircle : Info;
          const iconColor = log.severity === 'ERROR' ? 'text-rose-600' : log.severity === 'WARNING' ? 'text-amber-600' : log.severity === 'SUCCESS' ? 'text-emerald-600' : 'text-blue-600';

          return (
            <div key={log.id} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-start gap-3">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between font-bold text-xs text-slate-900">
                  <span className="truncate">{log.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono font-normal shrink-0">{log.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed font-medium">{log.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
