import React, { useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { SeverityLevel } from '../types/activity';
import { StatusBadge } from '../components/common/StatusBadge';
import { Search, Download } from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  const activityLogs = useTradingStore((s) => s.activityLogs);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'ALL'>('ALL');

  const filtered = activityLogs.filter((log) => {
    if (severityFilter !== 'ALL' && log.severity !== severityFilter) return false;
    if (searchTerm && !log.title.toLowerCase().includes(searchTerm.toLowerCase()) && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System & Execution Activity Logs</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Real-time System Audit Stream & Severity Filter</p>
        </div>

        <button className="px-3.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs">
          <Download className="w-3.5 h-3.5 text-slate-500" /> Export Logs (JSON)
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="card-premium p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg focus-within:border-blue-500 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs by keyword..."
            className="bg-transparent text-slate-900 outline-none w-full placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 outline-none focus:border-blue-500 font-semibold"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
          </select>
        </div>
      </div>

      {/* Stream List */}
      <div className="card-premium p-4 space-y-2.5">
        {filtered.map((log) => (
          <div key={log.id} className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-200/80 hover:border-blue-200 hover:bg-white transition-all flex items-start justify-between gap-4 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <StatusBadge status={log.severity} size="sm" />
                <span className="font-semibold text-slate-900">{log.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 font-medium">{log.category}</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-normal">{log.message}</p>
            </div>

            <span className="text-[11px] text-slate-400 shrink-0 font-mono-num">{log.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

