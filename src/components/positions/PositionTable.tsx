import React, { useState } from 'react';
import { Position } from '../../types/position';
import { StatusBadge } from '../common/StatusBadge';
import { DataTable, TableHeader, TableRow, TableCell } from '../common/DataTable';
import { 
  LogOut, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Copy, 
  Check, 
  Clock, 
  Shield, 
  Inbox
} from 'lucide-react';
import { useTradingStore } from '../../store/useTradingStore';
import { useUIStore } from '../../store/useUIStore';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface PositionTableProps {
  positions: Position[];
  onExitComplete?: () => void;
}

export const PositionTable: React.FC<PositionTableProps> = ({ positions, onExitComplete }) => {
  const exitPosition = useTradingStore((s) => s.exitPosition);
  const addToast = useUIStore((s) => s.addToast);

  const [confirmExitPosition, setConfirmExitPosition] = useState<Position | null>(null);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  const handleCopySymbol = (sym: string) => {
    navigator.clipboard.writeText(sym);
    setCopiedSymbol(sym);
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  const handleExecuteSingleExit = async () => {
    if (!confirmExitPosition) return;
    setIsExiting(true);
    try {
      const res = await exitPosition(confirmExitPosition.id, {
        accountId: confirmExitPosition.accountId,
        symbol: confirmExitPosition.symbol,
        quantity: confirmExitPosition.quantity,
        productType: confirmExitPosition.productType,
      });

      if (res && res.success) {
        addToast(
          'Position Squared Off',
          res.message || `Successfully placed market exit order for ${confirmExitPosition.symbol}.`,
          'success'
        );
      } else {
        addToast(
          'Exit Warning',
          res?.message || `Could not confirm square-off for ${confirmExitPosition.symbol}.`,
          'warning'
        );
      }
      onExitComplete?.();
    } catch (err: any) {
      addToast('Exit Failed', err.message || 'Failed to place exit order.', 'error');
    } finally {
      setIsExiting(false);
      setConfirmExitPosition(null);
    }
  };

  if (positions.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-2xs flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
          <Inbox className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 font-sans">No Positions Found</h3>
        <p className="text-xs text-slate-500 max-w-sm font-sans">
          No positions match the currently selected account, underlying, or status filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTable>
        <TableHeader>
          <tr>
            <th className="px-4 py-3 text-left">Account</th>
            <th className="px-4 py-3 text-left">Contract / Strike</th>
            <th className="px-4 py-3 text-left">Expiry</th>
            <th className="px-4 py-3 text-center">Product</th>
            <th className="px-4 py-3 text-center">Side</th>
            <th className="px-4 py-3 text-right">Net Qty (Lots)</th>
            <th className="px-4 py-3 text-right">Avg Entry</th>
            <th className="px-4 py-3 text-right">Market LTP</th>
            <th className="px-4 py-3 text-right">Unrealized P&L</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-center">Action</th>
          </tr>
        </TableHeader>
        <tbody>
          {positions.map((pos) => {
            const isBuy = Number(pos.quantity) > 0;
            const isCall = pos.type === 'CE';
            const isPut = pos.type === 'PE';
            const isFut = pos.type === 'FUT';
            const absQty = Math.abs(Number(pos.quantity) || 0);
            const lotCount = pos.lots || (pos.lotSize ? Math.max(1, Math.floor(absQty / pos.lotSize)) : 1);
            const pnl = Number(pos.unrealizedPnL) || 0;
            const pnlPct = Number(pos.pnlPercent) || 0;
            const priceDiff = (Number(pos.ltp) || 0) - (Number(pos.averagePrice) || 0);
            const isProdCarry = ['CARRYFORWARD', 'NRML'].includes((pos.productType || 'CARRYFORWARD').toUpperCase());

            return (
              <TableRow key={pos.id} className={pos.status === 'CLOSED' ? 'opacity-60 bg-slate-50/50' : 'hover:bg-slate-50/80 transition-colors'}>
                {/* Account */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {pos.accountName ? pos.accountName[0].toUpperCase() : 'A'}
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 leading-tight">
                        {pos.accountName || 'Target Account'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {pos.accountId}
                      </div>
                    </div>
                  </div>
                </TableCell>

                {/* Contract / Strike Price & Option Type */}
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Underlying Index Chip */}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                        {pos.underlying || 'NIFTY'}
                      </span>

                      {/* Strike Price & Option Type Badge */}
                      {pos.strike && pos.strike > 0 ? (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-extrabold flex items-center gap-1 border ${
                            isCall
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isPut
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}
                        >
                          {isCall ? (
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                          ) : isPut ? (
                            <ArrowDownRight className="w-3 h-3 text-rose-600" />
                          ) : null}
                          <span>{pos.strike.toLocaleString('en-IN')} {pos.type}</span>
                        </span>
                      ) : isFut ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-extrabold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          FUTURES
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {pos.type || 'EQ'}
                        </span>
                      )}
                    </div>

                    {/* Tradingsymbol with copy shortcut */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                      <span>{pos.symbol}</span>
                      <button
                        type="button"
                        onClick={() => handleCopySymbol(pos.symbol)}
                        className="hover:text-slate-700 p-0.5 rounded transition-colors"
                        title="Copy contract symbol"
                      >
                        {copiedSymbol === pos.symbol ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </TableCell>

                {/* Expiry Date */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{pos.expiry || 'Live'}</span>
                  </div>
                  {pos.rawExpiry && pos.rawExpiry !== pos.expiry && pos.rawExpiry !== 'Live' && (
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 pl-5">
                      {pos.rawExpiry}
                    </div>
                  )}
                </TableCell>

                {/* Product Type (NRML / MIS) */}
                <TableCell className="text-center">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide uppercase border ${
                      isProdCarry
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                    title={isProdCarry ? 'Carryforward (NRML) - Overnight retention' : 'Intraday (MIS) - Auto square-off at 3:15 PM'}
                  >
                    {isProdCarry ? 'NRML' : 'MIS'}
                  </span>
                </TableCell>

                {/* Side (Long/Short) */}
                <TableCell className="text-center">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase border ${
                      isBuy
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {isBuy ? 'LONG' : 'SHORT'}
                  </span>
                </TableCell>

                {/* Quantity & Lots */}
                <TableCell className="text-right">
                  <div className={`font-extrabold font-mono text-xs ${isBuy ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isBuy ? '+' : '-'}{absQty}
                  </div>
                  <div className="text-[10px] font-bold text-blue-600 font-mono mt-0.5">
                    ({lotCount} Lot{lotCount > 1 ? 's' : ''})
                  </div>
                </TableCell>

                {/* Average Price */}
                <TableCell className="text-right font-mono text-xs font-semibold text-slate-700">
                  ₹{Number(pos.averagePrice || 0).toFixed(2)}
                </TableCell>

                {/* Current LTP */}
                <TableCell className="text-right font-mono text-xs font-extrabold text-slate-900">
                  <div>₹{Number(pos.ltp || 0).toFixed(2)}</div>
                  {pos.status === 'OPEN' && (
                    <div className={`text-[10px] font-bold mt-0.5 ${priceDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {priceDiff >= 0 ? '+' : ''}₹{priceDiff.toFixed(2)}
                    </div>
                  )}
                </TableCell>

                {/* Unrealized P&L */}
                <TableCell className="text-right font-mono">
                  <div className={`text-xs font-extrabold ${pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className={`text-[10px] font-bold mt-0.5 ${pnlPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell className="text-center">
                  {pos.status === 'OPEN' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      OPEN
                    </span>
                  ) : (
                    <StatusBadge status="CLOSED" size="sm" />
                  )}
                </TableCell>

                {/* Action */}
                <TableCell className="text-center">
                  {pos.status === 'OPEN' ? (
                    <button
                      type="button"
                      onClick={() => setConfirmExitPosition(pos)}
                      className="px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg border border-rose-200/90 transition-all flex items-center gap-1 mx-auto shadow-2xs cursor-pointer active:scale-95"
                      title="Market square-off this contract"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Exit</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">Flat</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </DataTable>

      {/* Exit Single Position Modal */}
      {confirmExitPosition && (
        <ConfirmationModal
          isOpen={!!confirmExitPosition}
          onClose={() => setConfirmExitPosition(null)}
          onConfirm={handleExecuteSingleExit}
          title="Confirm Market Square-Off"
          description={`Are you sure you want to exit ${confirmExitPosition.symbol} (${confirmExitPosition.strike ? `${confirmExitPosition.strike} ${confirmExitPosition.type}` : confirmExitPosition.type}) on account ${confirmExitPosition.accountName}? A MARKET order will be placed to square off ${Math.abs(confirmExitPosition.quantity)} shares immediately.`}
          confirmText={isExiting ? 'Exiting Position...' : 'Market Square-Off Now'}
          confirmVariant="danger"
          isLoading={isExiting}
        />
      )}
    </div>
  );
};
