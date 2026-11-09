import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Sun, 
  Moon, 
  Minus, 
  Square, 
  X,
  ChevronDown,
  Check,
  Search,
  Home,
  Lock,
  ExternalLink,
  ShieldCheck,
  User,
  UserCircle,
  LogOut,
  Cloud,
  RefreshCw,
  FileSpreadsheet,
  Download,
  UserPlus,
  Settings,
  LayoutDashboard,
  Users,
  CreditCard,
  PieChart,
  SlidersHorizontal,
  BookOpen,
  FileText,
  HelpCircle
} from 'lucide-react';
import { exportPayrollProToExcel, ExportOptions } from '../../engine/excelEngine';
import { ExportScopeModal } from '../excel/ExportScopeModal';
import { LegalModal } from '../legal/LegalModal';
import { openInstructionManualPdf } from '../legal/openManual';
import { MONTHS } from '../../store/usePayrollStore';
import { Employee, CalculatedPayrollItem, PayrollVariables, PayeTaxVariables, PayrollSnapshot, AppView, CompanyProfile, CompanyAccount, TeamMember, EmployeeLoan, EmploymentTypeRule } from '../../types';
import { checkRealConnectivity, getSavedCloudConfig, isStandaloneOfflineMode } from '../../services/supabaseClient';
import { checkForGithubReleaseUpdate, openExternalReleaseLink } from '../../utils/releaseUpdate';
import appLogo from '../../../assets/icon.png';

interface DesktopTitleBarProps {
  selectedMonth: string;
  selectedYear: number;
  onPeriodChange: (month: string, year: number) => void;
  activeSnapshot: PayrollSnapshot | undefined;
  employees: Employee[];
  payrollItems: CalculatedPayrollItem[];
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  monthLabel: string;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  company: CompanyProfile;
  companies?: CompanyAccount[];
  activeCompanyId?: string | null;
  onSelectCompany?: (id: string) => void;
  onOpenCompanySettings: () => void;
  onNavigate: (view: AppView) => void;
  onSoftReload?: () => void;
  onTriggerAddEmployee?: () => void;
  onLockOrSwitchCompany?: () => void;
  currentUser?: TeamMember | null;
  onSignOut?: () => void;
  loans?: EmployeeLoan[];
  departments?: string[];
  employmentTypeRules?: EmploymentTypeRule[];
}

