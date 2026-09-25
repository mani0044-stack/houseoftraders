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
      <div className="h-16 border-b border-slate-100 flex items-center justify-between px-3.5">
        <NavLink to="/" onClick={() => isMobile && setMobileMenuOpen(false)} className="flex items-center gap-2.5 overflow-hidden group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 fill-current text-white/90" />
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold tracking-tight text-slate-900 text-sm leading-tight font-sans truncate">
                HOUSE OF TRADERS
              </span>
              <span className="text-[10px] text-blue-600 font-semibold tracking-wider uppercase mt-0.5">
                Pro Terminal
              </span>
            </div>
          )}
        </NavLink>

        {isMobile ? (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative',
                  isActive
                    ? 'bg-blue-50/80 text-blue-700 font-semibold shadow-xs border-r-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
                  item.highlight && !isActive && 'text-amber-600 hover:text-amber-700 hover:bg-amber-50/60'
                )
              }
              title={sidebarCollapsed && !isMobile ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              {(!sidebarCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
              {sidebarCollapsed && !isMobile && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-sans rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Emergency Button */}
      <div className="p-2.5 border-t border-slate-100 bg-slate-50/50">
        <button
          onClick={() => {
            if (isMobile) setMobileMenuOpen(false);
            setEmergencyStopOpen(true);
          }}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 transition-all font-semibold text-xs tracking-wider shadow-xs hover:shadow-red-500/10',
            sidebarCollapsed && !isMobile && 'px-0'
          )}
          title="EMERGENCY STOP ALL"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-600 animate-pulse" />
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
          'hidden md:flex bg-white text-slate-800 border-r border-slate-200 flex-col justify-between transition-all duration-300 z-30 shrink-0 sticky top-0 h-screen shadow-xs',
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Sidebar Content */}
          <div className="relative bg-white w-72 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 animate-slide-in">
            {navContent(true)}
          </div>
        </div>
      )}
    </>
  );
};

