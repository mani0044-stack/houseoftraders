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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System & Execution Activity Logs</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Real-time System Audit Stream & Severity Filter</p>
        </div>

        <button className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 font-mono">
          <Download className="w-3.5 h-3.5" /> Export Logs (JSON)
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs by keyword..."
            className="bg-transparent text-slate-900 outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 outline-none"
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
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
        {filtered.map((log) => (
          <div key={log.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors flex items-start justify-between gap-4 font-mono text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={log.severity} size="sm" />
                <span className="font-bold text-slate-900">{log.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">{log.category}</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-sans">{log.message}</p>
            </div>

            <span className="text-[11px] text-slate-500 shrink-0">{log.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
