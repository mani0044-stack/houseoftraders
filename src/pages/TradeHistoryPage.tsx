import React, { useState } from 'react';
import { useTradingStore } from '../store/useTradingStore';
import { DataTable, TableHeader, TableRow, TableCell } from '../components/common/DataTable';
import { Download, Search, History } from 'lucide-react';

export const TradeHistoryPage: React.FC = () => {
  const orders = useTradingStore((s) => s.orders);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const completedTrades = orders.filter((o) => o.status === 'COMPLETED');

  const filtered = completedTrades.filter((t) =>
    t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.algoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.accountName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Completed Trade History</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Historical Execution Ledger & Order Audit Log</p>
        </div>

        <button className="px-3.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs">
          <Download className="w-3.5 h-3.5 text-slate-500" /> Export Trades (CSV)
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-2.5">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Symbol, Algo, or Account..."
          className="bg-transparent text-xs text-slate-900 placeholder:text-slate-400 outline-none w-full font-medium"
        />
      </div>

      {filtered.length > 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <DataTable>
            <TableHeader>
              <tr>
                <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Time</th>
                <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Account</th>
                <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Algo Source</th>
                <th className="px-3.5 py-2.5 text-left text-xs font-semibold text-slate-600">Symbol</th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-slate-600">Side</th>
                <th className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">Qty</th>
                <th className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">Filled Price</th>
                <th className="px-3.5 py-2.5 text-right text-xs font-semibold text-slate-600">Broker Ref</th>
              </tr>
            </TableHeader>
            <tbody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-slate-500 text-xs font-mono-num">{t.timestamp}</TableCell>
                  <TableCell className="font-semibold text-slate-800 text-xs">{t.accountName}</TableCell>
                  <TableCell className="text-slate-600 text-xs">{t.algoName || 'Manual'}</TableCell>
                  <TableCell className="font-bold text-slate-900 text-xs">{t.symbol}</TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${t.side === 'BUY' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                      {t.side}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-800 font-mono-num">{t.quantity}</TableCell>
                  <TableCell className="text-right text-slate-700 font-mono-num">₹{(t.averagePrice || t.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-slate-500 font-mono-num text-[11px]">{t.brokerOrderId || t.id}</TableCell>
                </TableRow>
              ))}
            </tbody>
          </DataTable>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-sans">No Completed Trades Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
              Executed order history and completed trade logs will appear here once live or paper orders fill.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};


