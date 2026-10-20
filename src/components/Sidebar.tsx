import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';
import { 
  Shield, 
  Activity, 
  Map, 
  AlertTriangle, 
  FileText, 
  Cpu, 
  CpuIcon,
  Terminal, 
  Binary, 
  SearchCode, 
  Settings, 
  LogOut, 
  Heart, 
  ChevronLeft, 
  ChevronRight,
  Database,
  BarChart3,
  Search,
  Bot,
  Radar,
  Skull
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const { user, logout, alerts } = useSecurity();
  const newAlertsCount = alerts.filter(a => a.status === 'New').length;

  const menuItems = [
    { name: 'Overview', path: '/', icon: Shield },
    { name: 'Live Monitoring', path: '/monitoring', icon: Activity },
    { name: 'Network Map', path: '/network', icon: Map },
    { name: 'Alerts', path: '/alerts', icon: AlertTriangle, badge: newAlertsCount },
    { name: 'Detection Rules', path: '/rules', icon: SearchCode },
    { name: 'Threat Sensors', path: '/sensors', icon: Radar },
    { name: 'Meta-Learning Ops', path: '/meta-learning', icon: Cpu },
    { name: 'AI Security Analyst', path: '/ai-analyst', icon: Bot },
    { name: 'Simulation Lab', path: '/simulation', icon: Terminal },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Reports Console', path: '/reports', icon: FileText },
    { name: 'System Health', path: '/system', icon: Heart },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside 
      className={`bg-slate-950 border-r border-slate-900 h-screen sticky top-0 flex flex-col transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-900">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-slate-100 tracking-tight whitespace-nowrap">AEGIS ML IDS</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest whitespace-nowrap">Meta-Learning SOC</span>
            </div>
          )}
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-slate-900 text-slate-400 hover:text-slate-200 cursor-pointer hidden md:block"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav Menu items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-900">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[inset_0_1px_2px_rgba(59,130,246,0.05)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`
              }
              title={collapsed ? item.name : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="truncate flex-1">{item.name}</span>
              )}
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`absolute ${collapsed ? 'top-1 right-1' : 'right-3'} inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-semibold leading-none rounded-full bg-red-600 text-white font-mono shadow-[0_0_8px_rgba(220,38,38,0.5)]`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Details + Red Team Portal Launcher */}
      <div className="p-3 border-t border-slate-900 flex flex-col gap-2">
        {/* Dedicated Red Team Portal Launcher */}
        <NavLink
          to="/redteam"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-red-400/80 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 transition-all cursor-pointer ${
            collapsed ? 'justify-center px-2' : ''
          }`}
          title="Open Red Team Hacker Console"
        >
          <Skull className="w-4 h-4 text-red-400 shrink-0" />
          {!collapsed && <span className="truncate">Red Team Portal →</span>}
        </NavLink>

        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-900/40 border border-slate-900">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-blue-400 font-semibold font-mono">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/10 hover:border-red-500/10 border border-transparent cursor-pointer transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
