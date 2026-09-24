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
          <th className="px-3 py-2 text-left">Time</th>
          <th className="px-3 py-2 text-left">Account</th>
          <th className="px-3 py-2 text-left">Algo Source</th>
          <th className="px-3 py-2 text-left">Symbol</th>
          <th className="px-3 py-2 text-center">Side</th>
          <th className="px-3 py-2 text-right">Qty</th>
          <th className="px-3 py-2 text-center">Type</th>
          <th className="px-3 py-2 text-right">Price</th>
          <th className="px-3 py-2 text-left">Broker Order ID</th>
          <th className="px-3 py-2 text-center">Status</th>
        </tr>
      </TableHeader>
      <tbody>
        {orders.map((ord) => (
          <TableRow key={ord.id} onClick={() => setSelectedOrder(ord)}>
            <TableCell className="text-gray-400 text-xs font-mono">{ord.timestamp}</TableCell>
            <TableCell className="font-medium text-gray-200">{ord.accountName}</TableCell>
            <TableCell className="text-gray-300 text-xs">{ord.algoName}</TableCell>
            <TableCell className="font-bold text-gray-100 font-mono">{ord.symbol}</TableCell>
            <TableCell className="text-center">
              <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${ord.side === 'BUY' ? 'bg-profit-bg text-profit' : 'bg-loss-bg text-loss'}`}>
                {ord.side}
              </span>
            </TableCell>
            <TableCell className="text-right font-bold text-gray-200">{ord.quantity}</TableCell>
            <TableCell className="text-center">
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#162032] text-gray-300 border border-[#1F293D] font-mono">
                {ord.orderType}
              </span>
            </TableCell>
            <TableCell className="text-right font-bold text-gray-100">₹{ord.price.toFixed(2)}</TableCell>
            <TableCell className="text-gray-400 font-mono text-[11px]">{ord.brokerOrderId}</TableCell>
            <TableCell className="text-center">
              <StatusBadge status={ord.status} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      </tbody>
    </DataTable>
  );
};
