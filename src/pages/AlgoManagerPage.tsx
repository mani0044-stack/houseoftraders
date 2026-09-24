import React, { useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { AlgoCard } from '../components/algos/AlgoCard';
import { AlgoLogsModal } from '../components/algos/AlgoLogsModal';
import { Plus, Search, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AlgoManagerPage: React.FC = () => {
  const algos = useTradingStore((s) => s.algos);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterUnderlying, setFilterUnderlying] = useState<string>('ALL');

  const filteredAlgos = algos.filter((algo) => {
    const matchesSearch = algo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          algo.strategyType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnderlying = filterUnderlying === 'ALL' || algo.underlying === filterUnderlying;
    return matchesSearch && matchesUnderlying;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0F4C3A]" /> Option Strategy Manager
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Monitor & Control Active Multi-Account Options Algorithms & Spreads
          </p>
        </div>

        <button
          onClick={() => navigate('/create-algo')}
          className="px-4 py-2.5 text-xs font-bold bg-[#0F4C3A] hover:bg-[#0A3A2A] text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors uppercase tracking-wider shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Strategy
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search strategy by title or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F4C3A]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-mono font-medium">Underlying:</span>
          <select
            value={filterUnderlying}
            onChange={(e) => setFilterUnderlying(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#0F4C3A]"
          >
            <option value="ALL">All Index (NIFTY, BANKNIFTY...)</option>
            <option value="NIFTY">NIFTY</option>
            <option value="BANKNIFTY">BANKNIFTY</option>
            <option value="FINNIFTY">FINNIFTY</option>
          </select>
        </div>
      </div>

      {/* Algos Grid */}
      {filteredAlgos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAlgos.map((algo) => (
            <AlgoCard
              key={algo.id}
              algo={algo}
              onEdit={() => navigate('/create-algo')}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-[#0F4C3A] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Strategies Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              No algorithm strategies match your current filter or no strategies have been created yet.
            </p>
          </div>
          <button
            onClick={() => navigate('/create-algo')}
            className="px-4 py-2 text-xs font-bold bg-[#0F4C3A] hover:bg-[#0A3A2A] text-white rounded-lg shadow-sm"
          >
            Create Your First Option Spread
          </button>
        </div>
      )}

      <AlgoLogsModal />
    </div>
  );
};
