import React from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  change?: number;
  changeSuffix?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  isCurrency?: boolean;
  valueColor?: 'profit' | 'loss' | 'neutral' | 'brand';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  change,
  changeSuffix = '%',
  icon: Icon,
  valueColor = 'neutral',
  className
}) => {
  let colorStyle = 'text-slate-900';
  if (valueColor === 'profit' || (typeof change === 'number' && change > 0)) {
    colorStyle = 'text-emerald-600';
  } else if (valueColor === 'loss' || (typeof change === 'number' && change < 0)) {
    colorStyle = 'text-rose-600';
  } else if (valueColor === 'brand') {
    colorStyle = 'text-blue-600';
  }

  return (
    <div
      className={clsx(
        'bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-300 hover:shadow-md transition-all relative overflow-hidden group',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className={clsx('text-2xl font-bold font-mono-num tracking-tight', colorStyle)}>
          {value}
        </span>
        {typeof change === 'number' && (
          <span
            className={clsx(
              'text-xs font-semibold font-mono-num px-2 py-0.5 rounded-md border shrink-0',
              change >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80' : 'text-rose-700 bg-rose-50 border-rose-200/80'
            )}
          >
            {change >= 0 ? '+' : ''}{change}{changeSuffix}
          </span>
        )}
      </div>

      {subtext && <p className="mt-2 text-xs text-slate-500 font-medium leading-normal">{subtext}</p>}
    </div>
  );
};
