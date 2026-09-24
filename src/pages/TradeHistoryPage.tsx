import React, { useState } from 'react';
import { DataTable, TableHeader, TableRow, TableCell } from '../components/common/DataTable';
import { Download, Search } from 'lucide-react';

const mockTradeHistory = [
  { id: 't-1', time: '2026-09-21 14:22', account: 'Main Angel Alpha', algo: 'NIFTY Momentum Scalper', symbol: 'NIFTY24SEP24850CE', type: 'CE', side: 'BUY', qty: 150, entryPrice: 142.50, exitPrice: 168.20, pnl: 3855.00, charges: 120 },
  { id: 't-2', time: '2026-09-21 11:30', account: 'Secondary Angel Beta', algo: 'BANKNIFTY Breakout Pro', symbol: 'BANKNIFTY24SEP53200CE', type: 'CE', side: 'BUY', qty: 30, entryPrice: 380.00, exitPrice: 445.50, pnl: 1965.00, charges: 80 },
  { id: 't-3', time: '2026-09-20 15:10', account: 'Main Angel Alpha', algo: 'NIFTY Momentum Scalper', symbol: 'NIFTY24SEP24800PE', type: 'PE', side: 'BUY', qty: 100, entryPrice: 95.00, exitPrice: 142.00, pnl: 4700.00, charges: 90 },
  { id: 't-4', time: '2026-09-20 10:15', account: 'Hedge Account Gamma', algo: 'Options Delta Scalper', symbol: 'FINNIFTY24SEP23600CE', type: 'CE', side: 'BUY', qty: 80, entryPrice: 110.00, exitPrice: 88.00, pnl: -1760.00, charges: 75 },
];

export const TradeHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = mockTradeHistory.filter((t) =>
    t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.algo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.account.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Completed Trade History</h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">Historical Execution Ledger & P&L Audit Log</p>
        </div>

        <button className="px-3.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs">
          <Download className="w-3.5 h-3.5 text-slate-500" /> Export Trades (CSV)
        </button>
      </div>

      {/* Search Bar */}
      <div className="card-premium p-3 flex items-center gap-2.5">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Symbol, Algo, or Account..."
          className="bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none w-full"
        />
      </div>

      <div className="card-premium p-0 overflow-hidden">
        <DataTable>
          <TableHeader>
            <tr>
              <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Time</th>
              <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Account</th>
              <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Algo Source</th>
              <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Symbol</th>
              <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-slate-600">Side</th>
              <th className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">Qty</th>
              <th className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">Entry Price</th>
              <th className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">Exit Price</th>
              <th className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">Net P&L (₹)</th>
              <th className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">Charges</th>
            </tr>
          </TableHeader>
          <tbody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-slate-500 text-xs font-mono-num">{t.time}</TableCell>
                <TableCell className="font-semibold text-slate-800 text-xs">{t.account}</TableCell>
                <TableCell className="text-slate-600 text-xs">{t.algo}</TableCell>
                <TableCell className="font-bold text-slate-900 text-xs">{t.symbol}</TableCell>
                <TableCell className="text-center">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${t.side === 'BUY' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {t.side}
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold text-slate-800 font-mono-num">{t.qty}</TableCell>
                <TableCell className="text-right text-slate-700 font-mono-num">₹{t.entryPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right text-slate-700 font-mono-num">₹{t.exitPrice.toFixed(2)}</TableCell>
                <TableCell className={`text-right font-bold font-mono-num ${t.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{t.pnl.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-slate-500 font-mono-num">₹{t.charges}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </DataTable>
      </div>
    </div>
  );
};

