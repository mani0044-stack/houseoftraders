import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { AlertCircle, CheckCircle, Info, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SystemAlertsPanel: React.FC = () => {
  const activityLogs = useTradingStore((s) => s.activityLogs);
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-[#E3E8E6] rounded-2xl p-5 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3.5 border-b border-[#E3E8E6] mb-1">
        <div>
          <h3 className="text-xs font-bold text-[#12211C] uppercase tracking-wider">System & Risk Audit Stream</h3>
          <p className="text-xs text-[#6B7C75] font-medium">Real-time Risk Audit Stream</p>
        </div>
        <button
          onClick={() => navigate('/activity-logs')}
          className="text-xs font-semibold text-[#0F6B5C] hover:text-[#0B5347] hover:underline"
        >
          View Full Audit Log
        </button>
      </div>

      <div className="flex flex-col overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
        {activityLogs.slice(0, 5).map((log) => {
          const Icon = log.severity === 'ERROR' ? ShieldAlert : log.severity === 'WARNING' ? AlertCircle : log.severity === 'SUCCESS' ? CheckCircle : Info;
          const iconColor = log.severity === 'ERROR' ? 'text-rose-600' : log.severity === 'WARNING' ? 'text-amber-600' : log.severity === 'SUCCESS' ? 'text-emerald-600' : 'text-[#0F6B5C]';

          return (
            <div
              key={log.id}
              className="py-3 border-b border-[#E3E8E6] last:border-b-0 flex items-start gap-3"
            >
              <span className="text-[11px] text-[#6B7C75] font-mono shrink-0 w-24 mt-0.5">{log.timestamp}</span>
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-baseline md:gap-3">
                <span className="font-bold text-xs text-[#12211C] shrink-0">{log.title}</span>
                <p className="text-[11px] text-[#6B7C75] font-medium leading-relaxed">{log.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};