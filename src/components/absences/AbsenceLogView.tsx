import React, { useState, useMemo } from 'react';
import { 
  CalendarOff, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Calendar, 
  Clock,
  DollarSign,
  Users,
  Lock,
  ChevronRight,
  X
} from 'lucide-react';
import { 
  Employee, 
  EmployeeAbsenceRecord, 
  PayrollVariables, 
  CalculatedPayrollItem,
  TeamMember,
  CompanyProfile,
  PayrollSnapshot
} from '../../types';
import { formatNaira, getScheduleWorkdays } from '../../engine/payePensionEngine';
import { MONTHS } from '../../store/usePayrollStore';
import { TablePagination } from '../common/TablePagination';
import { SortableHeader, SortDirection } from '../common/SortableHeader';
import { LogAbsenceModal } from './LogAbsenceModal';

interface AbsenceLogViewProps {
  employees: Employee[];
  absences: EmployeeAbsenceRecord[];
  payrollVariables?: PayrollVariables;
  payrollItems?: CalculatedPayrollItem[];
  company?: CompanyProfile;
  monthLabel: string;
  selectedMonth: string;
  selectedYear: number;
  onPeriodChange: (month: string, year: number) => void;
  onSaveAbsence: (absenceData: Omit<EmployeeAbsenceRecord, 'id' | 'createdAt'> & { id?: string }) => void;
  onDeleteAbsence: (id: string) => void;
  currentUser?: TeamMember | null;
  snapshots?: PayrollSnapshot[];
  isReadOnly?: boolean;
}

