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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Option Strategy Manager
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitor & Control Active Multi-Account Options Algorithms & Spreads
          </p>
        </div>

        <button
          onClick={() => navigate('/create-algo')}
          className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all uppercase tracking-wider shrink-0 font-sans"
        >
          <Plus className="w-4 h-4" /> Create New Strategy
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search strategy by title or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-sans font-bold uppercase text-[11px] tracking-wider">Underlying:</span>
          <select
            value={filterUnderlying}
            onChange={(e) => setFilterUnderlying(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans">No Strategies Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
              No algorithm strategies match your current filter or no strategies have been created yet.
            </p>
          </div>
          <button
            onClick={() => navigate('/create-algo')}
            className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
          >
            Create Your First Option Spread
          </button>
        </div>
      )}

      <AlgoLogsModal />
    </div>
  );
};
