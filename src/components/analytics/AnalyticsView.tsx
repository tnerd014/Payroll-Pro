import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart, 
  Landmark, 
  ShieldCheck, 
  Download, 
  Building2, 
  TrendingUp, 
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  ChevronDown,
  Users,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  PayrollSnapshot, 
  Employee, 
  PayrollVariables, 
  PayeTaxVariables, 
  CompanyProfile 
} from '../../types';
import { 
  formatNaira, 
  formatCompactNaira, 
  calculatePayrollItem 
} from '../../engine/payePensionEngine';
import { exportPayrollProToExcel } from '../../engine/excelEngine';
import { PrintableScheduleModal, ScheduleReportType } from './PrintableScheduleModal';
import { MONTHS } from '../../store/usePayrollStore';
import { TablePagination } from '../common/TablePagination';
import { SortableHeader, SortDirection } from '../common/SortableHeader';

export type AnalyticsRangeMode = 'single-month' | 'full-year' | 'all-history';

interface AnalyticsViewProps {
  items: CalculatedPayrollItem[];
  employees: Employee[];
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  monthLabel: string;
  selectedMonth?: string;
  year: number;
  activeSnapshot?: PayrollSnapshot | undefined;
  snapshots?: PayrollSnapshot[];
  departments?: string[];
  company?: CompanyProfile;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  items: initialItems,
  employees,
  payrollVariables,
  payeTaxVariables,
  monthLabel: initialMonthLabel,
  selectedMonth: initialSelectedMonth = 'jan',
  year: initialYear,
  activeSnapshot,
  snapshots = [],
  departments = [],
  company = { name: 'COMPANY LIMITED', subtitle: '', address: '', phone: '', email: '' }
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'tax' | 'pension' | 'bank'>('overview');
  
