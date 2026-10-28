import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Sun, 
  Moon, 
  Lock, 
  Unlock, 
  Smartphone,
  LogOut,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Home
} from 'lucide-react';
import { CompanyProfile, CompanyAccount, TeamMember, AppView } from '../../types';
import { MONTHS } from '../../store/usePayrollStore';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobileTopAppBarProps {
  activeView?: AppView;
  company: CompanyProfile;
  companies: CompanyAccount[];
  activeCompanyId?: string;
  onSelectCompany: (companyId: string) => void;
  onLockOrSwitchCompany?: () => void;
  selectedMonth: string;
  selectedYear: number;
  onPeriodChange: (month: string, year: number) => void;
  isLocked: boolean;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  currentUser: TeamMember | null;
  onSignOut: () => void;
  isPhoneFramePreview: boolean;
  onTogglePhoneFrame: () => void;
  onNavigate: (view: AppView) => void;
}

export const MobileTopAppBar: React.FC<MobileTopAppBarProps> = ({
  activeView,
  company,
  companies,
  activeCompanyId,
  onSelectCompany,
  onLockOrSwitchCompany,
  selectedMonth,
  selectedYear,
  onPeriodChange,
  isLocked,
  isDarkTheme,
  onToggleTheme,
  currentUser,
  onSignOut,
  isPhoneFramePreview,
  onTogglePhoneFrame,
  onNavigate,
}) => {
  const [isCompanySheetOpen, setIsCompanySheetOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Only show the monthly cycle bar on cycle-dependent pages (Dashboard & Payroll Run)
  const showPeriodSelector = !activeView || activeView === 'dashboard' || activeView === 'payroll';

  const monthIdx = MONTHS.findIndex(m => m.key === selectedMonth);
  const currentMonthData = MONTHS[monthIdx] || { key: 'oct', label: 'Oct', fullLabel: 'October' };
  const currentMonthLabel = (currentMonthData as any).fullLabel || currentMonthData.label;

  const handlePrevMonth = () => {
    if (monthIdx > 0) {
      onPeriodChange(MONTHS[monthIdx - 1].key, selectedYear);
    } else {
      onPeriodChange(MONTHS[11].key, selectedYear - 1);
    }
  };

  const handleNextMonth = () => {
    if (monthIdx < 11) {
      onPeriodChange(MONTHS[monthIdx + 1].key, selectedYear);
    } else {
      onPeriodChange(MONTHS[0].key, selectedYear + 1);
    }
  };

  return (
    <>
      <header className="shrink-0 sticky top-0 z-40 bg-white dark:bg-[#09090b] border-b border-zinc-200/90 dark:border-zinc-800/90 select-none shadow-xs">
      
      {/* ── Top App Bar Row: Organization & Quick Actions (Spacious & Clean) ── */}
      <div className="flex items-center justify-between px-3.5 py-2 gap-2">
        
        {/* Left: Company Selector Pill (Expanded width, never crushed) */}
        <button
          type="button"
          onClick={() => setIsCompanySheetOpen(true)}
          className="flex-1 min-w-0 flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 transition-colors text-left border border-zinc-200/60 dark:border-zinc-700/50 cursor-pointer active:scale-[0.98]"
        >
          {company.logoUrl ? (
            <img 
              src={company.logoUrl} 
              alt={company.name} 
              className="w-7 h-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 shadow-xs" 
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {company.name?.charAt(0) || 'P'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate leading-tight">
              {company.name || 'Payroll Pro'}
            </span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block truncate leading-none mt-0.5">
              Tap to switch workspace
            </span>
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        </button>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkTheme ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-zinc-600" />}
          </button>

          {/* User Profile Avatar Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-white font-bold text-xs flex items-center justify-center border border-zinc-300 dark:border-zinc-700 shadow-xs cursor-pointer"
            >
              {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
            </button>

            {isUserMenuOpen && (
              <>
                {/* Full-screen tap-catcher backdrop */}
                <div 
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsUserMenuOpen(false)}
                  onTouchStart={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {currentUser?.name || 'Administrator'}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {currentUser?.email || 'admin@payrollpro.app'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onNavigate('settings');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Company Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── 3. Dedicated Material 3 Cycle Period Sub-Header (Only on cycle-driven views: Dashboard & Payroll) ── */}
      {showPeriodSelector && (
        <div className="px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between">
          
          {/* Left: Previous month button */}
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Center: Period Title & Status Chip (Single Line Guaranteed) */}
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-xs font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
              {currentMonthLabel} {selectedYear}
            </span>
            {isLocked && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                <Lock className="w-2.5 h-2.5" />
                <span>Locked</span>
              </span>
            )}
          </div>

          {/* Right: Next month button */}
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

        </div>
      )}
    </header>

    {/* ── 4. Android Bottom Sheet for Company / Organization Switching ── */}
    <MobileBottomSheet
      isOpen={isCompanySheetOpen}
      onClose={() => setIsCompanySheetOpen(false)}
      title="Switch Organization"
    >
      <div className="space-y-2">
        {companies.map((c) => {
          const isCurrent = c.id === activeCompanyId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setIsCompanySheetOpen(false);
                onSelectCompany(c.id);
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.99] ${
                isCurrent
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500/40 shadow-xs'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ${
                  isCurrent 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                }`}>
                  {c.name?.charAt(0) || 'C'}
                </div>

                <p className={`text-xs font-bold truncate ${
                  isCurrent ? 'text-emerald-700 dark:text-emerald-300' : 'text-zinc-900 dark:text-zinc-100'
                }`}>
                  {c.name}
                </p>
              </div>

              {isCurrent && (
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}
            </button>
          );
        })}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              setIsCompanySheetOpen(false);
              onLockOrSwitchCompany?.();
            }}
            className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Home className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span>Home</span>
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  </>
);
};
