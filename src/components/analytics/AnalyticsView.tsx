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
  ArrowRight,
  PiggyBank,
  ArrowUpRight,
  FileText,
  Wallet,
  Search,
  RotateCcw,
  Receipt,
  CalendarOff,
  Clock,
  ChevronRight
} from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  PayrollSnapshot, 
  Employee, 
  PayrollVariables, 
  PayeTaxVariables, 
  CompanyProfile,
  EmployeeLoan,
  EmployeeContribution,
  ContributionPayout,
  ContributionScheme,
  EmployeeContributionSummary,
  EmployeeAbsenceRecord
} from '../../types';
import { 
  formatNaira, 
  formatCompactNaira, 
  calculatePayrollItem,
  formatDate,
  getScheduleWorkdays
} from '../../engine/payePensionEngine';
import { exportPayrollProToExcel } from '../../engine/excelEngine';
import { PrintableScheduleModal, ScheduleReportType } from './PrintableScheduleModal';
import { MONTHS } from '../../store/usePayrollStore';
import { TablePagination } from '../common/TablePagination';
import { SortableHeader, SortDirection } from '../common/SortableHeader';

export type AnalyticsRangeMode = 'single-month' | 'full-year' | 'all-history';
export type AnalyticsTab = 'overview' | 'departments' | 'tax' | 'pension' | 'bank' | 'contributions' | 'absences';

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
  loans?: EmployeeLoan[];
  contributions?: EmployeeContribution[];
  payouts?: ContributionPayout[];
  schemes?: ContributionScheme[];
  absences?: EmployeeAbsenceRecord[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  items: initialItems,
  employees,
  payrollVariables,
  payeTaxVariables,
  monthLabel: initialMonthLabel,
  selectedMonth: initialSelectedMonth = (MONTHS[new Date().getMonth()]?.key || 'oct'),
  year: initialYear = new Date().getFullYear(),
  activeSnapshot,
  snapshots = [],
  departments = [],
  company = { name: 'COMPANY LIMITED', subtitle: '', address: '', phone: '', email: '' },
  loans = [],
  contributions = [],
  payouts = [],
  schemes = [],
  absences = [],
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  
  // Interactive Report Filters
  const [rangeMode, setRangeMode] = useState<AnalyticsRangeMode>('single-month');
  const [activeMonthKey, setActiveMonthKey] = useState<string>(() => initialSelectedMonth || (MONTHS[new Date().getMonth()]?.key || 'oct'));
  const [activeYear, setActiveYear] = useState<number>(() => initialYear || new Date().getFullYear());
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

  // Dynamic year range — accounts for all historical snapshots (e.g. 5-year companies)
  const years = useMemo(() => {
    const cy = new Date().getFullYear();
    const set = new Set<number>([cy - 5, cy - 4, cy - 3, cy - 2, cy - 1, cy, cy + 1, cy + 2]);
    (snapshots || []).forEach(s => {
      const yr = Number(s.year);
      if (!isNaN(yr) && yr > 2000) set.add(yr);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [snapshots]);

  const currentMonthObj = MONTHS.find(m => m.key === activeMonthKey);
  const activeMonthLabel = currentMonthObj?.label || initialMonthLabel;

  // ================= CONTRIBUTIONS & WELFARE TAB STATE =================
  const [contribScope, setContribScope] = useState<string>('ALL'); // 'ALL' or employeeId
  const [contribTimeframe, setContribTimeframe] = useState<'month' | 'year' | 'all'>('month');
  const [contribYear, setContribYear] = useState<number>(() => initialYear || new Date().getFullYear());
  const [contribMonthKey, setContribMonthKey] = useState<string>(() => initialSelectedMonth || (MONTHS[new Date().getMonth()]?.key || 'oct'));
  const [contribSearchQuery, setContribSearchQuery] = useState('');
  const [contribPage, setContribPage] = useState(1);
  const [contribPageSize, setContribPageSize] = useState(10);
  const [isPrintStatementModalOpen, setIsPrintStatementModalOpen] = useState(false);

  // Sync with main toolbar
  useEffect(() => {
    setContribYear(activeYear);
  }, [activeYear]);

  useEffect(() => {
    setContribMonthKey(activeMonthKey);
  }, [activeMonthKey]);

  useEffect(() => {
    if (rangeMode === 'single-month') setContribTimeframe('month');
    else if (rangeMode === 'full-year') setContribTimeframe('year');
    else if (rangeMode === 'all-history') setContribTimeframe('all');
  }, [rangeMode]);

  useEffect(() => {
    setContribPage(1);
  }, [contribScope, contribTimeframe, contribYear, contribMonthKey, contribSearchQuery]);

  // ================= ABSENCES & ATTENDANCE REPORT TAB STATE =================
  const [absenceScope, setAbsenceScope] = useState<string>('ALL'); // 'ALL' or employeeId
  const [absenceTimeframe, setAbsenceTimeframe] = useState<'month' | 'year' | 'all'>('month');
  const [absenceYear, setAbsenceYear] = useState<number>(() => initialYear || new Date().getFullYear());
  const [absenceMonthKey, setAbsenceMonthKey] = useState<string>(() => initialSelectedMonth || (MONTHS[new Date().getMonth()]?.key || 'oct'));
  const [absenceSearchQuery, setAbsenceSearchQuery] = useState('');
  const [absencePage, setAbsencePage] = useState(1);
  const [absencePageSize, setAbsencePageSize] = useState(10);
  const [isPrintAbsenceModalOpen, setIsPrintAbsenceModalOpen] = useState(false);
  const [viewingAbsenceRow, setViewingAbsenceRow] = useState<any | null>(null);

  useEffect(() => {
    setAbsenceYear(activeYear);
  }, [activeYear]);

  useEffect(() => {
    setAbsenceMonthKey(activeMonthKey);
  }, [activeMonthKey]);

  useEffect(() => {
    if (rangeMode === 'single-month') setAbsenceTimeframe('month');
    else if (rangeMode === 'full-year') setAbsenceTimeframe('year');
    else if (rangeMode === 'all-history') setAbsenceTimeframe('all');
  }, [rangeMode]);

  useEffect(() => {
    setAbsencePage(1);
  }, [absenceScope, absenceTimeframe, absenceYear, absenceMonthKey, absenceSearchQuery]);

  const allAbsenceYears = useMemo(() => {
    const set = new Set<number>();
    const cy = new Date().getFullYear();
    [cy - 5, cy - 4, cy - 3, cy - 2, cy - 1, cy, cy + 1, cy + 2].forEach(y => set.add(y));
    (snapshots || []).forEach(s => {
      const yr = Number(s.year);
      if (!isNaN(yr) && yr > 2000) set.add(yr);
    });
    (absences || []).forEach(a => {
      const yr = parseInt(a.periodKey?.split('-')[0], 10);
      if (!isNaN(yr)) set.add(yr);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [snapshots, absences]);

  const selectedAbsenceEmployee = useMemo(() => {
    if (absenceScope === 'ALL') return null;
    return employees.find(e => e.id === absenceScope) || null;
  }, [employees, absenceScope]);

  const absenceReportData = useMemo(() => {
    const all = (absences || []).map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      const [yStr, mKey] = (a.periodKey || '').split('-');
      const y = parseInt(yStr, 10) || activeYear;
      const mObj = MONTHS.find(m => m.key === mKey);
      const periodLabel = `${mObj?.label || mKey?.toUpperCase() || ''} ${y}`;
      const sched = emp?.workSchedule || '5-day';
      const workdays = getScheduleWorkdays(
        y, 
        mKey || 'jan', 
        sched, 
        payrollVariables?.workdayDivisorRule || 'actual_weekdays'
      );
      const contractualGross = Number(emp?.monthlyGross) || 0;
      const dailyRate = workdays > 0 ? contractualGross / workdays : 0;
      const deductionAmount = Number(a.deductionAmount) || 0;
      const proratedGross = Math.max(0, contractualGross - deductionAmount);

      return {
        ...a,
        emp,
        periodLabel,
        year: y,
        monthKey: mKey,
        workSchedule: sched,
        dailyRate,
        contractualGross,
        deductionAmount,
        proratedGross,
      };
    });

    let filtered = selectedAbsenceEmployee
      ? all.filter(r => r.employeeId === selectedAbsenceEmployee.id)
      : all;

    if (absenceTimeframe === 'year') {
      filtered = filtered.filter(r => r.year === absenceYear);
    } else if (absenceTimeframe === 'month') {
      filtered = filtered.filter(r => r.year === absenceYear && r.monthKey === absenceMonthKey);
    }

    if (absenceSearchQuery.trim()) {
      const q = absenceSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => {
        const name = `${r.emp?.firstName || ''} ${r.emp?.lastName || ''}`.toLowerCase();
        const code = (r.emp?.code || '').toLowerCase();
        const dept = (r.emp?.department || '').toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        return name.includes(q) || code.includes(q) || dept.includes(q) || notes.includes(q);
      });
    }

    filtered.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      const mIdxA = MONTHS.findIndex(m => m.key === a.monthKey);
      const mIdxB = MONTHS.findIndex(m => m.key === b.monthKey);
      if (mIdxA !== mIdxB) return mIdxB - mIdxA;
      return (a.emp?.lastName || '').localeCompare(b.emp?.lastName || '');
    });

    const totalDaysDocked = filtered.reduce((s, r) => s + (Number(r.daysAbsent) || 0), 0);
    const totalDeductions = filtered.reduce((s, r) => s + r.deductionAmount, 0);
    const affectedStaffCount = new Set(filtered.map(r => r.employeeId)).size;
    const avgDeductionPerStaff = affectedStaffCount > 0 ? totalDeductions / affectedStaffCount : 0;

    return {
      rows: filtered,
      totalDaysDocked,
      totalDeductions,
      affectedStaffCount,
      avgDeductionPerStaff,
    };
  }, [absences, employees, selectedAbsenceEmployee, absenceTimeframe, absenceYear, absenceMonthKey, absenceSearchQuery, payrollVariables, activeYear]);

  const paginatedAbsenceRows = useMemo(() => {
    const start = (absencePage - 1) * absencePageSize;
    return absenceReportData.rows.slice(start, start + absencePageSize);
  }, [absenceReportData.rows, absencePage, absencePageSize]);

  // CSV Export for Absences
  const handleExportAbsencesCsv = () => {
    const sanitize = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = 'Period,Staff Code,Staff Name,Department,Schedule,Daily Rate,Absent Dates,Days Docked,Salary Deduction,Adjusted Earned Gross,Absence Type,Notes';
    const rows = absenceReportData.rows.map(r => [
      sanitize(r.periodLabel),
      sanitize(r.emp?.code || ''),
      sanitize(`${r.emp?.firstName || ''} ${r.emp?.lastName || ''}`),
      sanitize(r.emp?.department || 'General'),
      sanitize(r.workSchedule === '6-day' ? '6-Day (Mon–Sat)' : '5-Day (Mon–Fri)'),
      Math.round(r.dailyRate),
      sanitize(Array.isArray(r.dates) && r.dates.length > 0 ? r.dates.join('; ') : r.periodLabel),
      r.daysAbsent,
      r.deductionAmount,
      r.proratedGross,
      sanitize(r.absenceType),
      sanitize(r.notes || '')
    ].join(','));

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = selectedAbsenceEmployee
      ? `Absence_Statement_${selectedAbsenceEmployee.code}_${absenceYear}.csv`
      : `Absence_Schedule_${absenceTimeframe}_${absenceYear}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const allContribYears = useMemo(() => {
    const set = new Set<number>();
    const cy = new Date().getFullYear();
    [cy - 5, cy - 4, cy - 3, cy - 2, cy - 1, cy, cy + 1, cy + 2].forEach(y => set.add(y));
    (snapshots || []).forEach(s => {
      const yr = Number(s.year);
      if (!isNaN(yr) && yr > 2000) set.add(yr);
    });
    (contributions || []).forEach(c => {
      const yr = parseInt(c.periodKey?.split('-')[0], 10);
      if (!isNaN(yr)) set.add(yr);
    });
    (payouts || []).forEach(p => {
      const yr = new Date(p.payoutDate).getFullYear();
      if (!isNaN(yr)) set.add(yr);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [snapshots, contributions, payouts]);

  const schemeNameFallback = schemes[0]?.name || 'Staff Welfare Fund';

  // Employee cumulative ledgers (all-time)
  const employeeContribSummaries = useMemo(() => {
    return employees.map(emp => {
      const empContribs = (contributions || []).filter(c => c.employeeId === emp.id);
      const empPayouts = (payouts || []).filter(p => p.employeeId === emp.id);

      const totalContributed = empContribs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const totalDisbursed = empPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const currentBalance = totalContributed - totalDisbursed;

      return {
        emp,
        totalContributed,
        totalDisbursed,
        currentBalance,
        activeThisMonth: empContribs.some(c => c.periodKey === `${contribYear}-${contribMonthKey}` && c.amount > 0),
        activeThisYear: empContribs.some(c => c.periodKey.startsWith(`${contribYear}-`) && c.amount > 0),
      };
    });
  }, [employees, contributions, payouts, contribYear, contribMonthKey]);

  const selectedContribEmployee = useMemo(() => {
    if (contribScope === 'ALL') return null;
    return employees.find(e => e.id === contribScope) || null;
  }, [employees, contribScope]);

  // Single Employee Statement Data
  const employeeStatementData = useMemo(() => {
    if (!selectedContribEmployee) return { lines: [], totalInflow: 0, totalOutflow: 0, netBalance: 0, allTimeBalance: 0 };

    const empId = selectedContribEmployee.id;
    const empContribs = (contributions || []).filter(c => c.employeeId === empId);
    const empPayouts = (payouts || []).filter(p => p.employeeId === empId);

    interface RawEvent {
      id: string;
      date: string;
      periodKey?: string;
      type: 'contribution' | 'payout';
      scheme: string;
      amount: number;
      notes?: string;
    }

    const events: RawEvent[] = [];

    empContribs.forEach(c => {
      let accountingDate = '';
      if (c.periodKey) {
        const parts = c.periodKey.split('-');
        const y = parseInt(parts[0], 10);
        const m = parts[1] || 'jan';
        const mIdx = MONTHS.findIndex(mo => mo.key === m);
        accountingDate = new Date(Date.UTC(y, mIdx >= 0 ? mIdx : 0, 25)).toISOString();
      } else if (c.createdAt) {
        accountingDate = c.createdAt;
      } else {
        accountingDate = new Date().toISOString();
      }

      events.push({
        id: c.id,
        date: accountingDate,
        periodKey: c.periodKey,
        type: 'contribution',
        scheme: c.schemeName || schemeNameFallback,
        amount: Number(c.amount) || 0,
        notes: c.notes || 'Payroll Net Deduction',
      });
    });

    empPayouts.forEach(p => {
      events.push({
        id: p.id,
        date: p.payoutDate,
        type: 'payout',
        scheme: p.schemeName || schemeNameFallback,
        amount: Number(p.amount) || 0,
        notes: p.reason ? `Payout: ${p.reason.replace(/_/g, ' ')}` : 'Savings Payout',
      });
    });

    // Chronological order from oldest to newest to compute running balance correctly.
    // If on the exact same date or period, contributions (inflows) execute before payouts (outflows).
    events.sort((a, b) => {
      const tA = new Date(a.date).getTime();
      const tB = new Date(b.date).getTime();
      if (tA !== tB) return tA - tB;
      if (a.type !== b.type) return a.type === 'contribution' ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

    let running = 0;
    const allLinesWithRunning = events.map(evt => {
      const isInflow = evt.type === 'contribution';
      const inflow = isInflow ? evt.amount : 0;
      const outflow = !isInflow ? evt.amount : 0;
      running += (inflow - outflow);

      let periodLabel = '';
      if (evt.periodKey) {
        const [yr, mk] = evt.periodKey.split('-');
        const monthObj = MONTHS.find(m => m.key === mk);
        periodLabel = `${monthObj?.label || mk.toUpperCase()} ${yr}`;
      } else {
        const d = new Date(evt.date);
        const m = MONTHS[d.getMonth()]?.label || '';
        periodLabel = `${m} ${d.getFullYear()}`;
      }

      return {
        id: evt.id,
        date: evt.date,
        periodKey: evt.periodKey,
        periodLabel,
        type: evt.type,
        scheme: evt.scheme,
        inflow,
        outflow,
        runningBalance: running,
        notes: evt.notes,
        monthlyGross: selectedContribEmployee.monthlyGross,
      };
    });

    const allTimeBalance = running;

    const filteredLines = allLinesWithRunning.filter(line => {
      if (contribTimeframe === 'all') return true;

      if (contribTimeframe === 'year') {
        if (line.periodKey) {
          return line.periodKey.startsWith(`${contribYear}-`);
        }
        return new Date(line.date).getFullYear() === contribYear;
      }

      if (contribTimeframe === 'month') {
        if (line.periodKey) {
          return line.periodKey === `${contribYear}-${contribMonthKey}`;
        }
        const d = new Date(line.date);
        return d.getFullYear() === contribYear && MONTHS[d.getMonth()]?.key === contribMonthKey;
      }

      return true;
    });

    const totalInflow = filteredLines.reduce((s, l) => s + l.inflow, 0);
    const totalOutflow = filteredLines.reduce((s, l) => s + l.outflow, 0);
    const netBalance = totalInflow - totalOutflow;

    return {
      lines: filteredLines,
      totalInflow,
      totalOutflow,
      netBalance,
      allTimeBalance,
    };
  }, [selectedContribEmployee, contributions, payouts, contribTimeframe, contribYear, contribMonthKey, schemeNameFallback]);

  // All Staff Contribution Schedule Data
  const allStaffContribData = useMemo(() => {
    const q = contribSearchQuery.toLowerCase().trim();

    if (contribTimeframe === 'month') {
      const currentPeriodKey = `${contribYear}-${contribMonthKey}`;
      const rows = employees
        .map(emp => {
          const contrib = (contributions || []).find(c => c.employeeId === emp.id && c.periodKey === currentPeriodKey);
          const amount = Number(contrib?.amount) || 0;
          const summary = employeeContribSummaries.find(s => s.emp.id === emp.id);
          return {
            emp,
            contrib,
            amount,
            schemeName: contrib?.schemeName || schemeNameFallback,
            currentBalance: summary?.currentBalance || 0,
            percentGross: emp.monthlyGross > 0 ? (amount / emp.monthlyGross) * 100 : 0,
          };
        })
        .filter(r => {
          if (!r.contrib || r.amount <= 0) return false;
          if (!q) return true;
          return (
            r.emp.code.toLowerCase().includes(q) ||
            `${r.emp.firstName} ${r.emp.lastName}`.toLowerCase().includes(q) ||
            (r.emp.department || '').toLowerCase().includes(q)
          );
        });

      const totalDeductions = rows.reduce((s, r) => s + r.amount, 0);
      const participatingCount = rows.length;
      const avgContribution = participatingCount > 0 ? totalDeductions / participatingCount : 0;
      const totalFundPool = employeeContribSummaries.reduce((s, r) => s + r.currentBalance, 0);

      return {
        mode: 'month' as const,
        rows,
        totalDeductions,
        participatingCount,
        avgContribution,
        totalFundPool,
      };
    } else if (contribTimeframe === 'year') {
      const rows = employees
        .map(emp => {
          const yearContribs = (contributions || []).filter(c => c.employeeId === emp.id && c.periodKey.startsWith(`${contribYear}-`) && Number(c.amount) > 0);
          const yearPayouts = (payouts || []).filter(p => p.employeeId === emp.id && new Date(p.payoutDate).getFullYear() === contribYear);
          const totalYearContrib = yearContribs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
          const totalYearPayouts = yearPayouts.reduce((s, p) => s + (Number(p.amount) || 0), 0);
          const netYearSavings = totalYearContrib - totalYearPayouts;
          const summary = employeeContribSummaries.find(s => s.emp.id === emp.id);
          const monthsCount = yearContribs.length;

          return {
            emp,
            monthsCount,
            totalYearContrib,
            totalYearPayouts,
            netYearSavings,
            currentBalance: summary?.currentBalance || 0,
            schemeName: yearContribs[0]?.schemeName || schemeNameFallback,
          };
        })
        .filter(r => {
          if (r.totalYearContrib <= 0 && r.totalYearPayouts <= 0) return false;
          if (!q) return true;
          return (
            r.emp.code.toLowerCase().includes(q) ||
            `${r.emp.firstName} ${r.emp.lastName}`.toLowerCase().includes(q) ||
            (r.emp.department || '').toLowerCase().includes(q)
          );
        });

      const totalYearDeductions = rows.reduce((s, r) => s + r.totalYearContrib, 0);
      const totalYearDisbursed = rows.reduce((s, r) => s + r.totalYearPayouts, 0);
      const netYearFundGrowth = totalYearDeductions - totalYearDisbursed;
      const totalFundPool = employeeContribSummaries.reduce((s, r) => s + r.currentBalance, 0);

      return {
        mode: 'year' as const,
        rows,
        totalYearDeductions,
        totalYearDisbursed,
        netYearFundGrowth,
        participatingCount: rows.length,
        totalFundPool,
      };
    } else {
      const rows = employeeContribSummaries
        .filter(s => {
          if (s.totalContributed <= 0 && s.totalDisbursed <= 0) return false;
          if (!q) return true;
          return (
            s.emp.code.toLowerCase().includes(q) ||
            `${s.emp.firstName} ${s.emp.lastName}`.toLowerCase().includes(q) ||
            (s.emp.department || '').toLowerCase().includes(q)
          );
        });

      const totalAllTimeContributed = rows.reduce((s, r) => s + r.totalContributed, 0);
      const totalAllTimeDisbursed = rows.reduce((s, r) => s + r.totalDisbursed, 0);
      const totalBalanceHeld = totalAllTimeContributed - totalAllTimeDisbursed;

      return {
        mode: 'all' as const,
        rows,
        totalAllTimeContributed,
        totalAllTimeDisbursed,
        totalBalanceHeld,
        participatingCount: rows.length,
      };
    }
  }, [employees, contributions, payouts, employeeContribSummaries, contribTimeframe, contribYear, contribMonthKey, contribSearchQuery, schemeNameFallback]);

  const paginatedStatementLines = useMemo(() => {
    const start = (contribPage - 1) * contribPageSize;
    return employeeStatementData.lines.slice(start, start + contribPageSize);
  }, [employeeStatementData.lines, contribPage, contribPageSize]);

  const paginatedAllStaffRows = useMemo(() => {
    const start = (contribPage - 1) * contribPageSize;
    return allStaffContribData.rows.slice(start, start + contribPageSize);
  }, [allStaffContribData.rows, contribPage, contribPageSize]);

  // CSV Export for Contributions
  const handleExportContributionsCsv = () => {
    let headers = '';
    let rows: string[] = [];
    const sanitize = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    if (selectedContribEmployee) {
      headers = 'Period,Date,Scheme,Monthly Gross,Contribution (Inflow),Payout (Outflow),Running Balance,Notes';
      rows = employeeStatementData.lines.map(l => [
        sanitize(l.periodLabel),
        sanitize(formatDate(l.date)),
        sanitize(l.scheme),
        l.monthlyGross || 0,
        l.inflow,
        l.outflow,
        l.runningBalance,
        sanitize(l.notes)
      ].join(','));
    } else {
      if (contribTimeframe === 'month') {
        headers = 'Staff Code,Staff Name,Department,Scheme,Monthly Gross,Contribution Deducted,Percent of Gross,Current Balance';
        rows = allStaffContribData.rows.map((r: any) => [
          sanitize(r.emp.code),
          sanitize(`${r.emp.firstName} ${r.emp.lastName}`),
          sanitize(r.emp.department),
          sanitize(r.schemeName),
          r.emp.monthlyGross,
          r.amount,
          `${r.percentGross.toFixed(1)}%`,
          r.currentBalance
        ].join(','));
      } else if (contribTimeframe === 'year') {
        headers = 'Staff Code,Staff Name,Department,Scheme,Months Deducted,Total Year Deductions,Total Year Payouts,Net Year Added,Current Balance';
        rows = allStaffContribData.rows.map((r: any) => [
          sanitize(r.emp.code),
          sanitize(`${r.emp.firstName} ${r.emp.lastName}`),
          sanitize(r.emp.department),
          sanitize(r.schemeName),
          r.monthsCount,
          r.totalYearContrib,
          r.totalYearPayouts,
          r.netYearSavings,
          r.currentBalance
        ].join(','));
      } else {
        headers = 'Staff Code,Staff Name,Department,Total All-Time Contributed,Total All-Time Disbursed,Current Balance Held';
        rows = allStaffContribData.rows.map((r: any) => [
          sanitize(r.emp.code),
          sanitize(`${r.emp.firstName} ${r.emp.lastName}`),
          sanitize(r.emp.department),
          r.totalContributed,
          r.totalDisbursed,
          r.currentBalance
        ].join(','));
      }
    }

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = selectedContribEmployee 
      ? `Contribution_Statement_${selectedContribEmployee.code}_${contribYear}.csv`
      : `Contributions_${contribTimeframe}_${contribYear}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
      // Use the parent-provided items for the current period (respects locked snapshots).
      // For other months, re-compute live from employees.
      const isActivePeriod =
        activeMonthKey === initialSelectedMonth && activeYear === initialYear;
      const baseItems = isActivePeriod
        ? (Array.isArray(initialItems) ? initialItems : [])
        : getComputedItemsForMonth(activeMonthKey, activeYear);
      return baseItems.filter(filterPredicate);
    }

    // For Full Year or All History: aggregate employee 12-month totals into composite items
    const monthsToScan = rangeMode === 'full-year' ? MONTHS : MONTHS; // extensible to multi-year
    const annualMap = new Map<string, CalculatedPayrollItem>();

    monthsToScan.forEach(m => {
      // Use parent items for the current period; re-compute for all other months
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
  }, [rangeMode, activeMonthKey, activeYear, initialItems, initialSelectedMonth, initialYear, employees, payrollVariables, payeTaxVariables, selectedDept, selectedEmpType]);

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
        loans,
      },
      loans
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
                    if (activeTab === 'contributions') {
                      setIsPrintStatementModalOpen(true);
                      return;
                    }
                    if (activeTab === 'absences') {
                      setIsPrintAbsenceModalOpen(true);
                      return;
                    }
                    const mappedType: ScheduleReportType = activeTab === 'tax' ? 'paye' : activeTab === 'pension' ? 'pension' : 'bank';
                    setPrintModalType(mappedType);
                    setIsPrintModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-zinc-500 shrink-0" />
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {activeTab === 'contributions' 
                        ? (selectedContribEmployee ? 'Print Staff Statement' : 'Print Contribution Schedule')
                        : activeTab === 'absences'
                        ? (selectedAbsenceEmployee ? 'Print Absence Statement' : 'Print Absence Schedule')
                        : 'Print / Save PDF'}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {activeTab === 'contributions'
                        ? 'Printable statement and ledger report'
                        : activeTab === 'absences'
                        ? 'Printable absence and statutory proration report'
                        : 'Printable schedule and audit voucher'}
                    </div>
                  </div>
                </button>

                <div className="h-px bg-zinc-100 dark:bg-zinc-800/80 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    if (activeTab === 'contributions') {
                      handleExportContributionsCsv();
                      return;
                    }
                    if (activeTab === 'absences') {
                      handleExportAbsencesCsv();
                      return;
                    }
                    handleExport();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {activeTab === 'contributions' 
                        ? 'Export Contribution Records (.csv)' 
                        : activeTab === 'absences'
                        ? 'Export Absence Records (.csv)'
                        : 'Export All Schedules (.xlsx)'}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {activeTab === 'contributions' 
                        ? 'Download filtered contribution data' 
                        : activeTab === 'absences'
                        ? 'Download filtered absence and proration data'
                        : 'Complete multi-tab Excel workbook'}
                    </div>
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

        {/* Tabs - Shortened labels with full title tooltips so all tabs fit seamlessly in view */}
      <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 text-xs overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('overview')}
          title="Executive Summary & Obligations"
          className={`px-2.5 py-2 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          title="Department Cost Centers & Breakdown"
          className={`px-2.5 py-2 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'departments'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          Departments ({deptList.length})
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          title="PAYE Tax Schedule & State Remittance"
          className={`px-2.5 py-2 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'tax'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          PAYE Tax
        </button>
        <button
          onClick={() => setActiveTab('pension')}
          title="Pension Remittance Schedule (Employee 8% + Employer 10%)"
          className={`px-2.5 py-2 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'pension'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          Pension
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          title="Bank Disbursement Schedule & NUBAN Details"
          className={`px-2.5 py-2 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'bank'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          Disbursements
        </button>
        <button
          onClick={() => setActiveTab('contributions')}
          title="Staff Contributions, Savings & Welfare Deductions"
          className={`px-2.5 py-2 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'contributions'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          Contributions
        </button>
        <button
          onClick={() => setActiveTab('absences')}
          title="Employee Absence & Attendance Docking Log"
          className={`px-2.5 py-2 font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'absences'
              ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          Absences
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
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px] shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Code" field="code" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Employee Name" field="name" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Employment Type" field="type" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Gross Remuneration" field="gross" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Total CRA Relief" field="cra" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Taxable Income" field="taxable" currentSortField={taxSortField} sortDirection={taxSortDir} onSort={handleTaxSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right bg-zinc-50 dark:bg-zinc-900">
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
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px] shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Code" field="code" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Employee Name" field="name" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="PFA / RSA PIN" field="pfa" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Pensionable Base (BHT)" field="base" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Employee (8%)" field="employee" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Employer (10%)" field="employer" currentSortField={pensionSortField} sortDirection={pensionSortDir} onSort={handlePensionSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right bg-zinc-50 dark:bg-zinc-900">
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
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-[10px] shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
                    <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500">S/N</span>
                  </th>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Beneficiary" field="name" currentSortField={bankSortField} sortDirection={bankSortDir} onSort={handleBankSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Bank" field="bank" currentSortField={bankSortField} sortDirection={bankSortDir} onSort={handleBankSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="NUBAN Account" field="account" currentSortField={bankSortField} sortDirection={bankSortDir} onSort={handleBankSort} align="left" />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-right bg-zinc-50 dark:bg-zinc-900">
                    <SortableHeader label="Net Amount" field="net" currentSortField={bankSortField} sortDirection={bankSortDir} onSort={handleBankSort} align="right" />
                  </th>
                  <th className="py-2.5 px-3 font-medium bg-zinc-50 dark:bg-zinc-900">
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

      {/* ================= TAB 6: STAFF CONTRIBUTIONS & WELFARE ================= */}
      {activeTab === 'contributions' && (
        <div className="space-y-4">
          {/* Minimalist Filter Ribbon */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Left: Staff Selector Dropdown */}
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Scope:</span>
                </span>
                <select
                  value={contribScope}
                  onChange={(e) => {
                    setContribScope(e.target.value);
                    setContribPage(1);
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-hidden focus:border-zinc-400 cursor-pointer"
                >
                  <option value="ALL">All Contributing Staff (Company Schedule)</option>
                  <optgroup label="Select Specific Employee Statement">
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.code} — {emp.firstName} {emp.lastName} ({emp.department || 'GENERAL'})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Center: Timeframe Scope Mode (Monthly / Full Year / All History) */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => { setContribTimeframe('month'); setContribPage(1); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    contribTimeframe === 'month'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => { setContribTimeframe('year'); setContribPage(1); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    contribTimeframe === 'year'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  Full Year
                </button>
                <button
                  type="button"
                  onClick={() => { setContribTimeframe('all'); setContribPage(1); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    contribTimeframe === 'all'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  All Records
                </button>
              </div>

              {/* Right: Year and Month Selectors */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Year Dropdown */}
                <div className={`flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 ${contribTimeframe === 'all' ? 'opacity-40 pointer-events-none' : ''}`}>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Year:</span>
                  <select
                    value={contribYear}
                    disabled={contribTimeframe === 'all'}
                    onChange={(e) => {
                      setContribYear(Number(e.target.value));
                      setContribPage(1);
                    }}
                    className="bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
                  >
                    {allContribYears.map(y => (
                      <option key={y} value={y} className="dark:bg-zinc-900">{y}</option>
                    ))}
                  </select>
                </div>

                {/* Month Dropdown (active when 'month') */}
                {contribTimeframe === 'month' && (
                  <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    <select
                      value={contribMonthKey}
                      onChange={(e) => {
                        setContribMonthKey(e.target.value);
                        setContribPage(1);
                      }}
                      className="bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
                    >
                      {MONTHS.map(m => (
                        <option key={m.key} value={m.key} className="dark:bg-zinc-900">{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Print Statement Button */}
                <button
                  type="button"
                  onClick={() => setIsPrintStatementModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{selectedContribEmployee ? 'Print Statement' : 'Print Schedule'}</span>
                </button>
              </div>
            </div>

            {/* Quick search input when in All Staff mode */}
            {contribScope === 'ALL' && (
              <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search contributing staff by name, code, department..."
                    value={contribSearchQuery}
                    onChange={(e) => setContribSearchQuery(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-3 py-1 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-400"
                  />
                </div>
                {contribSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setContribSearchQuery('')}
                    className="px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ================= VIEW A: INDIVIDUAL EMPLOYEE STATEMENT ================= */}
          {selectedContribEmployee ? (
            <div className="space-y-4">
              {/* Employee Summary Card */}
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {selectedContribEmployee.firstName} {selectedContribEmployee.lastName}
                    </span>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      {selectedContribEmployee.code}
                    </span>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {selectedContribEmployee.department || 'GENERAL'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Monthly Gross: <span className="font-mono text-zinc-700 dark:text-zinc-300 font-medium">{formatNaira(selectedContribEmployee.monthlyGross)}</span> • Scheme: <span className="text-zinc-700 dark:text-zinc-300 font-medium">{schemeNameFallback}</span> • Period: <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{contribTimeframe === 'month' ? `${MONTHS.find(m => m.key === contribMonthKey)?.label} ${contribYear}` : contribTimeframe === 'year' ? `Full Year ${contribYear}` : 'All-Time Career History'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setContribScope('ALL')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Return to All Staff Schedule</span>
                </button>
              </div>

              {/* 4 Minimalist Stat Cards for this employee */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                    Total Deducted ({contribTimeframe === 'month' ? `${MONTHS.find(m => m.key === contribMonthKey)?.label}` : contribTimeframe === 'year' ? `FY ${contribYear}` : 'All-Time'})
                  </span>
                  <p className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {formatNaira(employeeStatementData.totalInflow)}
                  </p>
                </div>

                <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                    Disbursed Payouts
                  </span>
                  <p className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {formatNaira(employeeStatementData.totalOutflow)}
                  </p>
                </div>

                <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                    Net Added in Period
                  </span>
                  <p className="text-base sm:text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {formatNaira(employeeStatementData.netBalance)}
                  </p>
                </div>

                <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                    Current Balance Held
                  </span>
                  <p className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {formatNaira(employeeStatementData.allTimeBalance)}
                  </p>
                </div>
              </div>

              {/* Statement Itemized Ledger Table */}
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-2xs">
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Staff Ledger Statement ({employeeStatementData.lines.length} entries)
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    All transactions in NGN (₦)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                      <tr>
                        <th className="px-3 py-2.5">Period / Month</th>
                        <th className="px-3 py-2.5">Transaction Date</th>
                        <th className="px-3 py-2.5">Scheme</th>
                        <th className="px-3 py-2.5">Type</th>
                        <th className="px-3 py-2.5 text-right">Deduction (Inflow)</th>
                        <th className="px-3 py-2.5 text-right">Payout (Outflow)</th>
                        <th className="px-3 py-2.5 text-right">Running Balance</th>
                        <th className="px-3 py-2.5">Narration / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-xs">
                      {employeeStatementData.lines.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-10 text-center font-sans text-zinc-400">
                            <PiggyBank className="w-6 h-6 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                            <p className="text-xs font-medium">No contribution records found for {selectedContribEmployee.firstName} in the selected period.</p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Switch the timeframe to "Full Year" or "All Records" to view other contributions.</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedStatementLines.map((line) => (
                          <tr key={line.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                            <td className="px-3 py-2.5 font-sans font-medium text-zinc-900 dark:text-zinc-100">
                              {line.periodLabel}
                            </td>
                            <td className="px-3 py-2.5 text-zinc-500">
                              {formatDate(line.date)}
                            </td>
                            <td className="px-3 py-2.5 font-sans text-zinc-600 dark:text-zinc-300">
                              {line.scheme}
                            </td>
                            <td className="px-3 py-2.5 font-sans">
                              {line.type === 'contribution' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Deduction
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  Payout
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-zinc-900 dark:text-zinc-100">
                              {line.inflow > 0 ? formatNaira(line.inflow) : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right text-rose-600 dark:text-rose-400">
                              {line.outflow > 0 ? `-${formatNaira(line.outflow)}` : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">
                              {formatNaira(line.runningBalance)}
                            </td>
                            <td className="px-3 py-2.5 font-sans text-[11px] text-zinc-500 max-w-xs truncate">
                              {line.notes || '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {employeeStatementData.lines.length > 0 && (
                      <tfoot className="bg-zinc-50 dark:bg-zinc-800/80 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 border-t border-zinc-200 dark:border-zinc-800">
                        <tr>
                          <td colSpan={4} className="px-3 py-2.5 font-sans uppercase text-[11px] text-zinc-500">
                            Total for Selected Period
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            {formatNaira(employeeStatementData.totalInflow)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-rose-600 dark:text-rose-400">
                            {employeeStatementData.totalOutflow > 0 ? `-${formatNaira(employeeStatementData.totalOutflow)}` : '₦0.00'}
                          </td>
                          <td className="px-3 py-2.5 text-right text-indigo-600 dark:text-indigo-400">
                            {formatNaira(employeeStatementData.netBalance)}
                          </td>
                          <td className="px-3 py-2.5"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {employeeStatementData.lines.length > contribPageSize && (
                  <TablePagination
                    currentPage={contribPage}
                    totalItems={employeeStatementData.lines.length}
                    pageSize={contribPageSize}
                    onPageChange={setContribPage}
                    onPageSizeChange={setContribPageSize}
                    itemLabel="statement entries"
                  />
                )}
              </div>
            </div>
          ) : (
            /* ================= VIEW B: ALL CONTRIBUTING STAFF SCHEDULE ================= */
            <div className="space-y-4">
              {/* 4 Minimalist Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {contribTimeframe === 'month' && (
                  <>
                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Deducted ({MONTHS.find(m => m.key === contribMonthKey)?.label} {contribYear})
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {formatNaira(allStaffContribData.totalDeductions || 0)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Contributing Staff
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {allStaffContribData.participatingCount} of {employees.length}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Average Deduction
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {formatNaira(allStaffContribData.avgContribution || 0)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Total Fund Pool Balance
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {formatNaira(allStaffContribData.totalFundPool || 0)}
                      </p>
                    </div>
                  </>
                )}

                {contribTimeframe === 'year' && (
                  <>
                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Total {contribYear} Deductions
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {formatNaira(allStaffContribData.totalYearDeductions || 0)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Total {contribYear} Payouts
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatNaira(allStaffContribData.totalYearDisbursed || 0)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Net Savings Added in {contribYear}
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {formatNaira(allStaffContribData.netYearFundGrowth || 0)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Annual Contributors
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {allStaffContribData.participatingCount} staff
                      </p>
                    </div>
                  </>
                )}

                {contribTimeframe === 'all' && (
                  <>
                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        All-Time Deductions
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {formatNaira(allStaffContribData.totalAllTimeContributed || 0)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        All-Time Payouts
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {formatNaira(allStaffContribData.totalAllTimeDisbursed || 0)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Current Pool Balance Held
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {formatNaira(allStaffContribData.totalBalanceHeld || 0)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
                      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Enrolled Staff
                      </span>
                      <p className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {allStaffContribData.participatingCount} staff
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* All Staff Schedule Table */}
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-2xs">
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {contribTimeframe === 'month'
                        ? `Monthly Contribution Schedule — ${MONTHS.find(m => m.key === contribMonthKey)?.label} ${contribYear}`
                        : contribTimeframe === 'year'
                        ? `Annual Contribution Summary — FY ${contribYear}`
                        : 'All-Time Cumulative Staff Savings Ledger'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {allStaffContribData.rows.length} participating records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                      <tr>
                        <th className="px-3 py-2.5 w-10">#</th>
                        <th className="px-3 py-2.5">Code</th>
                        <th className="px-3 py-2.5">Staff Name</th>
                        <th className="px-3 py-2.5">Department</th>
                        {contribTimeframe === 'month' && (
                          <>
                            <th className="px-3 py-2.5">Scheme</th>
                            <th className="px-3 py-2.5">Monthly Gross</th>
                            <th className="px-3 py-2.5 text-right">Contribution (Net)</th>
                            <th className="px-3 py-2.5 text-right">% of Gross</th>
                            <th className="px-3 py-2.5 text-right">Fund Balance</th>
                          </>
                        )}
                        {contribTimeframe === 'year' && (
                          <>
                            <th className="px-3 py-2.5">Months Contributed</th>
                            <th className="px-3 py-2.5 text-right">Deducted in {contribYear}</th>
                            <th className="px-3 py-2.5 text-right">Disbursed in {contribYear}</th>
                            <th className="px-3 py-2.5 text-right">Net Added in {contribYear}</th>
                            <th className="px-3 py-2.5 text-right">Current Balance</th>
                          </>
                        )}
                        {contribTimeframe === 'all' && (
                          <>
                            <th className="px-3 py-2.5 text-right">All-Time Deducted</th>
                            <th className="px-3 py-2.5 text-right">All-Time Disbursed</th>
                            <th className="px-3 py-2.5 text-right">Current Fund Balance</th>
                          </>
                        )}
                        <th className="px-3 py-2.5 text-right">Statement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-normal">
                      {allStaffContribData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-3 py-10 text-center font-sans text-zinc-400">
                            <PiggyBank className="w-6 h-6 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                            <p className="text-xs font-medium">No active contributions logged for the selected period.</p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">Staff who make voluntary contributions will be scheduled here automatically.</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedAllStaffRows.map((r: any, idx: number) => {
                          const rowNum = (contribPage - 1) * contribPageSize + idx + 1;
                          return (
                            <tr key={r.emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                              <td className="px-3 py-2 font-mono text-zinc-400">{rowNum}</td>
                              <td className="px-3 py-2 font-mono text-zinc-500">{r.emp.code}</td>
                              <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setContribScope(r.emp.id);
                                    setContribPage(1);
                                  }}
                                  className="text-left hover:underline hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                >
                                  {r.emp.firstName} {r.emp.lastName}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-zinc-500">{r.emp.department || 'GENERAL'}</td>

                              {contribTimeframe === 'month' && (
                                <>
                                  <td className="px-3 py-2 text-zinc-500">{r.schemeName}</td>
                                  <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-300">{formatNaira(r.emp.monthlyGross)}</td>
                                  <td className="px-3 py-2 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                                    {formatNaira(r.amount)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-zinc-500">
                                    {r.percentGross.toFixed(1)}%
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                                    {formatNaira(r.currentBalance)}
                                  </td>
                                </>
                              )}

                              {contribTimeframe === 'year' && (
                                <>
                                  <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-300">
                                    {r.monthsCount} mos
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                                    {formatNaira(r.totalYearContrib)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                    {r.totalYearPayouts > 0 ? `-${formatNaira(r.totalYearPayouts)}` : '₦0.00'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                    {formatNaira(r.netYearSavings)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                                    {formatNaira(r.currentBalance)}
                                  </td>
                                </>
                              )}

                              {contribTimeframe === 'all' && (
                                <>
                                  <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                                    {formatNaira(r.totalContributed)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                    {r.totalDisbursed > 0 ? `-${formatNaira(r.totalDisbursed)}` : '₦0.00'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                    {formatNaira(r.currentBalance)}
                                  </td>
                                </>
                              )}

                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setContribScope(r.emp.id);
                                    setContribPage(1);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                                >
                                  <FileText className="w-3 h-3 text-zinc-400" />
                                  <span>Statement</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {allStaffContribData.rows.length > contribPageSize && (
                  <TablePagination
                    currentPage={contribPage}
                    totalItems={allStaffContribData.rows.length}
                    pageSize={contribPageSize}
                    onPageChange={setContribPage}
                    onPageSizeChange={setContribPageSize}
                    itemLabel="contributing staff"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 7: ATTENDANCE & ABSENCE REPORT ================= */}
      {activeTab === 'absences' && (
        <div className="space-y-4">
          {/* Minimalist Filter Ribbon */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Left: Staff Selector Dropdown */}
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Scope:</span>
                </span>
                <select
                  value={absenceScope}
                  onChange={(e) => {
                    setAbsenceScope(e.target.value);
                    setAbsencePage(1);
                  }}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-hidden focus:border-zinc-400 cursor-pointer"
                >
                  <option value="ALL">All Affected Staff (Company Absence Schedule)</option>
                  <optgroup label="Select Specific Employee Attendance Statement">
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.code} — {emp.firstName} {emp.lastName} ({emp.department || 'GENERAL'})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Center: Timeframe Scope Mode (Monthly / Full Year / All History) */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => { setAbsenceTimeframe('month'); setAbsencePage(1); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    absenceTimeframe === 'month'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => { setAbsenceTimeframe('year'); setAbsencePage(1); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    absenceTimeframe === 'year'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  Full Year
                </button>
                <button
                  type="button"
                  onClick={() => { setAbsenceTimeframe('all'); setAbsencePage(1); }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                    absenceTimeframe === 'all'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  All Records
                </button>
              </div>

              {/* Right: Year and Month Selectors */}
              <div className="flex items-center gap-2 shrink-0">
                <div className={`flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1 ${absenceTimeframe === 'all' ? 'opacity-40 pointer-events-none' : ''}`}>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Year:</span>
                  <select
                    value={absenceYear}
                    disabled={absenceTimeframe === 'all'}
                    onChange={(e) => {
                      setAbsenceYear(Number(e.target.value));
                      setAbsencePage(1);
                    }}
                    className="bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
                  >
                    {allAbsenceYears.map(y => (
                      <option key={y} value={y} className="dark:bg-zinc-900">{y}</option>
                    ))}
                  </select>
                </div>

                {absenceTimeframe === 'month' && (
                  <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 py-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    <select
                      value={absenceMonthKey}
                      onChange={(e) => {
                        setAbsenceMonthKey(e.target.value);
                        setAbsencePage(1);
                      }}
                      className="bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-hidden cursor-pointer"
                    >
                      {MONTHS.map(m => (
                        <option key={m.key} value={m.key} className="dark:bg-zinc-900">{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsPrintAbsenceModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{selectedAbsenceEmployee ? 'Print Statement' : 'Print Schedule'}</span>
                </button>
              </div>
            </div>

            {absenceScope === 'ALL' && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search by staff name, code, department, reason..."
                    value={absenceSearchQuery}
                    onChange={(e) => {
                      setAbsenceSearchQuery(e.target.value);
                      setAbsencePage(1);
                    }}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-zinc-400"
                  />
                </div>
                <div className="text-[11px] text-zinc-400">
                  Showing <span className="font-semibold text-zinc-700 dark:text-zinc-300 font-mono">{absenceReportData.rows.length}</span> logged absence events
                </div>
              </div>
            )}
          </div>

          {/* 3 Minimalist Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <span>Total Days Docked</span>
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {absenceReportData.totalDaysDocked} {absenceReportData.totalDaysDocked === 1 ? 'day' : 'days'}
              </p>
            </div>

            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <span>Unpaid Deductions</span>
                <span className="text-rose-500 font-bold text-xs">₦</span>
              </div>
              <p className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                -{formatNaira(absenceReportData.totalDeductions)}
              </p>
            </div>

            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <span>Affected Staff</span>
                <Users className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <p className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {absenceReportData.affectedStaffCount} {absenceReportData.affectedStaffCount === 1 ? 'employee' : 'employees'}
              </p>
            </div>
          </div>

          {/* Minimalist Absence Table View */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <CalendarOff className="w-3.5 h-3.5 text-zinc-500" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedAbsenceEmployee
                    ? `Attendance Deduction Statement — ${selectedAbsenceEmployee.firstName} ${selectedAbsenceEmployee.lastName} (${selectedAbsenceEmployee.code})`
                    : absenceTimeframe === 'month'
                    ? `Monthly Absence Schedule — ${MONTHS.find(m => m.key === absenceMonthKey)?.label} ${absenceYear}`
                    : absenceTimeframe === 'year'
                    ? `Annual Absence Schedule — FY ${absenceYear}`
                    : 'All-Time Cumulative Absence & Attendance Log'}
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                {absenceReportData.rows.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                <thead className="bg-zinc-50/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Date / Period</th>
                    {!selectedAbsenceEmployee && <th className="px-4 py-3">Staff Name</th>}
                    <th className="px-4 py-3 text-center">Absent Days</th>
                    <th className="px-4 py-3 text-right">Deduction</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {absenceReportData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={selectedAbsenceEmployee ? 4 : 5} className="px-4 py-12 text-center text-zinc-400">
                        <CalendarOff className="w-6 h-6 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                        <p className="text-xs font-medium">No absence records found for the selected timeframe and filters.</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">All staff had 100% attendance during this period.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedAbsenceRows.map(rec => {
                      const datesDisplay = Array.isArray(rec.dates) && rec.dates.length > 0
                        ? rec.dates.map(ds => {
                            const [y, m, d] = ds.split('-').map(Number);
                            return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                          }).join(', ')
                        : rec.periodLabel;

                      return (
                        <tr
                          key={rec.id}
                          onClick={() => setViewingAbsenceRow(rec)}
                          className="group hover:bg-zinc-50/90 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                        >
                          {/* Date / Period */}
                          <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors" />
                              <span>{datesDisplay}</span>
                            </div>
                          </td>

                          {/* Staff Name with Code & Department */}
                          {!selectedAbsenceEmployee && (
                            <td className="px-4 py-3">
                              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {rec.emp ? `${rec.emp.firstName} ${rec.emp.lastName}` : 'Former Staff'}
                              </p>
                              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                                {rec.emp?.code || '—'} &bull; {rec.emp?.department || 'General'}
                              </p>
                            </td>
                          )}

                          {/* Absent Days */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60">
                              {rec.daysAbsent} {rec.daysAbsent === 1 ? 'day' : 'days'}
                            </span>
                          </td>

                          {/* Salary Deduction */}
                          <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            -{formatNaira(rec.deductionAmount)}
                          </td>

                          {/* Details View Hint */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                              <span>View</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {absenceReportData.rows.length > 0 && (
                  <tfoot className="bg-zinc-50 dark:bg-zinc-800/80 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 border-t border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <td colSpan={selectedAbsenceEmployee ? 1 : 2} className="px-4 py-2.5 font-sans uppercase text-[11px] text-zinc-500 font-semibold">
                        Total for Selected Scope
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold">
                        {absenceReportData.totalDaysDocked} {absenceReportData.totalDaysDocked === 1 ? 'day' : 'days'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-rose-600 dark:text-rose-400 font-bold">
                        -{formatNaira(absenceReportData.totalDeductions)}
                      </td>
                      <td className="px-4 py-2.5"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {absenceReportData.rows.length > absencePageSize && (
              <TablePagination
                currentPage={absencePage}
                totalItems={absenceReportData.rows.length}
                pageSize={absencePageSize}
                onPageChange={setAbsencePage}
                onPageSizeChange={setAbsencePageSize}
                itemLabel="absence records"
              />
            )}
          </div>

          {/* Succinct Absence View Modal */}
          {viewingAbsenceRow && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {viewingAbsenceRow.emp ? `${viewingAbsenceRow.emp.firstName} ${viewingAbsenceRow.emp.lastName}` : 'Former Staff'}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">
                      {viewingAbsenceRow.emp?.code || '—'} &bull; {viewingAbsenceRow.emp?.department || 'General'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingAbsenceRow(null)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Specific Dates Pill Grid */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Dates / Period
                    </span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                      {viewingAbsenceRow.daysAbsent} {viewingAbsenceRow.daysAbsent === 1 ? 'day' : 'days'}
                    </span>
                  </div>

                  {Array.isArray(viewingAbsenceRow.dates) && viewingAbsenceRow.dates.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {viewingAbsenceRow.dates.map((dStr: string) => {
                        const [y, m, d] = dStr.split('-').map(Number);
                        const formatted = new Date(y, m - 1, d).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        });
                        return (
                          <span
                            key={dStr}
                            className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs"
                          >
                            {formatted}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      {viewingAbsenceRow.periodLabel}
                    </p>
                  )}

                  <div className="pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-zinc-400">Absence Type</span>
                    <span className="capitalize font-medium text-zinc-700 dark:text-zinc-300">
                      {viewingAbsenceRow.absenceType?.replace(/_/g, ' ') || 'Unauthorized'}
                    </span>
                  </div>
                </div>

                {/* Financial Computation Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-zinc-500">
                    <span>Work Schedule</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {viewingAbsenceRow.workSchedule === '6-day' ? '6-Day (Mon–Sat)' : '5-Day (Mon–Fri)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-500">
                    <span>Daily Rate</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">{formatNaira(viewingAbsenceRow.dailyRate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-500">
                    <span>Contractual Gross</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">{formatNaira(viewingAbsenceRow.contractualGross)}</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <span>Salary Deduction</span>
                    <span className="font-mono">-{formatNaira(viewingAbsenceRow.deductionAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Adjusted Gross</span>
                    <span className="font-mono">{formatNaira(viewingAbsenceRow.proratedGross)}</span>
                  </div>
                </div>

                {/* Notes if any */}
                {viewingAbsenceRow.notes && (
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-0.5">
                      Notes
                    </span>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 italic">
                      "{viewingAbsenceRow.notes}"
                    </p>
                  </div>
                )}

                {/* Modal Close Action */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewingAbsenceRow(null)}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 active:scale-95 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printable Statement / Schedule Modal */}
      {isPrintStatementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedContribEmployee ? 'Employee Contribution Statement' : 'Staff Contributions Schedule'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintStatementModalOpen(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 print:p-0 print:overflow-visible">
              {/* Company & Document Header */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                      {company.name || 'COMPANY LIMITED'}
                    </h1>
                    {company.subtitle && <p className="text-xs text-zinc-500">{company.subtitle}</p>}
                    <p className="text-[11px] text-zinc-400 mt-0.5">{company.address || 'Lagos, Nigeria'}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 mb-1">
                      Official Record
                    </span>
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {selectedContribEmployee ? 'STAFF SAVINGS STATEMENT' : 'STAFF CONTRIBUTIONS SCHEDULE'}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      Issued: {formatDate(new Date().toISOString())}
                    </p>
                  </div>
                </div>

                {selectedContribEmployee ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Staff Name</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{selectedContribEmployee.firstName} {selectedContribEmployee.lastName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Staff Code</span>
                      <span className="font-mono text-zinc-700 dark:text-zinc-300">{selectedContribEmployee.code}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Department</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{selectedContribEmployee.department || 'GENERAL'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Reporting Period</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{contribTimeframe === 'month' ? `${MONTHS.find(m => m.key === contribMonthKey)?.label} ${contribYear}` : contribTimeframe === 'year' ? `Full Year ${contribYear}` : 'All Records'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-zinc-500">
                    Reporting Scope: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{contribTimeframe === 'month' ? `${MONTHS.find(m => m.key === contribMonthKey)?.label} ${contribYear}` : contribTimeframe === 'year' ? `Full Year ${contribYear}` : 'All Historical Records'}</span> • Enrolled Staff: <span className="font-semibold font-mono">{allStaffContribData.rows.length}</span>
                  </div>
                )}
              </div>

              {/* Data Table */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 text-[10px] uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    {selectedContribEmployee ? (
                      <tr>
                        <th className="p-2.5">Period</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Scheme</th>
                        <th className="p-2.5 text-right">Deduction (Inflow)</th>
                        <th className="p-2.5 text-right">Payout (Outflow)</th>
                        <th className="p-2.5 text-right">Balance</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">Staff Name</th>
                        <th className="p-2.5">Department</th>
                        <th className="p-2.5 text-right">Amount Deducted</th>
                        <th className="p-2.5 text-right">Fund Balance</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-xs">
                    {selectedContribEmployee ? (
                      employeeStatementData.lines.map(line => (
                        <tr key={line.id}>
                          <td className="p-2.5 font-sans">{line.periodLabel}</td>
                          <td className="p-2.5 text-zinc-500">{formatDate(line.date)}</td>
                          <td className="p-2.5 font-sans">{line.scheme}</td>
                          <td className="p-2.5 text-right font-medium">{line.inflow > 0 ? formatNaira(line.inflow) : '—'}</td>
                          <td className="p-2.5 text-right text-rose-600">{line.outflow > 0 ? `-${formatNaira(line.outflow)}` : '—'}</td>
                          <td className="p-2.5 text-right font-bold">{formatNaira(line.runningBalance)}</td>
                        </tr>
                      ))
                    ) : (
                      allStaffContribData.rows.map((r: any) => (
                        <tr key={r.emp.id}>
                          <td className="p-2.5 text-zinc-500">{r.emp.code}</td>
                          <td className="p-2.5 font-sans font-medium">{r.emp.firstName} {r.emp.lastName}</td>
                          <td className="p-2.5 font-sans text-zinc-500">{r.emp.department || 'GENERAL'}</td>
                          <td className="p-2.5 text-right font-medium">{formatNaira(r.amount ?? r.totalYearContrib ?? r.totalContributed ?? 0)}</td>
                          <td className="p-2.5 text-right font-bold text-zinc-900 dark:text-zinc-100">{formatNaira(r.currentBalance || 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Sign-off Block */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
                <div className="space-y-4">
                  <div className="h-8 border-b border-zinc-300 dark:border-zinc-700 w-48"></div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">Prepared by: HR / Payroll Officer</p>
                </div>
                <div className="space-y-4 text-right">
                  <div className="h-8 border-b border-zinc-300 dark:border-zinc-700 w-48 ml-auto"></div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">Authorized by: Management / Trustee</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Absence Schedule / Statement Modal */}
      {isPrintAbsenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedAbsenceEmployee ? 'Employee Absence Statement' : 'Company Absence & Attendance Schedule'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintAbsenceModalOpen(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 print:p-0 print:overflow-visible text-zinc-900 dark:text-zinc-100">
              <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <h2 className="text-lg font-bold tracking-tight">
                  {company?.name || 'COMPANY LIMITED'}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {company?.address || 'Corporate Headquarters'} &bull; {company?.email || 'payroll@company.ng'}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {selectedAbsenceEmployee
                      ? `OFFICIAL EMPLOYEE ABSENCE & PRORATION STATEMENT`
                      : `STATUTORY EMPLOYEE ABSENCE & ATTENDANCE SCHEDULE`}
                  </h3>
                  <span className="text-xs font-mono font-medium text-zinc-500">
                    Timeframe: {absenceTimeframe === 'month' ? `${MONTHS.find(m => m.key === absenceMonthKey)?.label} ${absenceYear}` : absenceTimeframe === 'year' ? `FY ${absenceYear}` : 'All Historical Records'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Compliance: Calculated strictly in accordance with Nigerian Labour Act Section 5 daily rate proration rules.
                </p>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Total Days Docked</span>
                  <span className="text-base font-bold font-mono">{absenceReportData.totalDaysDocked} days</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Total Unpaid Deductions</span>
                  <span className="text-base font-bold font-mono text-rose-600">-{formatNaira(absenceReportData.totalDeductions)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Affected Staff</span>
                  <span className="text-base font-bold font-mono">{absenceReportData.affectedStaffCount} employees</span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left text-xs border border-zinc-200 dark:border-zinc-800">
                <thead className="bg-zinc-100 dark:bg-zinc-800 text-[10px] uppercase font-semibold text-zinc-600 dark:text-zinc-300">
                  <tr>
                    <th className="p-2 border-b">Period</th>
                    {!selectedAbsenceEmployee && <th className="p-2 border-b">Staff Name</th>}
                    {!selectedAbsenceEmployee && <th className="p-2 border-b">Department</th>}
                    <th className="p-2 border-b">Schedule</th>
                    <th className="p-2 border-b text-right">Daily Rate</th>
                    <th className="p-2 border-b">Dates Absent</th>
                    <th className="p-2 border-b text-center">Days</th>
                    <th className="p-2 border-b text-right">Deduction</th>
                    <th className="p-2 border-b text-right">Adjusted Gross</th>
                    <th className="p-2 border-b">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-xs">
                  {absenceReportData.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                      <td className="p-2 font-mono">{r.periodLabel}</td>
                      {!selectedAbsenceEmployee && (
                        <td className="p-2 font-medium font-sans">{r.emp ? `${r.emp.firstName} ${r.emp.lastName}` : '—'}</td>
                      )}
                      {!selectedAbsenceEmployee && <td className="p-2 font-sans">{r.emp?.department || 'General'}</td>}
                      <td className="p-2 font-sans">{r.workSchedule === '6-day' ? '6-Day' : '5-Day'}</td>
                      <td className="p-2 text-right">{formatNaira(r.dailyRate)}</td>
                      <td className="p-2 text-[11px] font-sans">{Array.isArray(r.dates) && r.dates.length > 0 ? r.dates.join(', ') : r.periodLabel}</td>
                      <td className="p-2 text-center font-bold">{r.daysAbsent}d</td>
                      <td className="p-2 text-right text-rose-600 font-bold">-{formatNaira(r.deductionAmount)}</td>
                      <td className="p-2 text-right text-emerald-600 font-medium">{formatNaira(r.proratedGross)}</td>
                      <td className="p-2 text-[11px] font-sans capitalize">{r.absenceType?.replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-8 text-xs text-zinc-500">
                <div>
                  <div className="border-b border-zinc-400 w-48 mb-1"></div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Prepared By:</span> Payroll Accountant
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="border-b border-zinc-400 w-48 mb-1"></div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Approved By:</span> Head of Human Resources / Auditor
                </div>
              </div>
            </div>
          </div>
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