  // Interactive Report Filters
  const [rangeMode, setRangeMode] = useState<AnalyticsRangeMode>('single-month');
  const [activeMonthKey, setActiveMonthKey] = useState<string>(initialSelectedMonth);
  const [activeYear, setActiveYear] = useState<number>(initialYear);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedEmpType, setSelectedEmpType] = useState<string>('ALL');

  // Floating Filter Popover State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalType, setPrintModalType] = useState<ScheduleReportType>('bank');

  // Merged Export & Print Menu State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutsideExport = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutsideExport);
    }
    return () => document.removeEventListener('mousedown', handleClickOutsideExport);
  }, [isExportMenuOpen]);

  // Schedule Pagination State
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePageSize, setSchedulePageSize] = useState(10);

  useEffect(() => {
    setSchedulePage(1);
  }, [activeTab, rangeMode, activeMonthKey, activeYear, selectedDept, selectedEmpType]);

  const years = [2024, 2025, 2026, 2027, 2028];

  const currentMonthObj = MONTHS.find(m => m.key === activeMonthKey);
  const activeMonthLabel = currentMonthObj?.label || initialMonthLabel;

  // Available unique departments
  const availableDepts = useMemo(() => {
    const set = new Set<string>();
    departments.forEach(d => d && set.add(d));
    employees.forEach(e => e.department && set.add(e.department));
    return ['ALL', ...Array.from(set)];
  }, [departments, employees]);

  // Available employment types
  const availableEmpTypes = useMemo(() => {
    const list = ['ALL', 'Full-Time', 'Part-Time', 'Contract', 'Intern / NYSC'];
    if (payrollVariables.employmentTypeRules) {
      payrollVariables.employmentTypeRules.forEach(r => {
        if (!list.includes(r.name)) list.push(r.name);
      });
    }
    return list;
  }, [payrollVariables.employmentTypeRules]);

  // Helper to calculate items for a specific month
  const getComputedItemsForMonth = (mKey: string, y: number) => {
    return (employees || []).filter(e => e && e.status === 'Active').map(emp => 
      calculatePayrollItem(emp, payrollVariables, payeTaxVariables, mKey, y)
    );
  };

  // Filter items matching current department & employment type
  const filterPredicate = (item: CalculatedPayrollItem) => {
    if (!item) return false;
    if (selectedDept !== 'ALL' && (item.department || '').toLowerCase() !== selectedDept.toLowerCase()) {
      return false;
    }
    if (selectedEmpType !== 'ALL') {
      const type = item.employmentType || 'Full-Time';
      if (type.toLowerCase() !== selectedEmpType.toLowerCase()) return false;
    }
    return true;
  };

  // 12-Month Trajectory Trend (for Full-Year analysis)
  const monthlyTrajectory = useMemo(() => {
    return MONTHS.map(m => {
      const monthItems = getComputedItemsForMonth(m.key, activeYear).filter(filterPredicate);
      const gross = monthItems.reduce((s, i) => s + i.monthlyGross, 0);
      const net = monthItems.reduce((s, i) => s + i.netTakeHome, 0);
      const paye = monthItems.reduce((s, i) => s + i.monthlyPaye, 0);
      const empPension = monthItems.reduce((s, i) => s + i.employeePension, 0);
      const emplrPension = monthItems.reduce((s, i) => s + i.employerPension, 0);
      const pension = empPension + emplrPension;
      const totalCost = gross + emplrPension;
      return {
        key: m.key,
        label: m.label,
        headcount: monthItems.length,
        gross,
        net,
        paye,
        pension,
        totalCost,
      };
    });
  }, [employees, payrollVariables, payeTaxVariables, activeYear, selectedDept, selectedEmpType]);

  // Active items based on current rangeMode
  const activeItems = useMemo(() => {
    if (rangeMode === 'single-month') {
      return getComputedItemsForMonth(activeMonthKey, activeYear).filter(filterPredicate);
    }
    
    // For Full Year or All History: aggregate employee 12-month totals into composite items
    const monthsToScan = rangeMode === 'full-year' ? MONTHS : MONTHS; // extensible to multi-year
    const annualMap = new Map<string, CalculatedPayrollItem>();

    monthsToScan.forEach(m => {
      const mItems = getComputedItemsForMonth(m.key, activeYear).filter(filterPredicate);
      mItems.forEach(item => {
        const existing = annualMap.get(item.employeeId);
        if (!existing) {
          annualMap.set(item.employeeId, { ...item });
        } else {
          existing.monthlyGross += item.monthlyGross;
          existing.basic += item.basic;
          existing.housing += item.housing;
          existing.transport += item.transport;
          existing.otherAllowances += item.otherAllowances;
          existing.pensionableBHT += item.pensionableBHT;
          existing.employeePension += item.employeePension;
          existing.employerPension += item.employerPension;
          existing.monthlyPaye += item.monthlyPaye;
          existing.totalDeductions += item.totalDeductions;
          existing.netTakeHome += item.netTakeHome;
          existing.employerTotalCost += item.employerTotalCost;
        }
      });
    });

    return Array.from(annualMap.values());
  }, [rangeMode, activeMonthKey, activeYear, employees, payrollVariables, payeTaxVariables, selectedDept, selectedEmpType]);

  // Department Sorting
  const [deptSortField, setDeptSortField] = useState<string | null>('gross');
  const [deptSortDir, setDeptSortDir] = useState<SortDirection>('desc');
  const handleDeptSort = (field: string) => {
    if (deptSortField === field) {
      setDeptSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setDeptSortField(field);
      setDeptSortDir('asc');
    }
  };

  // Tax Schedule Sorting
  const [taxSortField, setTaxSortField] = useState<string | null>(null);
  const [taxSortDir, setTaxSortDir] = useState<SortDirection>('asc');
  const handleTaxSort = (field: string) => {
    if (taxSortField === field) {
      setTaxSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setTaxSortField(field);
      setTaxSortDir('asc');
    }
  };

  // Pension Schedule Sorting
  const [pensionSortField, setPensionSortField] = useState<string | null>(null);
  const [pensionSortDir, setPensionSortDir] = useState<SortDirection>('asc');
  const handlePensionSort = (field: string) => {
    if (pensionSortField === field) {
      setPensionSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setPensionSortField(field);
      setPensionSortDir('asc');
    }
  };

  // Bank Schedule Sorting
  const [bankSortField, setBankSortField] = useState<string | null>(null);
  const [bankSortDir, setBankSortDir] = useState<SortDirection>('asc');
  const handleBankSort = (field: string) => {
    if (bankSortField === field) {
      setBankSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setBankSortField(field);
      setBankSortDir('asc');
    }
  };

  const taxItems = useMemo(() => activeItems.filter(i => i.monthlyPaye > 0 || i.hasPaye), [activeItems]);
  const sortedTaxItems = useMemo(() => {
    if (!taxSortField) return taxItems;
    return [...taxItems].sort((a, b) => {
      let comparison = 0;
      switch (taxSortField) {
        case 'code': comparison = (a.employeeCode || '').localeCompare(b.employeeCode || ''); break;
        case 'name': comparison = (a.fullName || '').localeCompare(b.fullName || ''); break;
        case 'type': comparison = (a.employmentType || '').localeCompare(b.employmentType || ''); break;
        case 'gross': comparison = a.monthlyGross - b.monthlyGross; break;
        case 'cra': comparison = a.totalCra - b.totalCra; break;
        case 'taxable': comparison = a.taxableIncome - b.taxableIncome; break;
        case 'paye': comparison = a.monthlyPaye - b.monthlyPaye; break;
        default: comparison = 0;
      }
      return taxSortDir === 'asc' ? comparison : -comparison;
    });
  }, [taxItems, taxSortField, taxSortDir]);

  const paginatedTaxItems = useMemo(() => {
    const start = (schedulePage - 1) * schedulePageSize;
    return sortedTaxItems.slice(start, start + schedulePageSize);
  }, [sortedTaxItems, schedulePage, schedulePageSize]);

  const pensionItems = useMemo(() => activeItems.filter(i => i.hasPension), [activeItems]);
  const sortedPensionItems = useMemo(() => {
    if (!pensionSortField) return pensionItems;
    return [...pensionItems].sort((a, b) => {
      let comparison = 0;
      switch (pensionSortField) {
        case 'code': comparison = (a.employeeCode || '').localeCompare(b.employeeCode || ''); break;
        case 'name': comparison = (a.fullName || '').localeCompare(b.fullName || ''); break;
        case 'pfa': comparison = (a.pfaName || '').localeCompare(b.pfaName || ''); break;
        case 'base': comparison = a.pensionableBHT - b.pensionableBHT; break;
        case 'employee': comparison = a.employeePension - b.employeePension; break;
        case 'employer': comparison = a.employerPension - b.employerPension; break;
        case 'total': comparison = (a.employeePension + a.employerPension) - (b.employeePension + b.employerPension); break;
        default: comparison = 0;
      }
      return pensionSortDir === 'asc' ? comparison : -comparison;
    });
  }, [pensionItems, pensionSortField, pensionSortDir]);

  const paginatedPensionItems = useMemo(() => {
    const start = (schedulePage - 1) * schedulePageSize;
    return sortedPensionItems.slice(start, start + schedulePageSize);
  }, [sortedPensionItems, schedulePage, schedulePageSize]);

  const sortedBankItems = useMemo(() => {
    if (!bankSortField) return activeItems;
    return [...activeItems].sort((a, b) => {
      let comparison = 0;
      switch (bankSortField) {
        case 'code': comparison = (a.employeeCode || '').localeCompare(b.employeeCode || ''); break;
        case 'name': comparison = (a.fullName || '').localeCompare(b.fullName || ''); break;
        case 'bank': comparison = (a.bankName || '').localeCompare(b.bankName || ''); break;
        case 'account': comparison = (a.accountNumber || '').localeCompare(b.accountNumber || ''); break;
        case 'net': comparison = a.netTakeHome - b.netTakeHome; break;
        default: comparison = 0;
      }
      return bankSortDir === 'asc' ? comparison : -comparison;
    });
  }, [activeItems, bankSortField, bankSortDir]);

  const paginatedBankItems = useMemo(() => {
    const start = (schedulePage - 1) * schedulePageSize;
    return sortedBankItems.slice(start, start + schedulePageSize);
  }, [sortedBankItems, schedulePage, schedulePageSize]);

  // Aggregated totals
  const totalGross = activeItems.reduce((s, i) => s + i.monthlyGross, 0);
  const totalNet = activeItems.reduce((s, i) => s + i.netTakeHome, 0);
  const totalPaye = activeItems.reduce((s, i) => s + i.monthlyPaye, 0);
  const totalEmpPension = activeItems.reduce((s, i) => s + i.employeePension, 0);
  const totalEmplrPension = activeItems.reduce((s, i) => s + i.employerPension, 0);
  const totalPensionPool = totalEmpPension + totalEmplrPension;
  const totalEmployerCost = totalGross + totalEmplrPension;
  const totalDeductions = totalPaye + totalEmpPension;

  // Proportions
  const netRatio = totalGross > 0 ? (totalNet / totalGross) * 100 : 0;
  const payeRatio = totalGross > 0 ? (totalPaye / totalGross) * 100 : 0;
  const empPensionRatio = totalGross > 0 ? (totalEmpPension / totalGross) * 100 : 0;
  const emplrPensionRatio = totalGross > 0 ? (totalEmplrPension / totalGross) * 100 : 0;

  // Department Breakdown
  const deptList = useMemo(() => {
    const map: Record<string, { count: number; gross: number; net: number; tax: number; pension: number }> = {};
    activeItems.forEach(item => {
      const dept = item.department || 'Unassigned';
      if (!map[dept]) {
        map[dept] = { count: 0, gross: 0, net: 0, tax: 0, pension: 0 };
      }
      map[dept].count += 1;
      map[dept].gross += item.monthlyGross;
      map[dept].net += item.netTakeHome;
      map[dept].tax += item.monthlyPaye;
      map[dept].pension += (item.employeePension + item.employerPension);
    });
    const list = Object.entries(map).map(([dept, data]) => ({ dept, ...data }));
    if (!deptSortField) return list;
    return list.sort((a, b) => {
      let comparison = 0;
      switch (deptSortField) {
        case 'dept': comparison = a.dept.localeCompare(b.dept); break;
        case 'count': comparison = a.count - b.count; break;
        case 'gross': comparison = a.gross - b.gross; break;
        case 'net': comparison = a.net - b.net; break;
        case 'tax': comparison = a.tax - b.tax; break;
        case 'pension': comparison = a.pension - b.pension; break;
        default: comparison = 0;
      }
      return deptSortDir === 'asc' ? comparison : -comparison;
    });
  }, [activeItems, deptSortField, deptSortDir]);

  // Employment Type Breakdown
  const empTypeList = useMemo(() => {
    const map: Record<string, { count: number; gross: number; net: number; tax: number; pension: number }> = {};
    activeItems.forEach(item => {
      const type = item.employmentType || 'Full-Time';
      if (!map[type]) {
        map[type] = { count: 0, gross: 0, net: 0, tax: 0, pension: 0 };
      }
      map[type].count += 1;
      map[type].gross += item.monthlyGross;
      map[type].net += item.netTakeHome;
      map[type].tax += item.monthlyPaye;
      map[type].pension += (item.employeePension + item.employerPension);
    });
    return Object.entries(map)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.gross - a.gross);
  }, [activeItems]);

  // Excel Export Handler
  const handleExport = () => {
    exportPayrollProToExcel(
      employees,
      activeItems,
      payrollVariables,
      payeTaxVariables,
      rangeMode === 'single-month' ? activeMonthLabel : `Full Year ${activeYear}`,
      activeYear,
      activeSnapshot,
      company,
      {
        scope: rangeMode === 'single-month' ? 'current-month' : rangeMode === 'full-year' ? 'full-year' : 'all-history',
        selectedMonth: activeMonthKey,
        selectedYear: activeYear,
        departmentFilter: selectedDept,
        employmentTypeFilter: selectedEmpType,
      }
    );
  };

  const hasActiveFilters = selectedDept !== 'ALL' || selectedEmpType !== 'ALL' || rangeMode !== 'single-month';

  const resetFilters = () => {
    setSelectedDept('ALL');
    setSelectedEmpType('ALL');
    setRangeMode('single-month');
    setActiveMonthKey(initialSelectedMonth);
    setActiveYear(initialYear);
  };

  const periodSubtitle = rangeMode === 'single-month'
    ? `${activeMonthLabel} ${activeYear}`
    : rangeMode === 'full-year'
    ? `Full Calendar Year ${activeYear} (12-Month Aggregate)`
    : `Complete Historical Multi-Year Records`;

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      
      {/* Top Header - Pinned above scroll container so the vertical scrollbar starts below this header */}
      <div className="shrink-0 bg-[#fbfbfb] dark:bg-[#09090b] border-b border-zinc-200 dark:border-zinc-800 px-6 pt-5 pb-3.5 md:px-8 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight shrink-0">
              Payroll Analytics &amp; Statutory Reports
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
              {activeItems.length} Records
            </span>
            <span className="text-zinc-300 dark:text-zinc-700 hidden md:inline">&bull;</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden md:inline truncate">
              {periodSubtitle}
            </span>
          </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Minimalist Filter Popover Button */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                isFilterOpen || hasActiveFilters
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                  : 'bg-white dark:bg-[#121215] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
              }`}
            >
              <Filter className={`w-3.5 h-3.5 ${hasActiveFilters ? 'text-emerald-400 dark:text-emerald-600' : 'text-zinc-500 dark:text-zinc-400'}`} />
              <span>Filter</span>
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/30" />
              )}
              <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Floating Filter Popover */}
            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-4 z-40 space-y-3.5 animate-in fade-in zoom-in-95 duration-100 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Report Filters
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                </div>

                {/* Scope: Single Month / Whole Year / All Records */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Reporting Scope
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setRangeMode('single-month')}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition cursor-pointer ${
                        rangeMode === 'single-month'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                          : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      Month
                    </button>
                    <button
                      type="button"
                      onClick={() => setRangeMode('full-year')}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition cursor-pointer ${
                        rangeMode === 'full-year'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                          : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      Whole Year
                    </button>
                    <button
                      type="button"
                      onClick={() => setRangeMode('all-history')}
                      className={`px-2 py-1 text-[11px] font-medium rounded transition cursor-pointer ${
                        rangeMode === 'all-history'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                          : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      All Records
                    </button>
                  </div>
                </div>

                {/* Month & Year Selectors */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                      Month
                    </label>
                    <div className={`flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5 ${rangeMode !== 'single-month' ? 'opacity-40 pointer-events-none' : ''}`}>
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <select
                        value={activeMonthKey}
                        onChange={e => setActiveMonthKey(e.target.value)}
                        disabled={rangeMode !== 'single-month'}
                        className="bg-transparent text-zinc-800 dark:text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer w-full"
                      >
                        {MONTHS.map(m => (
                          <option key={m.key} value={m.key}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                      Year
                    </label>
                    <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5">
                      <select
                        value={activeYear}
                        onChange={e => setActiveYear(Number(e.target.value))}
                        className="bg-transparent text-zinc-800 dark:text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer w-full"
                      >
                        {years.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Department Filter */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                    Department
                  </label>
                  <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <select
                      value={selectedDept}
                      onChange={e => setSelectedDept(e.target.value)}
                      className="bg-transparent text-zinc-800 dark:text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer w-full truncate"
                    >
                      {availableDepts.map(d => (
                        <option key={d} value={d}>
                          {d === 'ALL' ? 'All Departments' : d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Employment Type Filter */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                    Employment Type
                  </label>
                  <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <select
                      value={selectedEmpType}
                      onChange={e => setSelectedEmpType(e.target.value)}
                      className="bg-transparent text-zinc-800 dark:text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer w-full truncate"
                    >
                      {availableEmpTypes.map(t => (
                        <option key={t} value={t}>
                          {t === 'ALL' ? 'All Types' : t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Merged Action Dropdown: Print & Export */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print &amp; Export</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-150 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    const mappedType: ScheduleReportType = activeTab === 'tax' ? 'paye' : activeTab === 'pension' ? 'pension' : 'bank';
                    setPrintModalType(mappedType);
                    setIsPrintModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-zinc-500 shrink-0" />
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">Print / Save PDF</div>
                    <div className="text-[10px] text-zinc-400">Printable schedule and audit voucher</div>
                  </div>
                </button>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800/80 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    handleExport();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">Export All Schedules (.xlsx)</div>
                    <div className="text-[10px] text-zinc-400">Complete multi-tab Excel workbook</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Scrollable Content Container - Vertical scrollbar starts here BELOW the header */}
    <div className="flex-1 overflow-y-auto px-6 py-5 md:px-8">
      <div className="max-w-6xl mx-auto space-y-5">

        {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 text-xs overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-2 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          Executive Summary
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-3 py-2 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'departments'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          Department Cost Centers ({deptList.length})
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={`px-3 py-2 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'tax'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          PAYE Tax Schedule
        </button>
        <button
          onClick={() => setActiveTab('pension')}
          className={`px-3 py-2 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'pension'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          Pension Remittance Schedule
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-3 py-2 font-medium border-b-2 transition whitespace-nowrap ${
            activeTab === 'bank'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          Bank Disbursement Schedule
        </button>
      </div>

      {/* ================= TAB 1: EXECUTIVE SUMMARY ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          
          {/* 5 Minimalist KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            
            {/* Card 1: Gross */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                Total Gross Payroll
              </span>
              <p className="text-base sm:text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
                {formatNaira(totalGross)}
              </p>
            </div>

            {/* Card 2: Net Take-Home */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                Net Take-Home Pay
              </span>
              <p className="text-base sm:text-lg font-semibold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                {formatNaira(totalNet)}
              </p>
            </div>

            {/* Card 3: Total PAYE */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                Total PAYE Remittance
              </span>
              <p className="text-base sm:text-lg font-semibold font-mono text-amber-600 dark:text-amber-400 tracking-tight">
                {formatNaira(totalPaye)}
              </p>
            </div>

            {/* Card 4: Pension Pool */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                Combined Pension Pool
              </span>
              <p className="text-base sm:text-lg font-semibold font-mono text-blue-600 dark:text-blue-400 tracking-tight">
                {formatNaira(totalPensionPool)}
              </p>
            </div>

            {/* Card 5: Total Employer Cost */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">
                Total Employer Cost
              </span>
              <p className="text-base sm:text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
                {formatNaira(totalEmployerCost)}
              </p>
            </div>

          </div>

          {/* Minimalist Payroll Outflow Composition Bar (Proportional, Sleek & Simple) */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Payroll Outflow &amp; Remittance Composition
              </h3>
              <span className="text-zinc-400 font-mono text-[11px]">
                Total Outflow: {formatNaira(totalEmployerCost)}
              </span>
            </div>

            {/* Proportional Multi-Segment Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex shadow-inner">
              <div 
                style={{ width: `${netRatio}%` }} 
                className="bg-emerald-500 h-full transition-all duration-300" 
                title={`Net Take-Home: ${netRatio.toFixed(1)}%`}
              />
              <div 
                style={{ width: `${payeRatio}%` }} 
                className="bg-amber-500 h-full transition-all duration-300" 
                title={`PAYE Tax: ${payeRatio.toFixed(1)}%`}
              />
              <div 
                style={{ width: `${empPensionRatio}%` }} 
                className="bg-blue-500 h-full transition-all duration-300" 
                title={`Employee Pension (8%): ${empPensionRatio.toFixed(1)}%`}
              />
              <div 
                style={{ width: `${emplrPensionRatio}%` }} 
                className="bg-indigo-500 h-full transition-all duration-300" 
                title={`Employer Pension (10%): ${emplrPensionRatio.toFixed(1)}%`}
              />
            </div>

            {/* Minimalist Legend Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <div className="truncate">
                  <span className="text-zinc-500 dark:text-zinc-400 block truncate">Net Take-Home ({netRatio.toFixed(1)}%)</span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(totalNet)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <div className="truncate">
                  <span className="text-zinc-500 dark:text-zinc-400 block truncate">PAYE Tax ({payeRatio.toFixed(1)}%)</span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(totalPaye)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <div className="truncate">
                  <span className="text-zinc-500 dark:text-zinc-400 block truncate">Employee Pension ({empPensionRatio.toFixed(1)}%)</span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(totalEmpPension)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                <div className="truncate">
                  <span className="text-zinc-500 dark:text-zinc-400 block truncate">Employer Pension ({emplrPensionRatio.toFixed(1)}%)</span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(totalEmplrPension)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Statutory Obligations & Department Share */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Statutory Remittance Obligations */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Statutory Remittance Obligations
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Compliant</span>
                </span>
              </div>

              <div className="space-y-2 text-xs divide-y divide-zinc-100 dark:divide-zinc-800/60">
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500 dark:text-zinc-400">State Internal Revenue Service (PAYE):</span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(totalPaye)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500 dark:text-zinc-400">Pension Fund Custodians (Employee 8%):</span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(totalEmpPension)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500 dark:text-zinc-400">Company Matching Pension (Employer 10%):</span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(totalEmplrPension)}</span>
                </div>
                <div className="flex justify-between pt-2 font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                  <span>Total Compliance Outflow:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatNaira(totalPaye + totalPensionPool)}</span>
                </div>
              </div>
            </div>

            {/* Employment Type Distribution Card */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Employment Type Demarcation
                </h3>
                <span className="text-[11px] font-mono text-zinc-400">
                  {empTypeList.length} Categories
                </span>
              </div>

              <div className="space-y-2 text-xs divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {empTypeList.map(t => (
                  <div key={t.type} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        t.type === 'Full-Time' ? 'bg-emerald-500' :
                        t.type === 'Contract' ? 'bg-blue-500' :
                        t.type === 'Part-Time' ? 'bg-purple-500' : 'bg-amber-500'
                      }`} />
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{t.type}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">({t.count} staff)</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(t.gross)}</span>
                      <span className="text-[10px] text-zinc-400 block font-mono">
                        {totalGross > 0 ? ((t.gross / totalGross) * 100).toFixed(1) : 0}% of payroll
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Department Cost Distribution */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-zinc-100 dark:border-zinc-800/60 pb-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                Department Cost Allocation
              </h3>
              <span className="text-zinc-400 font-mono text-[11px]">{deptList.length} Operating Units</span>
            </div>

            <div className="space-y-2.5 text-xs">
              {deptList.map(dept => {
                const percent = totalGross > 0 ? (dept.gross / totalGross) * 100 : 0;
                return (
                  <div key={dept.dept} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {dept.dept}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {dept.count} staff
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                          {formatNaira(dept.gross)}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 w-12 text-right">
                          {percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-zinc-800 dark:bg-zinc-300 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 12-Month Trajectory Table (When in Full-Year Mode) */}
          {rangeMode === 'full-year' && (
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                    12-Month Payroll Performance Trajectory ({activeYear})
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Monthly distribution of gross expenditure, net disbursement, and statutory deductions across {activeYear}
                  </p>
                </div>
                <span className="text-zinc-400 font-mono text-[11px]">12 Months Cumulative</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2 px-3 font-medium font-sans">Month</th>
                      <th className="py-2 px-3 font-medium text-center font-sans">Staff</th>
                      <th className="py-2 px-3 font-medium text-right font-sans">Gross</th>
                      <th className="py-2 px-3 font-medium text-right font-sans">Net Pay</th>
                      <th className="py-2 px-3 font-medium text-right font-sans">PAYE Tax</th>
                      <th className="py-2 px-3 font-medium text-right font-sans">Pension</th>
                      <th className="py-2 px-3 font-medium text-right font-sans">Employer Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {monthlyTrajectory.map(m => (
                      <tr key={m.key} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                        <td className="py-2 px-3 font-sans font-medium text-zinc-900 dark:text-zinc-100">{m.label}</td>
                        <td className="py-2 px-3 text-center text-zinc-600 dark:text-zinc-400">{m.headcount}</td>
                        <td className="py-2 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(m.gross)}</td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">{formatNaira(m.net)}</td>
                        <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400">{formatNaira(m.paye)}</td>
                        <td className="py-2 px-3 text-right text-blue-600 dark:text-blue-400">{formatNaira(m.pension)}</td>
                        <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300 font-medium">{formatNaira(m.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-50/80 dark:bg-zinc-900/80 border-t-2 border-zinc-200 dark:border-zinc-800 font-bold">
                    <tr>
                      <td className="py-2.5 px-3 font-sans text-zinc-900 dark:text-zinc-100">Annual Total</td>
                      <td className="py-2.5 px-3 text-center text-zinc-600 dark:text-zinc-400">{activeItems.length}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-900 dark:text-zinc-100">{formatNaira(totalGross)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">{formatNaira(totalNet)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">{formatNaira(totalPaye)}</td>
                      <td className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400">{formatNaira(totalPensionPool)}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-900 dark:text-zinc-100">{formatNaira(totalEmployerCost)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ================= TAB 2: DEPARTMENTS ================= */}
      {activeTab === 'departments' && (
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-2xs">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Department Cost Center Breakdown &bull; {periodSubtitle}
            </span>
            <span className="font-mono text-zinc-400">Total Units: {deptList.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">
                    <SortableHeader label="Department" field="dept" currentSortField={deptSortField} sortDirection={deptSortDir} onSort={handleDeptSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-center">
                    <SortableHeader label="Headcount" field="count" currentSortField={deptSortField} sortDirection={deptSortDir} onSort={handleDeptSort} align="center" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Total Gross" field="gross" currentSortField={deptSortField} sortDirection={deptSortDir} onSort={handleDeptSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Total Net" field="net" currentSortField={deptSortField} sortDirection={deptSortDir} onSort={handleDeptSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Total PAYE" field="tax" currentSortField={deptSortField} sortDirection={deptSortDir} onSort={handleDeptSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Total Pension" field="pension" currentSortField={deptSortField} sortDirection={deptSortDir} onSort={handleDeptSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500">% of Payroll</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono">
                {deptList.map(d => (
                  <tr key={d.dept} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-medium text-zinc-900 dark:text-zinc-100">{d.dept}</td>
                    <td className="py-2.5 px-3 text-center text-zinc-700 dark:text-zinc-300">{d.count}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(d.gross)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">{formatNaira(d.net)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">{formatNaira(d.tax)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">{formatNaira(d.pension)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-500 dark:text-zinc-400 font-sans">
                      {((d.gross / (totalGross || 1)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: TAX SCHEDULE ================= */}
      {activeTab === 'tax' && (
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-2xs">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              State IRS PAYE Tax Remittance Schedule &bull; {periodSubtitle}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">Total Tax: {formatNaira(totalPaye)}</span>
              <button
                onClick={() => { setPrintModalType('paye'); setIsPrintModalOpen(true); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition"
              >
                <Printer className="w-3 h-3" />
                <span>Print Schedule (PDF)</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">
                    <SortableHeader label="Code" field="code" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium">
                    <SortableHeader label="Employee Name" field="name" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium">
                    <SortableHeader label="Employment Type" field="type" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Gross Remuneration" field="gross" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Total CRA Relief" field="cra" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Taxable Income" field="taxable" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="PAYE Deducted" field="paye" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="right" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono">
                {paginatedTaxItems.map(i => (
                  <tr key={i.employeeId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400">{i.employeeCode}</td>
                    <td className="py-2 px-3 font-sans font-medium text-zinc-900 dark:text-zinc-100">{i.fullName}</td>
                    <td className="py-2 px-3 font-sans text-zinc-500 text-[11px]">{i.employmentType || 'Full-Time'}</td>
                    <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300">{formatNaira(i.monthlyGross)}</td>
                    <td className="py-2 px-3 text-right text-zinc-500 dark:text-zinc-400">{formatNaira(i.totalCra)}</td>
                    <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300">{formatNaira(i.taxableIncome)}</td>
                    <td className="py-2 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(i.monthlyPaye)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={schedulePage}
            totalItems={taxItems.length}
            pageSize={schedulePageSize}
            onPageChange={setSchedulePage}
            onPageSizeChange={setSchedulePageSize}
            itemLabel="tax records"
          />
        </div>
      )}

      {/* ================= TAB 4: PENSION ================= */}
      {activeTab === 'pension' && (
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-2xs">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Pension Reform Act Schedule (Employee 8% + Employer 10%) &bull; {periodSubtitle}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">Total Pool: {formatNaira(totalPensionPool)}</span>
              <button
                onClick={() => { setPrintModalType('pension'); setIsPrintModalOpen(true); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition"
              >
                <Printer className="w-3 h-3" />
                <span>Print Schedule (PDF)</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">
                    <SortableHeader label="Code" field="code" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium">
                    <SortableHeader label="Employee Name" field="name" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium">
                    <SortableHeader label="PFA / RSA PIN" field="pfa" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Pensionable Base (BHT)" field="base" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Employee (8%)" field="employee" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Employer (10%)" field="employer" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Total Remittance" field="total" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="right" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono">
                {paginatedPensionItems.map(i => (
                  <tr key={i.employeeId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400">{i.employeeCode}</td>
                    <td className="py-2 px-3 font-sans font-medium text-zinc-900 dark:text-zinc-100">{i.fullName}</td>
                    <td className="py-2 px-3 font-sans text-zinc-500 text-[11px]">{i.pfaName || 'Standard'} &bull; {i.pensionNumber || 'PIN on file'}</td>
                    <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300">{formatNaira(i.pensionableBHT)}</td>
                    <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300">{formatNaira(i.employeePension)}</td>
                    <td className="py-2 px-3 text-right text-zinc-700 dark:text-zinc-300">{formatNaira(i.employerPension)}</td>
                    <td className="py-2 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(i.employeePension + i.employerPension)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={schedulePage}
            totalItems={pensionItems.length}
            pageSize={schedulePageSize}
            onPageChange={setSchedulePage}
            onPageSizeChange={setSchedulePageSize}
            itemLabel="pension records"
          />
        </div>
      )}

      {/* ================= TAB 5: BANK DISBURSEMENT ================= */}
      {activeTab === 'bank' && (
        <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-2xs">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              Commercial Bank Batch Disbursement Schedule &bull; {periodSubtitle}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">Total Net: {formatNaira(totalNet)}</span>
              <button
                onClick={() => { setPrintModalType('bank'); setIsPrintModalOpen(true); }}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition shadow-2xs"
              >
                <Printer className="w-3 h-3" />
                <span>Print Bank Schedule (PDF)</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 font-medium">
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500">S/N</span>
                  </th>
                  <th className="py-2.5 px-3 font-medium">
                    <SortableHeader label="Beneficiary" field="name" currentSortField={bankSortField} sortDirection={bankSortDir} onSort={handleBankSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium">
                    <SortableHeader label="Bank" field="bank" currentSortField={bankSortField} sortDirection={bankSortDir} onSort={handleBankSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium">
                    <SortableHeader label="NUBAN Account" field="account" currentSortField={bankSortField} sortDirection={bankSortDir} onSort={handleBankSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right">
                    <SortableHeader label="Net Amount" field="net" currentSortField={bankSortField} sortDirection={bankSortDir} onSort={handleBankSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium">
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500">Narration</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-mono">
                {paginatedBankItems.map((i, idx) => (
                  <tr key={i.employeeId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2 px-3 text-zinc-400">{(schedulePage - 1) * schedulePageSize + idx + 1}</td>
                    <td className="py-2 px-3 font-sans font-medium text-zinc-900 dark:text-zinc-100">{i.fullName}</td>
                    <td className="py-2 px-3 font-sans text-zinc-700 dark:text-zinc-300">{i.bankName}</td>
                    <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">{i.accountNumber}</td>
                    <td className="py-2 px-3 text-right font-medium text-zinc-900 dark:text-zinc-100">{formatNaira(i.netTakeHome)}</td>
                    <td className="py-2 px-3 font-sans text-zinc-500 dark:text-zinc-400 text-[10px]">
                      SALARY {rangeMode === 'single-month' ? activeMonthLabel.toUpperCase() : 'FY'} {activeYear}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={schedulePage}
            totalItems={activeItems.length}
            pageSize={schedulePageSize}
            onPageChange={setSchedulePage}
            onPageSizeChange={setSchedulePageSize}
            itemLabel="disbursement records"
          />
        </div>
      )}

      </div>
    </div>

    {/* Printable Schedule Modal */}
      {isPrintModalOpen && (
        <PrintableScheduleModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          initialType={printModalType}
          items={activeItems}
          employees={employees}
          company={company}
          monthLabel={rangeMode === 'single-month' ? activeMonthLabel : `FY ${activeYear}`}
          year={activeYear}
        />
      )}

    </div>
  );
};
