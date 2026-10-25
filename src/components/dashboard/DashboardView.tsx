import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Receipt, 
  ArrowRight, 
  Download, 
  Lock, 
  Unlock, 
  Wallet,
  Calendar,
  Filter,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  X
} from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  PayrollSnapshot, 
  AppView, 
  Employee, 
  PayrollVariables, 
  PayeTaxVariables 
} from '../../types';
import { 
  formatNaira, 
  formatCompactNaira, 
  calculatePayrollItem 
} from '../../engine/payePensionEngine';
import { MONTHS } from '../../store/usePayrollStore';
import { AnnualPayrollTrendChart } from './AnnualPayrollTrendChart';

interface DashboardViewProps {
  items: CalculatedPayrollItem[];
  staffCount: number;
  monthLabel: string;
  selectedMonth?: string;
  year: number;
  activeSnapshot: PayrollSnapshot | undefined;
  onNavigate: (view: AppView) => void;
  departments?: string[];
  employees?: Employee[];
  payrollVariables?: PayrollVariables;
  payeTaxVariables?: PayeTaxVariables;
  onPeriodChange?: (month: string, year: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  items: initialItems,
  staffCount,
  monthLabel: initialMonthLabel,
  selectedMonth: initialSelectedMonth = 'jan',
  year: initialYear,
  activeSnapshot,
  onNavigate,
  departments = [],
  employees = [],
  payrollVariables,
  payeTaxVariables,
  onPeriodChange,
}) => {
  // Local or connected filters for Dashboard
  const [filterMonth, setFilterMonth] = useState<string>(initialSelectedMonth);
  const [filterYear, setFilterYear] = useState<number>(initialYear);
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterEmpType, setFilterEmpType] = useState<string>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  const years = [2024, 2025, 2026, 2027, 2028];
  const isAllMonths = filterMonth === 'ALL';
  const currentMonthObj = MONTHS.find(m => m.key === filterMonth);
  const activeMonthLabel = isAllMonths ? 'All Months' : (currentMonthObj?.label || initialMonthLabel);

  // Department options
  const availableDepts = useMemo(() => {
    const set = new Set<string>();
    (departments || []).forEach(d => d && set.add(d));
    (employees || []).forEach(e => e?.department && set.add(e.department));
    (initialItems || []).forEach(i => i?.department && set.add(i.department));
    return ['ALL', ...Array.from(set)];
  }, [departments, employees, initialItems]);

  // Employment type options
  const availableEmpTypes = useMemo(() => {
    const list = ['ALL', 'Full-Time', 'Part-Time', 'Contract', 'Intern / NYSC'];
    if (payrollVariables?.employmentTypeRules) {
      payrollVariables.employmentTypeRules.forEach(r => {
        if (!list.includes(r.name)) list.push(r.name);
      });
    }
    return list;
  }, [payrollVariables?.employmentTypeRules]);

  // Filter predicate for department and employment type
  const filterPredicate = (item: CalculatedPayrollItem) => {
    if (!item) return false;
    if (filterDept !== 'ALL' && (item.department || '').toLowerCase() !== filterDept.toLowerCase()) {
      return false;
    }
    if (filterEmpType !== 'ALL') {
      const type = item.employmentType || 'Full-Time';
      if (type.toLowerCase() !== filterEmpType.toLowerCase()) return false;
    }
    return true;
  };

  // Helper to calculate items for a specific month
  const getComputedItemsForMonth = (mKey: string, y: number) => {
    if (employees.length === 0 || !payrollVariables || !payeTaxVariables) {
      return initialItems;
    }
    return employees.map(emp => 
      calculatePayrollItem(emp, payrollVariables, payeTaxVariables, mKey, y)
    );
  };

  // 12-Month Trajectory Trend (for Full-Year Annual Chart)
  const monthlyTrajectory = useMemo(() => {
    return MONTHS.map(m => {
      const monthItems = getComputedItemsForMonth(m.key, filterYear).filter(filterPredicate);
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
        shortLabel: m.label.substring(0, 3),
        headcount: monthItems.length,
        gross,
        net,
        paye,
        pension,
        totalCost,
      };
    });
  }, [employees, payrollVariables, payeTaxVariables, filterYear, filterDept, filterEmpType, initialItems]);

  // Calculate items based on current month/year/filters
  const activeItems = useMemo(() => {
    if (!isAllMonths) {
      let baseItems = initialItems;

      // If month or year differs and we have employees and variables, recompute on the fly
      if ((filterMonth !== initialSelectedMonth || filterYear !== initialYear) && employees.length > 0 && payrollVariables && payeTaxVariables) {
        baseItems = employees.map(emp => 
          calculatePayrollItem(emp, payrollVariables, payeTaxVariables, filterMonth, filterYear)
        );
      }

      return baseItems.filter(filterPredicate);
    }

    // For Full Year (All Months): Aggregate employee 12-month totals into composite items
    const annualMap = new Map<string, CalculatedPayrollItem>();
    MONTHS.forEach(m => {
      const mItems = getComputedItemsForMonth(m.key, filterYear).filter(filterPredicate);
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
  }, [isAllMonths, initialItems, filterMonth, filterYear, initialSelectedMonth, initialYear, employees, payrollVariables, payeTaxVariables, filterDept, filterEmpType]);

  const isLocked = Boolean(activeSnapshot?.isLocked && !isAllMonths && filterMonth === initialSelectedMonth && filterYear === initialYear);

  // Aggregated totals
  const totalGross = activeItems.reduce((s, i) => s + i.monthlyGross, 0);
  const totalNet = activeItems.reduce((s, i) => s + i.netTakeHome, 0);
  const totalPaye = activeItems.reduce((s, i) => s + i.monthlyPaye, 0);
  const totalEmpPension = activeItems.reduce((s, i) => s + i.employeePension, 0);
  const totalEmplrPension = activeItems.reduce((s, i) => s + i.employerPension, 0);
  const totalPension = totalEmpPension + totalEmplrPension;
  const totalDeductions = totalPaye + totalEmpPension;
  const totalEmployerCost = totalGross + totalEmplrPension;

  // Proportions
  const netRatio = totalGross > 0 ? (totalNet / totalGross) * 100 : 0;
  const payeRatio = totalGross > 0 ? (totalPaye / totalGross) * 100 : 0;
  const empPensionRatio = totalGross > 0 ? (totalEmpPension / totalGross) * 100 : 0;
  const emplrPensionRatio = totalGross > 0 ? (totalEmplrPension / totalGross) * 100 : 0;

  // Department distribution calculation
  const deptList = useMemo(() => {
    const deptMap: { [key: string]: { count: number; gross: number } } = {};
    activeItems.forEach(item => {
      const d = item.department || 'Unassigned';
      if (!deptMap[d]) deptMap[d] = { count: 0, gross: 0 };
      deptMap[d].count += 1;
      deptMap[d].gross += item.monthlyGross;
    });

    return Object.entries(deptMap)
      .map(([dept, data]) => ({
        name: dept,
        count: data.count,
        gross: data.gross,
        percentage: totalGross > 0 ? Math.round((data.gross / totalGross) * 100) : 0
      }))
      .sort((a, b) => b.gross - a.gross);
  }, [activeItems, totalGross]);

  // Employment Type distribution
  const empTypeList = useMemo(() => {
    const map: { [key: string]: { count: number; gross: number } } = {};
    activeItems.forEach(item => {
      const type = item.employmentType || 'Full-Time';
      if (!map[type]) map[type] = { count: 0, gross: 0 };
      map[type].count += 1;
      map[type].gross += item.monthlyGross;
    });

    return Object.entries(map).map(([type, data]) => ({
      name: type,
      count: data.count,
      gross: data.gross,
      percentage: totalGross > 0 ? Math.round((data.gross / totalGross) * 100) : 0
    })).sort((a, b) => b.gross - a.gross);
  }, [activeItems, totalGross]);

  const hasActiveFilters = filterDept !== 'ALL' || filterEmpType !== 'ALL' || filterMonth !== initialSelectedMonth || filterYear !== initialYear;

  const handleResetFilters = () => {
    setFilterMonth(initialSelectedMonth);
    setFilterYear(initialYear);
    setFilterDept('ALL');
    setFilterEmpType('ALL');
    onPeriodChange?.(initialSelectedMonth, initialYear);
  };

  const handleMonthChange = (newMonth: string) => {
    setFilterMonth(newMonth);
    if (newMonth !== 'ALL') {
      onPeriodChange?.(newMonth, filterYear);
    }
  };

  const handleYearChange = (newYear: number) => {
    setFilterYear(newYear);
    onPeriodChange?.(filterMonth, newYear);
  };

  return (
    <div className="space-y-5 select-none max-w-6xl mx-auto">
      
      {/* Top Header - Sticky */}
      <div className="sticky top-0 z-30 bg-[#fbfbfb]/95 dark:bg-[#09090b]/95 backdrop-blur-md pt-2.5 pb-3.5 border-b border-zinc-200 dark:border-zinc-800 -mx-6 px-6 md:-mx-8 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Executive Dashboard
              </h1>
            {isLocked && (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked Run
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Active view for <strong>{isAllMonths ? `All Months ${filterYear} (Full Year)` : `${activeMonthLabel} ${filterYear}`}</strong> &bull; {activeItems.length} Enrolled Personnel
          </p>
        </div>


        {/* Minimalist Filter Button in Top Row */}
        <div className="relative" ref={filterMenuRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-2 ${
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

          {/* Floating Minimalist Filter Popover */}
          {isFilterOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-4 z-40 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Dashboard Filters
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* Month & Year Selectors */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                    Month
                  </label>
                  <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <select
                      value={filterMonth}
                      onChange={e => handleMonthChange(e.target.value)}
                      className="bg-transparent text-zinc-800 dark:text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer w-full"
                    >
                      <option value="ALL" className="dark:bg-zinc-900 font-semibold text-emerald-600 dark:text-emerald-400">
                        All Months (Full Year)
                      </option>
                      {MONTHS.map(m => (
                        <option key={m.key} value={m.key} className="dark:bg-zinc-900">{m.label}</option>
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
                      value={filterYear}
                      onChange={e => handleYearChange(Number(e.target.value))}
                      className="bg-transparent text-zinc-800 dark:text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer w-full"
                    >
                      {years.map(y => (
                        <option key={y} value={y} className="dark:bg-zinc-900">{y}</option>
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
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <select
                    value={filterDept}
                    onChange={e => setFilterDept(e.target.value)}
                    className="bg-transparent text-zinc-800 dark:text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer w-full truncate"
                  >
                    {availableDepts.map(d => (
                      <option key={d} value={d} className="dark:bg-zinc-900">
                        {d === 'ALL' ? 'All Departments' : d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Employment Type Filter */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block mb-1">
                  Personnel Type
                </label>
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <select
                    value={filterEmpType}
                    onChange={e => setFilterEmpType(e.target.value)}
                    className="bg-transparent text-zinc-800 dark:text-zinc-200 text-xs font-medium focus:outline-none cursor-pointer w-full truncate"
                  >
                    {availableEmpTypes.map(t => (
                      <option key={t} value={t} className="dark:bg-zinc-900">
                        {t === 'ALL' ? 'All Staff Types' : t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                <span>Matching: <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{activeItems.length} staff</strong></span>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium transition"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* ================= 4 MINIMALIST METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Gross */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Total Gross Payroll</span>
          <div className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
            {formatNaira(totalGross)}
          </div>
        </div>

        {/* Card 2: Net */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Net Disbursement</span>
          <div className="text-xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
            {formatNaira(totalNet)}
          </div>
        </div>

        {/* Card 3: Deductions */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Total Statutory Deductions</span>
          <div className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono">
            {formatNaira(totalDeductions)}
          </div>
        </div>

        {/* Card 4: Workforce */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">Filtered Workforce</span>
          <div className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {activeItems.length} <span className="text-xs font-normal text-zinc-400">Personnel</span>
          </div>
        </div>

      </div>

      {/* ================= MINIMALIST OUTFLOW COMPOSITION BAR ================= */}
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between text-xs">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
            Payroll Outflow Composition
          </h3>
          <span className="text-zinc-400 font-mono text-[11px]">
            Gross: {formatNaira(totalGross)}
          </span>
        </div>

        {/* Minimal Stacked Bar */}
        <div className="w-full h-2.5 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex shadow-inner">
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
        </div>

        {/* 3 Minimal Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="truncate">
              <span className="text-zinc-500 dark:text-zinc-400">Net Take-Home ({netRatio.toFixed(1)}%)</span>
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100 ml-1.5">{formatNaira(totalNet)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <div className="truncate">
              <span className="text-zinc-500 dark:text-zinc-400">PAYE Tax ({payeRatio.toFixed(1)}%)</span>
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100 ml-1.5">{formatNaira(totalPaye)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <div className="truncate">
              <span className="text-zinc-500 dark:text-zinc-400">Employee Pension ({empPensionRatio.toFixed(1)}%)</span>
              <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100 ml-1.5">{formatNaira(totalEmpPension)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= ANNUAL PAYROLL TREND CHART (SHOWN ONLY IN ALL MONTHS FILTER) ================= */}
      {isAllMonths && (
        <AnnualPayrollTrendChart year={filterYear} data={monthlyTrajectory} />
      )}

      {/* ================= 2-COLUMN SECTION: DEPT DISTRIBUTION & EMPLOYMENT DEMARCATION ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Department Distribution */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Department Allocation
            </h3>
            <span className="text-xs text-zinc-400 font-mono">{deptList.length} Units</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {deptList.map(dept => (
              <div key={dept.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                      {dept.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">({dept.count} staff)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {formatNaira(dept.gross)}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400 w-10 text-right">
                      {dept.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-zinc-900 dark:bg-zinc-300 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${dept.percentage}%` }}
                  />
                </div>
              </div>
            ))}

            {deptList.length === 0 && (
              <div className="py-4 text-center text-zinc-400 text-xs">No records available for selected filters.</div>
            )}
          </div>
        </div>

        {/* Employment Type Demarcation */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-2.5">
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Employment Demarcation
            </h3>
            <span className="text-xs text-zinc-400 font-mono">{empTypeList.length} Categories</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {empTypeList.map(type => (
              <div key={type.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      type.name === 'Full-Time' ? 'bg-emerald-500' :
                      type.name === 'Contract' ? 'bg-blue-500' :
                      type.name === 'Part-Time' ? 'bg-purple-500' : 'bg-amber-500'
                    }`} />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {type.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">({type.count} staff)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {formatNaira(type.gross)}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400 w-10 text-right">
                      {type.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      type.name === 'Full-Time' ? 'bg-emerald-500' :
                      type.name === 'Contract' ? 'bg-blue-500' :
                      type.name === 'Part-Time' ? 'bg-purple-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${type.percentage}%` }}
                  />
                </div>
              </div>
            ))}

            {empTypeList.length === 0 && (
              <div className="py-4 text-center text-zinc-400 text-xs">No records available for selected filters.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
