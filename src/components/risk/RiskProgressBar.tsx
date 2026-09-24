import React from 'react';
import { clsx } from 'clsx';

interface RiskProgressBarProps {
  label: string;
  current: number;
  max: number;
  unit?: string;
  isCurrency?: boolean;
}

export const RiskProgressBar: React.FC<RiskProgressBarProps> = ({
  label,
  current,
  max,
  unit = '',
  isCurrency = false
}) => {
  const percent = Math.min(100, Math.max(0, Math.round((current / max) * 100)));
  const barColor = percent > 85 ? 'bg-rose-600' : percent > 60 ? 'bg-amber-500' : 'bg-blue-600';

  return (
    <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2 font-sans">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-bold">{label}</span>
        <span className="text-slate-900 font-mono-num font-bold">
          {isCurrency ? `₹${current.toLocaleString()}` : `${current}${unit}`} / {isCurrency ? `₹${max.toLocaleString()}` : `${max}${unit}`} ({percent}%)
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
        <div
          className={clsx('h-full transition-all duration-500', barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
