import React, { useState, useRef, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  Minus, 
  Square, 
  X
} from 'lucide-react';
import { exportPayrollProToExcel } from '../../engine/excelEngine';
import { Employee, CalculatedPayrollItem, PayrollVariables, PayeTaxVariables, PayrollSnapshot, AppView, CompanyProfile } from '../../types';
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
  onOpenCompanySettings: () => void;
  onNavigate: (view: AppView) => void;
  onSoftReload?: () => void;
  onTriggerAddEmployee?: () => void;
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
  onOpenCompanySettings,
  onNavigate,
  onSoftReload,
  onTriggerAddEmployee,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
      } else if (e.key === 'F11') {
        e.preventDefault();
        handleToggleFullScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomLevel, onTriggerAddEmployee, employees, payrollItems, payrollVariables, payeTaxVariables, monthLabel, selectedYear, activeSnapshot]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
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
      className="no-print h-9 bg-white dark:bg-[#09090b] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 select-none relative z-50 shrink-0 transition-colors"
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
            <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-[60]">
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
            <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-[60]">
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
            <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-[60]">
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

      {/* Center: Quiet Company & Period Indicator */}
      <div className="hidden md:flex items-center gap-2 text-xs font-medium absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="truncate max-w-[340px] lg:max-w-[540px] text-zinc-700 dark:text-zinc-300 font-semibold tracking-tight">
          {company.name}
        </span>
        <span className="text-zinc-300 dark:text-zinc-700 font-normal">&bull;</span>
        <span className="text-zinc-400 font-mono text-[11px] whitespace-nowrap">
          {monthLabel} {selectedYear}
        </span>
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
