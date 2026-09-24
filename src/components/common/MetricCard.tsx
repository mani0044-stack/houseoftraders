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
    colorStyle = 'text-emerald-700';
  } else if (valueColor === 'loss' || (typeof change === 'number' && change < 0)) {
    colorStyle = 'text-red-600';
  } else if (valueColor === 'brand') {
    colorStyle = 'text-[#0F4C3A]';
  }

  return (
    <div
      className={clsx(
        'bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-md transition-all relative overflow-hidden group',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{title}</span>
        {Icon && (
          <div className="p-2 rounded-lg bg-emerald-50 text-[#0F4C3A] border border-emerald-100 group-hover:bg-[#0F4C3A] group-hover:text-white transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className={clsx('text-2xl font-bold font-mono-num tracking-tight', colorStyle)}>
          {value}
        </span>
        {typeof change === 'number' && (
          <span
            className={clsx(
              'text-xs font-semibold font-mono-num px-1.5 py-0.5 rounded border',
              change >= 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'
            )}
          >
            {change >= 0 ? '+' : ''}{change}{changeSuffix}
          </span>
        )}
      </div>

      {subtext && <p className="mt-1.5 text-xs text-slate-500">{subtext}</p>}
    </div>
  );
};
