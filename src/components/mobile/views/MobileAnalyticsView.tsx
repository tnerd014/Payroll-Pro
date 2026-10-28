import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Landmark, 
  ShieldCheck, 
  FileSpreadsheet, 
  Printer, 
  ChevronDown, 
  CheckCircle2, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  X,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Percent,
  Wallet,
  Users
} from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  PayrollSnapshot, 
  Employee, 
  PayrollVariables, 
  PayeTaxVariables, 
  CompanyProfile,
  EmployeeLoan
} from '../../../types';
import { 
  formatNaira, 
  formatCompactNaira, 
  calculatePayrollItem 
} from '../../../engine/payePensionEngine';
import { exportPayrollProToExcel } from '../../../engine/excelEngine';
import { PrintableScheduleModal, ScheduleReportType } from '../../analytics/PrintableScheduleModal';
import { MONTHS } from '../../../store/usePayrollStore';

export type MobileAnalyticsTab = 'overview' | 'departments' | 'statutory';
export type MobileStatutorySubTab = 'tax' | 'pension';

interface MobileAnalyticsViewProps {
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
  loans?: EmployeeLoan[];
}

export const MobileAnalyticsView: React.FC<MobileAnalyticsViewProps> = ({
  items: initialItems,
  employees,
  payrollVariables,
  payeTaxVariables,
  monthLabel: initialMonthLabel,
  selectedMonth: initialSelectedMonth = (MONTHS[new Date().getMonth()]?.key || 'oct'),
  year: initialYear = new Date().getFullYear(),
  activeSnapshot,
  snapshots: _snapshots = [],
  departments = [],
  company = { name: 'COMPANY LIMITED', subtitle: '', address: '', phone: '', email: '' },
  loans = [],
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<MobileAnalyticsTab>('overview');
  const [statutorySubTab, setStatutorySubTab] = useState<MobileStatutorySubTab>('tax');

  // Filters
  const [activeMonthKey, setActiveMonthKey] = useState<string>(() => initialSelectedMonth || (MONTHS[new Date().getMonth()]?.key || 'oct'));
  const [activeYear, setActiveYear] = useState<number>(() => initialYear || new Date().getFullYear());
  const [rangeMode, setRangeMode] = useState<'single-month' | 'full-year'>('single-month');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination for statutory list
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Print modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalType, setPrintModalType] = useState<ScheduleReportType>('bank');

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

  // Compute live items for month
  const getComputedItemsForMonth = (mKey: string, y: number) => {
    return (employees || []).filter(e => e && e.status === 'Active').map(emp => 
      calculatePayrollItem(emp, payrollVariables, payeTaxVariables, mKey, y)
    );
  };

  // Filter items matching department
  const filterPredicate = (item: CalculatedPayrollItem) => {
    if (!item) return false;
    if (selectedDept !== 'ALL' && (item.department || '').toLowerCase() !== selectedDept.toLowerCase()) {
      return false;
    }
    return true;
  };

  // Active items based on current rangeMode
  const activeItems = useMemo(() => {
    if (rangeMode === 'single-month') {
      const isActivePeriod = activeMonthKey === initialSelectedMonth && activeYear === initialYear;
      const baseItems = isActivePeriod
        ? (Array.isArray(initialItems) ? initialItems : [])
        : getComputedItemsForMonth(activeMonthKey, activeYear);
      return baseItems.filter(filterPredicate);
    }

    // Full-year 12-month composite items
    const annualMap = new Map<string, CalculatedPayrollItem>();
    MONTHS.forEach(m => {
      const isCurrentPeriod = m.key === initialSelectedMonth && activeYear === initialYear;
      const mItems = (isCurrentPeriod
        ? (Array.isArray(initialItems) ? initialItems : [])
        : getComputedItemsForMonth(m.key, activeYear)
      ).filter(filterPredicate);

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
  }, [rangeMode, activeMonthKey, activeYear, initialItems, initialSelectedMonth, initialYear, employees, payrollVariables, payeTaxVariables, selectedDept]);

  // Aggregated totals
  const totalGross = activeItems.reduce((s, i) => s + (i.monthlyGross || 0), 0);
  const totalNet = activeItems.reduce((s, i) => s + (i.netTakeHome || 0), 0);
  const totalPaye = activeItems.reduce((s, i) => s + (i.monthlyPaye || 0), 0);
  const totalEmpPension = activeItems.reduce((s, i) => s + (i.employeePension || 0), 0);
  const totalEmplrPension = activeItems.reduce((s, i) => s + (i.employerPension || 0), 0);
  const totalPensionPool = totalEmpPension + totalEmplrPension;
  const totalEmployerCost = totalGross + totalEmplrPension;
  const totalStatutory = totalPaye + totalPensionPool;

  // Percentage Proportions
  const netRatio = totalEmployerCost > 0 ? (totalNet / totalEmployerCost) * 100 : 0;
  const payeRatio = totalEmployerCost > 0 ? (totalPaye / totalEmployerCost) * 100 : 0;
  const empPensionRatio = totalEmployerCost > 0 ? (totalEmpPension / totalEmployerCost) * 100 : 0;
  const emplrPensionRatio = totalEmployerCost > 0 ? (totalEmplrPension / totalEmployerCost) * 100 : 0;

  // Department Breakdown
  const deptList = useMemo(() => {
    const map: Record<string, { count: number; gross: number; net: number; tax: number; pension: number; employerCost: number }> = {};
    activeItems.forEach(item => {
      const dept = item.department || 'General';
      if (!map[dept]) {
        map[dept] = { count: 0, gross: 0, net: 0, tax: 0, pension: 0, employerCost: 0 };
      }
      map[dept].count += 1;
      map[dept].gross += item.monthlyGross;
      map[dept].net += item.netTakeHome;
      map[dept].tax += item.monthlyPaye;
      map[dept].pension += (item.employeePension + item.employerPension);
      map[dept].employerCost += (item.monthlyGross + item.employerPension);
    });

    return Object.entries(map)
      .map(([dept, data]) => ({
        dept,
        ...data,
        costPercentage: totalEmployerCost > 0 ? Math.round((data.employerCost / totalEmployerCost) * 100) : 0
      }))
      .sort((a, b) => b.employerCost - a.employerCost);
  }, [activeItems, totalEmployerCost]);

  // Statutory Items filtered by search
  const filteredStatutoryItems = useMemo(() => {
    let list = activeItems;
    if (statutorySubTab === 'tax') {
      list = list.filter(i => (i.monthlyPaye > 0 || i.hasPaye));
    } else {
      list = list.filter(i => i.hasPension);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(i => 
      (i.fullName || '').toLowerCase().includes(q) ||
      (i.employeeCode || '').toLowerCase().includes(q) ||
      (i.department || '').toLowerCase().includes(q) ||
      (i.pfaName || '').toLowerCase().includes(q)
    );
  }, [activeItems, statutorySubTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStatutoryItems.length / pageSize));
  const paginatedStatutoryItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStatutoryItems.slice(start, start + pageSize);
  }, [filteredStatutoryItems, currentPage, pageSize]);

  // Excel Export
  const handleExportExcel = () => {
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
        scope: rangeMode === 'single-month' ? 'current-month' : 'full-year',
        selectedMonth: activeMonthKey,
        selectedYear: activeYear,
        departmentFilter: selectedDept,
        employmentTypeFilter: 'ALL',
        loans,
      },
      loans
    );
  };

  // Open Print Modal with specific report type
  const handleOpenPrintModal = (type: ScheduleReportType) => {
    setPrintModalType(type);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-4 pb-2 select-none">
      
      {/* ── 1. Top Controls Bar (Sticky, Minimalist & Tactile) ── */}
      <div className="sticky -top-3.5 z-30 pt-1 pb-1 bg-[#fbfbfb] dark:bg-[#09090b]">
        <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3 shadow-xs space-y-2.5">
          
          {/* Title Row & Quick Scope Switcher */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Payroll Analytics
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {activeItems.length} Enrolled • {rangeMode === 'single-month' ? `${activeMonthLabel} ${activeYear}` : `Full Year ${activeYear}`}
              </p>
            </div>

            {/* Scope Pill Switcher: Month vs Full Year */}
            <div className="inline-flex p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/60 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={() => { setRangeMode('single-month'); setCurrentPage(1); }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  rangeMode === 'single-month'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => { setRangeMode('full-year'); setCurrentPage(1); }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  rangeMode === 'full-year'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
                }`}
              >
                Year
              </button>
            </div>
          </div>

          {/* Month / Year & Department Selectors */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* Period Selector */}
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {rangeMode === 'single-month' ? (
                <select
                  value={activeMonthKey}
                  onChange={(e) => { setActiveMonthKey(e.target.value); setCurrentPage(1); }}
                  className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-7 pr-6 text-xs font-medium text-zinc-900 dark:text-zinc-100 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {MONTHS.map(m => (
                    <option key={m.key} value={m.key}>{m.label} {activeYear}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={activeYear}
                  onChange={(e) => { setActiveYear(Number(e.target.value)); setCurrentPage(1); }}
                  className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-7 pr-6 text-xs font-medium text-zinc-900 dark:text-zinc-100 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {years.map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Department Dropdown Selector */}
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-7 pr-6 text-xs font-medium text-zinc-900 dark:text-zinc-100 appearance-none focus:outline-none focus:border-emerald-500 cursor-pointer truncate"
              >
                {availableDepts.map(d => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? 'All Departments' : d}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

          </div>

        </div>
      </div>

      {/* ── 2. Hero Outflow Card (Minimalist Apple/Revolut Fintech) ── */}
      <div className="relative overflow-hidden bg-white dark:bg-[#121215] rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
        
        {/* Subtle decorative mesh */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-emerald-100/30 via-teal-50/10 to-transparent dark:from-emerald-950/20 dark:via-transparent pointer-events-none rounded-full blur-2xl" />

        <div className="relative z-10 space-y-2.5">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Total Employer Outflow
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 font-semibold">
              {rangeMode === 'single-month' ? `${activeMonthLabel} ${activeYear}` : `12M ${activeYear}`}
            </span>
          </div>

          {/* Large Hero Outflow Value */}
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatNaira(totalEmployerCost)}
          </div>

          {/* Sleek Proportional Outflow Bar */}
          <div className="space-y-2 pt-0.5">
            <div className="w-full h-2 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex shadow-inner">
              <div 
                style={{ width: `${Math.max(1, netRatio)}%` }} 
                className="bg-emerald-500 h-full transition-all duration-300" 
                title={`Take-Home: ${netRatio.toFixed(1)}%`}
              />
              <div 
                style={{ width: `${Math.max(1, payeRatio)}%` }} 
                className="bg-amber-500 h-full transition-all duration-300" 
                title={`PAYE: ${payeRatio.toFixed(1)}%`}
              />
              <div 
                style={{ width: `${Math.max(1, empPensionRatio)}%` }} 
                className="bg-blue-500 h-full transition-all duration-300" 
                title={`Emp Pension: ${empPensionRatio.toFixed(1)}%`}
              />
              <div 
                style={{ width: `${Math.max(1, emplrPensionRatio)}%` }} 
                className="bg-indigo-500 h-full transition-all duration-300" 
                title={`Emplr Pension: ${emplrPensionRatio.toFixed(1)}%`}
              />
            </div>

            {/* Split Outflow Legend Pills */}
            <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
              
              {/* Take-Home Pay Pill */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/80 dark:border-emerald-900/40 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-medium text-[10px] uppercase tracking-wide">Take-Home</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {netRatio.toFixed(0)}%
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {formatNaira(totalNet)}
                </div>
              </div>

              {/* Statutory Pool Pill */}
              <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/80 dark:border-amber-900/40 rounded-xl p-2.5">
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="font-medium text-[10px] uppercase tracking-wide">Statutory</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    {(100 - netRatio).toFixed(0)}%
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400 mt-0.5">
                  {formatNaira(totalStatutory)}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── 3. Ergonomic Segmented Switcher (Thumb-Friendly 44px) ── */}
      <div className="grid grid-cols-3 gap-1 bg-zinc-200/70 dark:bg-zinc-800/80 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 shadow-2xs">
        <button
          type="button"
          onClick={() => { setActiveTab('overview'); setCurrentPage(1); }}
          className={`h-10 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <span>Summary</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('departments'); setCurrentPage(1); }}
          className={`h-10 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'departments'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <span>Cost Centers</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {deptList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('statutory'); setCurrentPage(1); }}
          className={`h-10 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'statutory'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <span>Statutory</span>
        </button>
      </div>

      {/* ── 4. Tab 1: Executive Summary & Obligations ── */}
      {activeTab === 'overview' && (
        <div className="space-y-3.5">
          
          {/* Statutory Remittance Obligations Card */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Statutory Remittances
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800/60">
                <CheckCircle2 className="w-3 h-3" />
                <span>Compliant</span>
              </span>
            </div>

            <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800/60">
              
              {/* LIRS / State PAYE */}
              <div className="pt-2 first:pt-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    PAYE Tax (IRS)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {formatNaira(totalPaye)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenPrintModal('paye')}
                    className="p-1 rounded-lg text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                    title="View PAYE Schedule"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pension Custodians */}
              <div className="pt-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Pension Pool (18%)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {formatNaira(totalPensionPool)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenPrintModal('pension')}
                    className="p-1 rounded-lg text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                    title="View Pension Schedule"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Net Bank Transfer */}
              <div className="pt-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Bank Net Pay
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatNaira(totalNet)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenPrintModal('bank')}
                    className="p-1 rounded-lg text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                    title="View Bank Schedule"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Itemized Payroll Cost Metric Cards (Minimalist Style, Zero Text Bloat) */}
          <div className="grid grid-cols-2 gap-2.5">
            
            {/* Total Gross */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                Gross Payroll
              </span>
              <p className="text-sm sm:text-base font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                {formatNaira(totalGross)}
              </p>
            </div>

            {/* Combined Pension Pool */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                Pension Pool
              </span>
              <p className="text-sm sm:text-base font-bold font-mono tracking-tight text-blue-600 dark:text-blue-400">
                {formatNaira(totalPensionPool)}
              </p>
            </div>

            {/* Employee Pension */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                Employee (8%)
              </span>
              <p className="text-sm sm:text-base font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                {formatNaira(totalEmpPension)}
              </p>
            </div>

            {/* Employer Pension Contribution */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3.5 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                Employer (10%)
              </span>
              <p className="text-sm sm:text-base font-bold font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
                {formatNaira(totalEmplrPension)}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ── 5. Tab 2: Cost Centers (Department Cards) ── */}
      {activeTab === 'departments' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Department Cost Share ({deptList.length})
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              Total: {formatCompactNaira(totalEmployerCost)}
            </span>
          </div>

          {deptList.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <Building2 className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No department records for this period.</p>
            </div>
          ) : (
            deptList.map(dept => (
              <div
                key={dept.dept}
                className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-2.5"
              >
                {/* Department Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {dept.dept}
                    </h4>
                    <span className="text-[11px] text-zinc-500">
                      {dept.count} Staff member{dept.count > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                      {formatNaira(dept.employerCost)}
                    </span>
                    <span className="text-[10px] font-mono block text-emerald-600 dark:text-emerald-400 font-semibold">
                      {dept.costPercentage}% of company outflow
                    </span>
                  </div>
                </div>

                {/* Progress Share Bar */}
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <div
                    style={{ width: `${Math.min(100, Math.max(3, dept.costPercentage))}%` }}
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  />
                </div>

                {/* Department Sub-metrics */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] border-t border-zinc-100 dark:border-zinc-800/80">
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Take-Home</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCompactNaira(dept.net)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">PAYE Tax</span>
                    <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                      {formatCompactNaira(dept.tax)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block">Pension Pool</span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {formatCompactNaira(dept.pension)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── 6. Tab 3: Statutory Schedules (PAYE & Pension Cards) ── */}
      {activeTab === 'statutory' && (
        <div className="space-y-3">
          
          {/* Sub-Switch: PAYE Tax Schedule vs Pension Schedule */}
          <div className="grid grid-cols-2 gap-1 bg-zinc-100 dark:bg-zinc-800/90 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
            <button
              type="button"
              onClick={() => { setStatutorySubTab('tax'); setCurrentPage(1); }}
              className={`h-9 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                statutorySubTab === 'tax'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>PAYE Tax Schedule</span>
            </button>

            <button
              type="button"
              onClick={() => { setStatutorySubTab('pension'); setCurrentPage(1); }}
              className={`h-9 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                statutorySubTab === 'pension'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Pension Schedule</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${statutorySubTab === 'tax' ? 'tax' : 'pension'} records...`}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-7 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Employee Schedule Cards */}
          <div className="space-y-2.5">
            {paginatedStatutoryItems.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <p className="text-xs text-zinc-500">No personnel records found matching filters.</p>
              </div>
            ) : (
              paginatedStatutoryItems.map(item => (
                <div
                  key={item.employeeId}
                  className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl p-3.5 shadow-xs space-y-2"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {item.fullName}
                      </h4>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {item.employeeCode} • {item.department || 'General'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wide block">
                        {statutorySubTab === 'tax' ? 'Monthly PAYE' : 'Combined Pension'}
                      </span>
                      <span className={`text-xs font-bold font-mono ${
                        statutorySubTab === 'tax' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {formatNaira(statutorySubTab === 'tax' ? item.monthlyPaye : (item.employeePension + item.employerPension))}
                      </span>
                    </div>
                  </div>

                  {/* Card Detail Columns */}
                  {statutorySubTab === 'tax' ? (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] border-t border-zinc-100 dark:border-zinc-800/80">
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase block">Monthly Gross</span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {formatNaira(item.monthlyGross)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase block">Tax Relief (CRA)</span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {formatNaira(item.totalCra)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase block">Taxable Income</span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {formatNaira(item.taxableIncome)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] border-t border-zinc-100 dark:border-zinc-800/80">
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase block">PFA &amp; PIN</span>
                        <span className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300 truncate block">
                          {item.pfaName || 'Standard'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase block">Employee (8%)</span>
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">
                          {formatNaira(item.employeePension)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase block">Employer (10%)</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                          {formatNaira(item.employerPension)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Minimalist Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-1 text-xs">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <span className="text-[11px] font-medium text-zinc-500 font-mono">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>
      )}

      {/* ── 7. Ergonomic Action Dock: Print & Export (Sticky / Pinned above bottom nav) ── */}
      <div className="pt-2">
        <div className="bg-white dark:bg-[#121215] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-2.5 shadow-xs flex items-center gap-2">
          
          {/* Print PDF Button */}
          <button
            type="button"
            onClick={() => handleOpenPrintModal(activeTab === 'statutory' && statutorySubTab === 'pension' ? 'pension' : activeTab === 'statutory' && statutorySubTab === 'tax' ? 'paye' : 'bank')}
            className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>Print Schedule</span>
          </button>

          {/* Export Excel (.xlsx) Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="h-11 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            title="Download Full Excel Workbook (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Excel</span>
          </button>

        </div>
      </div>

      {/* Schedule Print / Audit Modal */}
      <PrintableScheduleModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        initialType={printModalType}
        items={activeItems}
        employees={employees}
        company={company}
        monthLabel={rangeMode === 'single-month' ? activeMonthLabel : `Full Year ${activeYear}`}
        year={activeYear}
      />

    </div>
  );
};
