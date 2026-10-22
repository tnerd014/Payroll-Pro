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
  Building2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { exportPayrollProToExcel } from '../../engine/excelEngine';
import { Employee, CalculatedPayrollItem, PayrollVariables, PayeTaxVariables, PayrollSnapshot, AppView, CompanyProfile, CompanyAccount } from '../../types';
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
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        onTriggerAddEmployee?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        handleQuickExport();
      } else if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        handleForceReload();
      } else if ((e.ctrlKey && (e.key === 'r' || e.key === 'R')) || e.key === 'F5') {
        e.preventDefault();
        handleReload();
      } else if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if (e.ctrlKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        onLockOrSwitchCompany?.();
      } else if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomLevel, onTriggerAddEmployee, onLockOrSwitchCompany, employees, payrollItems, payrollVariables, payeTaxVariables, monthLabel, selectedYear, activeSnapshot]);

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

  const handleQuickExport = () => {
    try {
      exportPayrollProToExcel(
        employees,
        payrollItems,
        payrollVariables,
        payeTaxVariables,
        monthLabel,
        selectedYear,
        activeSnapshot
      );
    } catch (err) {
      console.error('Failed to export payroll Excel workbook:', err);
      alert('Unable to export Excel file: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
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
            <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-[10000]">
              <button
                onClick={() => { onTriggerAddEmployee?.(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 flex items-center justify-between cursor-pointer"
              >
                <span>Add Employee</span>
                <span className="text-[10px] text-zinc-400 font-mono">Ctrl+N</span>
              </button>
              <button
                onClick={() => { handleQuickExport(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 flex items-center justify-between cursor-pointer"
              >
                <span>Export Workbook</span>
                <span className="text-[10px] text-zinc-400 font-mono">Ctrl+E</span>
              </button>
              <button
                onClick={() => { onNavigate('settings'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 flex items-center justify-between cursor-pointer"
              >
                <span>Settings</span>
              </button>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
              <button
                onClick={() => { onLockOrSwitchCompany?.(); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 flex items-center justify-between cursor-pointer"
              >
                <span>Switch Company</span>
                <span className="text-[10px] text-zinc-400 font-mono">Ctrl+L</span>
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
            <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-[10000]">
              <button
                onClick={() => { onNavigate('payroll'); setActiveMenu(null); }}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 cursor-pointer"
              >
                Payroll Processing
              </button>
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
            className={`px-2 py-1 rounded text-xs font-medium transition ${
              activeMenu === 'view' 
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' 
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            View
          </button>

          {activeMenu === 'view' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-[10000]">
              <button
                onClick={() => { handleReload(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200"
              >
                <span>Reload Page</span>
                <span className="text-[11px] text-zinc-400 font-mono">Ctrl+R</span>
              </button>
              
              <button
                onClick={() => { handleForceReload(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200"
              >
                <span>Force Reload</span>
                <span className="text-[11px] text-zinc-400 font-mono">Ctrl+Shift+R</span>
              </button>

              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

              <button
                onClick={() => { handleZoomIn(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200"
              >
                <span>Zoom In</span>
                <span className="text-[11px] text-zinc-400 font-mono">Ctrl+=</span>
              </button>

              <button
                onClick={() => { handleZoomOut(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200"
              >
                <span>Zoom Out</span>
                <span className="text-[11px] text-zinc-400 font-mono">Ctrl+-</span>
              </button>

              <button
                onClick={() => { handleResetZoom(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200"
              >
                <span>Reset Zoom</span>
                <span className="text-[11px] text-zinc-400 font-mono">Ctrl+0</span>
              </button>

              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

              <button
                onClick={() => { handleToggleFullScreen(); setActiveMenu(null); }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200"
              >
                <span>Toggle Full Screen</span>
                <span className="text-[11px] text-zinc-400 font-mono">F11</span>
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
          <Building2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
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
                        <Building2 className="w-3 h-3" />
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

      {/* Right: Theme Toggle + Native Controls */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: "no-drag" } as any}>
        
        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          {isDarkTheme ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Native Window Controls */}
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

      </div>

    </header>
  );
};
