import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ChevronDown, 
  ShieldCheck, 
  Activity, 
  Lock, 
  Zap,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useTradingStore } from '../../store/useTradingStore';
import { useUIStore } from '../../store/useUIStore';
import { ConnectionStatusPill } from '../common/ConnectionStatusPill';

export const Topbar: React.FC = () => {
  const tradingMode = useTradingStore((s) => s.tradingMode);
  const selectedAccountId = useTradingStore((s) => s.selectedAccountId);
  const setSelectedAccountId = useTradingStore((s) => s.setSelectedAccountId);
  const accounts = useTradingStore((s) => s.accounts);
  const marketQuotes = useTradingStore((s) => s.marketQuotes);
  const wsConnected = useTradingStore((s) => s.wsConnected);
  const wsLatencyMs = useTradingStore((s) => s.wsLatencyMs);
  const backendConnected = useTradingStore((s) => s.backendConnected);

  const setLiveModeConfirmOpen = useUIStore((s) => s.setLiveModeConfirmOpen);
  const setManualOrderOpen = useUIStore((s) => s.setManualOrderOpen);
  const setTradingMode = useTradingStore((s) => s.setTradingMode);
  const activityLogs = useTradingStore((s) => s.activityLogs);

  const [timeStr, setTimeStr] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST');
    }, 1000);
    setTimeStr(new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST');
    return () => clearInterval(timer);
  }, []);

  const handleModeToggle = () => {
    if (tradingMode === 'Paper') {
      setLiveModeConfirmOpen(true);
    } else {
      setTradingMode('Paper');
    }
  };

  const nifty = marketQuotes['NIFTY'];
  const banknifty = marketQuotes['BANKNIFTY'];

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-20 shrink-0 shadow-xs">
      {/* Left: Ticker Marquee Bar */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-slate-500 font-semibold">NIFTY 50:</span>
          {nifty && (
            <span className={`font-bold flex items-center gap-0.5 ${nifty.change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {nifty.ltp.toFixed(2)}
              {nifty.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>({nifty.change >= 0 ? '+' : ''}{nifty.changePercent}%)</span>
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-slate-500 font-semibold">BANKNIFTY:</span>
          {banknifty && (
            <span className={`font-bold flex items-center gap-0.5 ${banknifty.change >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {banknifty.ltp.toFixed(2)}
              {banknifty.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>({banknifty.change >= 0 ? '+' : ''}{banknifty.changePercent}%)</span>
            </span>
          )}
        </div>

        <div className="hidden lg:block text-slate-500 text-[11px] font-mono">
          {timeStr}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* WS & API Status */}
        <div className="hidden md:flex items-center gap-2">
          <ConnectionStatusPill connected={wsConnected} latencyMs={wsLatencyMs} label="WS" />
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-50 text-[#0F4C3A] border border-emerald-200">
            <Activity className="w-3 h-3" />
            <span>API: {backendConnected ? 'OK' : 'MOCK'}</span>
          </div>
        </div>

        {/* Active Account Selector */}
        <div className="relative">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-mono cursor-pointer outline-none transition-colors"
          >
            <option value="ALL">All Angel Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.clientId})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Order Button */}
        <button
          onClick={() => setManualOrderOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
          title="Place Quick Order on Angel One"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>PLACE ORDER</span>
        </button>

        {/* Trading Mode Switcher Button */}
        <button
          onClick={handleModeToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold font-mono border tracking-wider transition-all shadow-xs ${
            tradingMode === 'Live'
              ? 'bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-600'
              : 'bg-[#0F4C3A] text-white border-[#0F4C3A] hover:bg-[#0A3A2A]'
          }`}
          title="Toggle Trading Mode"
        >
          {tradingMode === 'Live' ? (
            <>
              <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
              <span>LIVE TRADING</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PAPER TRADING</span>
            </>
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-semibold text-slate-800">
                <span>System Notifications</span>
                <span className="text-[10px] text-slate-400 font-mono">{activityLogs.length} total</span>
              </div>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
                {activityLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                    <div className="flex items-center justify-between font-medium text-slate-800">
                      <span>{log.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-xs">
              AT
            </div>
            <span className="hidden sm:inline text-xs font-medium">AlgoTrader</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-900">AlgoTrader Admin</p>
                <p className="text-[10px] text-slate-500 font-mono">admin@algotrade.io</p>
              </div>
              <div className="px-3 py-2 space-y-1 text-slate-700">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Broker Secrets:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1"><Lock className="w-3 h-3" /> Encrypted</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
