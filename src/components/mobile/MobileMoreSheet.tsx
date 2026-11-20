import React from 'react';
import { 
  BarChart3, 
  Palette, 
  PiggyBank,
  CalendarOff,
  ChevronRight
} from 'lucide-react';
import { AppView, TeamMember } from '../../types';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  currentUser?: TeamMember | null;
  onSignOut?: () => void;
  onLockOrSwitchCompany?: () => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  isOpen,
  onClose,
  activeView,
  onNavigate,
}) => {
  const handleItemClick = (view: AppView) => {
    onNavigate(view);
    onClose();
  };

  const menuItems = [
    {
      id: 'absences' as AppView,
      title: 'Absence & Attendance',
      icon: CalendarOff,
    },
    {
      id: 'contributions' as AppView,
      title: 'Staff Welfare & Savings',
      icon: PiggyBank,
    },
    {
      id: 'analytics' as AppView,
      title: 'Reports & Tax Schedules',
      icon: BarChart3,
    },
    {
      id: 'payslip-designer' as AppView,
      title: 'Payslip Designer',
      icon: Palette,
    },
  ];

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Tools & Reports"
      maxHeight="max-h-[50vh]"
      bodyClassName="px-4 py-2 space-y-2"
    >
      <div className="select-none space-y-1.5 pb-2">
        <div className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden divide-y divide-zinc-200/60 dark:divide-zinc-800/80 shadow-xs">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:bg-black/[0.06] dark:active:bg-white/[0.07] transition-colors text-left cursor-pointer ${
                  isCurrent ? 'app-subtle-surface' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isCurrent 
                      ? 'app-active-tab bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' 
                      : 'app-subtle-surface bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-sm tracking-tight truncate ${
                    isCurrent 
                      ? 'font-semibold text-zinc-950 dark:text-white' 
                      : 'font-medium text-zinc-800 dark:text-zinc-200'
                  }`}>
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  {isCurrent && (
                    <span className="app-accent-bar w-2 h-2 rounded-full" />
                  )}
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-400" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </MobileBottomSheet>
  );
};
