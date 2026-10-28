import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  Lock, 
  Unlock, 
  Printer, 
  Upload, 
  Search,
  X,
  SlidersHorizontal,
  Download,
  FileSpreadsheet,
  Clock,
  History,
  ArrowRight,
  Palette,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CalculatedPayrollItem, PayrollSnapshot, Employee, PayrollVariables, PayeTaxVariables, CompanyProfile, PayslipDesignConfig, PayslipCustomPreset, EmployeeLoan, TeamMember } from '../../types';
import { formatNaira, formatCompactNaira, formatDateTime } from '../../engine/payePensionEngine';
import { FinalizeLockModal } from './FinalizeLockModal';
import { UnlockPayrollModal } from './UnlockPayrollModal';
import { VersionHistoryModal } from './VersionHistoryModal';
import { BulkPrintPayslipsModal } from './BulkPrintPayslipsModal';
import { PayslipModal } from './PayslipModal';
import { exportPayrollProToExcel, ExportOptions } from '../../engine/excelEngine';
import { exportNibssBankTransferCsv } from '../../engine/bankPaymentEngine';
import { ExportScopeModal } from '../excel/ExportScopeModal';
import { MONTHS } from '../../store/usePayrollStore';
import { TablePagination } from '../common/TablePagination';
import { SortableHeader, SortDirection } from '../common/SortableHeader';

interface PayrollProcessingViewProps {
  monthLabel: string;
  year: number;
  items: CalculatedPayrollItem[];
  activeSnapshot: PayrollSnapshot | undefined;
  snapshots?: PayrollSnapshot[];
  onFinalizeAndLock: (notes: string) => void;
  onUnlock: (reason: string) => void;
  onDeleteSnapshot?: (snapshotId: string) => void;
  employees: Employee[];
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  selectedMonth: string;
  onPeriodChange: (month: string, year: number) => void;
  company: CompanyProfile;
  onOpenCompanySettings: () => void;
  departmentsList?: string[];
  onOpenPayslipDesigner?: () => void;
  payslipDesign?: PayslipDesignConfig;
  onUpdatePayslipDesign?: (updates: Partial<PayslipDesignConfig>) => void;
  onResetPayslipDesign?: () => void;
  savedPresets?: PayslipCustomPreset[];
  onSavePreset?: (name: string, config: PayslipDesignConfig) => void;
  onDeletePreset?: (id: string) => void;
  loans?: EmployeeLoan[];
  currentUser?: TeamMember | null;
}

