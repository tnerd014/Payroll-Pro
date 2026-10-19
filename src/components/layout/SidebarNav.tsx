import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calculator, 
  BarChart3, 
  Settings, 
  Lock
} from 'lucide-react';
import { AppView } from '../../types';
import appLogo from '../../../assets/icon.png';

interface SidebarNavProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  staffCount: number;
  isLocked: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeView,
  onViewChange,
  staffCount,
  isLocked
}) => {
  const navItems = [
    { id: 'dashboard' as AppView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees' as AppView, label: 'Staff Directory', icon: Users, badge: staffCount },
    { id: 'payroll' as AppView, label: 'Payroll Run', icon: Calculator, isLockedIndicator: isLocked },
    { id: 'analytics' as AppView, label: 'Account Reports', icon: BarChart3 },
    { id: 'settings' as AppView, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="no-print w-56 bg-white dark:bg-[#09090b] border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between p-3 select-none transition-colors shrink-0">
      
      <div className="space-y-3">
        {/* App Logo & Title */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
          <img src={appLogo} alt="Payroll Pro" className="w-6 h-6 rounded-md object-contain shrink-0 shadow-xs" />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-xs tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
              Payroll Pro
            </span>
            <span className="text-[10px] text-zinc-400 font-mono leading-tight">
              Nigeria Edition
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-1">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Navigation
          </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors ${
                isActive 
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1">
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800">
                    {item.badge}
                  </span>
                )}

                {item.isLockedIndicator && (
                  <span title="Cycle Locked"><Lock className="w-3 h-3 text-zinc-500" /></span>
                )}
              </div>
            </button>
          );
        })}
        </div>
      </div>

      {/* Quiet Status Pill */}
      <div className="px-2.5 py-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Offline Ready</span>
        </span>
        <span className="font-mono text-[10px]">v1.0.0</span>
      </div>

    </aside>
  );
};
