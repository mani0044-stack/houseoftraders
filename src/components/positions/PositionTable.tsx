import React, { useState } from 'react';
import { Position } from '../../types/position';
import { StatusBadge } from '../common/StatusBadge';
import { DataTable, TableHeader, TableRow, TableCell } from '../common/DataTable';
import { LogOut, AlertOctagon } from 'lucide-react';
import { useTradingStore } from '../../store/useTradingStore';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface PositionTableProps {
  positions: Position[];
}

export const PositionTable: React.FC<PositionTableProps> = ({ positions }) => {
  const exitPosition = useTradingStore((s) => s.exitPosition);
  const exitAllPositions = useTradingStore((s) => s.exitAllPositions);

  const [confirmExitId, setConfirmExitId] = useState<string | null>(null);
  const [confirmExitAll, setConfirmExitAll] = useState<boolean>(false);

  const openPositions = positions.filter((p) => p.status === 'OPEN');

  return (
    <div className="space-y-4">
      {/* Top Bulk Action */}
      {openPositions.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setConfirmExitAll(true)}
            className="px-4 py-2 text-xs font-bold bg-loss-bg text-loss hover:bg-loss hover:text-white border border-loss/40 rounded-lg font-mono uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5"
          >
            <AlertOctagon className="w-4 h-4" /> Exit All Open Positions ({openPositions.length})
          </button>
        </div>
      )}

      <DataTable>
        <TableHeader>
          <tr>
            <th className="px-3 py-2 text-left">Account</th>
            <th className="px-3 py-2 text-left">Symbol</th>
            <th className="px-3 py-2 text-center">Type</th>
            <th className="px-3 py-2 text-right">Qty</th>
            <th className="px-3 py-2 text-right">Avg Price</th>
            <th className="px-3 py-2 text-right">LTP</th>
            <th className="px-3 py-2 text-right">P&L (₹)</th>
            <th className="px-3 py-2 text-right">P&L (%)</th>
            <th className="px-3 py-2 text-left">Algo Source</th>
            <th className="px-3 py-2 text-center">Action</th>
          </tr>
        </TableHeader>
        <tbody>
          {positions.map((pos) => (
            <TableRow key={pos.id} className={pos.status === 'CLOSED' ? 'opacity-60 bg-gray-900/40' : ''}>
              <TableCell className="font-medium text-gray-200">{pos.accountName}</TableCell>
              <TableCell className="font-semibold text-gray-100 font-mono">
                {pos.symbol}
                <div className="text-[10px] text-gray-400 font-normal">{pos.expiry}</div>
              </TableCell>
              <TableCell className="text-center">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pos.type === 'CE' ? 'bg-profit-bg text-profit' : 'bg-loss-bg text-loss'}`}>
                  {pos.type}
                </span>
              </TableCell>
              <TableCell className={`text-right font-bold ${pos.quantity > 0 ? 'text-profit' : pos.quantity < 0 ? 'text-loss' : 'text-gray-400'}`}>
                {pos.quantity}
              </TableCell>
              <TableCell className="text-right text-gray-300">₹{pos.averagePrice.toFixed(2)}</TableCell>
              <TableCell className="text-right text-gray-100 font-bold">₹{pos.ltp.toFixed(2)}</TableCell>
              <TableCell className={`text-right font-bold ${pos.unrealizedPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                ₹{pos.unrealizedPnL.toLocaleString()}
              </TableCell>
              <TableCell className={`text-right font-bold ${pos.pnlPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent}%
              </TableCell>
              <TableCell className="text-gray-300 text-xs">{pos.algoName}</TableCell>
              <TableCell className="text-center">
                {pos.status === 'OPEN' ? (
                  <button
                    onClick={() => setConfirmExitId(pos.id)}
                    className="px-2.5 py-1 text-xs font-semibold bg-loss-bg text-loss hover:bg-loss hover:text-white rounded border border-loss/30 transition-colors flex items-center gap-1 mx-auto"
                  >
                    <LogOut className="w-3 h-3" /> Exit
                  </button>
                ) : (
                  <StatusBadge status="CLOSED" size="sm" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </DataTable>

      {/* Exit Single Position Modal */}
      <ConfirmationModal
        isOpen={!!confirmExitId}
        onClose={() => setConfirmExitId(null)}
        onConfirm={() => {
          if (confirmExitId) exitPosition(confirmExitId);
        }}
        title="Confirm Position Exit"
        description="Are you sure you want to market exit this position? An order will be placed to close out the contract immediately."
        confirmText="Market Exit Position"
        confirmVariant="danger"
      />

      {/* Exit All Positions Modal */}
      <ConfirmationModal
        isOpen={confirmExitAll}
        onClose={() => setConfirmExitAll(false)}
        onConfirm={() => exitAllPositions()}
        title="EXIT ALL OPEN POSITIONS"
        description={`Are you sure you want to close ALL ${openPositions.length} open market positions across all accounts?`}
        confirmText="EXIT ALL NOW"
        confirmVariant="danger"
      />
    </div>
  );
};
