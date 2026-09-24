import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';

interface ConnectionStatusPillProps {
  connected: boolean;
  latencyMs?: number;
  label?: string;
}

export const ConnectionStatusPill: React.FC<ConnectionStatusPillProps> = ({
  connected,
  latencyMs = 14,
  label = 'WS'
}) => {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors font-medium',
        connected
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
          : 'bg-rose-50 text-rose-700 border-rose-200/80'
      )}
    >
      {connected ? <Wifi className="w-3 h-3 text-emerald-600" /> : <WifiOff className="w-3 h-3" />}
      <span>{label}: {connected ? `${latencyMs}ms` : 'Disconnected'}</span>
    </div>
  );
};
