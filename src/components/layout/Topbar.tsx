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
  Menu
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
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
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
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
    <header className="h-16 bg-[#0F3D33] border-b border-[#1C5245] flex items-center justify-between px-3 md:px-5 sticky top-0 z-20 shrink-0">
      {/* Left: Mobile Menu Toggle & Ticker Summary */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-[#B7D0C7] hover:text-white hover:bg-white/10 transition-colors"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {/* NIFTY 50 Pill */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-300/40 transition-colors text-xs">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#B7D0C7] uppercase tracking-wider">NIFTY</span>
            {nifty && (
              <span className={`font-mono-num font-bold flex items-center gap-1 text-xs ${nifty.change >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {nifty.ltp.toFixed(1)}
                {nifty.change >= 0 ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
              </span>
            )}
          </div>

          {/* BANKNIFTY Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-300/40 transition-colors">
            <span className="text-[11px] font-semibold text-[#B7D0C7] uppercase tracking-wider">BANKNIFTY</span>
            {banknifty && (
              <span className={`text-xs font-mono-num font-bold flex items-center gap-1 ${banknifty.change >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {banknifty.ltp.toFixed(2)}
                {banknifty.change >= 0 ? <TrendingUp className="w-3 h-3 shrink-0" /> : <TrendingDown className="w-3 h-3 shrink-0" />}
                <span className="text-[11px]">({banknifty.change >= 0 ? '+' : ''}{banknifty.changePercent}%)</span>
              </span>
            )}
          </div>
        </div>

        <div className="hidden lg:block border-l border-white/10 pl-3">
          <span className="text-xs font-mono-num text-[#B7D0C7] font-medium">{timeStr}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Connection Status */}
        <div className="hidden md:flex items-center gap-2">
          <ConnectionStatusPill connected={wsConnected} latencyMs={wsLatencyMs} label="WS" />
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border ${
              backendConnected
                ? 'bg-emerald-400/10 text-emerald-300 border-emerald-300/25'
                : 'bg-white/5 text-[#B7D0C7] border-white/10'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>API: {backendConnected ? 'OK' : 'DISCONNECTED'}</span>
          </div>
        </div>

        {/* Account Selector */}
        <div className="relative">
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs rounded-xl px-2.5 sm:px-3 py-1.5 font-medium cursor-pointer outline-none transition-colors max-w-[110px] sm:max-w-none truncate"
          >
            <option value="ALL" className="bg-[#0F3D33] text-white">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="bg-[#0F3D33] text-white">
                {acc.name} ({acc.clientId})
              </option>
            ))}
          </select>
        </div>

        {/* Quick Order Button */}
        <button
          onClick={() => setManualOrderOpen(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-400 hover:bg-emerald-300 text-[#0B2B24] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          title="Place Quick Order on Angel One"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">ORDER</span>
        </button>

        {/* Trading Mode Switcher */}
        <button
          onClick={handleModeToggle}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            tradingMode === 'Live'
              ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-600'
              : 'bg-white/10 text-white border-white/20 hover:bg-white/15'
          }`}
          title="Toggle Trading Mode"
        >
          {tradingMode === 'Live' ? (
            <>
              <Zap className="w-3.5 h-3.5 fill-current animate-pulse text-amber-950" />
              <span className="hidden sm:inline">LIVE</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span className="hidden sm:inline">PAPER</span>
            </>
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#B7D0C7] hover:text-white hover:bg-white/10 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-300" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E3E8E6] rounded-2xl shadow-xl p-3 z-50 text-xs animate-fade-scale">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3E8E6] font-semibold text-[#12211C]">
                <span>System Notifications</span>
                <span className="text-[10px] text-[#6B7C75] font-mono">{activityLogs.length} logs</span>
              </div>
              <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {activityLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl bg-[#F4F7F6] border border-[#E3E8E6] space-y-1">
                    <div className="flex items-center justify-between font-semibold text-[#12211C]">
                      <span className="truncate">{log.title}</span>
                      <span className="text-[10px] text-[#6B7C75] font-mono shrink-0">{log.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-[#6B7C75] leading-relaxed">{log.message}</p>
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
            className="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            <img src={logoImg} alt="House of Traders Logo" className="w-7 h-7 object-contain rounded-lg" />
            <span className="hidden sm:inline text-xs font-semibold text-white">House of Traders</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#B7D0C7]" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-[#E3E8E6] rounded-2xl shadow-xl py-1.5 z-50 text-xs animate-fade-scale">
              <div className="px-3.5 py-2.5 border-b border-[#E3E8E6]">
                <p className="font-bold text-[#12211C]">House of Traders Pro</p>
                <p className="text-[10px] text-[#6B7C75] font-mono">admin@houseoftraders.in</p>
              </div>
              <div className="px-3.5 py-2.5 space-y-1 text-[#6B7C75]">
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