export const DesktopTitleBar: React.FC<DesktopTitleBarProps> = ({
  selectedMonth,
  selectedYear,
  activeSnapshot,
  employees,
  payrollItems,
  payrollVariables,
  payeTaxVariables,
  monthLabel,
  isDarkTheme,
  onToggleTheme,
  company,
  companies = [],
  activeCompanyId = null,
  onSelectCompany,
  onOpenCompanySettings,
  onNavigate,
  onSoftReload,
  onTriggerAddEmployee,
  onLockOrSwitchCompany,
  currentUser,
  onSignOut,
  loans = [],
  departments = [],
  employmentTypeRules = [],
}) => {
  const isAuditor = currentUser?.role === 'Auditor';
  const isLocalUser = currentUser?.id === 'local_offline_operator' || isStandaloneOfflineMode() || !getSavedCloudConfig().isEnabled;
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');
  const menuRef = useRef<HTMLDivElement>(null);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);
  const workspaceSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workspaceDropdownOpen) {
      setTimeout(() => {
        workspaceSearchInputRef.current?.focus();
      }, 50);
    } else {
      setWorkspaceSearch('');
    }
  }, [workspaceDropdownOpen]);

  const filteredWorkspaces = useMemo(() => {
    if (!workspaceSearch.trim()) return companies;
    const q = workspaceSearch.toLowerCase();
    return companies.filter(c => (c.name || '').toLowerCase().includes(q));
  }, [companies, workspaceSearch]);

  // Real connectivity state — uses an actual server ping, not navigator.onLine
  // navigator.onLine is unreliable in Electron: it returns true even when there
  // is no internet, as long as any network interface (e.g., router) is available.
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const connectivityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runCheck = async () => {
      const real = await checkRealConnectivity();
      if (!cancelled) setIsOnline(real);
    };

    // Run immediately, then every 15 seconds
    runCheck();
    connectivityIntervalRef.current = setInterval(runCheck, 15000);

    // Also respond to browser online/offline events as a fast trigger
    const handleBrowserEvent = () => { runCheck(); };
    window.addEventListener('online', handleBrowserEvent);
    window.addEventListener('offline', handleBrowserEvent);

    return () => {
      cancelled = true;
      if (connectivityIntervalRef.current) clearInterval(connectivityIntervalRef.current);
      window.removeEventListener('online', handleBrowserEvent);
      window.removeEventListener('offline', handleBrowserEvent);
    };
  }, []);

  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [appVersion, setAppVersion] = useState('v1.0.6');
  const [updateState, setUpdateState] = useState<{ status: string; downloadPercent: number; latestVersion: string; message: string; restartRequired: boolean; downloadPath: string; downloadUrl: string; releaseUrl: string; }>({
    status: 'idle',
    downloadPercent: 0,
    latestVersion: '',
    message: '',
    restartRequired: false,
    downloadPath: '',
    downloadUrl: '',
    releaseUrl: '',
  });

  const updateBadgeTitle = updateState.status === 'downloading'
    ? `Download in progress: ${updateState.downloadPercent}%`
    : updateState.restartRequired || updateState.status === 'downloaded'
      ? 'Update downloaded. Restart to install.'
      : updateState.status === 'available'
        ? 'Update available'
        : updateState.message || 'Check for updates';

  const handleInstallPendingUpdate = async () => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.installPendingUpdate) {
      if (updateState.releaseUrl) {
        openExternalReleaseLink(updateState.releaseUrl);
      }
      return;
    }

    try {
      const result = await electronAPI.installPendingUpdate();
      if (!result?.success) {
        alert(result?.error || 'Unable to start the installer.');
      }
    } catch (error) {
      console.error('Failed to install pending update:', error);
      alert('Unable to install the update right now.');
    }
  };

  const handleDismissUpdateNotice = async () => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.dismissUpdateNotice) {
      await electronAPI.dismissUpdateNotice();
    }
    setUpdateState((prev) => ({
      ...prev,
      status: 'idle',
      latestVersion: '',
      message: '',
      restartRequired: false,
      downloadPercent: 0,
      downloadPath: '',
      downloadUrl: '',
      releaseUrl: '',
    }));
  };

  useEffect(() => {
    let currentVer = '1.0.6';
    const runStartupUpdateCheck = async (ver: string) => {
      try {
        const electronAPI = (window as any).electronAPI;
        const result = electronAPI?.checkForUpdates
          ? await electronAPI.checkForUpdates()
          : await checkForGithubReleaseUpdate(ver.replace(/^v/i, ''));

        if (result?.success && result.updateAvailable) {
          const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
          const targetDownloadUrl = isAndroid
            ? (result.assetUrls?.androidApk || result.assetUrl || '')
            : (result.assetUrl || result.assetUrls?.windowsInstaller || '');

          setUpdateState((prev) =>
            prev.status === 'downloading' || prev.status === 'downloaded'
              ? prev
              : {
                  ...prev,
                  status: 'available',
                  latestVersion: result.latestVersion || '',
                  downloadUrl: targetDownloadUrl,
                  releaseUrl: result.releaseUrl || '',
                  message: `Update v${result.latestVersion} available`,
                }
          );
        }
      } catch {
        // Silently ignore network errors on background startup check
      }
    };

    if ((window as any).electronAPI?.getVersion) {
      (window as any).electronAPI
        .getVersion()
        .then((version: string) => {
          if (version) {
            currentVer = version;
            setAppVersion(`v${version}`);
          }
          setTimeout(() => runStartupUpdateCheck(currentVer), 4000);
        })
        .catch(() => {
          setTimeout(() => runStartupUpdateCheck(currentVer), 4000);
        });
    } else {
      setTimeout(() => runStartupUpdateCheck(currentVer), 4000);
    }
  }, []);

  useEffect(() => {
    if ((window as any).electronAPI?.onUpdateState) {
      const unsubscribe = (window as any).electronAPI.onUpdateState((state: any) => {
        if (state) {
          setUpdateState((prev) => ({ ...prev, ...state }));
        }
      });
      return () => unsubscribe?.();
    }
    return undefined;
  }, []);

  useEffect(() => {
    const checkSyncStatus = () => {
      if (!activeCompanyId) {
        setHasPendingSync(false);
        return;
      }
      const pending = localStorage.getItem('PAYROLL_PRO_PENDING_SYNC_' + activeCompanyId) === 'true';
      setHasPendingSync(pending);
    };

    checkSyncStatus();
    window.addEventListener('payroll-sync-status-changed', checkSyncStatus);
    window.addEventListener('online', checkSyncStatus);
    window.addEventListener('offline', checkSyncStatus);
    return () => {
      window.removeEventListener('payroll-sync-status-changed', checkSyncStatus);
      window.removeEventListener('online', checkSyncStatus);
      window.removeEventListener('offline', checkSyncStatus);
    };
  }, [activeCompanyId]);

  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => {
    const nextZoom = Math.min(Number((zoomLevel + 0.1).toFixed(2)), 2.0);
    setZoomLevel(nextZoom);
    if ((window as any).electronAPI?.setZoomFactor) {
      (window as any).electronAPI.setZoomFactor(nextZoom);
    } else {
      (document.body.style as any).zoom = `${nextZoom}`;
    }
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(Number((zoomLevel - 0.1).toFixed(2)), 0.5);
    setZoomLevel(nextZoom);
    if ((window as any).electronAPI?.setZoomFactor) {
      (window as any).electronAPI.setZoomFactor(nextZoom);
    } else {
      (document.body.style as any).zoom = `${nextZoom}`;
    }
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    if ((window as any).electronAPI?.setZoomFactor) {
      (window as any).electronAPI.setZoomFactor(1);
    } else {
      (document.body.style as any).zoom = '1';
    }
  };

  const handleReload = () => {
    if (onSoftReload) {
      onSoftReload();
    } else if ((window as any).electronAPI?.reload) {
      (window as any).electronAPI.reload();
    } else {
      window.location.reload();
    }
  };

  const handleForceReload = () => {
    if ((window as any).electronAPI?.forceReload) {
      (window as any).electronAPI.forceReload();
    } else {
      window.location.reload();
    }
  };

  const handleCheckForUpdates = async () => {
    setActiveMenu(null);
    const electronAPI = (window as any).electronAPI;

    try {
      const result = electronAPI?.checkForUpdates
        ? await electronAPI.checkForUpdates()
        : await checkForGithubReleaseUpdate(appVersion.replace(/^v/i, ''));

      if (!result?.success) {
        alert(result?.error || 'Unable to check for updates right now.');
        return;
      }

      if (result.upToDate) {
        alert(`You are already on the latest version (${result.currentVersion}).`);
        return;
      }

      const shouldDownload = window.confirm(
        `A new version (${result.latestVersion}) is available. Download and install it now?`
      );

      if (!shouldDownload) {
        return;
      }

      if (electronAPI?.downloadUpdate) {
        await electronAPI.downloadUpdate({
          latestVersion: result.latestVersion,
          releaseUrl: result.releaseUrl,
          downloadUrl: result.assetUrl || result.assetUrls?.windowsInstaller,
        });
        return;
      }

      const isAndroidDevice = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
      const targetAssetUrl = isAndroidDevice
        ? (result.assetUrls?.androidApk || result.assetUrl)
        : (result.assetUrl || result.assetUrls?.windowsInstaller);

      if (targetAssetUrl) {
        openExternalReleaseLink(targetAssetUrl);
      } else if (result.releaseUrl) {
        openExternalReleaseLink(result.releaseUrl);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
      alert('Unable to check for updates right now. Please try again later.');
    }
  };

  const handleToggleFullScreen = () => {
    if ((window as any).electronAPI?.toggleFullScreen) {
      (window as any).electronAPI.toggleFullScreen();
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  };

  const computedDepartments = useMemo(() => {
    const set = new Set<string>(departments);
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).filter(Boolean);
  }, [departments, employees]);

  const handleQuickExport = () => {
    try {
      exportPayrollProToExcel(
        employees,
        payrollItems,
        payrollVariables,
        payeTaxVariables,
        monthLabel,
        selectedYear,
        activeSnapshot,
        company,
        { scope: 'current-month', includeFormulas: true, loans },
        loans
      );
    } catch (err) {
      console.error('Failed to export payroll Excel workbook:', err);
      alert('Unable to export Excel file: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConfirmExport = (options: ExportOptions) => {
    try {
      const targetMonthLabel = options.selectedMonth
        ? (MONTHS.find(m => m.key === options.selectedMonth)?.label || monthLabel)
        : monthLabel;
      const targetYear = options.selectedYear || selectedYear;

      exportPayrollProToExcel(
        employees,
        payrollItems,
        payrollVariables,
        payeTaxVariables,
        targetMonthLabel,
        targetYear,
        activeSnapshot,
        company,
        { ...options, loans },
        loans
      );
      setIsExportModalOpen(false);
    } catch (err) {
      console.error('Failed to export payroll Excel workbook:', err);
      alert('Unable to export Excel file: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Priority 1: Export shortcuts
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        handleQuickExport();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        setIsExportModalOpen(true);
        return;
      }

      // Priority 2: Reload / Force Reload
      if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        handleForceReload();
        return;
      }
      if (((e.ctrlKey && (e.key === 'r' || e.key === 'R')) || e.key === 'F5') && !e.shiftKey) {
        e.preventDefault();
        handleReload();
        return;
      }

      // Priority 3: Fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullScreen();
        return;
      }

      // If typing in input, don't trigger navigation / modifier shortcuts
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        if (!isAuditor) {
          onTriggerAddEmployee?.();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        onNavigate('payroll');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        onToggleTheme();
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        onOpenCompanySettings ? onOpenCompanySettings() : onNavigate('settings');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        onLockOrSwitchCompany?.();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') { e.preventDefault(); onNavigate('dashboard'); }
        else if (e.key === '2') { e.preventDefault(); onNavigate('employees'); }
        else if (e.key === '3') { e.preventDefault(); onNavigate('payroll'); }
        else if (e.key === '4') { e.preventDefault(); onNavigate('loans'); }
        else if (e.key === '5') { e.preventDefault(); onNavigate('analytics'); }
        else if (e.key === '6') { e.preventDefault(); onNavigate('settings'); }
        else if (e.key === '=' || e.key === '+') { e.preventDefault(); handleZoomIn(); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); handleZoomOut(); }
        else if (e.key === '0') { e.preventDefault(); handleResetZoom(); }
      } else if (e.key === 'Escape') {
        setActiveMenu(null);
        setWorkspaceDropdownOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    zoomLevel, 
    onTriggerAddEmployee, 
    onLockOrSwitchCompany, 
    onNavigate, 
    onToggleTheme, 
    onOpenCompanySettings, 
    employees, 
    payrollItems, 
    payrollVariables, 
    payeTaxVariables, 
    monthLabel, 
    selectedMonth, 
    selectedYear, 
    activeSnapshot, 
    company, 
    loans
  ]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(e.target as Node)) {
        setWorkspaceDropdownOpen(false);
        setWorkspaceSearch('');
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <>
      <header 
        className="no-print h-9 bg-white dark:bg-[#09090b] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 select-none relative z-[9999] shrink-0 transition-colors"
        style={{ WebkitAppRegion: "drag" } as any}
      >
      {/* Left: Brand + Native Dropdown Menus */}
      <div className="flex items-center gap-1" ref={menuRef} style={{ WebkitAppRegion: "no-drag" } as any}>
        
        {/* Brand Label */}
        <div className="flex items-center gap-2 pr-2.5 mr-1 border-r border-zinc-200 dark:border-zinc-800">
          <img src={appLogo} alt="Payroll Pro Logo" className="w-4 h-4 rounded-xs object-contain" />
          <span className="font-semibold text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
            Payroll Pro
          </span>
        </div>

        {/* File Menu */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
            className={`px-2 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeMenu === 'file' 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            File
          </button>

          {activeMenu === 'file' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-[10000] animate-in fade-in duration-100">
              {!isAuditor && (
                <button
                  onClick={() => { onTriggerAddEmployee?.(); setActiveMenu(null); }}
                  className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
                >
                  <span>Add Employee</span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+N</span>
                </button>
              )}

              <button
                onClick={() => { setIsExportModalOpen(true); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Export to Excel...</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+E</span>
              </button>

              <button
                onClick={() => { handleQuickExport(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Quick Export</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+Shift+E</span>
              </button>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

              <button
                onClick={() => { onOpenCompanySettings ? onOpenCompanySettings() : onNavigate('settings'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Company Settings</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+,</span>
              </button>

              <button
                onClick={() => { onLockOrSwitchCompany?.(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Switch Workspace</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+L</span>
              </button>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

              <button
                onClick={() => { (window as any).electronAPI?.windowClose?.(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Exit</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Alt+F4</span>
              </button>
            </div>
          )}
        </div>

        {/* Payroll Menu */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'payroll' ? null : 'payroll')}
            className={`px-2 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeMenu === 'payroll' 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            Payroll
          </button>

          {activeMenu === 'payroll' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-[10000] animate-in fade-in duration-100">
              <button
                onClick={() => { onNavigate('payroll'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Payroll Processing</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+P</span>
              </button>

              <button
                onClick={() => { onNavigate('loans'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Loans & Advances</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+4</span>
              </button>

              <button
                onClick={() => { onNavigate('employees'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Staff Directory</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+2</span>
              </button>

              <button
                onClick={() => { onNavigate('analytics'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Reports & Analytics</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+5</span>
              </button>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

              <button
                onClick={() => { setIsExportModalOpen(true); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Export to Excel...</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+E</span>
              </button>
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
            className={`px-2 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeMenu === 'view' 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            View
          </button>

          {activeMenu === 'view' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-[10000] animate-in fade-in duration-100">
              <button
                onClick={() => { handleReload(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer rounded-xs transition-colors"
              >
                <span>Reload</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+R</span>
              </button>
              
              <button
                onClick={() => { handleForceReload(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer rounded-xs transition-colors"
              >
                <span>Force Reload</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+Shift+R</span>
              </button>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

              <button
                onClick={() => { handleZoomIn(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer rounded-xs transition-colors"
              >
                <span>Zoom In</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+=</span>
              </button>

              <button
                onClick={() => { handleZoomOut(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer rounded-xs transition-colors"
              >
                <span>Zoom Out</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+-</span>
              </button>

              <button
                onClick={() => { handleResetZoom(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer rounded-xs transition-colors"
              >
                <span>Reset Zoom</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+0</span>
              </button>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

              <button
                onClick={() => { handleToggleFullScreen(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer rounded-xs transition-colors"
              >
                <span>Full Screen</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">F11</span>
              </button>
            </div>
          )}
        </div>

        {/* Help Menu */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
            className={`px-2 py-1 rounded text-xs font-medium transition cursor-pointer ${
              activeMenu === 'help' 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            Help
          </button>

          {activeMenu === 'help' && (
            <div className="absolute left-0 top-full mt-1 w-60 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-[10000] animate-in fade-in duration-100">
              <button
                onClick={() => {
                  handleCheckForUpdates();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer rounded-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  <span>Check for Updates</span>
                </div>
                {(updateState.status === 'downloading' || updateState.restartRequired || updateState.status === 'downloaded') && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    {updateState.status === 'downloading' ? `${updateState.downloadPercent}%` : 'Ready'}
                  </span>
                )}
              </button>

              {updateState.status === 'downloading' && (
                <div className="px-3 pb-2">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                    <span>{updateState.message || 'Downloading update…'}</span>
                    <span>{updateState.downloadPercent}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-200"
                      style={{ width: `${Math.max(0, Math.min(100, updateState.downloadPercent))}%` }}
                    />
                  </div>
                </div>
              )}

              {(updateState.restartRequired || updateState.status === 'downloaded') && (
                <div className="border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                        Restart required
                      </div>
                      <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                        {updateState.message || 'Update downloaded. Restart to install.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleInstallPendingUpdate}
                      className="inline-flex items-center justify-center rounded-md bg-amber-500 px-2 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-amber-600"
                    >
                      Restart now
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  openInstructionManualPdf();
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer rounded-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Instruction Manual (PDF)</span>
                </div>
                <ExternalLink className="w-3 h-3 text-zinc-400" />
              </button>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

              <button
                onClick={() => {
                  setLegalModalTab('terms');
                  setIsLegalModalOpen(true);
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer rounded-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Terms of Service</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setLegalModalTab('privacy');
                  setIsLegalModalOpen(true);
                  setActiveMenu(null);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer rounded-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Privacy Policy</span>
                </div>
              </button>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

              <div className="px-3 py-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between select-none">
                <span>Payroll Pro Enterprise</span>
                <span className="font-mono">{appVersion}</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Center: Workspace Switcher Dropdown */}
      <div
        className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2"
        ref={workspaceDropdownRef}
        style={{ WebkitAppRegion: "no-drag" } as any}
      >
        <button
          onClick={() => setWorkspaceDropdownOpen(o => !o)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition text-xs font-semibold tracking-tight cursor-pointer group ${
            workspaceDropdownOpen 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs' 
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
          title="Switch workspace / company"
        >
          <Home className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
          <span className="truncate max-w-[260px] lg:max-w-[380px]">{company?.name ?? 'Select Workspace'}</span>
          <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-150 ${workspaceDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {workspaceDropdownOpen && companies.length > 0 && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-80 sm:w-96 max-w-[92vw] bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl text-xs z-[10000] animate-in fade-in flex flex-col overflow-hidden">
            
            {/* Header & Search */}
            <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-2">
              <div className="flex items-center justify-between px-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
                <span>Select Workspace</span>
                <span className="font-mono">{companies.length} {companies.length === 1 ? 'account' : 'accounts'}</span>
              </div>
              
              {companies.length > 4 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    ref={workspaceSearchInputRef}
                    type="text"
                    value={workspaceSearch}
                    onChange={e => setWorkspaceSearch(e.target.value)}
                    placeholder="Search workspaces by name..."
                    className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-lg text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 shadow-2xs"
                  />
                  {workspaceSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setWorkspaceSearch('');
                        workspaceSearchInputRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Scrollable Workspaces List (Max Height & Always Contained on Screen) */}
            <div className="max-h-[min(380px,calc(100vh-140px))] overflow-y-auto p-1.5 space-y-0.5">
              {filteredWorkspaces.map(comp => {
                const isActive = comp.id === activeCompanyId;
                return (
                  <button
                    key={comp.id}
                    onClick={() => {
                      if (!isActive) onSelectCompany?.(comp.id);
                      setWorkspaceDropdownOpen(false);
                      setWorkspaceSearch('');
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-left transition cursor-pointer group ${
                      isActive
                        ? 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border transition ${
                        isActive 
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' 
                          : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 border-zinc-200 dark:border-zinc-700/60'
                      }`}>
                        <Home className="w-3 h-3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs">{comp.name}</p>
                        {comp.subtitle && (
                          <p className="text-[10px] text-zinc-400 truncate">{comp.subtitle}</p>
                        )}
                      </div>
                      {comp.hasPassword && (
                        <span title="Password protected workspace">
                          <Lock className="w-3 h-3 text-amber-500/80 shrink-0 ml-1" />
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              {filteredWorkspaces.length === 0 && (
                <div className="text-center py-8 px-4 text-xs text-zinc-400">
                  No workspace matching "{workspaceSearch}"
                </div>
              )}
            </div>

            {/* Footer with switch/manage button */}
            <div className="p-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
              <button
                type="button"
                onClick={() => {
                  setWorkspaceDropdownOpen(false);
                  setWorkspaceSearch('');
                  onLockOrSwitchCompany?.();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-medium transition cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Manage Workspaces / Switch Account (Ctrl+L)</span>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Right: User Pill, Theme Toggle + Native Controls */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: "no-drag" } as any}>
        
        {updateState.status === 'downloading' && (
          <button
            type="button"
            title={updateBadgeTitle}
            onClick={handleInstallPendingUpdate}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
            <span>{updateState.downloadPercent}%</span>
          </button>
        )}

        {(updateState.restartRequired || updateState.status === 'downloaded') && (
          <button
            type="button"
            title={updateBadgeTitle}
            onClick={handleInstallPendingUpdate}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-500/10 dark:text-amber-300"
          >
            <Download className="h-2.5 w-2.5" />
            <span>Restart to install</span>
          </button>
        )}

        {/* Network / Offline & Sync Status Indicator */}
        {!getSavedCloudConfig().isEnabled ? (
          <div 
            title="Local Database — records are stored privately on this device"
            className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 select-none"
          >
            <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
            <span>Local Database</span>
          </div>
        ) : !isOnline ? (
          <div 
            title="Offline — changes saved locally and will sync when reconnected"
            className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span>{hasPendingSync ? 'Offline (pending)' : 'Offline'}</span>
          </div>
        ) : hasPendingSync ? (
          <div 
            title="Syncing changes to cloud server..."
            className="flex items-center gap-1.5 text-[11px] font-medium text-sky-600 dark:text-sky-400"
          >
            <RefreshCw className="w-2.5 h-2.5 text-sky-500 shrink-0 animate-spin" />
            <span>Syncing</span>
          </div>
        ) : (
          <div 
            title="Online — workspace synced with cloud server"
            className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
          >
            <span className="relative flex w-2.5 h-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-500"></span>
            </span>
            <span>Synced</span>
          </div>
        )}

        {updateState.status === 'available' && (
          <button
            type="button"
            title={updateBadgeTitle}
            onClick={handleCheckForUpdates}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-100 dark:border-violet-700/60 dark:bg-violet-500/10 dark:text-violet-300"
          >
            <RefreshCw className="h-2.5 w-2.5" />
            <span>Update v{updateState.latestVersion || ''} available</span>
          </button>
        )}

        {currentUser && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              title={`${currentUser.name} (${currentUser.role})`}
              className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                    {currentUser.name || currentUser.username || currentUser.email}
                  </div>
                </div>
                {!isLocalUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onNavigate('profile');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <UserCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Profile</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onSignOut?.();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          {isDarkTheme ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Native Window Controls - Only shown when running in Electron desktop */}
        {Boolean((window as any).electronAPI) && (
          <div className="flex items-center ml-1 border-l border-zinc-200 dark:border-zinc-800 pl-1" style={{ WebkitAppRegion: "no-drag" } as any}>
            <button 
              onClick={() => (window as any).electronAPI?.windowMinimize?.()}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
              title="Minimize"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button 
              onClick={() => (window as any).electronAPI?.windowMaximize?.()}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
              title="Maximize"
            >
              <Square className="w-2.5 h-2.5" />
            </button>
            <button 
              onClick={() => (window as any).electronAPI?.windowClose?.()}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-rose-500 hover:text-white text-zinc-400 transition"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

      </div>

    </header>

    {/* Global Export Scope Modal accessible anywhere via Ctrl+E or File Menu */}
    {isExportModalOpen && (
      <ExportScopeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleConfirmExport}
        currentMonthLabel={monthLabel}
        currentMonthKey={selectedMonth}
        currentYear={selectedYear}
        departments={computedDepartments}
        employmentTypeRules={employmentTypeRules}
      />
    )}

    {/* Global Legal & Help Modal (Terms of Service / Privacy Policy) */}
    <LegalModal
      isOpen={isLegalModalOpen}
      onClose={() => setIsLegalModalOpen(false)}
      initialTab={legalModalTab}
    />
  </>
  );
};
