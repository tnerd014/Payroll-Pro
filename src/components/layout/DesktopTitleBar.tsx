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
  SlidersHorizontal
} from 'lucide-react';
import { exportPayrollProToExcel, ExportOptions } from '../../engine/excelEngine';
import { ExportScopeModal } from '../excel/ExportScopeModal';
import { MONTHS } from '../../store/usePayrollStore';
import { Employee, CalculatedPayrollItem, PayrollVariables, PayeTaxVariables, PayrollSnapshot, AppView, CompanyProfile, CompanyAccount, TeamMember, EmployeeLoan, EmploymentTypeRule } from '../../types';
import { checkRealConnectivity } from '../../services/supabaseClient';
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
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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
        onTriggerAddEmployee?.();
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
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(e.target as Node)) {
        setWorkspaceDropdownOpen(false);
        setWorkspaceSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
              <button
                onClick={() => { onTriggerAddEmployee?.(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-between cursor-pointer rounded-xs transition-colors"
              >
                <span>Add Employee</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Ctrl+N</span>
              </button>

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
        
        {/* Network / Offline & Sync Status Indicator */}
        {!isOnline ? (
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

        {currentUser && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              title={`${currentUser.name} (${currentUser.role})`}
              className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 z-50 text-xs">
                <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400">
                  Staff: <strong>{currentUser.email || currentUser.username}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onSignOut?.();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Switch Staff User</span>
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
  </>
  );
};
