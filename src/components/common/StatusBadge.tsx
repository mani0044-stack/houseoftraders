import React from 'react';
import { clsx } from 'clsx';

interface StatusBadgeProps {
  status: string;
  variant?: 'solid' | 'subtle' | 'outline';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'subtle',
  size = 'md'
}) => {
  const upper = status.toUpperCase();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';

  if (['ACTIVE', 'CONNECTED', 'COMPLETED', 'SUCCESS', 'OPEN', 'BUY'].includes(upper)) {
    colorClasses = variant === 'solid' 
      ? 'bg-emerald-600 text-white font-semibold' 
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['STOPPED', 'DISCONNECTED', 'REJECTED', 'ERROR', 'CLOSED', 'SELL', 'EXPIRED'].includes(upper)) {
    colorClasses = variant === 'solid' 
      ? 'bg-red-600 text-white font-semibold' 
      : 'bg-red-50 text-red-700 border-red-200';
  } else if (['AUTHENTICATION_REQUIRED', 'AUTH_REQUIRED', 'PAUSED', 'WARNING', 'PENDING', 'CANCELLED'].includes(upper)) {
    colorClasses = variant === 'solid' 
      ? 'bg-amber-600 text-white font-semibold' 
      : 'bg-amber-50 text-amber-900 border-amber-300 font-semibold';
  } else if (['PAPER', 'INFO', 'CONNECTING'].includes(upper)) {
    colorClasses = variant === 'solid' 
      ? 'bg-[#0F4C3A] text-white font-semibold' 
      : 'bg-emerald-50 text-[#0F4C3A] border-emerald-300';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded border tracking-wider uppercase font-mono-num transition-colors',
        colorClasses,
        sizeClasses
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
};
