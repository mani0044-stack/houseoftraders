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
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors',
        connected
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-red-50 text-red-700 border-red-200'
      )}
    >
      {connected ? <Wifi className="w-3 h-3 animate-pulse" /> : <WifiOff className="w-3 h-3" />}
      <span>{label}: {connected ? `${latencyMs}ms` : 'Disconnected'}</span>
    </div>
  );
};