function formatAbsenceDateDisplay(dates: string[] | undefined, monthLabel: string, year: number): string {
  if (!dates || dates.length === 0) {
    return `${monthLabel} ${year}`;
  }
  const sorted = [...dates].sort();
  if (sorted.length === 1) {
    const [y, m, d] = sorted[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (sorted.length <= 3) {
    const formatted = sorted.map(ds => {
      const [y, m, d] = ds.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    });
    return `${formatted.join(', ')} (${sorted.length} days)`;
  }
  const [y1, m1, d1] = sorted[0].split('-').map(Number);
  const [y2, m2, d2] = sorted[sorted.length - 1].split('-').map(Number);
  const first = new Date(y1, m1 - 1, d1).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const last = new Date(y2, m2 - 1, d2).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${first} – ${last} (${sorted.length} days)`;
}

export const AbsenceLogView: React.FC<AbsenceLogViewProps> = ({
  employees = [],
  absences = [],
  payrollVariables,
  payrollItems = [],
  company,
  monthLabel,
  selectedMonth,
  selectedYear,
  snapshots = [],
  onPeriodChange,
  onSaveAbsence,
  onDeleteAbsence,
  currentUser,
  isReadOnly = false,
}) => {
  const isAuditor = currentUser?.role === 'Auditor';
  const isWriteDisabled = isAuditor || isReadOnly;

  const isPeriodLocked = useMemo(() => {
    return (snapshots || []).some(
      s => s.monthKey === selectedMonth && Number(s.year) === Number(selectedYear) && s.isLocked
    );
  }, [snapshots, selectedMonth, selectedYear]);

  const availableYears = useMemo(() => {
    const cy = Math.max(new Date().getFullYear(), selectedYear || 0);
    const snapshotYears = (snapshots || []).map(s => Number(s.year)).filter(y => !isNaN(y) && y > 2000);
    const minYear = snapshotYears.length > 0 ? Math.min(...snapshotYears, cy - 4) : cy - 4;
    const maxYear = cy + 2;
    const yearList: number[] = [];
    // Sort years descending so recent years appear first
    for (let y = maxYear; y >= minYear; y--) yearList.push(y);
    return yearList;
  }, [snapshots, selectedYear]);

  const canEdit = !isWriteDisabled && !isPeriodLocked;

  // Filter state with All Year & All Years support
  const [filterMonth, setFilterMonth] = useState<string>(selectedMonth || 'ALL');
  const [filterYear, setFilterYear] = useState<string>(selectedYear ? String(selectedYear) : 'ALL');

  // Sync with prop changes if not intentionally set to ALL
  React.useEffect(() => {
    if (filterMonth !== 'ALL') {
      setFilterMonth(selectedMonth);
    }
  }, [selectedMonth]);

  React.useEffect(() => {
    if (filterYear !== 'ALL') {
      setFilterYear(String(selectedYear));
    }
  }, [selectedYear]);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<EmployeeAbsenceRecord | null>(null);
  const [viewingAbsence, setViewingAbsence] = useState<EmployeeAbsenceRecord | null>(null);

  // Sorting state - Defaults to Date descending (most recent at the top)
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Date defaults to most recent first ('desc'), others to 'asc'
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  // Helper to get numeric timestamp for sorting by date
  const getRecordDateValue = (rec: EmployeeAbsenceRecord): number => {
    if (rec.dates && rec.dates.length > 0) {
      const sortedDates = [...rec.dates].sort();
      const latestDate = sortedDates[sortedDates.length - 1];
      const ts = new Date(latestDate).getTime();
      if (!isNaN(ts)) return ts;
    }
    if (rec.periodKey) {
      const [yStr, mKey] = rec.periodKey.split('-');
      const mIdx = MONTHS.findIndex(m => m.key.toLowerCase() === (mKey || '').toLowerCase());
      const y = parseInt(yStr, 10) || 2026;
      const m = mIdx >= 0 ? mIdx : 0;
      return new Date(y, m, 1).getTime();
    }
    if (rec.createdAt) {
      const ts = new Date(rec.createdAt).getTime();
      if (!isNaN(ts)) return ts;
    }
    return 0;
  };

  // Helper to extract period label info for display from record
  const getRecordPeriodLabel = (rec: EmployeeAbsenceRecord): { monthLabel: string; year: number } => {
    if (rec.periodKey) {
      const [yStr, mKey] = rec.periodKey.split('-');
      const m = MONTHS.find(mo => mo.key.toLowerCase() === (mKey || '').toLowerCase());
      return {
        monthLabel: m?.label || monthLabel,
        year: parseInt(yStr, 10) || selectedYear
      };
    }
    return { monthLabel, year: selectedYear };
  };

  // Active Scope Label for Stat Cards & Headers
  const activePeriodLabel = useMemo(() => {
    if (filterMonth === 'ALL' && filterYear === 'ALL') {
      return 'All Records';
    }
    if (filterMonth === 'ALL') {
      return `All Year ${filterYear}`;
    }
    if (filterYear === 'ALL') {
      const mObj = MONTHS.find(m => m.key.toLowerCase() === filterMonth.toLowerCase());
      return `${mObj?.label || filterMonth} (All Years)`;
    }
    const mObj = MONTHS.find(m => m.key.toLowerCase() === filterMonth.toLowerCase());
    return `${mObj?.label || filterMonth} ${filterYear}`;
  }, [filterMonth, filterYear]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter absences for period (handles specific month, All Year, and All Years)
  const periodAbsences = useMemo(() => {
    return absences.filter(a => {
      let aYear = '';
      let aMonth = '';
      if (a.periodKey) {
        const parts = a.periodKey.split('-');
        aYear = parts[0] || '';
        aMonth = (parts[1] || '').toLowerCase();
      } else if (a.dates && a.dates.length > 0) {
        const [y, m] = a.dates[0].split('-');
        aYear = y;
        const mNum = parseInt(m, 10);
        aMonth = MONTHS[mNum - 1]?.key || '';
      }

      if (filterYear !== 'ALL' && aYear !== filterYear) {
        return false;
      }
      if (filterMonth !== 'ALL' && aMonth !== filterMonth.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [absences, filterMonth, filterYear]);

  // Aggregate stats
  const totalDaysDocked = useMemo(() => {
    return periodAbsences.reduce((sum, a) => sum + (Number(a.daysAbsent) || 0), 0);
  }, [periodAbsences]);

  const totalDeductions = useMemo(() => {
    return periodAbsences.reduce((sum, a) => sum + (Number(a.deductionAmount) || 0), 0);
  }, [periodAbsences]);

  const affectedStaffCount = useMemo(() => {
    const uniqueIds = new Set(periodAbsences.map(a => a.employeeId));
    return uniqueIds.size;
  }, [periodAbsences]);

  // Filtered rows by search query
  const filteredAbsences = useMemo(() => {
    return periodAbsences.filter(rec => {
      const emp = employees.find(e => e.id === rec.employeeId);
      if (!emp) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        emp.code.toLowerCase().includes(q) ||
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
        (emp.department || '').toLowerCase().includes(q) ||
        (rec.notes || '').toLowerCase().includes(q)
      );
    });
  }, [periodAbsences, employees, searchQuery]);

  // Sorted rows
  const sortedAbsences = useMemo(() => {
    return [...filteredAbsences].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'date') {
        const dateA = getRecordDateValue(a);
        const dateB = getRecordDateValue(b);
        comparison = dateA - dateB;
        if (comparison === 0) {
          const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = createdA - createdB;
        }
      } else if (sortField === 'name') {
        const empA = employees.find(e => e.id === a.employeeId);
        const empB = employees.find(e => e.id === b.employeeId);
        const nameA = empA ? `${empA.firstName} ${empA.lastName}`.toLowerCase() : '';
        const nameB = empB ? `${empB.firstName} ${empB.lastName}`.toLowerCase() : '';
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === 'days') {
        const daysA = Number(a.daysAbsent) || 0;
        const daysB = Number(b.daysAbsent) || 0;
        comparison = daysA - daysB;
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [filteredAbsences, sortField, sortDirection, employees]);

  // Paginated rows
  const paginatedAbsences = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAbsences.slice(start, start + pageSize);
  }, [sortedAbsences, currentPage, pageSize]);

  const getAbsenceTypeBadge = (type: string) => {
    switch (type) {
      case 'unauthorized_absence':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
            Unauthorized
          </span>
        );
      case 'unpaid_leave':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
            Unpaid Leave
          </span>
        );
      case 'suspension_half_pay':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50">
            Suspension (50%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            Suspension (Unpaid)
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile Sticky Compact Top Bar (Playbook from MobileAppShell / MobileStaffDirectoryView) */}
      <div className="sm:hidden -mx-4 -mt-2 px-4 py-2.5 bg-[#fbfbfb] dark:bg-[#09090b] border-b border-zinc-200/80 dark:border-zinc-800/80 sticky -top-3 z-20 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
              <CalendarOff className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Absentee Log
              </h1>
              <p className="text-[11px] text-zinc-500 font-mono">
                {activePeriodLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Period Picker Pill */}
            <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-xl text-xs shadow-2xs">
              <select
                value={filterMonth}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterMonth(val);
                  setCurrentPage(1);
                  if (val !== 'ALL') {
                    const yNum = filterYear === 'ALL' ? selectedYear : parseInt(filterYear, 10);
                    onPeriodChange(val, yNum);
                  }
                }}
                className="bg-transparent font-medium text-zinc-800 dark:text-zinc-200 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="ALL" className="dark:bg-zinc-900 font-semibold">
                  All Year
                </option>
                {MONTHS.map(m => (
                  <option key={m.key} value={m.key} className="dark:bg-zinc-900">
                    {m.label.slice(0, 3)}
                  </option>
                ))}
              </select>
              <span className="text-zinc-300 dark:text-zinc-700 mx-0.5">/</span>
              <select
                value={filterYear}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterYear(val);
                  setCurrentPage(1);
                  if (val !== 'ALL' && filterMonth !== 'ALL') {
                    onPeriodChange(filterMonth, parseInt(val, 10));
                  }
                }}
                className="bg-transparent font-medium text-zinc-800 dark:text-zinc-200 text-xs focus:outline-hidden cursor-pointer"
              >
                <option value="ALL" className="dark:bg-zinc-900 font-semibold">
                  All Years
                </option>
                {availableYears.map(y => (
                  <option key={y} value={String(y)} className="dark:bg-zinc-900">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {isPeriodLocked ? (
              <div className="flex items-center gap-1 h-7 px-2 rounded-xl text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <Lock className="w-3 h-3" />
                <span>Locked</span>
              </div>
            ) : !isWriteDisabled && (
              <button
                type="button"
                onClick={() => {
                  setEditingAbsence(null);
                  setIsModalOpen(true);
                }}
                className="h-7 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs flex items-center gap-1 shadow-2xs active:scale-98 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Brief Total Headline (Succinct - Replaces Cluttered Stat Cards) */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs text-xs">
          <span className="text-zinc-500 dark:text-zinc-400">Total Docked</span>
          <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {totalDeductions > 0 ? `-${formatNaira(totalDeductions)}` : '₦0.00'}
            </span>
            <span className="text-zinc-400 font-normal ml-1.5 font-sans">
              &bull; {affectedStaffCount} {affectedStaffCount === 1 ? 'staff' : 'staff'} ({totalDaysDocked}d)
            </span>
          </span>
        </div>
      </div>

      {/* Desktop Top Header */}
      <div className="hidden sm:flex pt-3 pb-3 flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <span>Employee Absence & Attendance Log</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Log unpaid days not worked with automatic workweek proration (Nigerian Labour Act Section 5).
          </p>
        </div>

        {/* Period Selector & Log Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded-md text-xs">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={filterMonth}
              onChange={(e) => {
                const val = e.target.value;
                setFilterMonth(val);
                setCurrentPage(1);
                if (val !== 'ALL') {
                  const yNum = filterYear === 'ALL' ? selectedYear : parseInt(filterYear, 10);
                  onPeriodChange(val, yNum);
                }
              }}
              className="bg-transparent font-medium text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL" className="dark:bg-zinc-900 font-semibold">
                All Year
              </option>
              {MONTHS.map(m => (
                <option key={m.key} value={m.key} className="dark:bg-zinc-900">
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={(e) => {
                const val = e.target.value;
                setFilterYear(val);
                setCurrentPage(1);
                if (val !== 'ALL' && filterMonth !== 'ALL') {
                  onPeriodChange(filterMonth, parseInt(val, 10));
                }
              }}
              className="bg-transparent font-medium text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL" className="dark:bg-zinc-900 font-semibold">
                All Years
              </option>
              {availableYears.map(y => (
                <option key={y} value={String(y)} className="dark:bg-zinc-900">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {isPeriodLocked ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
              <Lock className="w-3.5 h-3.5" />
              <span>Payroll Finalized (Locked)</span>
            </div>
          ) : !isWriteDisabled && (
            <button
              onClick={() => {
                setEditingAbsence(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Absence</span>
            </button>
          )}
        </div>
      </div>

      {/* Minimalist Stat Cards (Desktop Only - Hidden on Mobile) */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <span>Days Docked ({filterMonth === 'ALL' ? (filterYear === 'ALL' ? 'All Time' : filterYear) : (MONTHS.find(m => m.key.toLowerCase() === filterMonth.toLowerCase())?.label || monthLabel)})</span>
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {totalDaysDocked} {totalDaysDocked === 1 ? 'day' : 'days'}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <span>Unpaid Deductions</span>
            <DollarSign className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
            -{formatNaira(totalDeductions)}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <span>Affected Staff</span>
            <Users className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {affectedStaffCount} {affectedStaffCount === 1 ? 'employee' : 'employees'}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, code, dept, notes..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-zinc-400"
          />
        </div>
      </div>

      {/* Desktop Absences Table View - Simplified Succinct Layout */}
      <div className="hidden sm:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="bg-zinc-50/80 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold">
              <tr>
                <th className="px-4 py-3">
                  <SortableHeader
                    label="Date"
                    field="date"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th className="px-4 py-3">
                  <SortableHeader
                    label="Staff Name"
                    field="name"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="left"
                  />
                </th>
                <th className="px-4 py-3 text-center">
                  <SortableHeader
                    label="Absent Days"
                    field="days"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="px-4 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {filteredAbsences.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-zinc-400">
                    <CalendarOff className="w-6 h-6 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-xs font-medium">No absence records logged for {activePeriodLabel}.</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Click "Log Absence" to record days not worked for any employee.</p>
                  </td>
                </tr>
              ) : (
                paginatedAbsences.map(rec => {
                  const emp = employees.find(e => e.id === rec.employeeId);
                  if (!emp) return null;
                  const recPeriod = getRecordPeriodLabel(rec);
                  const dateDisplay = formatAbsenceDateDisplay(rec.dates, recPeriod.monthLabel, recPeriod.year);

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => setViewingAbsence(rec)}
                      className="group hover:bg-zinc-50/90 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors" />
                          <span>{dateDisplay}</span>
                        </div>
                      </td>

                      {/* Staff Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                              {emp.code} &bull; {emp.department || 'General'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Absent Days */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60">
                          {rec.daysAbsent} {rec.daysAbsent === 1 ? 'day' : 'days'}
                        </span>
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
          </table>
        </div>
      </div>

      {/* Mobile Absence Cards Stack - Succinct & Clickable */}
      <div className="sm:hidden space-y-2">
        {filteredAbsences.length === 0 ? (
          <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 text-center shadow-xs">
            <CalendarOff className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No absences recorded</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">All staff have 100% attendance logged for {activePeriodLabel}.</p>
          </div>
        ) : (
          paginatedAbsences.map(rec => {
            const emp = employees.find(e => e.id === rec.employeeId);
            if (!emp) return null;
            const recPeriod = getRecordPeriodLabel(rec);
            const dateDisplay = formatAbsenceDateDisplay(rec.dates, recPeriod.monthLabel, recPeriod.year);

            return (
              <div
                key={rec.id}
                onClick={() => setViewingAbsence(rec)}
                className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-xl p-3.5 shadow-2xs active:bg-zinc-50 dark:active:bg-zinc-800/50 transition cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5">
                      <span>{emp.code}</span>
                      <span>&bull;</span>
                      <span className="truncate">{dateDisplay}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {rec.daysAbsent}d
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Succinct Details Modal (No elaborate UI, just simplicity, neat and succinct) */}
      {viewingAbsence && (() => {
        const emp = employees.find(e => e.id === viewingAbsence.employeeId);
        if (!emp) return null;
        const sched = emp.workSchedule || '5-day';
        const absPeriod = getRecordPeriodLabel(viewingAbsence);
        const absMonthKey = viewingAbsence.periodKey ? (viewingAbsence.periodKey.split('-')[1] || selectedMonth) : selectedMonth;
        const workdays = getScheduleWorkdays(
          absPeriod.year, 
          absMonthKey, 
          sched, 
          payrollVariables?.workdayDivisorRule || 'actual_weekdays'
        );
        const contractualGross = Number(emp.monthlyGross) || 0;
        const dailyRate = workdays > 0 ? contractualGross / workdays : 0;
        const proratedGross = Math.max(0, contractualGross - Number(viewingAbsence.deductionAmount || 0));
        const datesList = Array.isArray(viewingAbsence.dates) && viewingAbsence.dates.length > 0
          ? viewingAbsence.dates
          : [];

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {emp.firstName} {emp.lastName}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    {emp.code} &bull; {emp.department || 'General'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingAbsence(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Specific Dates Pill Grid */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Dates of Absence
                  </span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-xs">
                    {viewingAbsence.daysAbsent} {viewingAbsence.daysAbsent === 1 ? 'day' : 'days'}
                  </span>
                </div>

                {datesList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {datesList.map(dStr => {
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
                    {absPeriod.monthLabel} {absPeriod.year}
                  </p>
                )}

                <div className="pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Absence Type</span>
                  <div>{getAbsenceTypeBadge(viewingAbsence.absenceType)}</div>
                </div>
              </div>

              {/* Financial Computation Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-zinc-500">
                  <span>Work Schedule</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {sched === '6-day' ? '6-Day (Mon–Sat)' : '5-Day (Mon–Fri)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-zinc-500">
                  <span>Daily Rate</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{formatNaira(dailyRate)}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-500">
                  <span>Contractual Gross</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{formatNaira(contractualGross)}</span>
                </div>
                <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-semibold pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <span>Salary Deduction</span>
                  <span className="font-mono">-{formatNaira(viewingAbsence.deductionAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Adjusted Gross</span>
                  <span className="font-mono">{formatNaira(proratedGross)}</span>
                </div>
              </div>

              {/* Notes if any */}
              {viewingAbsence.notes && (
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-0.5">
                    Notes
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 italic">
                    "{viewingAbsence.notes}"
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                {canEdit ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const recToEdit = viewingAbsence;
                        setViewingAbsence(null);
                        setEditingAbsence(recToEdit);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete absence record for ${emp.firstName} ${emp.lastName}?`)) {
                          onDeleteAbsence(viewingAbsence.id);
                          setViewingAbsence(null);
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                ) : <div />}

                <button
                  type="button"
                  onClick={() => setViewingAbsence(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 active:scale-95 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {filteredAbsences.length > pageSize && (
        <div className="mt-3">
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredAbsences.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <LogAbsenceModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAbsence(null);
          }}
          employees={employees}
          payrollVariables={payrollVariables}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          monthLabel={monthLabel}
          existingAbsence={editingAbsence}
          onSaveAbsence={onSaveAbsence}
          onDeleteAbsence={onDeleteAbsence}
          isReadOnly={isWriteDisabled}
        />
      )}
    </div>
  );
};

