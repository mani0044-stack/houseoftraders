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
    <div className="w-full overflow-x-auto rounded-xl border border-[#1F293D] bg-[#111827] shadow-sm">
      <table className="w-full text-center text-xs font-mono border-collapse">
        <thead>
          <tr className="bg-[#162032] text-gray-400 uppercase text-[10px] tracking-wider font-semibold border-b border-[#1F293D]">
            <th colSpan={8} className="py-2 px-3 border-r border-[#1F293D] text-profit font-bold text-center bg-profit-bg/20">
              CALLS (CE)
            </th>
            <th className="py-2 px-4 bg-[#1E293B] text-gray-200 font-bold text-center">STRIKE</th>
            <th colSpan={8} className="py-2 px-3 border-l border-[#1F293D] text-loss font-bold text-center bg-loss-bg/20">
              PUTS (PE)
            </th>
          </tr>
          <tr className="bg-[#0D131F] text-gray-400 uppercase text-[9px] border-b border-[#1F293D]">
            {/* CALLS */}
            <th className="py-1.5 px-2 text-right">OI</th>
            <th className="py-1.5 px-2 text-right">Chg OI</th>
            <th className="py-1.5 px-2 text-right">Vol</th>
            <th className="py-1.5 px-2 text-right">IV</th>
            <th className="py-1.5 px-2 text-right">LTP</th>
            <th className="py-1.5 px-2 text-right">Chg</th>
            <th className="py-1.5 px-2 text-right">Bid</th>
            <th className="py-1.5 px-2 text-right border-r border-[#1F293D]">Ask</th>

            {/* STRIKE */}
            <th className="py-1.5 px-3 bg-[#162032] text-gray-200 font-bold">STRIKE</th>

            {/* PUTS */}
            <th className="py-1.5 px-2 text-left border-l border-[#1F293D]">Bid</th>
            <th className="py-1.5 px-2 text-left">Ask</th>
            <th className="py-1.5 px-2 text-left">LTP</th>
            <th className="py-1.5 px-2 text-left">Chg</th>
            <th className="py-1.5 px-2 text-left">IV</th>
            <th className="py-1.5 px-2 text-left">Vol</th>
            <th className="py-1.5 px-2 text-left">Chg OI</th>
            <th className="py-1.5 px-2 text-left">OI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isAtm = row.isATM;
            return (
              <tr
                key={row.strike}
                className={clsx(
                  'border-b border-[#1F293D]/50 transition-colors hover:bg-[#1E293B]/80',
                  isAtm && 'bg-brand/15 font-bold border-brand'
                )}
              >
                {/* CALL CONTRACT CELL CLICKABLE */}
                <td
                  onClick={() => setSelectedContract(row.ce)}
                  className="py-2 px-2 text-right text-gray-300 cursor-pointer hover:text-profit hover:font-bold"
                >
                  {(row.ce.openInterest / 1000).toFixed(1)}k
                </td>
                <td className={`py-2 px-2 text-right ${row.ce.changeOI >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {row.ce.changeOI >= 0 ? '+' : ''}{(row.ce.changeOI / 1000).toFixed(1)}k
                </td>
                <td className="py-2 px-2 text-right text-gray-400">{(row.ce.volume / 1000).toFixed(1)}k</td>
                <td className="py-2 px-2 text-right text-gray-400">{row.ce.greeks.iv}%</td>
                <td
                  onClick={() => setSelectedContract(row.ce)}
                  className="py-2 px-2 text-right font-bold text-profit cursor-pointer bg-profit-bg/10 hover:bg-profit-bg/30"
                >
                  ₹{row.ce.ltp.toFixed(2)}
                </td>
                <td className={`py-2 px-2 text-right ${row.ce.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {row.ce.change >= 0 ? '+' : ''}{row.ce.change.toFixed(1)}
                </td>
                <td className="py-2 px-2 text-right text-gray-400">₹{row.ce.bidPrice.toFixed(1)}</td>
                <td className="py-2 px-2 text-right text-gray-400 border-r border-[#1F293D]">
                  ₹{row.ce.askPrice.toFixed(1)}
                </td>

                {/* STRIKE CELL */}
                <td
                  className={clsx(
                    'py-2 px-3 font-bold font-mono text-center tracking-wider',
                    isAtm ? 'bg-brand text-white shadow-lg scale-105' : 'bg-[#162032] text-gray-100'
                  )}
                >
                  {row.strike}
                  {isAtm && <span className="block text-[9px] font-normal tracking-normal uppercase">ATM</span>}
                </td>

                {/* PUT CONTRACT CELL CLICKABLE */}
                <td className="py-2 px-2 text-left text-gray-400 border-l border-[#1F293D]">
                  ₹{row.pe.bidPrice.toFixed(1)}
                </td>
                <td className="py-2 px-2 text-left text-gray-400">₹{row.pe.askPrice.toFixed(1)}</td>
                <td
                  onClick={() => setSelectedContract(row.pe)}
                  className="py-2 px-2 text-left font-bold text-loss cursor-pointer bg-loss-bg/10 hover:bg-loss-bg/30"
                >
                  ₹{row.pe.ltp.toFixed(2)}
                </td>
                <td className={`py-2 px-2 text-left ${row.pe.change >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {row.pe.change >= 0 ? '+' : ''}{row.pe.change.toFixed(1)}
                </td>
                <td className="py-2 px-2 text-left text-gray-400">{row.pe.greeks.iv}%</td>
                <td className="py-2 px-2 text-left text-gray-400">{(row.pe.volume / 1000).toFixed(1)}k</td>
                <td className={`py-2 px-2 text-left ${row.pe.changeOI >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {row.pe.changeOI >= 0 ? '+' : ''}{(row.pe.changeOI / 1000).toFixed(1)}k
                </td>
                <td
                  onClick={() => setSelectedContract(row.pe)}
                  className="py-2 px-2 text-left text-gray-300 cursor-pointer hover:text-loss hover:font-bold"
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
