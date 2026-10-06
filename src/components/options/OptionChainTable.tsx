import React, { useEffect, useRef, useState } from 'react';
import { OptionChainRow } from '../../types/options';
import { clsx } from 'clsx';
import { useUIStore } from '../../store/useUIStore';

interface OptionChainTableProps {
  rows: OptionChainRow[];
  spotLtp?: number;
}

// Performant flashing cell component that flashes green on tick increase, red on tick decrease
const FlashCell: React.FC<{
  value: number;
  formatter: (val: number) => string;
  className?: string;
  onClick?: () => void;
}> = React.memo(({ value, formatter, className, onClick }) => {
  const prevValueRef = useRef<number>(value);
  const [flashClass, setFlashClass] = useState<string>('');

  useEffect(() => {
    if (prevValueRef.current !== value) {
      if (value > prevValueRef.current) {
        setFlashClass('bg-emerald-200 text-emerald-900 font-extrabold transition-none');
      } else if (value < prevValueRef.current) {
        setFlashClass('bg-rose-200 text-rose-900 font-extrabold transition-none');
      }
      prevValueRef.current = value;

      const timer = setTimeout(() => {
        setFlashClass('transition-colors duration-700');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <td
      onClick={onClick}
      className={clsx('transition-colors duration-500', flashClass || className)}
    >
      {formatter(value)}
    </td>
  );
});

export const OptionChainTable: React.FC<OptionChainTableProps> = ({ rows = [], spotLtp }) => {
  const setSelectedContract = useUIStore((s) => s.setSelectedContract);

  // Determine current ATM strike
  const atmRow = rows.find((r) => r.isATM);
  const atmStrike = atmRow ? atmRow.strike : 0;

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <table className="w-full text-center text-xs font-mono-num border-collapse">
        <thead>
          <tr className="bg-[#062c26] text-white uppercase text-[10px] tracking-widest font-bold border-b border-[#0f443c]">
            <th colSpan={6} className="py-3 px-3 border-r border-[#0f443c] text-[#10b981] font-bold text-center bg-[#07362f]">
              CALLS (CE)
            </th>
            <th className="py-3 px-4 bg-[#0d483d] text-white font-extrabold text-center border-x border-[#0f443c]">
              STRIKE PRICE
            </th>
            <th colSpan={6} className="py-3 px-3 border-l border-[#0f443c] text-rose-400 font-bold text-center bg-[#07362f]">
              PUTS (PE)
            </th>
          </tr>
          <tr className="bg-slate-100 text-slate-600 uppercase text-[9.5px] font-bold tracking-wider border-b border-slate-200">
            {/* CALLS */}
            <th className="py-2.5 px-2 text-right">OI (Lakhs)</th>
            <th className="py-2.5 px-2 text-right">Chg OI</th>
            <th className="py-2.5 px-2 text-right">Volume</th>
            <th className="py-2.5 px-2 text-right">IV %</th>
            <th className="py-2.5 px-2 text-right font-bold text-emerald-700 bg-emerald-50/60">LTP (₹)</th>
            <th className="py-2.5 px-2 text-right border-r border-slate-200">Chg</th>

            {/* STRIKE */}
            <th className="py-2.5 px-3 bg-[#062c26] text-white font-bold border-x border-slate-200 text-center">STRIKE</th>

            {/* PUTS */}
            <th className="py-2.5 px-2 text-left border-l border-slate-200 font-bold text-rose-700 bg-rose-50/60">LTP (₹)</th>
            <th className="py-2.5 px-2 text-left">Chg</th>
            <th className="py-2.5 px-2 text-left">IV %</th>
            <th className="py-2.5 px-2 text-left">Volume</th>
            <th className="py-2.5 px-2 text-left">Chg OI</th>
            <th className="py-2.5 px-2 text-left">OI (Lakhs)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isAtm = row.isATM;
            const isCallITM = atmStrike > 0 ? row.strike < atmStrike : false;
            const isPutITM = atmStrike > 0 ? row.strike > atmStrike : false;

            return (
              <tr
                key={row.strike}
                className={clsx(
                  'border-b border-slate-100 transition-colors',
                  isAtm ? 'bg-amber-100/70 font-bold border-amber-300 shadow-xs' : 'hover:bg-slate-50'
                )}
              >
                {/* CALLS DATA */}
                <FlashCell
                  value={row.ce.openInterest}
                  formatter={(val) => `${(val / 100000).toFixed(2)}L`}
                  onClick={() => setSelectedContract(row.ce)}
                  className={clsx(
                    "py-2.5 px-2 text-right text-slate-700 font-medium cursor-pointer hover:text-emerald-700",
                    isCallITM && "bg-emerald-50/30"
                  )}
                />
                <td className={clsx("py-2.5 px-2 text-right font-medium", row.ce.changeOI >= 0 ? "text-emerald-600" : "text-rose-600", isCallITM && "bg-emerald-50/30")}>
                  {row.ce.changeOI >= 0 ? '+' : ''}{(row.ce.changeOI / 1000).toFixed(1)}k
                </td>
                <td className={clsx("py-2.5 px-2 text-right text-slate-500", isCallITM && "bg-emerald-50/30")}>
                  {(row.ce.volume / 1000).toFixed(1)}k
                </td>
                <td className={clsx("py-2.5 px-2 text-right text-slate-500 font-mono", isCallITM && "bg-emerald-50/30")}>
                  {row.ce.greeks?.iv || 15.0}%
                </td>
                <FlashCell
                  value={row.ce.ltp}
                  formatter={(val) => `₹${val.toFixed(2)}`}
                  onClick={() => setSelectedContract(row.ce)}
                  className={clsx(
                    "py-2.5 px-2 text-right font-bold cursor-pointer text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100",
                    isCallITM && "bg-emerald-100/50"
                  )}
                />
                <td className={clsx("py-2.5 px-2 text-right font-semibold border-r border-slate-200", row.ce.change >= 0 ? "text-emerald-600" : "text-rose-600", isCallITM && "bg-emerald-50/30")}>
                  {row.ce.change >= 0 ? '+' : ''}{row.ce.change.toFixed(1)}
                </td>

                {/* STRIKE PRICE COLUMN */}
                <td
                  className={clsx(
                    'py-2.5 px-3 font-bold text-center border-x border-slate-200 select-none',
                    isAtm ? 'bg-[#062c26] text-white font-extrabold shadow-md scale-105 rounded-md' : 'bg-slate-50 text-slate-900'
                  )}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{row.strike}</span>
                    {isAtm && <span className="text-[9px] bg-[#10b981] text-slate-950 px-1.5 py-0.5 rounded font-sans uppercase tracking-wider font-extrabold">ATM</span>}
                  </div>
                </td>

                {/* PUTS DATA */}
                <FlashCell
                  value={row.pe.ltp}
                  formatter={(val) => `₹${val.toFixed(2)}`}
                  onClick={() => setSelectedContract(row.pe)}
                  className={clsx(
                    "py-2.5 px-2 text-left font-bold cursor-pointer text-rose-700 border-l border-slate-200 bg-rose-50/70 hover:bg-rose-100",
                    isPutITM && "bg-rose-100/50"
                  )}
                />
                <td className={clsx("py-2.5 px-2 text-left font-semibold", row.pe.change >= 0 ? "text-emerald-600" : "text-rose-600", isPutITM && "bg-rose-50/30")}>
                  {row.pe.change >= 0 ? '+' : ''}{row.pe.change.toFixed(1)}
                </td>
                <td className={clsx("py-2.5 px-2 text-left text-slate-500 font-mono", isPutITM && "bg-rose-50/30")}>
                  {row.pe.greeks?.iv || 15.0}%
                </td>
                <td className={clsx("py-2.5 px-2 text-left text-slate-500", isPutITM && "bg-rose-50/30")}>
                  {(row.pe.volume / 1000).toFixed(1)}k
                </td>
                <td className={clsx("py-2.5 px-2 text-left font-medium", row.pe.changeOI >= 0 ? "text-emerald-600" : "text-rose-600", isPutITM && "bg-rose-50/30")}>
                  {row.pe.changeOI >= 0 ? '+' : ''}{(row.pe.changeOI / 1000).toFixed(1)}k
                </td>
                <FlashCell
                  value={row.pe.openInterest}
                  formatter={(val) => `${(val / 100000).toFixed(2)}L`}
                  onClick={() => setSelectedContract(row.pe)}
                  className={clsx(
                    "py-2.5 px-2 text-left text-slate-700 font-medium cursor-pointer hover:text-rose-700",
                    isPutITM && "bg-rose-50/30"
                  )}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
