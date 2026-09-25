import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ChevronDown, 
  ShieldCheck, 
  Activity, 
  Lock, 
  Zap,
  TrendingUp,
  TrendingDown,
  Search,
  User,
  Shield
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
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-5 sticky top-0 z-20 shrink-0 shadow-xs">
      {/* Left: Ticker Summary & Time */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {/* NIFTY 50 Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">NIFTY 50</span>
            {nifty && (
              <span className={`text-xs font-mono-num font-bold flex items-center gap-1 ${nifty.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {nifty.ltp.toFixed(2)}
                {nifty.change >= 0 ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                <span className="text-[11px]">({nifty.change >= 0 ? '+' : ''}{nifty.changePercent}%)</span>
              </span>
            )}
          </div>

          {/* BANKNIFTY Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">BANKNIFTY</span>
            {banknifty && (
              <span className={`text-xs font-mono-num font-bold flex items-center gap-1 ${banknifty.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {banknifty.ltp.toFixed(2)}
                {banknifty.change >= 0 ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                <span className="text-[11px]">({banknifty.change >= 0 ? '+' : ''}{banknifty.changePercent}%)</span>
              </span>
            )}
          </div>
        </div>

        <div className="hidden lg:block border-l border-slate-200 pl-3">
          <span className="text-xs font-mono-num text-slate-500 font-medium">{timeStr}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Connection Status */}
        <div className="hidden md:flex items-center gap-2">
          <ConnectionStatusPill connected={wsConnected} latencyMs={wsLatencyMs} label="WS" />
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${backendConnected ? 'bg-blue-50 text-blue-700 border-blue-200/80' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
            <Activity className="w-3 h-3" />
            <span>API: {backendConnected ? 'OK' : 'DISCONNECTED'}</span>
          </div>
        </div>

        {/* Account Selector */}
        <div className="relative">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 font-medium cursor-pointer outline-none transition-colors"
          >
            <option value="ALL">All Angel Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.clientId})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Order Button - Sensibull Indigo/Blue Accent */}
        <button
          onClick={() => setManualOrderOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          title="Place Quick Order on Angel One"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>PLACE ORDER</span>
        </button>

        {/* Trading Mode Switcher */}
        <button
          onClick={handleModeToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-xs ${
            tradingMode === 'Live'
              ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-600'
              : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
          }`}
          title="Toggle Trading Mode"
        >
          {tradingMode === 'Live' ? (
            <>
              <Zap className="w-3.5 h-3.5 fill-current animate-pulse text-amber-950" />
              <span>LIVE</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>PAPER</span>
            </>
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-50 text-xs animate-fade-scale">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-semibold text-slate-900">
                <span>System Notifications</span>
                <span className="text-[10px] text-slate-400 font-mono">{activityLogs.length} logs</span>
              </div>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {activityLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="truncate">{log.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{log.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{log.message}</p>
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
            className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              HT
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-slate-800">House of Traders</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs animate-fade-scale">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <p className="font-bold text-slate-900">House of Traders Pro</p>
                <p className="text-[10px] text-slate-500 font-mono">admin@houseoftraders.in</p>
              </div>
              <div className="px-3.5 py-2.5 space-y-1 text-slate-600">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Broker Connection:</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1"><Lock className="w-3 h-3" /> Active</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
