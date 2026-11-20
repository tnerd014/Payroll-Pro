import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calculator, 
  BarChart3, 
  Settings, 
  Lock,
  ArrowRightLeft,
  Building2,
  Landmark,
  PiggyBank,
  CalendarOff
} from 'lucide-react';
import { AppView } from '../../types';
import appLogo from '../../../assets/icon.png';

interface SidebarNavProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  staffCount: number;
  activeLoansCount?: number;
  absencesCount?: number;
  isLocked: boolean;
  companyName?: string;
  companyLogoUrl?: string;
  onLockOrSwitchCompany?: () => void;
  isAdmin?: boolean;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeView,
  onViewChange,
  staffCount,
  activeLoansCount,
  absencesCount,
  isLocked,
  companyName,
  companyLogoUrl,
  onLockOrSwitchCompany,
  isAdmin = true,
}) => {
  const navItems = [
    { id: 'dashboard' as AppView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees' as AppView, label: 'Staff Directory', icon: Users, badge: staffCount },
    { id: 'absences' as AppView, label: 'Absence Log', icon: CalendarOff, badge: absencesCount },
    { id: 'loans' as AppView, label: 'Loans & Advances', icon: Landmark, badge: activeLoansCount },
    { id: 'contributions' as AppView, label: 'Contributions', icon: PiggyBank },
    { id: 'payroll' as AppView, label: 'Payroll Run', icon: Calculator, isLockedIndicator: isLocked },
    { id: 'analytics' as AppView, label: 'Account Reports', icon: BarChart3 },
    ...(isAdmin ? [{ id: 'settings' as AppView, label: 'Settings', icon: Settings }] : []),
  ];

  return (
    <aside className="app-sidebar no-print w-56 bg-white dark:bg-[#09090b] border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between p-3 select-none transition-colors shrink-0">
      
      <div className="space-y-3">
        {/* App Logo & Title */}
        <div className="app-sidebar-brand flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
          <img src={appLogo} alt="Payroll Pro" className="w-5 h-5 rounded-md object-contain shrink-0 shadow-xs" />
          <span className="app-sidebar-title font-semibold text-xs tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
            Payroll Pro
          </span>
        </div>

        {/* Navigation Items */}
        <div className="space-y-1">
          <div
            className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 opacity-80"
            style={{ color: 'var(--theme-sidebar-muted)' }}
          >
            Navigation
          </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                isActive 
                  ? 'app-sidebar-item-active bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium' 
                  : 'app-sidebar-item text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-90" />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center gap-1">
                {item.badge !== undefined && (
                  <span
                    className="px-1.5 py-0.2 rounded text-[11px] font-mono border border-zinc-200/60 dark:border-zinc-700/60 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                    style={{
                      backgroundColor: 'var(--theme-sidebar-card-bg)',
                      borderColor: 'var(--theme-sidebar-border)',
                      color: isActive ? 'var(--theme-sidebar-active-fg)' : 'var(--theme-sidebar-muted)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}

                {item.isLockedIndicator && (
                  <span
                    title="Cycle Locked"
                    style={{ color: isActive ? 'var(--theme-sidebar-active-icon)' : 'var(--theme-sidebar-muted)' }}
                  >
                    <Lock className="w-3 h-3" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
        </div>
      </div>

      {/* Bottom Area: Active Company Card & Status Pill */}
      <div className="space-y-2">
        {companyName && (
          <div className="app-sidebar-company p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-md border flex items-center justify-center shrink-0 overflow-hidden font-bold text-[11px]"
                style={{
                  backgroundColor: 'var(--theme-sidebar-active-bg)',
                  color: 'var(--theme-sidebar-active-fg)',
                  borderColor: 'var(--theme-sidebar-border)',
                }}
              >
                {companyLogoUrl ? (
                  <img src={companyLogoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
                ) : (
                  <span>{companyName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="app-sidebar-title text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate" title={companyName}>
                  {companyName}
                </span>
                <span
                  className="text-[11px] text-zinc-400 truncate"
                  style={{ color: 'var(--theme-sidebar-muted)' }}
                >
                  Current Workspace
                </span>
              </div>
            </div>

            {onLockOrSwitchCompany && (
              <button
                onClick={onLockOrSwitchCompany}
                title="Switch Company Account (Ctrl+L)"
                className="app-sidebar-item p-1 rounded transition shrink-0 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

      </div>

    </aside>
  );
};
