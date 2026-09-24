import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { AlertCircle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SystemAlertsPanel: React.FC = () => {
  const activityLogs = useTradingStore((s) => s.activityLogs);
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">System & Risk Alerts</h3>
          <p className="text-xs text-slate-500 font-mono">Real-time Risk Audit Stream</p>
        </div>
        <button
          onClick={() => navigate('/activity-logs')}
          className="text-xs font-semibold text-[#0F4C3A] hover:underline"
        >
          View Log Stream
        </button>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
        {activityLogs.slice(0, 5).map((log) => {
          const Icon = log.severity === 'ERROR' ? ShieldAlert : log.severity === 'WARNING' ? AlertCircle : log.severity === 'SUCCESS' ? CheckCircle : Info;
          const iconColor = log.severity === 'ERROR' ? 'text-red-600' : log.severity === 'WARNING' ? 'text-amber-600' : log.severity === 'SUCCESS' ? 'text-emerald-600' : 'text-[#0F4C3A]';

          return (
            <div key={log.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between font-semibold text-xs text-slate-900">
                  <span>{log.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{log.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
