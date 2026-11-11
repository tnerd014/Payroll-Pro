import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Calendar, 
  CheckSquare, 
  Square, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Printer, 
  Download, 
  TrendingUp, 
  Users, 
  PiggyBank, 
  DollarSign, 
  FileText,
  SlidersHorizontal,
  ChevronDown,
  Info,
  MoreVertical,
  Edit3,
  Lock
} from 'lucide-react';
import { 
  Employee, 
  EmployeeContribution, 
  ContributionPayout, 
  ContributionScheme, 
  EmployeeContributionSummary, 
  CompanyProfile, 
  TeamMember,
  CalculatedPayrollItem,
  PayrollSnapshot
} from '../../types';
import { formatNaira, formatDate } from '../../engine/payePensionEngine';
import { MONTHS, normalizeMonthKey } from '../../store/usePayrollStore';
import { TablePagination } from '../common/TablePagination';

interface ContributionsViewProps {
  employees: Employee[];
  payrollItems?: CalculatedPayrollItem[];
  contributions: EmployeeContribution[];
  payouts: ContributionPayout[];
  schemes?: ContributionScheme[];
  company?: CompanyProfile;
  monthLabel: string;
  selectedMonth: string;
  selectedYear: number;
  onPeriodChange: (month: string, year: number) => void;
  onSaveBatchContributions: (contributions: EmployeeContribution[]) => void;
  onDeleteContribution: (id: string) => void;
  onAddPayout: (payout: Omit<ContributionPayout, 'id' | 'createdAt'>) => void;
  onDeletePayout: (id: string) => void;
  currentUser?: TeamMember | null;
  snapshots?: PayrollSnapshot[];
  isReadOnly?: boolean;
}

