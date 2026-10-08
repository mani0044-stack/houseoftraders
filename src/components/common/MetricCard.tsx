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
  let colorStyle = 'text-slate-100';
  let glowShadow = 'hover:shadow-[0_20px_45px_-15px_rgba(148,163,184,0.25)]';
  let iconWrap = 'bg-sky-400/10 text-sky-300 border-sky-400/20 group-hover:bg-sky-400/90 group-hover:text-slate-950';
  let iconGlow = 'group-hover:shadow-[0_6px_18px_-4px_rgba(56,189,248,0.6)]';

  if (valueColor === 'profit' || (typeof change === 'number' && change > 0)) {
    colorStyle = 'text-emerald-400';
    glowShadow = 'hover:shadow-[0_20px_45px_-12px_rgba(52,211,153,0.35)]';
  } else if (valueColor === 'loss' || (typeof change === 'number' && change < 0)) {
    colorStyle = 'text-rose-400';
    glowShadow = 'hover:shadow-[0_20px_45px_-12px_rgba(251,113,133,0.35)]';
  } else if (valueColor === 'brand') {
    colorStyle = 'text-sky-300';
    glowShadow = 'hover:shadow-[0_20px_45px_-12px_rgba(56,189,248,0.35)]';
  }

  return (
    <div
      className={clsx(
        'relative overflow-hidden group rounded-2xl p-5',
        'bg-white/[0.05] backdrop-blur-xl',
        'border border-white/10',
        'shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]',
        glowShadow,
        className
      )}
    >
      {/* shine sweep on hover */}
      <div
        className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full
                   transition-transform duration-700 ease-out
                   bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
      />

      {/* ambient glow blob */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 rounded-full
                   bg-emerald-400/0 group-hover:bg-emerald-400/10 blur-2xl
                   transition-colors duration-500"
      />

      <div className="relative flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div
            className={clsx(
              'w-8 h-8 rounded-xl border flex items-center justify-center',
              'backdrop-blur-md transition-all duration-300 ease-out',
              'group-hover:scale-110 group-hover:rotate-6',
              iconWrap,
              iconGlow
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="relative mt-3 flex items-baseline justify-between gap-2">
        <span
          className={clsx(
            'text-2xl font-bold font-mono-num tracking-tight transition-transform duration-300',
            'group-hover:translate-x-0.5',
            colorStyle
          )}
        >
          {value}
        </span>
        {typeof change === 'number' && (
          <span
            className={clsx(
              'text-xs font-semibold font-mono-num px-2 py-0.5 rounded-md border shrink-0 backdrop-blur-md',
              'transition-transform duration-300 group-hover:scale-105',
              change >= 0
                ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25 animate-pulse'
                : 'text-rose-300 bg-rose-400/10 border-rose-400/25 animate-pulse'
            )}
            style={{ animationDuration: '2.5s' }}
          >
            {change >= 0 ? '+' : ''}{change}{changeSuffix}
          </span>
        )}
      </div>

      {subtext && (
        <p className="relative mt-2 text-xs text-slate-400 font-medium leading-normal">{subtext}</p>
      )}
    </div>
  );
};