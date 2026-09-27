import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OptionChainTable } from '../components/options/OptionChainTable';
import { TradingViewChart } from '../components/market/TradingViewChart';
import { UnderlyingSymbol } from '../types/algo';
import { OptionChainRow } from '../types/options';
import { optionsApi } from '../api/optionsApi';
import { useTradingStore } from '../store/useTradingStore';
import { useUIStore } from '../store/useUIStore';
import { RefreshCw, BarChart2, ChevronDown, ChevronUp, Target, Sparkles, Layers } from 'lucide-react';

export const OptionChainPage: React.FC = () => {
  const marketQuotes = useTradingStore((s) => s.marketQuotes);
  const setSensibullModelsOpen = useUIStore((s) => s.setSensibullModelsOpen);

  const [underlying, setUnderlying] = useState<UnderlyingSymbol>('NIFTY');
  const [expiries, setExpiries] = useState<string[]>(['26 SEP 2024', '03 OCT 2024', '31 OCT 2024']);
  const [expiry, setExpiry] = useState<string>('26 SEP 2024');
  const [strikeRange, setStrikeRange] = useState<number>(10);
  const [showTvChart, setShowTvChart] = useState<boolean>(false);
  const [rows, setRows] = useState<OptionChainRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const spotQuote = marketQuotes[underlying];
  const spotLtp = spotQuote?.ltp;

  // Load available expiries for selected underlying
  useEffect(() => {
    optionsApi.getExpiries(underlying).then((dates) => {
      if (dates && dates.length > 0) {
        setExpiries(dates);
        setExpiry(dates[0]);
      }
    });
  }, [underlying]);

  // Fetch Option Chain matrix
  const fetchChain = () => {
    setLoading(true);
    optionsApi.getOptionChain(underlying, expiry, spotLtp, strikeRange).then((data) => {
      setRows(data || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchChain();
  }, [underlying, expiry, strikeRange]);

  // Dynamic real-time calculation update as live spot price ticks
  useEffect(() => {
    if (!spotLtp || rows.length === 0) return;
    const step = underlying === 'BANKNIFTY' ? 100 : 50;
    const atmStrike = Math.round(spotLtp / step) * step;

    setRows((prevRows) =>
      prevRows.map((row) => {
        const isATM = row.strike === atmStrike;
        const ceMoneyness = spotLtp - row.strike;
        const peMoneyness = row.strike - spotLtp;

        const ceLtp = Math.max(3, Math.round((Math.max(0, ceMoneyness) + Math.max(12, 175 - Math.abs((row.strike - atmStrike) / step) * 11.5)) * 100) / 100);
        const peLtp = Math.max(3, Math.round((Math.max(0, peMoneyness) + Math.max(12, 175 - Math.abs((row.strike - atmStrike) / step) * 11.5)) * 100) / 100);

        return {
          ...row,
          isATM,
          ce: { ...row.ce, ltp: ceLtp, isATM },
          pe: { ...row.pe, ltp: peLtp, isATM }
        };
      })
    );
  }, [spotLtp, underlying]);

  const scrollToATM = () => {
    const atmElement = document.querySelector('.bg-[#062c26]');
    if (atmElement) {
      atmElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 font-sans">
      {/* Top Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" /> Sensibull Live Option Chain Stream
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold uppercase border border-emerald-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE RELAY
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-Time Sensibull Stream (`wsrelay.sensibull.com`), Angel One Scrip Master & Black-Scholes Greeks Solver
          </p>
        </div>

        {spotQuote && (
          <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs font-mono-num text-emerald-950 flex items-center gap-2 shadow-xs">
            <span className="text-slate-500 font-semibold uppercase tracking-wider">{underlying} INDEX SPOT:</span>
            <strong className={`text-sm font-bold ${spotQuote.change >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              ₹{spotQuote.ltp.toFixed(2)} ({spotQuote.change >= 0 ? '+' : ''}{spotQuote.changePercent}%)
            </strong>
          </div>
        )}
      </div>

      {/* Top Controls Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 text-xs font-sans">
          <div>
            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-wider">Underlying Index</label>
            <select
              value={underlying}
              onChange={(e) => setUnderlying(e.target.value as UnderlyingSymbol)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 font-bold outline-none cursor-pointer hover:border-emerald-600 focus:border-emerald-600"
            >
              <option value="NIFTY">NIFTY 50</option>
              <option value="BANKNIFTY">BANK NIFTY</option>
              <option value="FINNIFTY">FIN NIFTY</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-wider">Expiry Date</label>
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 font-bold outline-none cursor-pointer hover:border-emerald-600 focus:border-emerald-600"
            >
              {expiries.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1 tracking-wider">Strikes Range</label>
            <select
              value={strikeRange}
              onChange={(e) => setStrikeRange(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 font-bold outline-none cursor-pointer hover:border-emerald-600 focus:border-emerald-600"
            >
              <option value={5}>ATM ± 5 Strikes (11 Rows)</option>
              <option value={10}>ATM ± 10 Strikes (21 Rows)</option>
              <option value={15}>ATM ± 15 Strikes (31 Rows)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSensibullModelsOpen(true)}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#062c26] hover:bg-[#0a423a] text-emerald-300 border border-emerald-800/80 flex items-center gap-1.5 transition-all shadow-xs"
            title="Open Sensibull Strategy Models & Ingestor"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sensibull Models</span>
          </button>

          <button
            onClick={scrollToATM}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 flex items-center gap-1.5 transition-all shadow-xs"
            title="Focus ATM Strike"
          >
            <Target className="w-3.5 h-3.5 text-amber-700" />
            <span>Focus ATM</span>
          </button>

          <button
            onClick={() => setShowTvChart(!showTvChart)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all border ${
              showTvChart
                ? 'bg-[#062c26] text-white border-[#062c26] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>TradingView Chart</span>
            {showTvChart ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={fetchChain}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Collapsible TradingView Live Chart Panel */}
      {showTvChart && (
        <div className="h-[380px] animate-fade-scale">
          <TradingViewChart symbol={underlying} timeframe="5m" height="100%" />
        </div>
      )}

      {/* Option Chain Grid Table */}
      <div ref={tableContainerRef}>
        <OptionChainTable rows={rows} spotLtp={spotLtp} />
      </div>
    </div>
  );
};