export const ContributionsView: React.FC<ContributionsViewProps> = ({
  employees = [],
  payrollItems = [],
  contributions = [],
  payouts = [],
  schemes = [],
  snapshots = [],
  company,
  monthLabel,
  selectedMonth,
  selectedYear,
  onPeriodChange,
  onSaveBatchContributions,
  onDeleteContribution,
  onAddPayout,
  onDeletePayout,
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
    for (let y = minYear; y <= maxYear; y++) yearList.push(y);
    return yearList;
  }, [snapshots, selectedYear]);

  const canEdit = !isWriteDisabled && !isPeriodLocked;

  const currentPeriodKey = `${selectedYear}-${selectedMonth}`;
  const effectiveSchemes: ContributionScheme[] = schemes.length > 0 ? schemes : [
    {
      id: 'scheme-welfare',
      name: 'Staff Welfare Fund',
      description: 'Standard voluntary staff welfare and social support fund',
      defaultAmount: 5000,
      defaultMode: 'fixed',
      isDefault: true,
    }
  ];

  // Helper to resolve baseline take-home pay before voluntary contributions
  const getEmployeeTakeHome = (empId: string, monthlyGross: number) => {
    const pItem = (payrollItems || []).find(p => p.employeeId === empId);
    if (pItem) {
      return Math.max(0, pItem.netTakeHome + (pItem.contributionDeduction || 0));
    }
    // Fallback estimate (~82% of gross after statutory PAYE/Pension)
    return Math.max(0, Math.round(monthlyGross * 0.82));
  };

  // Active Tab
  const [activeTab, setActiveTab] = useState<'monthly' | 'ledger' | 'payouts'>('monthly');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScheme, setSelectedScheme] = useState<string>('All');

  // Modals state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedLedgerEmpId, setSelectedLedgerEmpId] = useState<string | null>(null);

  // Single Edit Modal State
  const [editingSingleEmp, setEditingSingleEmp] = useState<{ emp: Employee; existing?: EmployeeContribution } | null>(null);
  const [singleAmount, setSingleAmount] = useState<number>(5000);
  const [singleScheme, setSingleScheme] = useState<string>(effectiveSchemes[0]?.name || 'Staff Welfare Fund');

  // 3-Dot Action Menu State (Fixed Coordinates & Click-Outside)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedScheme, activeTab, selectedMonth, selectedYear]);

  // Handle click outside & Escape for 3-dot dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.contrib-action-menu') && !target.closest('.contrib-action-dropdown')) {
        setActiveMenuId(null);
        setMenuCoords(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null);
        setMenuCoords(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Current month's contributions
  const currentMonthContributions = useMemo(() => {
    return contributions.filter(c => c.periodKey === currentPeriodKey);
  }, [contributions, currentPeriodKey]);

  // Employee cumulative ledgers
  const employeeSummaries: EmployeeContributionSummary[] = useMemo(() => {
    return employees.map(emp => {
      const empContribs = contributions.filter(c => c.employeeId === emp.id);
      const empPayouts = payouts.filter(p => p.employeeId === emp.id);

      const totalContributed = empContribs.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const totalDisbursed = empPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const currentBalance = totalContributed - totalDisbursed;

      const lastContrib = empContribs.length > 0 
        ? empContribs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] 
        : undefined;
      const lastPayout = empPayouts.length > 0 
        ? empPayouts.sort((a, b) => b.payoutDate.localeCompare(a.payoutDate))[0] 
        : undefined;

      return {
        employeeId: emp.id,
        employeeCode: emp.code,
        fullName: `${emp.firstName} ${emp.lastName}`.trim(),
        department: emp.department || 'GENERAL',
        schemeName: lastContrib?.schemeName || 'Staff Welfare Fund',
        totalContributed,
        totalDisbursed,
        currentBalance,
        lastContributionDate: lastContrib?.createdAt,
        lastPayoutDate: lastPayout?.payoutDate,
      };
    });
  }, [employees, contributions, payouts]);

  // Active Contributors this month (ONLY staff who actually contributed; hides opted out / zero deduction)
  const monthlyContributors = useMemo(() => {
    return employees
      .map(emp => {
        const contrib = currentMonthContributions.find(c => c.employeeId === emp.id);
        const amount = Number(contrib?.amount) || 0;
        return { emp, contrib, amount };
      })
      .filter(({ contrib, amount, emp }) => {
        if (!contrib || amount <= 0) return false;
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
          emp.code.toLowerCase().includes(q) ||
          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
          (emp.department || '').toLowerCase().includes(q)
        );
      });
  }, [employees, currentMonthContributions, searchQuery]);

  const paginatedMonthlyContributors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return monthlyContributors.slice(start, start + pageSize);
  }, [monthlyContributors, currentPage, pageSize]);

  // Active Cumulative Savings Ledgers (only staff who have contributed or hold a balance)
  const activeLedgers = useMemo(() => {
    return employeeSummaries.filter(s => {
      if (s.totalContributed <= 0 && s.currentBalance <= 0) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        s.employeeCode.toLowerCase().includes(q) ||
        s.fullName.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
      );
    });
  }, [employeeSummaries, searchQuery]);

  const paginatedLedgers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeLedgers.slice(start, start + pageSize);
  }, [activeLedgers, currentPage, pageSize]);

  // Filtered & Paginated Payouts
  const filteredPayouts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return payouts;
    return payouts.filter(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : '';
      return (
        name.includes(q) ||
        p.reason.toLowerCase().includes(q) ||
        (p.referenceNo || '').toLowerCase().includes(q)
      );
    });
  }, [payouts, employees, searchQuery]);

  const paginatedPayouts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayouts.slice(start, start + pageSize);
  }, [filteredPayouts, currentPage, pageSize]);

  // Stat metrics
  const totalMonthCollection = useMemo(() => {
    return currentMonthContributions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  }, [currentMonthContributions]);

  const activeContributorsCount = useMemo(() => {
    return currentMonthContributions.filter(c => Number(c.amount) > 0).length;
  }, [currentMonthContributions]);

  const totalAllTimeDisbursed = useMemo(() => {
    return payouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payouts]);

  const totalPoolBalance = useMemo(() => {
    const totalContributedAllTime = contributions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    return totalContributedAllTime - totalAllTimeDisbursed;
  }, [contributions, totalAllTimeDisbursed]);

  // Bulk Modal state
  const [bulkRows, setBulkRows] = useState<Array<{
    employeeId: string;
    employeeCode: string;
    fullName: string;
    department: string;
    monthlyGross: number;
    takeHomePay: number;
    isSelected: boolean;
    amount: number;
  }>>([]);
  const [bulkScheme, setBulkScheme] = useState(effectiveSchemes[0]?.name || 'Staff Welfare Fund');
  const [batchMode, setBatchMode] = useState<'fixed' | 'percent_take_home'>('fixed');
  const [batchValue, setBatchValue] = useState<number>(5000);

  const openBulkModal = () => {
    const initial = employees.map(emp => {
      const existing = currentMonthContributions.find(
        c => c.employeeId === emp.id && c.schemeName === bulkScheme
      );
      const gross = Number(emp.monthlyGross) || 0;
      const takeHome = getEmployeeTakeHome(emp.id, gross);
      return {
        employeeId: emp.id,
        employeeCode: emp.code,
        fullName: `${emp.firstName} ${emp.lastName}`.trim(),
        department: emp.department || 'GENERAL',
        monthlyGross: gross,
        takeHomePay: takeHome,
        isSelected: existing ? Number(existing.amount) > 0 : true,
        amount: existing ? Number(existing.amount) : 5000,
      };
    });
    setBulkRows(initial);
    setIsBulkModalOpen(true);
  };

  const handleApplyBatchToChecked = () => {
    setBulkRows(prev => prev.map(row => {
      if (!row.isSelected) return row;
      let calculated = batchValue;
      if (batchMode === 'percent_take_home') {
        calculated = Math.round((row.takeHomePay * (batchValue / 100)) * 100) / 100;
      }
      return {
        ...row,
        amount: Math.max(0, calculated),
      };
    }));
  };

  const handleSaveBulk = () => {
    const toSave: EmployeeContribution[] = bulkRows
      .filter(r => r.isSelected && r.amount > 0)
      .map(r => ({
        id: `contrib_${r.employeeId}_${currentPeriodKey}`,
        employeeId: r.employeeId,
        periodKey: currentPeriodKey,
        schemeName: bulkScheme,
        amount: r.amount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

    // If any staff were unchecked or set to 0, remove their prior contribution for this month & scheme
    const unselectedOrZero = new Set(bulkRows.filter(r => !r.isSelected || r.amount <= 0).map(r => r.employeeId));
    currentMonthContributions.forEach(c => {
      if (unselectedOrZero.has(c.employeeId) && c.schemeName === bulkScheme) {
        onDeleteContribution(c.id);
      }
    });

    onSaveBatchContributions(toSave);
    setIsBulkModalOpen(false);
  };

  // Open single edit modal
  const handleOpenEditSingle = (emp: Employee, existing?: EmployeeContribution) => {
    setEditingSingleEmp({ emp, existing });
    setSingleAmount(existing ? Number(existing.amount) : 5000);
    setSingleScheme(existing?.schemeName || effectiveSchemes[0]?.name || 'Staff Welfare Fund');
  };

  const handleSaveSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSingleEmp) return;
    if (singleAmount <= 0) {
      if (editingSingleEmp.existing) {
        onDeleteContribution(editingSingleEmp.existing.id);
      }
      setEditingSingleEmp(null);
      return;
    }
    const toSave: EmployeeContribution[] = [{
      id: editingSingleEmp.existing?.id || `contrib_${editingSingleEmp.emp.id}_${currentPeriodKey}`,
      employeeId: editingSingleEmp.emp.id,
      periodKey: currentPeriodKey,
      schemeName: singleScheme,
      amount: singleAmount,
      createdAt: editingSingleEmp.existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];
    onSaveBatchContributions(toSave);
    setEditingSingleEmp(null);
  };

  // Payout Form state
  const [payoutEmpId, setPayoutEmpId] = useState<string>('');
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutDate, setPayoutDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payoutReason, setPayoutReason] = useState<ContributionPayout['reason']>('annual_payout');
  const [payoutMethod, setPayoutMethod] = useState<ContributionPayout['paymentMethod']>('bank_transfer');
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');

  const selectedPayoutEmpSummary = useMemo(() => {
    return employeeSummaries.find(s => s.employeeId === payoutEmpId);
  }, [employeeSummaries, payoutEmpId]);

  const handleSavePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutEmpId) {
      alert('Please select an employee.');
      return;
    }
    if (payoutAmount <= 0) {
      alert('Please enter a valid payout amount greater than zero.');
      return;
    }
    if (selectedPayoutEmpSummary && payoutAmount > selectedPayoutEmpSummary.currentBalance) {
      if (!confirm(`Warning: Payout amount (${formatNaira(payoutAmount)}) exceeds employee's current savings balance (${formatNaira(selectedPayoutEmpSummary.currentBalance)}). Proceed anyway?`)) {
        return;
      }
    }

    onAddPayout({
      employeeId: payoutEmpId,
      schemeName: selectedPayoutEmpSummary?.schemeName || 'Staff Welfare Fund',
      amount: payoutAmount,
      payoutDate,
      reason: payoutReason,
      paymentMethod: payoutMethod,
      referenceNo: payoutRef.trim(),
      notes: payoutNotes.trim(),
    });

    setIsPayoutModalOpen(false);
    setPayoutEmpId('');
    setPayoutAmount(0);
    setPayoutRef('');
    setPayoutNotes('');
  };

  return (
    <div className="space-y-4">
      {/* ── Mobile View: Compact Sticky Top Bar (Playbook from Mobile Staff Directory) ── */}
      <div className="sm:hidden sticky -top-3.5 z-30 pt-1 pb-1 bg-[#fbfbfb] dark:bg-[#09090b]">
        <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-1.5 truncate">
                <PiggyBank className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
                <span>Staff Contributions</span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5 truncate">
                {formatNaira(totalMonthCollection)} &bull; {activeContributorsCount} contributed
              </p>
            </div>

            {/* Month & Year Picker Pill */}
            <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-xl text-xs shrink-0">
              <select
                value={selectedMonth}
                onChange={(e) => onPeriodChange(e.target.value, selectedYear)}
                className="bg-transparent font-medium text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
              >
                {MONTHS.map(m => (
                  <option key={m.key} value={m.key} className="dark:bg-zinc-900">
                    {m.label.slice(0, 3)}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => onPeriodChange(selectedMonth, parseInt(e.target.value, 10))}
                className="bg-transparent font-medium text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
              >
                {availableYears.map(y => (
                  <option key={y} value={y} className="dark:bg-zinc-900">{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Quick Action Buttons */}
          {isPeriodLocked ? (
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Payroll Finalized (Locked)</span>
            </div>
          ) : !isWriteDisabled && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={openBulkModal}
                className="h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-98 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bulk Log</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayoutEmpId('');
                  setPayoutAmount(0);
                  setIsPayoutModalOpen(true);
                }}
                className="h-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Log Payout</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Top Header */}
      <div className="hidden sm:flex pt-3 pb-3 justify-between items-center gap-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <span>Staff Contributions & Welfare</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Voluntary staff welfare dues, cooperative savings, net deductions, and remittances.
          </p>
        </div>

        {/* Period & Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-1 rounded-md text-xs">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={selectedMonth}
              onChange={(e) => onPeriodChange(e.target.value, selectedYear)}
              className="bg-transparent font-medium text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              {MONTHS.map(m => (
                <option key={m.key} value={m.key} className="dark:bg-zinc-900">
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => onPeriodChange(selectedMonth, parseInt(e.target.value, 10))}
              className="bg-transparent font-medium text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              {availableYears.map(y => (
                <option key={y} value={y} className="dark:bg-zinc-900">
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
            <>
              <button
                onClick={openBulkModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bulk Log Month</span>
              </button>
              <button
                onClick={() => {
                  setPayoutEmpId('');
                  setPayoutAmount(0);
                  setIsPayoutModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Log Payout</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Minimalist Stat Cards (Desktop Only - Hidden on Mobile to prevent clutter) */}
      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <span>Deducted ({monthLabel})</span>
            <DollarSign className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {formatNaira(totalMonthCollection)}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <span>Participation</span>
            <Users className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {employees.length > 0 ? `${Math.round((activeContributorsCount / employees.length) * 100)}%` : '0%'}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <span>Total Paid Out</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatNaira(totalAllTimeDisbursed)}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            <span>Pool Balance</span>
            <PiggyBank className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {formatNaira(totalPoolBalance)}
          </div>
        </div>
      </div>

      {/* Mobile Segmented Switcher (Thumb-Friendly 40px) */}
      <div className="sm:hidden grid grid-cols-3 gap-1 bg-zinc-200/70 dark:bg-zinc-800/80 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('monthly')}
          className={`h-9 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'monthly'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <span>Deductions</span>
          <span className="text-[10px] font-mono px-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {monthlyContributors.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`h-9 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'ledger'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <span>Ledgers</span>
          <span className="text-[10px] font-mono px-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {activeLedgers.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payouts')}
          className={`h-9 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'payouts'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <span>Payouts</span>
          <span className="text-[10px] font-mono px-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            {filteredPayouts.length}
          </span>
        </button>
      </div>

      {/* Desktop Tabs & Search Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        {/* Navigation Tabs (Desktop) */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'monthly'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Monthly Deductions ({monthlyContributors.length})
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Staff Savings Ledgers ({activeLedgers.length})
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'payouts'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Disbursements & Payouts ({filteredPayouts.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name, code, dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:border-zinc-400"
          />
        </div>
      </div>

      {/* TAB 1: MONTHLY DEDUCTIONS */}
      {activeTab === 'monthly' && (
        <div>
          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Code</th>
                    <th className="px-3 py-2.5">Staff Name</th>
                    <th className="px-3 py-2.5">Department</th>
                    <th className="px-3 py-2.5">Monthly Gross</th>
                    <th className="px-3 py-2.5">Scheme</th>
                    <th className="px-3 py-2.5 text-right">Contribution (Net Deduction)</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    {!isWriteDisabled && <th className="px-3 py-2.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-normal">
                  {monthlyContributors.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-10 text-center text-zinc-400">
                        <PiggyBank className="w-6 h-6 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                        <p className="text-xs font-medium">No active contributions logged for {monthLabel} {selectedYear}.</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Click "Bulk Log Month" to record contributions for participating staff.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedMonthlyContributors.map(({ emp, contrib, amount }) => {
                      const summary = employeeSummaries.find(s => s.employeeId === emp.id);
                      const rowMenuId = `monthly_${emp.id}`;

                      return (
                        <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-3 py-2 font-mono text-zinc-500">{emp.code}</td>
                          <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                            {emp.firstName} {emp.lastName}
                          </td>
                          <td className="px-3 py-2 text-zinc-500">{emp.department}</td>
                          <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-300">
                            {formatNaira(emp.monthlyGross)}
                          </td>
                          <td className="px-3 py-2 text-zinc-500">
                            {contrib?.schemeName || 'Staff Welfare Fund'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                            {formatNaira(amount)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Active
                            </span>
                          </td>

                          {/* Standard 3-Dot Actions Menu */}
                          {!isWriteDisabled && (
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <div className="relative inline-block text-left contrib-action-menu">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activeMenuId === rowMenuId) {
                                      setActiveMenuId(null);
                                      setMenuCoords(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const spaceBelow = window.innerHeight - rect.bottom;
                                      const spaceAbove = rect.top;
                                      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
                                      setMenuCoords({
                                        top: openUp ? undefined : rect.bottom + 4,
                                        bottom: openUp ? Math.max(10, window.innerHeight - rect.top + 4) : undefined,
                                        right: Math.max(10, window.innerWidth - rect.right),
                                      });
                                      setActiveMenuId(rowMenuId);
                                    }
                                  }}
                                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                    activeMenuId === rowMenuId
                                      ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                                      : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                  }`}
                                  title="Actions"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {activeMenuId === rowMenuId && menuCoords && (
                                  <div
                                    style={{ 
                                      top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
                                      bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
                                      right: `${menuCoords.right}px` 
                                    }}
                                    className="fixed w-48 bg-white dark:bg-[#18181d] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 text-xs z-[9999] animate-in fade-in text-left contrib-action-dropdown"
                                  >
                                    {/* 1. Edit Amount */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        handleOpenEditSingle(emp, contrib);
                                      }}
                                      className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                      <span>Edit Amount</span>
                                    </button>

                                    {/* 2. View Ledger Statement */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        setSelectedLedgerEmpId(emp.id);
                                      }}
                                      className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                      <span>Savings Statement</span>
                                    </button>

                                    {/* 3. Disburse Payout */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        setPayoutEmpId(emp.id);
                                        setPayoutAmount(summary?.currentBalance || 0);
                                        setIsPayoutModalOpen(true);
                                      }}
                                      className="w-full px-3 py-1.5 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                                      <span>Log Payout</span>
                                    </button>

                                    {/* 4. Opt Out / Remove */}
                                    {contrib && amount > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          setMenuCoords(null);
                                          if (confirm(`Remove ${formatNaira(amount)} contribution deduction for ${emp.firstName} ${emp.lastName} in ${monthLabel}?`)) {
                                            onDeleteContribution(contrib.id);
                                          }
                                        }}
                                        className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer border-t border-zinc-100 dark:border-zinc-800 mt-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>Opt Out ({monthLabel})</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Stack (Clean, Thumb-Friendly, No Horizontal Scroll) */}
          <div className="sm:hidden space-y-2.5">
            {monthlyContributors.length === 0 ? (
              <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 text-center shadow-xs">
                <PiggyBank className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No active contributions logged</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Tap "Bulk Log" above to record contributions for {monthLabel} {selectedYear}.</p>
              </div>
            ) : (
              paginatedMonthlyContributors.map(({ emp, contrib, amount }) => {
                const initials = `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`.toUpperCase() || 'E';
                const summary = employeeSummaries.find(s => s.employeeId === emp.id);

                return (
                  <div
                    key={emp.id}
                    className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 shadow-xs"
                  >
                    {/* Top Identity Row */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/80 shrink-0 mt-0.5">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug break-words">
                            {emp.firstName} {emp.lastName}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 break-words">
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">{emp.department || 'General'}</span> &bull; {contrib?.schemeName || 'Staff Welfare'}
                          </p>
                        </div>
                      </div>

                      {/* Active Status Badge */}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>

                    {/* Middle Financial Info Strip */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-semibold">
                          {emp.code}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Gross: {formatNaira(emp.monthlyGross)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 uppercase font-medium mr-1.5">Contribution</span>
                        <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {formatNaira(amount)}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar (Thumb-Friendly Buttons) */}
                    {!isWriteDisabled && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedLedgerEmpId(emp.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3 text-zinc-400" />
                          <span>Statement</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditSingle(emp, contrib)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3 text-zinc-400" />
                          <span>Edit</span>
                        </button>
                        {contrib && amount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${formatNaira(amount)} contribution deduction for ${emp.firstName} ${emp.lastName} in ${monthLabel}?`)) {
                                onDeleteContribution(contrib.id);
                              }
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Opt Out</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {monthlyContributors.length > pageSize && (
            <div className="mt-3">
              <TablePagination
                currentPage={currentPage}
                totalItems={monthlyContributors.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STAFF SAVINGS LEDGERS */}
      {activeTab === 'ledger' && (
        <div>
          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Code</th>
                    <th className="px-3 py-2.5">Staff Name</th>
                    <th className="px-3 py-2.5">Department</th>
                    <th className="px-3 py-2.5 text-right">Total Contributed</th>
                    <th className="px-3 py-2.5 text-right">Total Disbursed</th>
                    <th className="px-3 py-2.5 text-right">Current Balance Held</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-normal">
                  {activeLedgers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-10 text-center text-zinc-400">
                        <PiggyBank className="w-6 h-6 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                        <p className="text-xs font-medium">No staff savings ledgers recorded yet.</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Participating staff will appear here automatically once their contributions are logged.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedLedgers.map(summary => {
                      const ledgerMenuId = `ledger_${summary.employeeId}`;
                      return (
                        <tr key={summary.employeeId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-3 py-2 font-mono text-zinc-500">{summary.employeeCode}</td>
                          <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                            {summary.fullName}
                          </td>
                          <td className="px-3 py-2 text-zinc-500">{summary.department}</td>
                          <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                            {formatNaira(summary.totalContributed)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {summary.totalDisbursed > 0 ? `-${formatNaira(summary.totalDisbursed)}` : '₦0.00'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {formatNaira(summary.currentBalance)}
                          </td>

                          {/* 3-Dot Actions Menu */}
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <div className="relative inline-block text-left contrib-action-menu">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeMenuId === ledgerMenuId) {
                                    setActiveMenuId(null);
                                    setMenuCoords(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const spaceAbove = rect.top;
                                    const openUp = spaceBelow < 120 && spaceAbove > spaceBelow;
                                    setMenuCoords({
                                      top: openUp ? undefined : rect.bottom + 4,
                                      bottom: openUp ? Math.max(10, window.innerHeight - rect.top + 4) : undefined,
                                      right: Math.max(10, window.innerWidth - rect.right),
                                    });
                                    setActiveMenuId(ledgerMenuId);
                                  }
                                }}
                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                  activeMenuId === ledgerMenuId
                                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                                title="Actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuId === ledgerMenuId && menuCoords && (
                                <div
                                  style={{ 
                                    top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
                                    bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
                                    right: `${menuCoords.right}px` 
                                  }}
                                  className="fixed w-44 bg-white dark:bg-[#18181d] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 text-xs z-[9999] animate-in fade-in text-left contrib-action-dropdown"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setMenuCoords(null);
                                      setSelectedLedgerEmpId(summary.employeeId);
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                    <span>View Statement</span>
                                  </button>

                                  {!isWriteDisabled && summary.currentBalance > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        setPayoutEmpId(summary.employeeId);
                                        setPayoutAmount(summary.currentBalance);
                                        setIsPayoutModalOpen(true);
                                      }}
                                      className="w-full px-3 py-1.5 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                                      <span>Disburse Payout</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Stack */}
          <div className="sm:hidden space-y-2.5">
            {activeLedgers.length === 0 ? (
              <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 text-center shadow-xs">
                <PiggyBank className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No staff savings ledgers yet</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Staff savings and pool balances will appear here as contributions accumulate.</p>
              </div>
            ) : (
              paginatedLedgers.map(summary => {
                const initials = summary.fullName
                  .split(' ')
                  .map(n => n.charAt(0))
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'S';

                return (
                  <div
                    key={summary.employeeId}
                    className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 shadow-xs"
                  >
                    {/* Identity */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-950/60 dark:to-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-200/80 dark:border-indigo-800/80 shrink-0 mt-0.5">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug break-words">
                            {summary.fullName}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-semibold mr-1.5">
                              {summary.employeeCode}
                            </span>
                            {summary.department || 'General'}
                          </p>
                        </div>
                      </div>

                      {/* Current Balance Tag */}
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-semibold block">Balance Held</span>
                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {formatNaira(summary.currentBalance)}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Strip */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Total Contributed</span>
                        <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300">
                          {formatNaira(summary.totalContributed)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block">Total Disbursed</span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {summary.totalDisbursed > 0 ? `-${formatNaira(summary.totalDisbursed)}` : '₦0.00'}
                        </span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedLedgerEmpId(summary.employeeId)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3 text-zinc-400" />
                        <span>View Statement</span>
                      </button>
                      {!isWriteDisabled && summary.currentBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayoutEmpId(summary.employeeId);
                            setPayoutAmount(summary.currentBalance);
                            setIsPayoutModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Disburse Payout</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {activeLedgers.length > pageSize && (
            <div className="mt-3">
              <TablePagination
                currentPage={currentPage}
                totalItems={activeLedgers.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DISBURSEMENT / PAYOUTS HISTORY */}
      {activeTab === 'payouts' && (
        <div>
          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Staff Name</th>
                    <th className="px-3 py-2.5">Reason</th>
                    <th className="px-3 py-2.5">Payment Method</th>
                    <th className="px-3 py-2.5">Reference No</th>
                    <th className="px-3 py-2.5 text-right">Amount Paid</th>
                    {!isWriteDisabled && <th className="px-3 py-2.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-normal">
                  {filteredPayouts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-zinc-400">
                        No payouts recorded yet. Click "Log Payout" to record savings disbursements back to staff.
                      </td>
                    </tr>
                  ) : (
                    paginatedPayouts.map(payout => {
                      const emp = employees.find(e => e.id === payout.employeeId);
                      const payoutMenuId = `payout_${payout.id}`;
                      return (
                        <tr key={payout.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="px-3 py-2 font-mono text-zinc-500">{formatDate(payout.payoutDate)}</td>
                          <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                            {emp ? `${emp.firstName} ${emp.lastName}` : 'Former Staff'}
                          </td>
                          <td className="px-3 py-2 capitalize text-zinc-600 dark:text-zinc-300">
                            {payout.reason.replace('_', ' ')}
                          </td>
                          <td className="px-3 py-2 capitalize text-zinc-500">
                            {payout.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="px-3 py-2 font-mono text-zinc-500 text-[11px]">
                            {payout.referenceNo || '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatNaira(payout.amount)}
                          </td>

                          {/* 3-Dot Actions Menu */}
                          {!isWriteDisabled && (
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <div className="relative inline-block text-left contrib-action-menu">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (activeMenuId === payoutMenuId) {
                                      setActiveMenuId(null);
                                      setMenuCoords(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const spaceBelow = window.innerHeight - rect.bottom;
                                      const spaceAbove = rect.top;
                                      const openUp = spaceBelow < 120 && spaceAbove > spaceBelow;
                                      setMenuCoords({
                                        top: openUp ? undefined : rect.bottom + 4,
                                        bottom: openUp ? Math.max(10, window.innerHeight - rect.top + 4) : undefined,
                                        right: Math.max(10, window.innerWidth - rect.right),
                                      });
                                      setActiveMenuId(payoutMenuId);
                                    }
                                  }}
                                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                    activeMenuId === payoutMenuId
                                      ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                                      : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                  }`}
                                  title="Actions"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {activeMenuId === payoutMenuId && menuCoords && (
                                  <div
                                    style={{ 
                                      top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
                                      bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
                                      right: `${menuCoords.right}px` 
                                    }}
                                    className="fixed w-40 bg-white dark:bg-[#18181d] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 text-xs z-[9999] animate-in fade-in text-left contrib-action-dropdown"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setMenuCoords(null);
                                        if (confirm('Are you sure you want to delete this payout record?')) {
                                          onDeletePayout(payout.id);
                                        }
                                      }}
                                      className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                      <span>Delete Payout</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Stack */}
          <div className="sm:hidden space-y-2.5">
            {filteredPayouts.length === 0 ? (
              <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 text-center shadow-xs">
                <ArrowUpRight className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">No payouts recorded</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Tap "Log Payout" above to record savings remittances back to staff.</p>
              </div>
            ) : (
              paginatedPayouts.map(payout => {
                const emp = employees.find(e => e.id === payout.employeeId);
                const initials = emp ? `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`.toUpperCase() : 'PS';

                return (
                  <div
                    key={payout.id}
                    className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-950/60 dark:to-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-200/80 dark:border-emerald-800/80 shrink-0 mt-0.5">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug break-words">
                            {emp ? `${emp.firstName} ${emp.lastName}` : 'Former Staff'}
                          </h4>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 capitalize">
                            {payout.reason.replace('_', ' ')} &bull; {payout.paymentMethod.replace('_', ' ')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {formatNaira(payout.amount)}
                        </span>
                        <span className="text-[10px] text-zinc-400 block font-mono">
                          {formatDate(payout.payoutDate)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-mono">
                        <span>Ref: {payout.referenceNo || '—'}</span>
                      </div>
                      {!isWriteDisabled && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this payout record?')) {
                              onDeletePayout(payout.id);
                            }
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {filteredPayouts.length > pageSize && (
            <div className="mt-3">
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredPayouts.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </div>
      )}

      {/* SINGLE EMPLOYEE EDIT CONTRIBUTION MODAL */}
      {editingSingleEmp && (
        <div 
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setEditingSingleEmp(null)}
        >
          <div 
            className="bg-white dark:bg-[#121215] border-t sm:border border-zinc-200/90 dark:border-zinc-800/90 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      Edit Staff Contribution
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                      {editingSingleEmp.emp.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {editingSingleEmp.emp.firstName} {editingSingleEmp.emp.lastName} &bull; {monthLabel} {selectedYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSingleEmp(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition shrink-0 ml-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSingle} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  Scheme / Purpose
                </label>
                <select
                  value={singleScheme}
                  onChange={(e) => setSingleScheme(e.target.value)}
                  className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
                >
                  {effectiveSchemes.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                {(() => {
                  const gross = Number(editingSingleEmp.emp.monthlyGross) || 0;
                  const takeHome = getEmployeeTakeHome(editingSingleEmp.emp.id, gross);
                  return (
                    <>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                          Monthly Net Deduction Amount (₦)
                        </label>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          Take-Home: <strong className="text-emerald-600 dark:text-emerald-400">{formatNaira(takeHome)}</strong>
                        </span>
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs text-zinc-400 font-mono">₦</span>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={singleAmount}
                          onChange={(e) => setSingleAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full pl-7 pr-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Voluntary contributions are deducted directly from the employee's take-home pay.
                      </p>

                      {/* Quick Presets: Fixed Lump Sum & % of Take-Home Pay */}
                      <div className="space-y-2 pt-2.5">
                        <div>
                          <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                            Fixed Lump Sum:
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[2000, 5000, 10000, 20000].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setSingleAmount(val)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                                  singleAmount === val
                                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                }`}
                              >
                                ₦{val.toLocaleString()}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                            % of Take-Home Pay:
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[2, 3, 5, 10].map(pct => {
                              const amt = Math.round(takeHome * (pct / 100));
                              return (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setSingleAmount(amt)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-colors cursor-pointer ${
                                    singleAmount === amt
                                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs'
                                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                  }`}
                                  title={`${pct}% of ${formatNaira(takeHome)} = ${formatNaira(amt)}`}
                                >
                                  {pct}% ({formatNaira(amt)})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setEditingSingleEmp(null)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 active:scale-95 transition shadow-sm cursor-pointer"
                >
                  Save Deduction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK DEDUCTIONS MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121215] border-t sm:border border-zinc-200/90 dark:border-zinc-800/90 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            {/* Mobile Drag Handle */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <PiggyBank className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      Bulk Contributions
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                      {monthLabel} {selectedYear}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    Set global deduction rate or customize amounts deducted from take-home pay
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Batch Toolbar */}
            <div className="px-4 py-2.5 bg-zinc-50/70 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider shrink-0">Scheme:</span>
                <select
                  value={bulkScheme}
                  onChange={(e) => setBulkScheme(e.target.value)}
                  className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-100 shadow-2xs focus:outline-none focus:ring-1 focus:ring-zinc-400 max-w-[180px] sm:max-w-none truncate"
                >
                  {effectiveSchemes.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider hidden sm:inline shrink-0">Quick Apply:</span>
                <select
                  value={batchMode}
                  onChange={(e: any) => {
                    const mode = e.target.value as 'fixed' | 'percent_take_home';
                    setBatchMode(mode);
                    if (mode === 'percent_take_home' && batchValue > 100) {
                      setBatchValue(5);
                    } else if (mode === 'fixed' && batchValue <= 100) {
                      setBatchValue(5000);
                    }
                  }}
                  className="bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/90 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-400 shrink-0"
                >
                  <option value="fixed">Fixed Lump Sum (₦)</option>
                  <option value="percent_take_home">% of Take-Home Pay</option>
                </select>

                <div className="relative flex items-center shrink-0">
                  <span className="absolute left-2.5 text-xs text-zinc-400 font-mono">
                    {batchMode === 'fixed' ? '₦' : '%'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={batchValue}
                    onChange={(e) => setBatchValue(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder={batchMode === 'fixed' ? '5000' : '5'}
                    className="w-24 pl-6 pr-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/90 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 shadow-2xs focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleApplyBatchToChecked}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold hover:opacity-90 active:scale-95 transition cursor-pointer shadow-2xs shrink-0"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden sm:block flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
                <thead className="bg-zinc-50 dark:bg-zinc-900/80 text-[10px] uppercase tracking-wider text-zinc-400 font-semibold sticky top-0 border-b border-zinc-100 dark:border-zinc-800 z-10">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={bulkRows.length > 0 && bulkRows.every(r => r.isSelected)}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setBulkRows(prev => prev.map(r => ({ ...r, isSelected: val })));
                        }}
                        className="rounded cursor-pointer text-zinc-900 focus:ring-0"
                      />
                    </th>
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-right">Take-Home Pay</th>
                    <th className="py-2.5 px-3 text-right w-36">Deduction (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {bulkRows.map(row => {
                    const initials = row.fullName.split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase() || 'E';
                    return (
                      <tr
                        key={row.employeeId}
                        className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors ${!row.isSelected ? 'opacity-40' : ''}`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.isSelected}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setBulkRows(prev => prev.map(r => r.employeeId === row.employeeId ? { ...r, isSelected: val } : r));
                            }}
                            className="rounded cursor-pointer text-zinc-900 focus:ring-0"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block truncate">
                                {row.fullName}
                              </span>
                              <span className="font-mono text-[10px] text-zinc-400">
                                {row.employeeCode}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-500 text-[11px]">{row.department}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          {formatNaira(row.takeHomePay)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="relative inline-flex items-center">
                            <span className="absolute left-2.5 text-xs text-zinc-400 font-mono">₦</span>
                            <input
                              type="number"
                              min="0"
                              disabled={!row.isSelected}
                              value={row.amount}
                              onChange={(e) => {
                                const val = Math.max(0, parseFloat(e.target.value) || 0);
                                setBulkRows(prev => prev.map(r => r.employeeId === row.employeeId ? { ...r, amount: val } : r));
                              }}
                              className={`w-28 pl-6 pr-2.5 py-1 text-right bg-white dark:bg-zinc-900 border ${
                                row.monthlyGross > 0 && row.amount > (row.monthlyGross / 3)
                                  ? 'border-amber-400 dark:border-amber-500 focus:ring-amber-400'
                                  : 'border-zinc-200 dark:border-zinc-700 focus:ring-zinc-400'
                              } rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 shadow-2xs`}
                            />
                          </div>
                          {row.monthlyGross > 0 && row.amount > (row.monthlyGross / 3) && (
                            <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-0.5" title="Section 5 Labour Act Advisory: voluntary deductions should not exceed 1/3 of monthly wages">
                              &gt; 1/3 cap
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARD STACK VIEW (No horizontal clipping) */}
            <div className="sm:hidden flex-1 overflow-y-auto p-3 space-y-2.5">
              <div className="flex items-center justify-between pb-1 px-1 text-xs">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Staff ({bulkRows.filter(r => r.isSelected).length}/{bulkRows.length} Selected)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = bulkRows.length > 0 && bulkRows.every(r => r.isSelected);
                    setBulkRows(prev => prev.map(r => ({ ...r, isSelected: !allSelected })));
                  }}
                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {bulkRows.length > 0 && bulkRows.every(r => r.isSelected) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {bulkRows.map(row => {
                const initials = row.fullName.split(' ').map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase() || 'E';
                return (
                  <div
                    key={row.employeeId}
                    className={`p-3 rounded-2xl border transition-all ${
                      row.isSelected
                        ? 'bg-white dark:bg-zinc-900/90 border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs'
                        : 'bg-zinc-50/60 dark:bg-zinc-900/30 border-zinc-200/40 dark:border-zinc-800/40 opacity-45'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={row.isSelected}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setBulkRows(prev => prev.map(r => r.employeeId === row.employeeId ? { ...r, isSelected: val } : r));
                        }}
                        className="mt-1 w-4 h-4 rounded text-zinc-900 focus:ring-0 cursor-pointer"
                      />
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {row.fullName}
                          </h4>
                          <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                            {row.employeeCode}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {row.department}
                        </p>

                        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-medium">Take-Home</span>
                            <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatNaira(row.takeHomePay)}
                            </span>
                          </div>

                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Deduct:</span>
                              <div className="relative flex items-center">
                                <span className="absolute left-2 text-[11px] text-zinc-400 font-mono">₦</span>
                                <input
                                  type="number"
                                  min="0"
                                  disabled={!row.isSelected}
                                  value={row.amount}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                                    setBulkRows(prev => prev.map(r => r.employeeId === row.employeeId ? { ...r, amount: val } : r));
                                  }}
                                  className={`w-24 pl-5 pr-2 py-1 text-right bg-zinc-50 dark:bg-zinc-800/80 border ${
                                    row.monthlyGross > 0 && row.amount > (row.monthlyGross / 3)
                                      ? 'border-amber-400 dark:border-amber-500'
                                      : 'border-zinc-200 dark:border-zinc-700'
                                  } rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-zinc-400`}
                                />
                              </div>
                            </div>
                            {row.monthlyGross > 0 && row.amount > (row.monthlyGross / 3) && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-0.5" title="Section 5 Labour Act Advisory: voluntary deductions should not exceed 1/3 of monthly wages">
                                &gt; 1/3 cap
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60">
              <div className="text-xs">
                <div className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                  <span>{bulkRows.filter(r => r.isSelected).length} of {bulkRows.length} selected</span>
                </div>
                <div className="font-mono font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                  {formatNaira(bulkRows.filter(r => r.isSelected).reduce((sum, r) => sum + r.amount, 0))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBulk}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 active:scale-95 transition shadow-sm"
                >
                  Save Deductions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYOUT MODAL */}
      {isPayoutModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsPayoutModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-[#121215] border-t sm:border border-zinc-200/90 dark:border-zinc-800/90 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      Log Savings Payout
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                      Disbursement
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    Record welfare or voluntary savings payout to staff
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition shrink-0 ml-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayout} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              {/* Employee Selection */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  Select Staff Member
                </label>
                <select
                  value={payoutEmpId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPayoutEmpId(id);
                    const s = employeeSummaries.find(x => x.employeeId === id);
                    if (s) {
                      setPayoutAmount(s.currentBalance > 0 ? s.currentBalance : 0);
                    }
                  }}
                  className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
                >
                  <option value="">-- Choose Employee --</option>
                  {employeeSummaries.map(s => (
                    <option key={s.employeeId} value={s.employeeId}>
                      {s.employeeCode} — {s.fullName} ({formatNaira(s.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Available Savings Balance Strip */}
              {selectedPayoutEmpSummary && (
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-emerald-900 dark:text-emerald-200 font-medium">Available Savings Balance</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    {formatNaira(selectedPayoutEmpSummary.currentBalance)}
                  </span>
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    Payout Amount (₦)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs text-zinc-400 font-mono">₦</span>
                    <input
                      type="number"
                      min="1"
                      step="100"
                      value={payoutAmount || ''}
                      onChange={(e) => setPayoutAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full pl-7 pr-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    Payout Date
                  </label>
                  <input
                    type="date"
                    value={payoutDate}
                    onChange={(e) => setPayoutDate(e.target.value)}
                    className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
                  />
                </div>
              </div>

              {/* Reason & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    Reason / Type
                  </label>
                  <select
                    value={payoutReason}
                    onChange={(e: any) => setPayoutReason(e.target.value)}
                    className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
                  >
                    <option value="annual_payout">Annual Savings Payout</option>
                    <option value="partial_withdrawal">Partial Withdrawal</option>
                    <option value="emergency_aid">Emergency Welfare Aid</option>
                    <option value="exit_refund">Exit / Terminal Refund</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e: any) => setPayoutMethod(e.target.value)}
                    className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  Reference No / Cheque No (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-94817281"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                  Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. December end of year welfare disbursement"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 active:scale-95 transition shadow-sm cursor-pointer"
                >
                  Record Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMPLOYEE CUMULATIVE STATEMENT MODAL */}
      {selectedLedgerEmpId && (
        <div 
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedLedgerEmpId(null)}
        >
          <div 
            className="bg-white dark:bg-[#121215] border-t sm:border border-zinc-200/90 dark:border-zinc-800/90 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {(() => {
              const emp = employees.find(e => e.id === selectedLedgerEmpId);
              const summary = employeeSummaries.find(s => s.employeeId === selectedLedgerEmpId);
              const empContribs = contributions
                .filter(c => c.employeeId === selectedLedgerEmpId)
                .map(c => {
                  let dateStr = '';
                  if (c.periodKey) {
                    const parts = c.periodKey.split('-');
                    const y = parseInt(parts[0], 10);
                    const m = parts[1] || 'jan';
                    const mIdx = MONTHS.findIndex(mo => mo.key === m);
                    dateStr = `${y}-${String((mIdx >= 0 ? mIdx : 0) + 1).padStart(2, '0')}-25`;
                  } else if (c.createdAt) {
                    dateStr = c.createdAt.split('T')[0];
                  } else {
                    dateStr = new Date().toISOString().split('T')[0];
                  }

                  return {
                    date: dateStr,
                    type: 'Monthly Deduction' as const,
                    scheme: c.schemeName,
                    inflow: Number(c.amount) || 0,
                    outflow: 0,
                    notes: `Period: ${c.periodKey}`,
                  };
                });
              const empPayouts = payouts
                .filter(p => p.employeeId === selectedLedgerEmpId)
                .map(p => ({
                  date: p.payoutDate,
                  type: 'Payout / Withdrawal' as const,
                  scheme: p.schemeName,
                  inflow: 0,
                  outflow: Number(p.amount) || 0,
                  notes: `${p.reason.replace('_', ' ')} (${p.paymentMethod.replace('_', ' ')})`,
                }));

              const allTransactions = [...empContribs, ...empPayouts].sort((a, b) => {
                const cmp = a.date.localeCompare(b.date);
                if (cmp !== 0) return cmp;
                return b.inflow - a.inflow; // Inflow (deductions) precede outflow on the same date
              });

              let running = 0;
              const rowsWithRunning = allTransactions.map(tx => {
                running += (tx.inflow - tx.outflow);
                return { ...tx, balance: running };
              });

              return (
                <>
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Staff Contribution & Savings Statement
                      </h2>
                      <p className="text-[11px] text-zinc-500">
                        {emp?.firstName} {emp?.lastName} ({emp?.code}) — {emp?.department}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => window.print()}
                        className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        title="Print Statement"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedLedgerEmpId(null)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
                    {/* Summary Card */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200 dark:border-zinc-800 text-center">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Total Saved</div>
                        <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm mt-0.5">
                          {formatNaira(summary?.totalContributed || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Total Paid Out</div>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                          {formatNaira(summary?.totalDisbursed || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Current Balance</div>
                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm mt-0.5">
                          {formatNaira(summary?.currentBalance || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Transactions Table */}
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-100 dark:bg-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Description</th>
                          <th className="p-2 text-right">Inflow (+)</th>
                          <th className="p-2 text-right">Outflow (-)</th>
                          <th className="p-2 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {rowsWithRunning.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-zinc-400">
                              No contribution or payout transactions recorded for this staff member yet.
                            </td>
                          </tr>
                        ) : (
                          rowsWithRunning.map((row, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                              <td className="p-2 font-mono text-zinc-500">{formatDate(row.date)}</td>
                              <td className="p-2">
                                <div className="font-medium text-zinc-800 dark:text-zinc-200">{row.type}</div>
                                <div className="text-[10px] text-zinc-400">{row.notes}</div>
                              </td>
                              <td className="p-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                                {row.inflow > 0 ? formatNaira(row.inflow) : '—'}
                              </td>
                              <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                {row.outflow > 0 ? formatNaira(row.outflow) : '—'}
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                {formatNaira(row.balance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-end">
                    <button
                      onClick={() => setSelectedLedgerEmpId(null)}
                      className="px-4 py-1.5 rounded text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
                    >
                      Close Statement
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
