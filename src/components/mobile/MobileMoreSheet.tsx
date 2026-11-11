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
      title: 'Absence & Attendance Log',
      subtitle: 'Track unpaid days not worked & statutory proration',
      icon: CalendarOff,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
    },
    {
      id: 'contributions' as AppView,
      title: 'Staff Contributions & Welfare',
      subtitle: 'Savings ledgers, bulk welfare deductions & payouts',
      icon: PiggyBank,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      id: 'analytics' as AppView,
      title: 'Account Reports & Tax',
      subtitle: 'Statutory schedules, PAYE, and cost centers',
      icon: BarChart3,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    },
    {
      id: 'payslip-designer' as AppView,
      title: 'Payslip Designer',
      subtitle: 'Customize company theme, layout & branding',
      icon: Palette,
      color: 'text-pink-600 dark:text-pink-400',
      bg: 'bg-pink-50 dark:bg-pink-950/50',
    },
  ];

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Reports & Design"
      subtitle="Payroll analytics and document customization"
      maxHeight="max-h-[45vh]"
      bodyClassName="p-4 space-y-3"
    >
      <div className="text-xs select-none space-y-2 pb-2">
        <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80 shadow-2xs">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors text-left cursor-pointer ${
                  isCurrent ? 'bg-zinc-50/80 dark:bg-zinc-800/40' : ''
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className={`text-sm font-bold block ${isCurrent ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'} truncate`}>
                      {item.title}
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 block truncate mt-0.5">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                  )}
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </MobileBottomSheet>
  );
};
