import React from 'react';
import { Order } from '../../types/order';
import { StatusBadge } from '../common/StatusBadge';
import { DataTable, TableHeader, TableRow, TableCell } from '../common/DataTable';
import { useUIStore } from '../../store/useUIStore';

interface OrderTableProps {
  orders: Order[];
}

export const OrderTable: React.FC<OrderTableProps> = ({ orders }) => {
  const setSelectedOrder = useUIStore((s) => s.setSelectedOrder);

  return (
    <DataTable>
      <TableHeader>
        <tr>
          <th className="px-4 py-3 text-left">Time</th>
          <th className="px-4 py-3 text-left">Account</th>
          <th className="px-4 py-3 text-left">Algo Source</th>
          <th className="px-4 py-3 text-left">Symbol</th>
          <th className="px-4 py-3 text-center">Side</th>
          <th className="px-4 py-3 text-right">Qty</th>
          <th className="px-4 py-3 text-center">Type</th>
          <th className="px-4 py-3 text-right">Price</th>
          <th className="px-4 py-3 text-left">Broker Order ID</th>
          <th className="px-4 py-3 text-center">Status</th>
        </tr>
      </TableHeader>
      <tbody>
        {orders.map((ord) => (
          <TableRow key={ord.id} onClick={() => setSelectedOrder(ord)}>
            <TableCell className="text-slate-400 text-xs font-mono-num">{ord.timestamp}</TableCell>
            <TableCell className="font-bold text-slate-900">{ord.accountName}</TableCell>
            <TableCell className="text-slate-600 text-xs font-medium">{ord.algoName}</TableCell>
            <TableCell className="font-bold text-slate-900 font-sans">{ord.symbol}</TableCell>
            <TableCell className="text-center">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-sans ${ord.side === 'BUY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-rose-50 text-rose-700 border border-rose-200/80'}`}>
                {ord.side}
              </span>
            </TableCell>
            <TableCell className="text-right font-bold text-slate-900 font-mono-num">{ord.quantity}</TableCell>
            <TableCell className="text-center">
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-mono-num font-semibold">
                {ord.orderType}
              </span>
            </TableCell>
            <TableCell className="text-right font-bold text-slate-900 font-mono-num">₹{ord.price.toFixed(2)}</TableCell>
            <TableCell className="text-slate-500 font-mono-num text-[11px] font-medium">{ord.brokerOrderId}</TableCell>
            <TableCell className="text-center">
              <StatusBadge status={ord.status} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  );
};
