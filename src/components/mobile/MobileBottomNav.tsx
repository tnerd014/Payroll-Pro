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
    <nav className="shrink-0 sticky bottom-0 z-40 bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-xl border-t border-zinc-200/70 dark:border-zinc-800/70 px-3 pt-1.5 pb-2 select-none">
      
      {/* 5-Item Minimalist Dock */}
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-0.5 relative group transition-transform active:scale-95 outline-none select-none cursor-pointer"
            >
              <div className="relative flex items-center justify-center p-1">
                <Icon 
                  className={`w-5 h-5 transition-colors duration-150 ${
                    isActive 
                      ? 'text-zinc-950 dark:text-white stroke-[2.25]' 
                      : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 stroke-[1.75]'
                  }`} 
                />

                {/* Badge Indicator */}
                {item.badge !== undefined && (
                  <span className="absolute -top-0.5 -right-2 px-1 min-w-[15px] h-3.5 flex items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[9px] font-bold font-mono shadow-2xs">
                    {item.badge}
                  </span>
                )}

                {/* Locked indicator */}
                {item.isLockedIndicator && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#09090b]" />
                )}
              </div>

              {/* Minimal Label */}
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                  isActive
                    ? 'font-semibold text-zinc-950 dark:text-white'
                    : 'font-medium text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {item.label}
              </span>

              {/* Minimal Active Indicator Dot */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-zinc-950 dark:bg-white mt-0.5" />
              )}
            </button>
          );
        })}

        {/* 5th Tab: More Drawer */}
        <button
          type="button"
          onClick={onOpenMoreSheet}
          className="flex-1 flex flex-col items-center justify-center py-0.5 relative group transition-transform active:scale-95 outline-none select-none cursor-pointer"
        >
          <div className="relative flex items-center justify-center p-1">
            <Grid2X2 
              className={`w-5 h-5 transition-colors duration-150 ${
                isMoreActive 
                  ? 'text-zinc-950 dark:text-white stroke-[2.25]' 
                  : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 stroke-[1.75]'
              }`} 
            />
          </div>
          <span
            className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
              isMoreActive
                ? 'font-semibold text-zinc-950 dark:text-white'
                : 'font-medium text-zinc-400 dark:text-zinc-500'
            }`}
          >
            More
          </span>

          {/* Minimal Active Indicator Dot */}
          {isMoreActive && (
            <span className="w-1 h-1 rounded-full bg-zinc-950 dark:bg-white mt-0.5" />
          )}
        </button>
      </div>

      {/* Android System Gesture Pill Indicator */}
      <div className="w-28 h-1 bg-zinc-300/80 dark:bg-zinc-700/80 rounded-full mx-auto mt-2" />
    </nav>
  );
};
