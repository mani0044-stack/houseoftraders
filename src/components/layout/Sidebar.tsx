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
  Zap
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
  const setEmergencyStopOpen = useUIStore((s) => s.setEmergencyStopOpen);

  return (
    <aside
      className={clsx(
        'bg-white text-slate-800 border-r border-slate-200 flex flex-col justify-between transition-all duration-300 z-30 shrink-0 sticky top-0 h-screen select-none shadow-xs',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-3.5">
        <NavLink to="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-[#0F4C3A] border border-emerald-200 shrink-0">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-[#0F4C3A] text-base font-sans">AlgoTrade</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider -mt-1 uppercase">Trading Terminal</span>
            </div>
          )}
        </NavLink>

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative',
                  isActive
                    ? 'bg-emerald-50 text-[#0F4C3A] font-bold border-l-4 border-[#0F4C3A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                  item.highlight && !isActive && 'text-amber-600 hover:text-amber-700'
                )
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Emergency Button */}
      <div className="p-2 border-t border-slate-200">
        <button
          onClick={() => setEmergencyStopOpen(true)}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all font-bold text-xs uppercase tracking-wider shadow-xs',
            sidebarCollapsed && 'px-0'
          )}
          title="EMERGENCY STOP ALL"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 animate-pulse" />
          {!sidebarCollapsed && <span>KILL SWITCH</span>}
        </button>
      </div>
    </aside>
  );
};
