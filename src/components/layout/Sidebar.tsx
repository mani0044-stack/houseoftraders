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
    <div className="flex flex-col h-full justify-between select-none relative overflow-hidden">
      {/* Subtle Background Pattern Graphic */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5 bg-no-repeat bg-bottom" 
        style={{
          backgroundImage: `radial-gradient(circle at 10% 90%, #10b981 0%, transparent 60%)`
        }} 
      />

      {/* Brand Header */}
      <div className="h-20 border-b border-[#0f443c]/60 flex items-center justify-between px-4 z-10">
        <NavLink to="/" onClick={() => isMobile && setMobileMenuOpen(false)} className="flex items-center gap-3 overflow-hidden group">
          {/* Brand Monogram Icon matching reference screenshot */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0e4a40] to-[#072b25] border border-[#10b981]/40 flex items-center justify-center shrink-0 shadow-sm group-hover:border-[#10b981] group-hover:scale-105 transition-all">
            <svg className="w-6 h-6 text-[#2dd4bf]" viewBox="0 0 32 32" fill="none" stroke="currentColor">
              <path d="M6 6H12M9 6V26M6 26H12M9 16H21M18 6H26M21 6V26M18 26H24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M25 6H31M28 6V26M25 26H31" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <div className="flex flex-col font-serif leading-none min-w-0 select-none">
              <span className="text-[10px] font-semibold tracking-[0.2em] text-[#a2c4bc] uppercase truncate">
                HOUSE OF
              </span>
              <span className="text-[14px] font-bold tracking-[0.22em] text-white uppercase mt-1 truncate">
                TRADER
              </span>
            </div>
          )}
        </NavLink>

        {isMobile ? (
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#0b3a33] text-[#7aa69e] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-[#0b3a33] text-[#7aa69e] hover:text-white transition-colors"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar z-10">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs transition-all group relative font-sans',
                  isActive
                    ? 'bg-[#0d483d] text-white font-semibold shadow-sm border-l-2 border-[#10b981]'
                    : 'text-[#7aa69e] hover:text-white hover:bg-[#0b3a33]/70 font-medium',
                  item.highlight && !isActive && 'text-amber-400 hover:text-amber-300 hover:bg-[#0b3a33]'
                )
              }
              title={sidebarCollapsed && !isMobile ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-[#10b981]" : "text-[#7aa69e] group-hover:text-white")} />
                  {(!sidebarCollapsed || isMobile) && <span className="truncate">{item.label}</span>}
                  {sidebarCollapsed && !isMobile && (
                    <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#031714] text-white text-xs font-sans rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-[#0d483d]">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Tagline & Emergency Button */}
      <div className="p-3 border-t border-[#0f443c]/60 bg-[#041e1a]/80 z-10 space-y-3">
        {(!sidebarCollapsed || isMobile) && (
          <div className="px-2 py-1 text-center">
            <p className="font-serif italic text-[11px] text-[#7aa69e] leading-snug">
              Better Strategies. Smarter Trades.<br/>Longer Growth.
            </p>
          </div>
        )}

        <button
          onClick={() => {
            if (isMobile) setMobileMenuOpen(false);
            setEmergencyStopOpen(true);
          }}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-all font-semibold text-xs tracking-wider shadow-xs',
            sidebarCollapsed && !isMobile && 'px-0'
          )}
          title="EMERGENCY STOP ALL"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 animate-pulse" />
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
          'hidden md:flex bg-[#062c26] text-white border-r border-[#0f443c]/80 flex-col justify-between transition-all duration-300 z-30 shrink-0 sticky top-0 h-screen shadow-lg',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {navContent(false)}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Sidebar Content */}
          <div className="relative bg-[#062c26] text-white w-72 max-w-[85vw] h-full shadow-2xl flex flex-col z-10 animate-slide-in">
            {navContent(true)}
          </div>
        </div>
      )}
    </>
  );
};

