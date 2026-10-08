import React from 'react';
import { useTradingStore } from '../../store/useTradingStore';
import { StatusBadge } from '../common/StatusBadge';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccountOverviewTable: React.FC = () => {
  const accounts = useTradingStore((s) => s.accounts);
  const navigate = useNavigate();

  return (
    <div
      className="bg-white border border-[#E3E8E6] rounded-2xl p-5 shadow-xs flex flex-col
                 transition-all duration-300
                 hover:bg-[#FBFDFC] hover:border-[#0F6B5C] hover:shadow-[0_10px_28px_-10px_rgba(15,107,92,0.28)]"
    >
      <div className="flex items-center justify-between pb-3.5 border-b border-[#E3E8E6] mb-1">
        <div>
          <h3 className="text-xs font-bold text-[#12211C] uppercase tracking-wider">Connected Accounts</h3>
          <p className="text-xs text-[#6B7C75] font-medium">Connected Angel One Broker Accounts</p>
        </div>
        <button
          onClick={() => navigate('/accounts')}
          className="text-xs font-semibold text-[#0F6B5C] hover:text-[#0B5347] hover:underline flex items-center gap-1"
        >
          <span>Manage Accounts</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      <div className="flex flex-col">
        {accounts.map((acc) => (
          <div key={acc.id} className="py-3 border-b border-[#E3E8E6] last:border-b-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#12211C] truncate">{acc.name}</div>
                <div className="text-[10px] text-[#6B7C75] font-mono mt-0.5">{acc.clientId}</div>
              </div>
              <div className={`text-sm font-bold font-mono-num shrink-0 ${acc.todaysPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {acc.todaysPnL >= 0 ? '+' : ''}₹{acc.todaysPnL.toLocaleString()}
              </div>
            </div>

            <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1.5">
              <span className="text-xs font-mono-num font-semibold text-[#12211C]">{acc.broker}</span>
              <StatusBadge status={acc.status} size="sm" />
              <span className="text-xs text-[#6B7C75] font-mono-num ml-auto">
                ₹{acc.availableMargin.toLocaleString()} · {acc.openPositionsCount} pos
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};