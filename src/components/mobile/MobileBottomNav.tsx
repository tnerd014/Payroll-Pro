import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calculator, 
  Landmark, 
  Grid2X2,
  Lock
} from 'lucide-react';
import { AppView } from '../../types';

interface MobileBottomNavProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  staffCount: number;
  activeLoansCount: number;
  isLocked: boolean;
  onOpenMoreSheet: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onViewChange,
  staffCount,
  activeLoansCount,
  isLocked,
  onOpenMoreSheet,
}) => {
  const isMoreActive = 
    activeView === 'analytics' || 
    activeView === 'payslip-designer' ||
    activeView === 'contributions' ||
    activeView === 'absences';

  const navItems = [
    {
      id: 'dashboard' as AppView,
      label: 'Home',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'employees' as AppView,
      label: 'Staff',
      icon: Users,
      badge: staffCount > 0 ? staffCount : undefined,
    },
    {
      id: 'payroll' as AppView,
      label: 'Payroll',
      icon: Calculator,
      isLockedIndicator: isLocked,
    },
    {
      id: 'loans' as AppView,
      label: 'Loans',
      icon: Landmark,
      badge: activeLoansCount > 0 ? activeLoansCount : undefined,
    },
  ];

  return (
    <nav className="shrink-0 sticky bottom-0 z-40 bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 px-2 pt-1 pb-3 select-none">
      
      {/* 5-Item Thumb Zone Dock */}
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-1 relative group transition-transform active:scale-95 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 select-none"
            >
              {/* Material 3 Active Pill Indicator */}
              <div
                className={`relative px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-105' : ''}`} />

                {/* Badge Indicator */}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] font-bold font-mono shadow-xs">
                    {item.badge}
                  </span>
                )}

                {/* Locked indicator */}
                {item.isLockedIndicator && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-900" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                  isActive
                    ? 'font-semibold text-emerald-800 dark:text-emerald-300'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 5th Tab: More / Services Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMoreSheet}
          className="flex-1 flex flex-col items-center justify-center py-1 relative group transition-transform active:scale-95 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 select-none"
        >
          <div
            className={`relative px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${
              isMoreActive
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'
            }`}
          >
            <Grid2X2 className="w-5 h-5" />
          </div>
          <span
            className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
              isMoreActive
                ? 'font-semibold text-emerald-800 dark:text-emerald-300'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            More
          </span>
        </button>
      </div>

      {/* Android System Gesture Pill Indicator */}
      <div className="w-32 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2" />
    </nav>
  );
};
