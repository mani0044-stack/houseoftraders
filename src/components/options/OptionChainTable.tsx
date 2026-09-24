import React from 'react';
import { OptionChainRow } from '../../types/options';
import { clsx } from 'clsx';
import { useUIStore } from '../../store/useUIStore';

interface OptionChainTableProps {
  rows: OptionChainRow[];
}

export const OptionChainTable: React.FC<OptionChainTableProps> = ({ rows = [] }) => {
  const setSelectedContract = useUIStore((s) => s.setSelectedContract);

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
      <table className="w-full text-center text-xs font-mono-num border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-700 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200/80">
            <th colSpan={8} className="py-2.5 px-3 border-r border-slate-200 text-emerald-700 font-bold text-center bg-emerald-50/40">
              CALLS (CE)
            </th>
            <th className="py-2.5 px-4 bg-blue-50 text-blue-900 font-extrabold text-center border-x border-slate-200">STRIKE</th>
            <th colSpan={8} className="py-2.5 px-3 border-l border-slate-200 text-rose-700 font-bold text-center bg-rose-50/40">
              PUTS (PE)
            </th>
          </tr>
          <tr className="bg-slate-100/70 text-slate-500 uppercase text-[9px] font-semibold border-b border-slate-200/80">
            {/* CALLS */}
            <th className="py-2 px-2 text-right">OI</th>
            <th className="py-2 px-2 text-right">Chg OI</th>
            <th className="py-2 px-2 text-right">Vol</th>
            <th className="py-2 px-2 text-right">IV</th>
            <th className="py-2 px-2 text-right">LTP</th>
            <th className="py-2 px-2 text-right">Chg</th>
            <th className="py-2 px-2 text-right">Bid</th>
            <th className="py-2 px-2 text-right border-r border-slate-200">Ask</th>

            {/* STRIKE */}
            <th className="py-2 px-3 bg-blue-50/60 text-blue-900 font-bold border-x border-slate-200">STRIKE</th>

            {/* PUTS */}
            <th className="py-2 px-2 text-left border-l border-slate-200">Bid</th>
            <th className="py-2 px-2 text-left">Ask</th>
            <th className="py-2 px-2 text-left">LTP</th>
            <th className="py-2 px-2 text-left">Chg</th>
            <th className="py-2 px-2 text-left">IV</th>
            <th className="py-2 px-2 text-left">Vol</th>
            <th className="py-2 px-2 text-left">Chg OI</th>
            <th className="py-2 px-2 text-left">OI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isAtm = row.isATM;
            return (
              <tr
                key={row.strike}
                className={clsx(
                  'border-b border-slate-100 hover:bg-slate-50/90 transition-colors',
                  isAtm && 'bg-amber-50/60 font-bold border-amber-200'
                )}
              >
                {/* CALL CONTRACT CELL CLICKABLE */}
                <td
                  onClick={() => setSelectedContract(row.ce)}
                  className="py-2.5 px-2 text-right text-slate-600 cursor-pointer hover:text-emerald-700 font-medium"
                >
                  {(row.ce.openInterest / 1000).toFixed(1)}k
                </td>
                <td className={`py-2.5 px-2 text-right font-medium ${row.ce.changeOI >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {row.ce.changeOI >= 0 ? '+' : ''}{(row.ce.changeOI / 1000).toFixed(1)}k
                </td>
                <td className="py-2.5 px-2 text-right text-slate-500">{(row.ce.volume / 1000).toFixed(1)}k</td>
                <td className="py-2.5 px-2 text-right text-slate-500">{row.ce.greeks.iv}%</td>
                <td
                  onClick={() => setSelectedContract(row.ce)}
                  className="py-2.5 px-2 text-right font-bold text-emerald-600 cursor-pointer bg-emerald-50/30 hover:bg-emerald-100/50"
                >
                  ₹{row.ce.ltp.toFixed(2)}
                </td>
                <td className={`py-2.5 px-2 text-right font-medium ${row.ce.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {row.ce.change >= 0 ? '+' : ''}{row.ce.change.toFixed(1)}
                </td>
                <td className="py-2.5 px-2 text-right text-slate-500">₹{row.ce.bidPrice.toFixed(1)}</td>
                <td className="py-2.5 px-2 text-right text-slate-500 border-r border-slate-200">
                  ₹{row.ce.askPrice.toFixed(1)}
                </td>

                {/* STRIKE CELL */}
                <td
                  className={clsx(
                    'py-2.5 px-3 font-bold text-center border-x border-slate-200',
                    isAtm ? 'bg-amber-400 text-slate-950 font-extrabold shadow-xs' : 'bg-slate-50 text-slate-900'
                  )}
                >
                  {row.strike}
                  {isAtm && <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-950">ATM</span>}
                </td>

                {/* PUT CONTRACT CELL CLICKABLE */}
                <td className="py-2.5 px-2 text-left text-slate-500 border-l border-slate-200">
                  ₹{row.pe.bidPrice.toFixed(1)}
                </td>
                <td className="py-2.5 px-2 text-left text-slate-500">₹{row.pe.askPrice.toFixed(1)}</td>
                <td
                  onClick={() => setSelectedContract(row.pe)}
                  className="py-2.5 px-2 text-left font-bold text-rose-600 cursor-pointer bg-rose-50/30 hover:bg-rose-100/50"
                >
                  ₹{row.pe.ltp.toFixed(2)}
                </td>
                <td className={`py-2.5 px-2 text-left font-medium ${row.pe.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {row.pe.change >= 0 ? '+' : ''}{row.pe.change.toFixed(1)}
                </td>
                <td className="py-2.5 px-2 text-left text-slate-500">{row.pe.greeks.iv}%</td>
                <td className="py-2.5 px-2 text-left text-slate-500">{(row.pe.volume / 1000).toFixed(1)}k</td>
                <td className={`py-2.5 px-2 text-left font-medium ${row.pe.changeOI >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {row.pe.changeOI >= 0 ? '+' : ''}{(row.pe.changeOI / 1000).toFixed(1)}k
                </td>
                <td
                  onClick={() => setSelectedContract(row.pe)}
                  className="py-2.5 px-2 text-left text-slate-600 cursor-pointer hover:text-rose-600 font-medium"
                >
                  {(row.pe.openInterest / 1000).toFixed(1)}k
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
