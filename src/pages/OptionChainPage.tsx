import React, { useState, useEffect } from 'react';
import { OptionChainTable } from '../components/options/OptionChainTable';
import { TradingViewChart } from '../components/market/TradingViewChart';
import { UnderlyingSymbol } from '../types/algo';
import { OptionChainRow } from '../types/options';
import { optionsApi } from '../api/optionsApi';
import { useTradingStore } from '../store/useTradingStore';
import { RefreshCw, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';

export const OptionChainPage: React.FC = () => {
  const marketQuotes = useTradingStore((s) => s.marketQuotes);

  const [underlying, setUnderlying] = useState<UnderlyingSymbol>('NIFTY');
  const [expiry, setExpiry] = useState<string>('26 SEP 2024');
  const [strikeRange, setStrikeRange] = useState<string>('Near ATM 10');
  const [showTvChart, setShowTvChart] = useState<boolean>(false);
  const [rows, setRows] = useState<OptionChainRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const spotQuote = marketQuotes[underlying];
  const spotLtp = spotQuote?.ltp;

  const fetchChain = () => {
    setLoading(true);
    optionsApi.getOptionChain(underlying, expiry, spotLtp).then((data) => {
      setRows(data || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchChain();
  }, [underlying, expiry]);

  // Recalculate Option Chain ATM and contract LTPs dynamically as live spot price ticks
  useEffect(() => {
    if (!spotLtp || rows.length === 0) return;
    const step = underlying === 'BANKNIFTY' ? 100 : 50;
    const atmStrike = Math.round(spotLtp / step) * step;

    setRows((prevRows) =>
      prevRows.map((row) => {
        const isATM = row.strike === atmStrike;
        const ceMoneyness = spotLtp - row.strike;
        const peMoneyness = row.strike - spotLtp;

        const ceLtp = Math.max(5, Math.round((Math.max(0, ceMoneyness) + Math.max(15, 180 - Math.abs((row.strike - atmStrike) / step) * 12)) * 100) / 100);
        const peLtp = Math.max(5, Math.round((Math.max(0, peMoneyness) + Math.max(15, 180 - Math.abs((row.strike - atmStrike) / step) * 12)) * 100) / 100);

        return {
          ...row,
          isATM,
          ce: { ...row.ce, ltp: ceLtp, isATM },
          pe: { ...row.pe, ltp: peLtp, isATM }
        };
      })
    );
  }, [spotLtp, underlying]);

  // Apply strike filter
  const filteredRows = React.useMemo(() => {
    if (rows.length === 0) return [];
    const atmIndex = rows.findIndex((r) => r.isATM);
    const centerIndex = atmIndex >= 0 ? atmIndex : Math.floor(rows.length / 2);

    if (strikeRange === 'Near ATM 5') {
      const start = Math.max(0, centerIndex - 5);
      const end = Math.min(rows.length, centerIndex + 6);
      return rows.slice(start, end);
    } else if (strikeRange === 'Near ATM 10') {
      const start = Math.max(0, centerIndex - 10);
      const end = Math.min(rows.length, centerIndex + 11);
      return rows.slice(start, end);
    }
    return rows;
  }, [rows, strikeRange]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Professional Option Chain</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time Strike Matrix, Open Interest, IV & Option Greeks
          </p>
        </div>

        {spotQuote && (
          <div className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs font-mono-num text-blue-900">
            <span className="text-slate-500 font-semibold">{underlying} SPOT:</span>{' '}
            <strong className={spotQuote.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              ₹{spotQuote.ltp.toFixed(2)} ({spotQuote.change >= 0 ? '+' : ''}{spotQuote.changePercent}%)
            </strong>
          </div>
        )}
      </div>

      {/* Top Controls Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 text-xs font-sans">
          <div>
            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Underlying</label>
            <select
              value={underlying}
              onChange={(e) => setUnderlying(e.target.value as UnderlyingSymbol)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="NIFTY">NIFTY</option>
              <option value="BANKNIFTY">BANKNIFTY</option>
              <option value="FINNIFTY">FINNIFTY</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Expiry Date</label>
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="26 SEP 2024">26 SEP 2024 (Weekly)</option>
              <option value="03 OCT 2024">03 OCT 2024 (Weekly)</option>
              <option value="31 OCT 2024">31 OCT 2024 (Monthly)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Strike Filter</label>
            <select
              value={strikeRange}
              onChange={(e) => setStrikeRange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="All">All Strikes (±15)</option>
              <option value="Near ATM 10">Near ATM (±10)</option>
              <option value="Near ATM 5">Near ATM (±5)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTvChart(!showTvChart)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all border ${
              showTvChart
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>TradingView Chart</span>
            {showTvChart ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={fetchChain}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
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

      {/* Option Chain Table */}
      <OptionChainTable rows={filteredRows} />
    </div>
  );
};
