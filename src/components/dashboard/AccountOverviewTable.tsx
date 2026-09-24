import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { StatusBadge } from '../common/StatusBadge';
import { DataTable, TableHeader, TableRow, TableCell } from '../common/DataTable';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccountOverviewTable: React.FC = () => {
  const accounts = useTradingStore((s) => s.accounts);
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-3.5">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account Overview</h3>
          <p className="text-xs text-slate-500 font-medium">Connected Angel One Broker Accounts</p>
        </div>
        <button
          onClick={() => navigate('/accounts')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
        >
          <span>Manage Accounts</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <DataTable>
        <TableHeader>
          <tr>
            <th className="px-4 py-3 text-left">Account Name</th>
            <th className="px-4 py-3 text-left">Broker</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Available Margin</th>
            <th className="px-4 py-3 text-right">Today's P&L</th>
            <th className="px-4 py-3 text-center">Positions</th>
          </tr>
        </TableHeader>
        <tbody>
          {accounts.map((acc) => (
            <TableRow key={acc.id}>
              <TableCell className="font-bold text-slate-900">
                {acc.name}
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{acc.clientId}</div>
              </TableCell>
              <TableCell className="font-mono-num font-semibold text-slate-700">{acc.broker}</TableCell>
              <TableCell>
                <StatusBadge status={acc.status} size="sm" />
              </TableCell>
              <TableCell className="text-right text-slate-900 font-bold font-mono-num">
                ₹{acc.availableMargin.toLocaleString()}
              </TableCell>
              <TableCell className={`text-right font-bold font-mono-num ${acc.todaysPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {acc.todaysPnL >= 0 ? '+' : ''}₹{acc.todaysPnL.toLocaleString()}
              </TableCell>
              <TableCell className="text-center font-bold text-slate-800 font-mono-num">
                {acc.openPositionsCount}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </DataTable>
    </div>
  );
};
