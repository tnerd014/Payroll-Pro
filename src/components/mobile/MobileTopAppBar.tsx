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
  UserCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Home,
  CalendarDays,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';
import { CompanyProfile, CompanyAccount, TeamMember, AppView } from '../../types';
import { MONTHS } from '../../store/usePayrollStore';
import { MobileBottomSheet } from './MobileBottomSheet';
import { isStandaloneOfflineMode, getSavedCloudConfig, getPrivacyMaskPreference, setPrivacyMaskPreference } from '../../services/supabaseClient';
import { registerBackHandler } from '../../utils/mobileBackHandler';
import { checkForGithubReleaseUpdate, openExternalReleaseLink, getRuntimeAppVersion, DEFAULT_APP_VERSION } from '../../utils/releaseUpdate';

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
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);
  const [privacyMask, setPrivacyMask] = useState<boolean>(() => getPrivacyMaskPreference());
  const [appVersion, setAppVersion] = useState('v1.0.9');
  const [availableUpdate, setAvailableUpdate] = useState<{ latestVersion: string; downloadUrl: string; releaseUrl: string } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const periodPickerRef = useRef<HTMLDivElement>(null);
  const isLocalUser = currentUser?.id === 'local_offline_operator' || isStandaloneOfflineMode() || !getSavedCloudConfig().isEnabled;

  useEffect(() => {
    let active = true;
    getRuntimeAppVersion(DEFAULT_APP_VERSION).then((ver) => {
      if (!active) return;
      setAppVersion(`v${ver}`);
      setTimeout(async () => {
        if (!active) return;
        try {
          const result = await checkForGithubReleaseUpdate(ver);
          if (active && result?.success && result.updateAvailable) {
            setAvailableUpdate({
              latestVersion: result.latestVersion || '',
              downloadUrl: result.assetUrls?.androidApk || result.assetUrl || '',
              releaseUrl: result.releaseUrl || '',
            });
          }
        } catch {
          // Ignore background check error
        }
      }, 3500);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setIsUserMenuOpen(false);
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    try {
      const electronAPI = (window as any).electronAPI;
      const ver = await getRuntimeAppVersion(appVersion.replace(/^v/i, ''));
      const result = electronAPI?.checkForUpdates
        ? await electronAPI.checkForUpdates()
        : await checkForGithubReleaseUpdate(ver);

      if (!result?.success) {
        alert(result?.error || 'Unable to check for updates right now.');
        return;
      }

      if (result.upToDate) {
        alert(`You are already on the latest version (v${result.currentVersion}).`);
        return;
      }

      const shouldDownload = window.confirm(
        `A new version (v${result.latestVersion}) is available. Download and install it now?`
      );
      if (!shouldDownload) return;

      if (electronAPI?.downloadUpdate) {
        const dlRes = await electronAPI.downloadUpdate({
          latestVersion: result.latestVersion,
          releaseUrl: result.releaseUrl,
          downloadUrl: result.assetUrl || result.assetUrls?.windowsInstaller,
        });
        if (dlRes?.success && electronAPI?.installPendingUpdate) {
          await electronAPI.installPendingUpdate();
        }
        return;
      }

      const targetUrl = result.assetUrls?.androidApk || result.assetUrl || result.releaseUrl;
      if (targetUrl) {
        openExternalReleaseLink(targetUrl);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      alert('Unable to check for updates right now. Please try again later.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  useEffect(() => {
    const handlePrivacyChange = () => {
      setPrivacyMask(getPrivacyMaskPreference());
    };
    window.addEventListener('payroll-privacy-mask-changed', handlePrivacyChange);
    return () => window.removeEventListener('payroll-privacy-mask-changed', handlePrivacyChange);
  }, []);

  const handleTogglePrivacyMask = () => {
    const next = !privacyMask;
    setPrivacyMask(next);
    setPrivacyMaskPreference(next);
  };

  useEffect(() => {
    if (!isUserMenuOpen && !isPeriodPickerOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (periodPickerRef.current && !periodPickerRef.current.contains(e.target as Node)) {
        setIsPeriodPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isUserMenuOpen, isPeriodPickerOpen]);

  // Intercept Android hardware back button for dropdowns
  useEffect(() => {
    if (!isPeriodPickerOpen) return;
    return registerBackHandler(() => {
      setIsPeriodPickerOpen(false);
      return true;
    });
  }, [isPeriodPickerOpen]);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    return registerBackHandler(() => {
      setIsUserMenuOpen(false);
      return true;
    });
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
      <header className="app-header shrink-0 sticky top-0 z-40 bg-white dark:bg-[#09090b] border-b border-zinc-200/90 dark:border-zinc-800/90 select-none shadow-xs transition-colors">

        {/* ── Top App Bar Row: Organization & Quick Actions (Spacious & Clean) ── */}
        <div className="flex items-center justify-between px-3.5 py-2 gap-2">

          {/* Left: Company Selector Pill (Expanded width, never crushed) */}
          <button
            type="button"
            onClick={() => setIsCompanySheetOpen(true)}
            className="app-header-pill flex-1 min-w-0 flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 transition-colors text-left border border-zinc-200/60 dark:border-zinc-700/50 cursor-pointer active:scale-[0.98]"
          >
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name}
                className="w-7 h-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0 shadow-xs"
              />
            ) : (
              <div className="app-primary-btn w-7 h-7 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {company.name?.charAt(0) || 'P'}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <span className="app-header-text text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate leading-tight">
                {company.name || 'Payroll Pro'}
              </span>
              <span className="app-header-subtext text-[10px] text-zinc-500 dark:text-zinc-400 block truncate leading-none mt-0.5">
                Tap to switch workspace
              </span>
            </div>

            <ChevronDown className="app-header-subtext w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </button>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 shrink-0">
            {availableUpdate && (
              <button
                type="button"
                onClick={handleCheckForUpdates}
                className="app-header-pill app-header-text px-2 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 border border-zinc-200/60 dark:border-zinc-700/60 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                title={`Update v${availableUpdate.latestVersion} available`}
              >
                <Download className="w-3 h-3" />
                <span>v{availableUpdate.latestVersion}</span>
              </button>
            )}

            {/* Privacy Shield Toggle */}
            <button
              type="button"
              onClick={handleTogglePrivacyMask}
              className="app-header-icon w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-transparent flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:opacity-85 transition-all cursor-pointer"
              title={privacyMask ? 'Disable Privacy Shield (Show Figures)' : 'Enable Privacy Shield (Mask Figures)'}
              aria-label={privacyMask ? 'Disable Privacy Shield' : 'Enable Privacy Shield'}
            >
              {privacyMask ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="app-header-icon w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-transparent flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:opacity-85 transition-all cursor-pointer"
              title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkTheme ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* User Profile Avatar Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="app-header-icon w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 font-bold text-xs flex items-center justify-center border border-transparent shadow-xs cursor-pointer hover:opacity-85 transition-all"
              >
                {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
              </button>

              {isUserMenuOpen && (
                <div className="app-surface-card absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-zinc-200/70 dark:border-zinc-800">
                    <div className="app-primary-btn w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {currentUser?.name || 'Administrator'}
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                        {currentUser?.email || 'admin@payrollpro.app'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {!isLocalUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigate('profile');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 cursor-pointer font-medium"
                      >
                        <UserCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Profile</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onNavigate('settings');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Company Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCheckForUpdates}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Check for Updates</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">{appVersion}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── 3. Dedicated Material 3 Cycle Period Sub-Header (Only on cycle-driven views: Dashboard & Payroll) ── */}
        {showPeriodSelector && (
          <div className="app-period-bar px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/70 dark:bg-zinc-900/40 flex items-center justify-between transition-colors">

            {/* Left: Previous month button */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className="app-period-btn w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Center: Clickable Period Title → opens calendar picker */}
            <div className="relative" ref={periodPickerRef}>
              <button
                type="button"
                onClick={() => {
                  setPickerYear(selectedYear);
                  setIsPeriodPickerOpen(!isPeriodPickerOpen);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                title="Pick month & year"
              >
                <span className="app-period-label text-xs font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                  {currentMonthLabel} {selectedYear}
                </span>
                <ChevronDown className={`app-period-chevron w-3 h-3 text-zinc-400 transition-transform duration-200 ${isPeriodPickerOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLocked && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-400 text-zinc-950 border border-amber-300 shadow-2xs" title="Payroll Locked">
                  <Lock className="w-2.5 h-2.5" />
                </span>
              )}

              {/* ── Calendar Dropdown Picker ── */}
              {isPeriodPickerOpen && (
                <div className="app-surface-card absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150">
                  {/* Year navigator */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setPickerYear(y => y - 1)}
                      className="app-subtle-surface w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-transparent flex items-center justify-center hover:opacity-85 transition cursor-pointer active:scale-90"
                    >
                      <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                    </button>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">{pickerYear}</span>
                    <button
                      type="button"
                      onClick={() => setPickerYear(y => y + 1)}
                      className="app-subtle-surface w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-transparent flex items-center justify-center hover:opacity-85 transition cursor-pointer active:scale-90"
                    >
                      <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                    </button>
                  </div>

                  {/* Month grid */}
                  <div className="grid grid-cols-4 gap-1.5 p-3">
                    {MONTHS.map((m) => {
                      const isSelected = m.key === selectedMonth && pickerYear === selectedYear;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            onPeriodChange(m.key, pickerYear);
                            setIsPeriodPickerOpen(false);
                          }}
                          className={`h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 ${isSelected
                              ? 'app-active-tab bg-emerald-600 text-white shadow-sm'
                              : 'app-subtle-surface bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:opacity-85'
                            }`}
                        >
                          {m.label.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Done button */}
                  <div className="px-3 pb-3">
                    <button
                      type="button"
                      onClick={() => setIsPeriodPickerOpen(false)}
                      className="app-primary-btn w-full h-9 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 active:scale-[0.98] transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Next month button */}
            <button
              type="button"
              onClick={handleNextMonth}
              className="app-period-btn w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
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
                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.99] ${isCurrent
                    ? 'app-subtle-surface shadow-xs'
                    : 'app-surface-card bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800/80 hover:opacity-90'
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs shrink-0 ${isCurrent
                      ? 'app-primary-btn bg-emerald-600 text-white'
                      : 'app-subtle-surface bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                    }`}>
                    {c.name?.charAt(0) || 'C'}
                  </div>

                  <p className={`text-xs font-bold truncate ${isCurrent ? 'app-accent-text text-emerald-700 dark:text-emerald-300' : 'text-zinc-900 dark:text-zinc-100'
                    }`}>
                    {c.name}
                  </p>
                </div>

                {isCurrent && (
                  <div className="app-primary-btn w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
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
              className="app-subtle-surface w-full py-3 rounded-xl border bg-zinc-100 hover:opacity-90 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
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
