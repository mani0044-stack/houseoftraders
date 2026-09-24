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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Completed Trade History</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Historical Execution Ledger & P&L Audit Log</p>
        </div>

        <button className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 font-mono">
          <Download className="w-3.5 h-3.5" /> Export Trades (CSV)
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2 shadow-xs">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Symbol, Algo, or Account..."
          className="bg-transparent text-xs text-slate-900 outline-none w-full font-mono"
        />
      </div>

      <DataTable>
        <TableHeader>
          <tr>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-3 py-2 text-left">Account</th>
            <th className="px-3 py-2 text-left">Algo Source</th>
            <th className="px-3 py-2 text-left">Symbol</th>
            <th className="px-3 py-2 text-center">Side</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Entry Price</th>
            <th className="px-3 py-2 text-right">Exit Price</th>
            <th className="px-3 py-2 text-right">Net P&L (₹)</th>
            <th className="px-3 py-2 text-right">Charges</th>
          </tr>
        </TableHeader>
        <tbody>
          {filtered.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="text-slate-500 text-xs font-mono">{t.time}</TableCell>
              <TableCell className="font-medium text-slate-800">{t.account}</TableCell>
              <TableCell className="text-slate-600 text-xs">{t.algo}</TableCell>
              <TableCell className="font-bold text-slate-900 font-mono">{t.symbol}</TableCell>
              <TableCell className="text-center">
                <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${t.side === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {t.side}
                </span>
              </TableCell>
              <TableCell className="text-right font-bold text-slate-800">{t.qty}</TableCell>
              <TableCell className="text-right text-slate-700">₹{t.entryPrice.toFixed(2)}</TableCell>
              <TableCell className="text-right text-slate-700">₹{t.exitPrice.toFixed(2)}</TableCell>
              <TableCell className={`text-right font-bold ${t.pnl >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                ₹{t.pnl.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-slate-500">₹{t.charges}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
};