export const PayrollProcessingView: React.FC<PayrollProcessingViewProps> = ({
  monthLabel,
  year,
  items,
  activeSnapshot,
  snapshots = [],
  onFinalizeAndLock,
  onUnlock,
  onDeleteSnapshot,
  employees,
  payrollVariables,
  payeTaxVariables,
  selectedMonth,
  onPeriodChange,
  company,
  onOpenCompanySettings,
  departmentsList = [],
  onOpenPayslipDesigner,
  payslipDesign,
  onUpdatePayslipDesign,
  onResetPayslipDesign,
  savedPresets = [],
  onSavePreset,
  onDeletePreset,
  loans = [],
  currentUser,
}) => {
  const isAuditor = currentUser?.role === 'Auditor';
  const [activeSubTab, setActiveSubTab] = useState<'processing' | 'paye' | 'pension'>('processing');
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedSingleSlip, setSelectedSingleSlip] = useState<CalculatedPayrollItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(true);

  // Selected version key: 'live' or string of version number, e.g. '1', '2'
  const [selectedVersionKey, setSelectedVersionKey] = useState<string>('latest');

  const handleDeleteSnapshot = (snapshotId: string) => {
    const target = snapshots.find(s => s.id === snapshotId);
    if (onDeleteSnapshot) {
      onDeleteSnapshot(snapshotId);
    }
    if (target && String(target.version) === selectedVersionKey) {
      setSelectedVersionKey('live');
    }
  };

  const isLocked = Boolean(activeSnapshot?.isLocked);

  // Snapshots for this period and version calculation
  const snapshotsForPeriod = useMemo(() => {
    return (snapshots || []).filter(s => s.monthKey === selectedMonth && s.year === year);
  }, [snapshots, selectedMonth, year]);

  const sortedSnapshots = useMemo(() => {
    return [...snapshotsForPeriod].sort((a, b) => b.version - a.version);
  }, [snapshotsForPeriod]);

  const nextVersion = snapshotsForPeriod.length + 1;

  // Sync selected version when period changes or active snapshot changes
  useEffect(() => {
    if (isLocked && activeSnapshot) {
      setSelectedVersionKey(String(activeSnapshot.version));
    } else {
      setSelectedVersionKey('live');
    }
  }, [selectedMonth, year, activeSnapshot?.id, isLocked]);

  // Determine active displayed snapshot and items
  const displaySnapshot = useMemo(() => {
    if (selectedVersionKey === 'live') return undefined;
    const found = snapshotsForPeriod.find(s => String(s.version) === selectedVersionKey);
    return found || activeSnapshot;
  }, [selectedVersionKey, snapshotsForPeriod, activeSnapshot]);

  const isViewingArchived = Boolean(
    displaySnapshot && (!activeSnapshot || displaySnapshot.version !== activeSnapshot.version)
  );

  const displayItems = useMemo(() => {
    if (displaySnapshot?.items && Array.isArray(displaySnapshot.items)) return displaySnapshot.items;
    return Array.isArray(items) ? items : [];
  }, [displaySnapshot, items]);

  // Departments for filtering
  const departments = ['ALL', ...Array.from(new Set([...departmentsList, ...displayItems.map(i => i?.department)].filter(Boolean)))];

  // Filter items by search, department, and active subtab
  const filteredItems = useMemo(() => {
    return displayItems.filter(i => {
      if (!i) return false;
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (i.fullName || '').toLowerCase().includes(query);
        const matchesCode = (i.employeeCode || '').toLowerCase().includes(query);
        const matchesDept = (i.department || '').toLowerCase().includes(query);
        const matchesTax = (i.payeNumber || '').toLowerCase().includes(query);
        const matchesPension = (i.pensionNumber || '').toLowerCase().includes(query);
        const matchesPfa = (i.pfaName || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesDept && !matchesTax && !matchesPension && !matchesPfa) return false;
      }

      // Department filter
      if (selectedDeptFilter !== 'ALL' && i.department !== selectedDeptFilter) return false;

      // Subtab filter
      if (activeSubTab === 'paye') return i.hasPaye;
      if (activeSubTab === 'pension') return i.hasPension;
      return true;
    });
  }, [displayItems, searchQuery, selectedDeptFilter, activeSubTab]);

  // Sorting State
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;
    return [...filteredItems].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'code':
          comparison = (a.employeeCode || '').localeCompare(b.employeeCode || '');
          break;
        case 'name':
          comparison = (a.fullName || '').localeCompare(b.fullName || '');
          break;
        case 'dept':
          comparison = (a.department || '').localeCompare(b.department || '');
          break;
        case 'gross':
          comparison = a.monthlyGross - b.monthlyGross;
          break;
        case 'paye':
          comparison = a.monthlyPaye - b.monthlyPaye;
          break;
        case 'pension':
          comparison = a.employeePension - b.employeePension;
          break;
        case 'net':
          comparison = a.netTakeHome - b.netTakeHome;
          break;
        case 'annualGross':
          comparison = a.annualGross - b.annualGross;
          break;
        case 'totalCra':
          comparison = a.totalCra - b.totalCra;
          break;
        case 'taxableIncome':
          comparison = a.taxableIncome - b.taxableIncome;
          break;
        case 'employerPension':
          comparison = a.employerPension - b.employerPension;
          break;
        case 'totalPension':
          comparison = (a.employeePension + a.employerPension) - (b.employeePension + b.employerPension);
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredItems, sortField, sortDirection]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 on search, filter, subtab or version change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDeptFilter, activeSubTab, selectedVersionKey]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // Totals computed across all displayed items
  const totalGross = displayItems.reduce((s, i) => s + i.monthlyGross, 0);
  const totalBasic = displayItems.reduce((s, i) => s + i.basic, 0);
  const totalHousing = displayItems.reduce((s, i) => s + i.housing, 0);
  const totalTransport = displayItems.reduce((s, i) => s + i.transport, 0);
  const totalOther = displayItems.reduce((s, i) => s + i.otherAllowances, 0);
  const totalPaye = displayItems.reduce((s, i) => s + i.monthlyPaye, 0);
  const totalEmpPension = displayItems.reduce((s, i) => s + i.employeePension, 0);
  const totalCompPension = displayItems.reduce((s, i) => s + i.employerPension, 0);
  const totalDeductions = displayItems.reduce((s, i) => s + i.totalDeductions, 0);
  const totalNet = displayItems.reduce((s, i) => s + i.netTakeHome, 0);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleOpenExportModal = () => {
    setIsExportModalOpen(true);
  };

  const handleConfirmExport = (options: ExportOptions) => {
    try {
      const targetMonthLabel = options.selectedMonth
        ? (MONTHS.find(m => m.key === options.selectedMonth)?.label || monthLabel)
        : monthLabel;
      const targetYear = options.selectedYear || year;

      exportPayrollProToExcel(
        employees,
        displayItems,
        payrollVariables,
        payeTaxVariables,
        targetMonthLabel,
        targetYear,
        displaySnapshot || activeSnapshot,
        company,
        { ...options, loans },
        loans
      );
    } catch (err) {
      alert('Error exporting Excel workbook: ' + (err as Error).message);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto select-none">
      
      {/* ── Top Header ── */}
      <div className="pt-2.5 pb-3.5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Payroll Processing
            </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Active cycle for {monthLabel} {year} &bull; {items.length} Employees enrolled
          </p>
        </div>

        {/* Action Controls Toolbar - Streamlined Single Row */}
        <div className="flex items-center gap-2 flex-nowrap">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => onPeriodChange(e.target.value, year)}
            className="h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] px-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 outline-none cursor-pointer"
          >
            {MONTHS.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={year}
            onChange={(e) => onPeriodChange(selectedMonth, Number(e.target.value))}
            className="h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] px-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 outline-none cursor-pointer"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Unified Version Status & Dropdown Switcher */}
          {snapshotsForPeriod.length > 0 && (
            <div className="relative flex items-center">
              <div className={`flex items-center gap-1.5 h-8 px-2 rounded-md border text-xs font-medium transition ${
                isViewingArchived
                  ? 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold'
                  : isLocked
                  ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300'
              }`}>
                {isViewingArchived ? (
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                ) : isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                )}
                
                <select
                  value={selectedVersionKey}
                  onChange={(e) => {
                    if (e.target.value === '__history__') {
                      setIsHistoryModalOpen(true);
                    } else {
                      setSelectedVersionKey(e.target.value);
                    }
                  }}
                  className="bg-transparent text-xs font-medium outline-none cursor-pointer pr-0.5 text-inherit"
                  title="Switch version or open history"
                >
                  {!isLocked && (
                    <option value="live" className="text-zinc-900 bg-white dark:bg-[#121215] dark:text-zinc-100">
                      Draft (Live v{nextVersion})
                    </option>
                  )}
                  {sortedSnapshots.map(snap => (
                    <option 
                      key={snap.id} 
                      value={String(snap.version)}
                      className="text-zinc-900 bg-white dark:bg-[#121215] dark:text-zinc-100"
                    >
                      {snap.isLocked ? `Locked (v${snap.version})` : `Archived (v${snap.version})`}
                    </option>
                  ))}
                  {snapshotsForPeriod.length > 1 && (
                    <option value="__history__" className="text-zinc-900 bg-white dark:bg-[#121215] dark:text-zinc-100">
                      Version History ({snapshotsForPeriod.length})...
                    </option>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Action Control: Unlock / Finalize / Return to Active */}
          {isViewingArchived ? (
            <button
              type="button"
              onClick={() => setSelectedVersionKey(isLocked ? String(activeSnapshot?.version) : 'live')}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition shadow-xs whitespace-nowrap"
              title="Return to latest version"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Back to v{activeSnapshot?.version || nextVersion}</span>
            </button>
          ) : isLocked ? (
            !isAuditor ? (
              <button
                type="button"
                onClick={() => setIsUnlockModalOpen(true)}
                className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition shadow-xs whitespace-nowrap cursor-pointer"
                title="Unlock to make changes to employee salaries and create a new version"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock to Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-medium border border-zinc-200 dark:border-zinc-700 select-none">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Locked (Auditor View)</span>
              </div>
            )
          ) : (
            !isAuditor ? (
              <button
                type="button"
                onClick={() => setIsLockModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-md font-medium text-xs transition shadow-xs whitespace-nowrap cursor-pointer ${
                  snapshotsForPeriod.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Finalize &amp; Lock (v{nextVersion})</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-xs font-medium border border-zinc-200 dark:border-zinc-700 select-none">
                <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Draft (Auditor View)</span>
              </div>
            )
          )}

          {/* Payslips Button */}
          <button
            onClick={() => setIsBulkPrintOpen(true)}
            className="h-8 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition whitespace-nowrap"
            title="Open Bulk Payslip Studio"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Payslips</span>
          </button>
        </div>
      </div>
    </div>

      {/* Archived Snapshot Warning Banner */}
      {isViewingArchived && displaySnapshot && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-xs text-blue-950 dark:text-blue-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-200">
                Viewing Archived Payroll Snapshot: Version {displaySnapshot.version}
              </div>
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                Finalized on {displaySnapshot.finalizedAt ? formatDateTime(displaySnapshot.finalizedAt) : 'Unknown date'}
                {displaySnapshot.finalizedBy ? ` by ${displaySnapshot.finalizedBy}` : ''}
                {displaySnapshot.notes ? ` • Note: "${displaySnapshot.notes}"` : ''}
                {' '}&bull; Calculations, payslips, and exports reflect Version {displaySnapshot.version}.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-2.5 py-1 rounded border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-200 font-medium text-[11px] transition"
            >
              All Versions ({snapshotsForPeriod.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedVersionKey(isLocked ? String(activeSnapshot?.version) : 'live')}
              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] transition shadow-2xs"
            >
              Back to v{activeSnapshot?.version || nextVersion} &rarr;
            </button>
          </div>
        </div>
      )}

      {/* 3 Sub-Tabs Navigation */}
      <div className="flex bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-md border border-zinc-200 dark:border-zinc-800/80 items-center overflow-x-auto gap-1">
        {[
          { id: 'processing', label: 'Master Register' },
          { id: 'paye', label: 'PAYE Schedule' },
          { id: 'pension', label: 'Pension Schedule' },
        ].map(tab => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded text-xs transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 font-medium shadow-xs' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Live Revision Banner (when unlocked after prior finalization) */}
      {!isLocked && snapshotsForPeriod.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            <span className="text-amber-800 dark:text-amber-300 font-medium">
              Live Revision Mode &bull; Drafting Version {nextVersion}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400 hidden md:inline">
              (Live calculation active. Update salaries or staff in Employee Directory, then click Finalize &amp; Lock to save Version {nextVersion})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsLockModalOpen(true)}
            className="self-start sm:self-auto px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] transition shadow-2xs"
          >
            Lock v{nextVersion}
          </button>
        </div>
      )}

      {/* 3 Minimal Hero Stat Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 animate-in fade-in duration-150">
          
          {/* Card 1: Gross */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <span className="text-xs text-zinc-500 block mb-1">Total Gross Compensation</span>
            <div className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {formatNaira(totalGross)}
            </div>
          </div>

          {/* Card 2: Deductions */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <span className="text-xs text-zinc-500 block mb-1">Total Statutory Deductions</span>
            <div className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {formatNaira(totalDeductions)}
            </div>
          </div>

          {/* Card 3: Net */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <span className="text-xs text-zinc-500 block mb-1">Total Net Payout (Take-Home)</span>
            <div className="text-xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatNaira(totalNet)}
            </div>
          </div>

        </div>
      )}

      {/* Filter and Density Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee name or code..."
            className="w-full bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-7 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] px-2.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
          >
            {departments.map(d => (
              <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>
            ))}
          </select>

          {/* Table Density Switcher */}
          <button
            onClick={() => setIsCompactMode(!isCompactMode)}
            className={`h-8 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
              isCompactMode 
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent' 
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{isCompactMode ? 'Compact' : 'Comfortable'}</span>
          </button>

          {/* Toggle Stats for More Table Room */}
          <button
            type="button"
            onClick={() => setShowStats(!showStats)}
            className="h-8 flex items-center gap-1.5 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md px-2.5 text-xs font-medium transition cursor-pointer shadow-2xs"
            title={showStats ? "Hide summary stats to maximize table room" : "Show summary stats"}
          >
            {showStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showStats ? "Hide Stats" : "Show Stats"}</span>
          </button>
        </div>

      </div>

      {/* Master Data Register Table */}
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs overflow-hidden">
        <div className={`overflow-x-auto overflow-y-auto ${showStats ? 'max-h-[calc(100vh-285px)]' : 'max-h-[calc(100vh-185px)]'}`}>
          <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shadow-xs">
            <tr className="bg-zinc-50 dark:bg-zinc-900">
              <th className="px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 rounded-tl-lg">
                <SortableHeader
                  label="Code"
                  field="code"
                  currentSortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                />
              </th>
                <th className="px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900">
                  <SortableHeader
                    label="Employee"
                    field="name"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th className="px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900">
                  <SortableHeader
                    label="Dept"
                    field="dept"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                  <SortableHeader
                    label="Gross"
                    field="gross"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                </th>
                {activeSubTab === 'processing' && (
                  <>
                    <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                      <SortableHeader
                        label="PAYE"
                        field="paye"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </th>
                    <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                      <SortableHeader
                        label="Pension"
                        field="pension"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </th>
                    <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                      <SortableHeader
                        label="Net Pay"
                        field="net"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </th>
                  </>
                )}
                {activeSubTab === 'paye' && (
                  <>
                    <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                      <SortableHeader
                        label="Annual Gross"
                        field="annualGross"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </th>
                    <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                      <SortableHeader
                        label="Total CRA"
                        field="totalCra"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </th>
                    <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                      <SortableHeader
                        label="Taxable Income"
                        field="taxableIncome"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </th>
                    <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                      <SortableHeader
                        label="Monthly PAYE"
                        field="paye"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </th>
                  </>
                )}
                {activeSubTab === 'pension' && (
                  <>
                    <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                      <SortableHeader
                        label="Employee (8%)"
                        field="pension"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </th>
                    <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                      <SortableHeader
                        label="Employer (10%)"
                        field="employerPension"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </th>
                    <th className="px-3.5 py-2.5 text-right bg-zinc-50 dark:bg-zinc-900">
                      <SortableHeader
                        label="Total Remittance"
                        field="totalPension"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        align="right"
                      />
                    </th>
                  </>
                )}
                <th className="px-3.5 py-2.5 text-center font-semibold uppercase tracking-wider text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-tr-lg">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {paginatedItems.map(item => (
                <tr 
                  key={item.employeeId} 
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-3.5 py-2 font-mono text-zinc-500">
                    {item.employeeCode}
                  </td>
                  
                  <td className="px-3.5 py-2">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {item.fullName}
                    </div>
                    {activeSubTab === 'paye' ? (
                      <div className="text-[11px] font-mono text-zinc-400">
                        {item.payeNumber ? `Tax ID: ${item.payeNumber}` : 'Tax ID: Not registered'}
                      </div>
                    ) : activeSubTab === 'pension' ? (
                      <div className="text-[11px] font-mono text-zinc-400">
                        {item.pensionNumber ? `RSA: ${item.pensionNumber}` : 'RSA: Not registered'}
                        {item.pfaName && <span className="font-sans text-zinc-500 ml-1">({item.pfaName})</span>}
                      </div>
                    ) : (
                      !isCompactMode && (
                        <div className="text-[11px] text-zinc-400">
                          {item.position}
                        </div>
                      )
                    )}
                  </td>

                  <td className="px-3.5 py-2 text-zinc-500">
                    {item.department}
                  </td>

                  <td className="px-3.5 py-2 text-right font-mono text-zinc-800 dark:text-zinc-200">
                    {formatNaira(item.monthlyGross)}
                  </td>

                  {activeSubTab === 'processing' && (
                    <>
                      <td className="px-3.5 py-2 text-right font-mono text-zinc-600 dark:text-zinc-400">
                        {formatNaira(item.monthlyPaye)}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-zinc-600 dark:text-zinc-400">
                        {formatNaira(item.employeePension)}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {formatNaira(item.netTakeHome)}
                      </td>
                    </>
                  )}

                  {activeSubTab === 'paye' && (
                    <>
                      <td className="px-3.5 py-2 text-right font-mono text-zinc-500">
                        {formatNaira(item.monthlyGross * 12)}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-zinc-500">
                        {formatNaira(item.totalCra)}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                        {formatNaira(item.taxableIncome)}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                        {formatNaira(item.monthlyPaye)}
                      </td>
                    </>
                  )}

                  {activeSubTab === 'pension' && (
                    <>
                      <td className="px-3.5 py-2 text-right font-mono text-zinc-500">
                        {formatNaira(item.employeePension)}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono text-zinc-500">
                        {formatNaira(item.employerPension)}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                        {formatNaira(item.employeePension + item.employerPension)}
                      </td>
                    </>
                  )}

                  <td className="px-3.5 py-2 text-center">
                    <button
                      onClick={() => setSelectedSingleSlip(item)}
                      className="px-2 py-0.5 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-400 italic">
                    No employee records match the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pinned Pagination Footer - Solid Floor of Table */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredItems.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="staff records"
        />
      </div>

      {/* Lock Period Modal */}
      {isLockModalOpen && (
        <FinalizeLockModal
          isOpen={isLockModalOpen}
          monthLabel={monthLabel}
          year={year}
          items={displayItems}
          nextVersion={nextVersion}
          onConfirm={(notes) => {
            onFinalizeAndLock(notes);
            setIsLockModalOpen(false);
          }}
          onClose={() => setIsLockModalOpen(false)}
        />
      )}

      {/* Unlock Period Modal */}
      {isUnlockModalOpen && (
        <UnlockPayrollModal
          isOpen={isUnlockModalOpen}
          onClose={() => setIsUnlockModalOpen(false)}
          onConfirm={(reason) => {
            onUnlock(reason);
            setIsUnlockModalOpen(false);
          }}
          monthLabel={monthLabel}
          year={year}
          activeSnapshot={activeSnapshot}
        />
      )}

      {/* Version History Modal */}
      {isHistoryModalOpen && (
        <VersionHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          snapshots={snapshotsForPeriod}
          monthLabel={monthLabel}
          year={year}
          currentSelectedVersion={selectedVersionKey}
          activeSnapshot={activeSnapshot}
          isLocked={isLocked}
          onSelectVersion={(vKey) => setSelectedVersionKey(vKey)}
          onDeleteSnapshot={isAuditor ? undefined : handleDeleteSnapshot}
        />
      )}

      {/* Bulk Print Payslips Studio Modal */}
      {isBulkPrintOpen && (
        <BulkPrintPayslipsModal
          isOpen={isBulkPrintOpen}
          onClose={() => setIsBulkPrintOpen(false)}
          items={filteredItems}
          monthLabel={monthLabel}
          year={year}
          company={company}
          config={payslipDesign}
          onOpenPayslipDesigner={onOpenPayslipDesigner}
          employees={employees}
          payrollVariables={payrollVariables}
          payeTaxVariables={payeTaxVariables}
          selectedMonth={selectedMonth}
          snapshots={snapshots}
          onUpdatePayslipDesign={onUpdatePayslipDesign}
          onResetPayslipDesign={onResetPayslipDesign}
          savedPresets={savedPresets}
          onSavePreset={onSavePreset}
          onDeletePreset={onDeletePreset}
        />
      )}

      {/* Single Employee Payslip Modal */}
      {selectedSingleSlip && (
        <PayslipModal
          isOpen={Boolean(selectedSingleSlip)}
          item={selectedSingleSlip}
          monthLabel={monthLabel}
          year={year}
          company={company}
          config={payslipDesign}
          onClose={() => setSelectedSingleSlip(null)}
          onOpenPayslipDesigner={onOpenPayslipDesigner}
          employees={employees}
          payrollVariables={payrollVariables}
          payeTaxVariables={payeTaxVariables}
          selectedMonth={selectedMonth}
          onUpdatePayslipDesign={onUpdatePayslipDesign}
          onResetPayslipDesign={onResetPayslipDesign}
          savedPresets={savedPresets}
          onSavePreset={onSavePreset}
          onDeletePreset={onDeletePreset}
        />
      )}

      {/* Export Scope & Formula Configuration Modal */}
      <ExportScopeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleConfirmExport}
        currentMonthLabel={monthLabel}
        currentMonthKey={selectedMonth}
        currentYear={year}
        departments={departmentsList.length > 0 ? departmentsList : Array.from(new Set(employees.map(e => e.department).filter(Boolean) as string[]))}
        employmentTypeRules={payrollVariables.employmentTypeRules}
      />

    </div>
  );
};
