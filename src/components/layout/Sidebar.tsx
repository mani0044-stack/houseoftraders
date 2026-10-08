import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Layers, 
  Cpu, 
  Sliders, 
  Users, 
  Briefcase, 
  Receipt, 
  History, 
  ShieldAlert, 
  BarChart3, 
  Gamepad2, 
  PieChart, 
  FileText, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';
import logoImg from '../../assets/logo.png';
import { clsx } from 'clsx';
import { useUIStore } from '../../store/useUIStore';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/live-market', label: 'Live Market', icon: TrendingUp },
  { path: '/option-chain', label: 'Option Chain', icon: Layers },
  { path: '/create-algo', label: 'Strategies', icon: Cpu },
  { path: '/algo-manager', label: 'Algo Manager', icon: Sliders },
  { path: '/accounts', label: 'Accounts', icon: Users },
  { path: '/positions', label: 'Positions', icon: Briefcase },
  { path: '/orders', label: 'Orders', icon: Receipt },
  { path: '/trade-history', label: 'Trade History', icon: History },
  { path: '/risk-manager', label: 'Risk Manager', icon: ShieldAlert, highlight: true },
  { path: '/backtesting', label: 'Backtesting', icon: BarChart3 },
  { path: '/paper-trading', label: 'Paper Trading', icon: Gamepad2 },
  { path: '/analytics', label: 'Analytics', icon: PieChart },
  { path: '/activity-logs', label: 'Activity Logs', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);
  const setEmergencyStopOpen = useUIStore((s) => s.setEmergencyStopOpen);

  const navContent = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full justify-between select-none">
      {/* Brand Header */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-3.5">
        <NavLink to="/" onClick={() => isMobile && setMobileMenuOpen(false)} className="flex items-center gap-2.5 overflow-hidden group">
          <img src={logoImg} alt="House of Traders Logo" className="w-9 h-9 object-contain shrink-0 group-hover:scale-105 transition-transform" />
          {(!sidebarCollapsed || isMobile) && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold tracking-tight text-white text-sm leading-tight font-sans truncate">
                HOUSE OF TRADERS
              </span>
              <span className="text-[10px] text-emerald-300 font-semibold tracking-wider uppercase mt-0.5">
                Pro Terminal
              </span>
            </div>
          )}
        </NavLink>

        {isMobile ? (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[#B7D0C7] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[#B7D0C7] hover:text-white transition-colors"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative border',
                  isActive
                    ? 'bg-[#1A5446] text-white font-semibold border-emerald-300/30'
                    : 'text-[#B7D0C7] hover:text-white hover:bg-white/5 border-transparent',
                  item.highlight && !isActive && 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
                )
              }
              title={sidebarCollapsed && !isMobile ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              {(!sidebarCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
              {sidebarCollapsed && !isMobile && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-[#0B2B24] text-white text-xs font-sans rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Emergency Button */}
      <div className="p-2.5 border-t border-white/10">
        <button
          onClick={() => {
            if (isMobile) setMobileMenuOpen(false);
            setEmergencyStopOpen(true);
          }}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-400/30 transition-all font-semibold text-xs tracking-wider',
            sidebarCollapsed && !isMobile && 'px-0'
          )}
          title="EMERGENCY STOP ALL"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 animate-pulse" />
          {(!sidebarCollapsed || isMobile) && <span>KILL SWITCH</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={clsx(
          'hidden md:flex bg-[#0F3D33] text-[#B7D0C7] border-r border-[#1C5245] flex-col justify-between transition-all duration-300 z-30 shrink-0 sticky top-0 h-screen',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {navContent(false)}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Sidebar Content */}
          <div className="relative bg-[#0F3D33] w-72 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 animate-slide-in">
            {navContent(true)}
          </div>
        </div>
      )}
    </>
  );
};