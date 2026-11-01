import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  PauseCircle, 
  PlayCircle, 
  Trash2, 
  History, 
  X,
  CreditCard,
  Clock,
  MoreVertical,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3
} from 'lucide-react';
import { Employee, EmployeeLoan, LoanType, LoanStatus, CalculatedPayrollItem, CompanyProfile, TeamMember } from '../../types';
import { formatNaira, formatDate } from '../../engine/payePensionEngine';
import { TablePagination } from '../common/TablePagination';

interface LoansAdvancesViewProps {
  loans: EmployeeLoan[];
  employees: Employee[];
  payrollItems?: CalculatedPayrollItem[];
  company?: CompanyProfile;
  monthLabel: string;
  selectedMonth: string;
  selectedYear: number;
  onAddLoan: (loan: Omit<EmployeeLoan, 'id' | 'totalRepaid' | 'remainingBalance' | 'status' | 'createdAt' | 'history'>) => void;
  onUpdateLoan?: (id: string, updates: Partial<EmployeeLoan>) => void;
  onDeleteLoan: (id: string) => void;
  onPauseResumeLoan: (id: string) => void;
  onRecordManualPayment: (id: string, amount: number, notes?: string, reference?: string) => void;
  onApplyLoanDeduction?: (loanId: string, periodKey?: string) => void;
  onApplyAllLoanDeductions?: (periodKey?: string) => void;
  currentUser?: TeamMember | null;
  isReadOnly?: boolean;
}

export const LoansAdvancesView: React.FC<LoansAdvancesViewProps> = ({
  loans = [],
  employees = [],
  monthLabel,
  selectedMonth,
  selectedYear,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
  onPauseResumeLoan,
  onRecordManualPayment,
  onApplyLoanDeduction,
  onApplyAllLoanDeductions,
  currentUser,
  isReadOnly = false,
}) => {
  const isAuditor = currentUser?.role === 'Auditor';
  const isWriteDisabled = isAuditor || isReadOnly;
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | LoanType>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | LoanStatus>('All');

  // Stats visibility state
  const [showStats, setShowStats] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus]);

  // 3-dot dropdown menu state
  const [activeMenuLoanId, setActiveMenuLoanId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        activeMenuLoanId &&
        !(e.target as Element).closest('.loan-actions-menu') &&
        !(e.target as Element).closest('.loan-actions-dropdown')
      ) {
        setActiveMenuLoanId(null);
        setMenuCoords(null);
      }
    };

    const handleScrollOrResize = () => {
      if (activeMenuLoanId) {
        setActiveMenuLoanId(null);
        setMenuCoords(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeMenuLoanId]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLoanForLedger, setSelectedLoanForLedger] = useState<EmployeeLoan | null>(null);
  const [editingLoan, setEditingLoan] = useState<EmployeeLoan | null>(null);

  // Edit Loan Form State
  const [editPrincipal, setEditPrincipal] = useState<number | ''>('');
  const [editMonthlyDeduction, setEditMonthlyDeduction] = useState<number | ''>('');
  const [editRemainingBalance, setEditRemainingBalance] = useState<number | ''>('');
  const [editType, setEditType] = useState<LoanType>('Staff Loan');
  const [editStatus, setEditStatus] = useState<LoanStatus>('Active');
  const [editDisbursementDate, setEditDisbursementDate] = useState<string>('');
  const [editRepaymentDate, setEditRepaymentDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  useEffect(() => {
    if (editingLoan) {
      setEditPrincipal(editingLoan.principalAmount);
      setEditMonthlyDeduction(editingLoan.monthlyDeduction);
      setEditRemainingBalance(editingLoan.remainingBalance);
      setEditType(editingLoan.type);
      setEditStatus(editingLoan.status);
      setEditDisbursementDate(editingLoan.disbursementDate || '');
      setEditRepaymentDate(editingLoan.repaymentDate || editingLoan.repaymentStartDate || '');
      setEditNotes(editingLoan.notes || '');
    }
  }, [editingLoan]);

  // Helper for computing end of month (YYYY-MM-DD)
  const getEndOfMonth = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 2) return '';
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(y) || isNaN(m)) return '';
    const lastDay = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, '0');
    const dd = String(lastDay).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const getDefaultDatesForPeriod = (year: number, monthKey: string) => {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mIdx = months.indexOf(monthKey?.toLowerCase());
    const mNum = mIdx >= 0 ? mIdx + 1 : 1;
    const mm = String(mNum).padStart(2, '0');
    const lastDay = new Date(year, mNum, 0).getDate();
    const dd = String(lastDay).padStart(2, '0');
    return {
      disbursed: `${year}-${mm}-01`,
      repayment: `${year}-${mm}-${dd}`,
    };
  };

  const getPeriodKeyFromDate = (dateStr: string, fallbackYear: number, fallbackMonth: string) => {
    if (!dateStr) return `${fallbackYear}-${fallbackMonth}`;
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      if (!isNaN(y) && m >= 1 && m <= 12) {
        return `${y}-${months[m - 1]}`;
      }
    }
    return `${fallbackYear}-${fallbackMonth}`;
  };

  // New Loan Form State
  const [newEmployeeId, setNewEmployeeId] = useState(employees[0]?.id || '');
  const [newLoanType, setNewLoanType] = useState<LoanType>('Staff Loan');
  const [newPrincipal, setNewPrincipal] = useState<number | ''>(100000);
  const [newMonthlyDeduction, setNewMonthlyDeduction] = useState<number | ''>(20000);
  const [newRepayMonths, setNewRepayMonths] = useState<number | ''>(5);

  const initialDates = getDefaultDatesForPeriod(selectedYear, selectedMonth);
  const [newDisbursementDate, setNewDisbursementDate] = useState<string>(initialDates.disbursed);
  const [newRepaymentDate, setNewRepaymentDate] = useState<string>(initialDates.repayment);
  const [newStartMonth] = useState<string>(selectedMonth);
  const [newStartYear] = useState<number>(selectedYear);
  const [newNotes, setNewNotes] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  const handleOpenAddModal = () => {
    const dates = getDefaultDatesForPeriod(selectedYear, selectedMonth);
    setNewDisbursementDate(dates.disbursed);
    setNewRepaymentDate(dates.repayment);
    setIsAddModalOpen(true);
  };

  const handleDisbursementDateChange = (dateVal: string) => {
    setNewDisbursementDate(dateVal);
    setNewRepaymentDate(getEndOfMonth(dateVal));
  };

  const currentPeriodKey = `${selectedYear}-${selectedMonth}`;

  // Employee lookup map
  const employeeMap = useMemo(() => {
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  // Check if a loan has already been deducted in current payroll period
  const isPeriodDeducted = (loan: EmployeeLoan) => {
    return (loan.history || []).some(h => h.periodKey === currentPeriodKey);
  };

  const handleApplySingleDeduction = (loan: EmployeeLoan) => {
    if (onApplyLoanDeduction) {
      onApplyLoanDeduction(loan.id, currentPeriodKey);
      const emp = employeeMap.get(loan.employeeId);
      const name = emp ? emp.firstName : 'Staff';
      setToastMessage(
        loan.type === 'Salary Advance'
          ? `Salary Advance for ${name} marked 100% deducted for ${monthLabel}!`
          : `Applied ${monthLabel} monthly deduction of ${formatNaira(loan.monthlyDeduction)} for ${name}!`
      );
      setTimeout(() => setToastMessage(''), 3500);
    }
  };

  // Aggregate Metrics
  const stats = useMemo(() => {
    let totalDisbursed = 0;
    let totalRepaid = 0;
    let activeOutstanding = 0;
    const activeBorrowerIds = new Set<string>();

    loans.forEach(loan => {
      totalDisbursed += loan.principalAmount || 0;
      totalRepaid += loan.totalRepaid || 0;
      if (loan.status === 'Active' || loan.status === 'Paused') {
        activeOutstanding += loan.remainingBalance || 0;
        activeBorrowerIds.add(loan.employeeId);
      }
    });

    return {
      totalDisbursed,
      totalRepaid,
      activeOutstanding,
      activeBorrowersCount: activeBorrowerIds.size,
    };
  }, [loans]);

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      const emp = employeeMap.get(loan.employeeId);
      const empName = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : '';
      const empCode = emp?.code?.toLowerCase() || '';
      const notes = (loan.notes || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || empName.includes(q) || empCode.includes(q) || notes.includes(q);
      const matchesType = filterType === 'All' || loan.type === filterType;
      const matchesStatus = filterStatus === 'All' || loan.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [loans, employeeMap, searchQuery, filterType, filterStatus]);

  // Paginated loans
  const paginatedLoans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLoans.slice(start, start + pageSize);
  }, [filteredLoans, currentPage, pageSize]);

  // Handler for adding loan
  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeId) {
      alert('Please select an employee.');
      return;
    }

    const principalNum = Number(newPrincipal) || 0;
    if (principalNum <= 0) {
      alert('Principal amount must be greater than zero.');
      return;
    }

    const deductionNum = Number(newMonthlyDeduction) || 0;
    const monthsNum = Number(newRepayMonths) || 1;
    const deduction = deductionNum > 0 ? deductionNum : Math.ceil(principalNum / monthsNum);
    const startPeriod = getPeriodKeyFromDate(newRepaymentDate || newDisbursementDate, newStartYear, newStartMonth);

    onAddLoan({
      employeeId: newEmployeeId,
      type: newLoanType,
      principalAmount: principalNum,
      monthlyDeduction: deduction,
      disbursementDate: newDisbursementDate,
      repaymentDate: newRepaymentDate,
      repaymentStartDate: newRepaymentDate,
      startPeriodKey: startPeriod,
      notes: newNotes.trim() || undefined,
    });

    setIsAddModalOpen(false);
    setNewPrincipal(100000);
    setNewMonthlyDeduction(20000);
    setNewRepayMonths(5);
    const defaultDates = getDefaultDatesForPeriod(selectedYear, selectedMonth);
    setNewDisbursementDate(defaultDates.disbursed);
    setNewRepaymentDate(defaultDates.repayment);
    setNewNotes('');
  };

  const handleRepayMonthsChange = (val: string) => {
    if (val === '') {
      setNewRepayMonths('');
      return;
    }
    const months = Number(val);
    setNewRepayMonths(months);
    const princ = Number(newPrincipal) || 0;
    if (months > 0 && princ > 0) {
      setNewMonthlyDeduction(Math.ceil(princ / months));
    }
  };

  const handlePrincipalChange = (val: string) => {
    if (val === '') {
      setNewPrincipal('');
      return;
    }
    const amount = Number(val);
    setNewPrincipal(amount);
    const months = Number(newRepayMonths) || 1;
    if (months > 0 && amount > 0) {
      setNewMonthlyDeduction(Math.ceil(amount / months));
    }
  };

  const handleSaveEditLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan || !onUpdateLoan) return;

    const principalNum = editPrincipal === '' ? editingLoan.principalAmount : Number(editPrincipal);
    const balanceNum = editRemainingBalance === '' ? editingLoan.remainingBalance : Number(editRemainingBalance);
    const deductionNum = editMonthlyDeduction === '' ? editingLoan.monthlyDeduction : Number(editMonthlyDeduction);

    const updatedStatus: LoanStatus = balanceNum <= 0 ? 'Paid' : editStatus;

    onUpdateLoan(editingLoan.id, {
      type: editType,
      principalAmount: principalNum,
      remainingBalance: balanceNum,
      monthlyDeduction: deductionNum,
      status: updatedStatus,
      disbursementDate: editDisbursementDate,
      repaymentDate: editRepaymentDate,
      repaymentStartDate: editRepaymentDate,
      notes: editNotes.trim() || undefined,
    });

    setToastMessage(`Updated ${editType} record successfully.`);
    setTimeout(() => setToastMessage(''), 3000);
    setEditingLoan(null);
  };

  return (
    <div className="space-y-4">
      {/* ── Top Header ── */}
      <div className="pt-2.5 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Staff Loans &amp; Salary Advances
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Disbursements, automated monthly salary deductions, and balance tracking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isWriteDisabled && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors cursor-pointer shadow-none"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Loan / Advance</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-zinc-500 block">Total Disbursed</span>
            <div className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">
              {formatNaira(stats.totalDisbursed)}
            </div>
          </div>

          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-zinc-500 block">Total Repaid</span>
            <div className="text-lg font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {formatNaira(stats.totalRepaid)}
            </div>
          </div>

          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-zinc-500 block">Active Balance</span>
            <div className="text-lg font-semibold tracking-tight text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {formatNaira(stats.activeOutstanding)}
            </div>
          </div>

          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-zinc-500 block">Active Borrowers</span>
            <div className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">
              {stats.activeBorrowersCount} Staff
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toastMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Search & Filters ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff, code, or notes..."
            className="w-full bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-7 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] px-2.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
          >
            <option value="All">All Types</option>
            <option value="Staff Loan">Staff Loan</option>
            <option value="Salary Advance">Salary Advance</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] px-2.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Paid">Fully Paid</option>
          </select>

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

      {/* ── Table Card ── */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs overflow-hidden">
        <div className={`overflow-x-auto overflow-y-auto ${showStats ? 'max-h-[calc(100vh-285px)]' : 'max-h-[calc(100vh-185px)]'}`}>
          <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider select-none shadow-xs">
            <tr>
              <th className="py-2.5 px-3 sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 rounded-tl-lg">Staff Member</th>
              <th className="py-2.5 px-3 sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900">Type</th>
              <th className="py-2.5 px-3 text-right sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900">Principal</th>
              <th className="py-2.5 px-3 text-right sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900" title="Automatically deducted from take-home pay each payroll cycle">Auto Deduct</th>
              <th className="py-2.5 px-3 min-w-[130px] sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900">Progress</th>
              <th className="py-2.5 px-3 text-right sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900">Balance</th>
              <th className="py-2.5 px-3 text-center sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900">Status</th>
              <th className="py-2.5 px-3 text-right sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 rounded-tr-lg">Actions</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <CreditCard className="w-6 h-6 text-zinc-300 dark:text-zinc-600 stroke-[1.5]" />
                      <p className="text-xs text-zinc-500">
                        {loans.length === 0 
                          ? 'No staff loans or salary advances registered yet.' 
                          : 'No facilities match your search.'}
                      </p>
                      {loans.length === 0 && !isWriteDisabled && (
                        <button
                          type="button"
                          onClick={handleOpenAddModal}
                          className="text-xs text-zinc-900 dark:text-zinc-100 font-medium underline cursor-pointer"
                        >
                          + Disburse First Loan or Advance
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLoans.map((loan) => {
                  const emp = employeeMap.get(loan.employeeId);
                  const empFullName = emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Staff';
                  const percentRepaid = loan.principalAmount > 0 
                    ? Math.min(100, Math.round(((loan.totalRepaid || 0) / loan.principalAmount) * 100))
                    : 100;

                  const isPaused = loan.status === 'Paused';
                  const isPaid = loan.status === 'Paid' || (loan.remainingBalance || 0) <= 0;
                  const isDeductedThisMonth = isPeriodDeducted(loan);

                  return (
                    <tr 
                      key={loan.id} 
                      className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors ${
                        activeMenuLoanId === loan.id ? 'relative z-30' : 'relative z-0'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {empFullName}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono truncate">
                            {emp?.code || 'NO-ID'} &bull; {emp?.department || 'Operations'}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          loan.type === 'Salary Advance'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                        }`}>
                          {loan.type}
                        </span>
                        {(loan.repaymentDate || loan.repaymentStartDate) ? (
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5" title="Deduction / Repayment Date">
                            Due: {formatDate(loan.repaymentDate || loan.repaymentStartDate)}
                          </div>
                        ) : loan.disbursementDate ? (
                          <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                            Disb: {formatDate(loan.disbursementDate)}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        {formatNaira(loan.principalAmount)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap" title="Auto-deducted from salary">
                        {formatNaira(loan.monthlyDeduction)}
                      </td>

                      {/* Upgraded & Clear Progress Column */}
                      <td className="py-2.5 px-3 min-w-[155px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {formatNaira(loan.totalRepaid || 0)}
                            </span>
                            <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                              isPaid 
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800'
                            }`}>
                              {percentRepaid}%
                            </span>
                          </div>

                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                isPaid ? 'bg-emerald-500' : 'bg-zinc-900 dark:bg-zinc-100'
                              }`}
                              style={{ width: `${percentRepaid}%` }}
                            />
                          </div>

                          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                            {isPaid ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Fully Repaid</span>
                            ) : loan.type === 'Salary Advance' ? (
                              <span>Full deduction on pay</span>
                            ) : (
                              <span>Auto-deducts {formatNaira(loan.monthlyDeduction)}/mo</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap">
                        <span className={loan.remainingBalance > 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-emerald-600 dark:text-emerald-400'}>
                          {formatNaira(loan.remainingBalance || 0)}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isPaid ? 'bg-emerald-500' : isPaused ? 'bg-amber-500' : 'bg-blue-500'
                          }`} />
                          {loan.status}
                        </span>
                      </td>

                      {/* Simplified 3-Dot Actions Menu */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="relative inline-block text-left loan-actions-menu">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeMenuLoanId === loan.id) {
                                setActiveMenuLoanId(null);
                                setMenuCoords(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const spaceAbove = rect.top;
                                const openUp = spaceBelow < 170 && spaceAbove > spaceBelow;
                                setMenuCoords({
                                  top: openUp ? undefined : rect.bottom + 4,
                                  bottom: openUp ? Math.max(10, window.innerHeight - rect.top + 4) : undefined,
                                  right: Math.max(10, window.innerWidth - rect.right),
                                });
                                setActiveMenuLoanId(loan.id);
                              }
                            }}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              activeMenuLoanId === loan.id
                                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                            title="Actions menu"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {activeMenuLoanId === loan.id && menuCoords && (
                            <div
                              style={{ 
                                top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
                                bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
                                right: `${menuCoords.right}px` 
                              }}
                              className="fixed w-48 bg-white dark:bg-[#18181d] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 text-xs z-[9999] animate-in fade-in text-left loan-actions-dropdown"
                            >
                              {/* 1. Edit Facility */}
                              {!isWriteDisabled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuLoanId(null);
                                    setMenuCoords(null);
                                    setEditingLoan(loan);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span>Edit Facility</span>
                                </button>
                              )}

                              {/* 2. Pause / Resume Deductions */}
                              {!isPaid && !isWriteDisabled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuLoanId(null);
                                    setMenuCoords(null);
                                    onPauseResumeLoan(loan.id);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                >
                                  {isPaused ? (
                                    <>
                                      <PlayCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      <span>Resume Deductions</span>
                                    </>
                                  ) : (
                                    <>
                                      <PauseCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                      <span>Pause Deductions</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* 3. Repayment Ledger */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuLoanId(null);
                                  setMenuCoords(null);
                                  setSelectedLoanForLedger(loan);
                                }}
                                className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              >
                                <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span>Repayment Ledger</span>
                              </button>

                              {/* 4. Delete Facility */}
                              {!isWriteDisabled && (
                                <>
                                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuLoanId(null);
                                      setMenuCoords(null);
                                      if (window.confirm(`Delete ${loan.type} record for ${empFullName}?`)) {
                                        onDeleteLoan(loan.id);
                                      }
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span>Delete Facility</span>
                                  </button>
                                </>
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

        {/* Pinned Pagination Footer - Solid Floor of Table */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredLoans.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="facilities"
        />
      </div>

      {/* ================= ADD NEW LOAN MODAL ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95 duration-100 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                New Loan or Salary Advance
              </h2>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Employee *
                </label>
                <select
                  value={newEmployeeId}
                  onChange={e => setNewEmployeeId(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 cursor-pointer"
                  required
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.code || 'NO-ID'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Facility Type *
                  </label>
                  <select
                    value={newLoanType}
                    onChange={e => {
                      const t = e.target.value as LoanType;
                      setNewLoanType(t);
                      if (t === 'Salary Advance') {
                        setNewRepayMonths(1);
                        setNewMonthlyDeduction(newPrincipal);
                      } else {
                        setNewRepayMonths(6);
                        const princ = Number(newPrincipal) || 0;
                        setNewMonthlyDeduction(princ > 0 ? Math.ceil(princ / 6) : '');
                      }
                    }}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                  >
                    <option value="Staff Loan">Staff Loan</option>
                    <option value="Salary Advance">Salary Advance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Principal Amount (₦) *
                  </label>
                  <input
                    type="number"
                    value={newPrincipal}
                    onChange={e => handlePrincipalChange(e.target.value)}
                    step="any"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Duration (Months)
                  </label>
                  <input
                    type="number"
                    value={newRepayMonths}
                    onChange={e => handleRepayMonthsChange(e.target.value)}
                    step="1"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Monthly Deduct (₦) *
                  </label>
                  <input
                    type="number"
                    value={newMonthlyDeduction}
                    onChange={e => setNewMonthlyDeduction(e.target.value === '' ? '' : Number(e.target.value))}
                    step="any"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Disbursed Date
                  </label>
                  <input
                    type="date"
                    value={newDisbursementDate}
                    onChange={e => handleDisbursementDateChange(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Repayment Date
                  </label>
                  <input
                    type="date"
                    value={newRepaymentDate}
                    onChange={e => setNewRepaymentDate(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Note / Purpose
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. Relocation, Medical"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT LOAN / ADVANCE MODAL ================= */}
      {editingLoan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95 duration-100 space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Edit {editingLoan.type}
                </h2>
                <p className="text-[11px] text-zinc-400">
                  {employeeMap.get(editingLoan.employeeId)?.firstName} {employeeMap.get(editingLoan.employeeId)?.lastName} &bull; <span className="font-mono">{employeeMap.get(editingLoan.employeeId)?.code || 'Staff'}</span>
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingLoan(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLoan} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Facility Type
                  </label>
                  <select
                    value={editType}
                    onChange={e => setEditType(e.target.value as LoanType)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                  >
                    <option value="Staff Loan">Staff Loan</option>
                    <option value="Salary Advance">Salary Advance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Facility Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as LoanStatus)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Paid">Fully Paid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Principal Amount (₦) *
                  </label>
                  <input
                    type="number"
                    value={editPrincipal}
                    onChange={e => setEditPrincipal(e.target.value === '' ? '' : Number(e.target.value))}
                    step="any"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Remaining Balance (₦) *
                  </label>
                  <input
                    type="number"
                    value={editRemainingBalance}
                    onChange={e => setEditRemainingBalance(e.target.value === '' ? '' : Number(e.target.value))}
                    step="any"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Monthly Deduction (₦) *
                </label>
                <input
                  type="number"
                  value={editMonthlyDeduction}
                  onChange={e => setEditMonthlyDeduction(e.target.value === '' ? '' : Number(e.target.value))}
                  step="any"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Disbursed Date
                  </label>
                  <input
                    type="date"
                    value={editDisbursementDate}
                    onChange={e => setEditDisbursementDate(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Repayment Date
                  </label>
                  <input
                    type="date"
                    value={editRepaymentDate}
                    onChange={e => setEditRepaymentDate(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Note / Purpose
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="e.g. Relocation, Medical"
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingLoan(null)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= REPAYMENT LEDGER / HISTORY MODAL ================= */}
      {selectedLoanForLedger && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-3.5 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Repayment Ledger
                </h2>
                <p className="text-[11px] text-zinc-400">
                  {employeeMap.get(selectedLoanForLedger.employeeId)?.firstName} {employeeMap.get(selectedLoanForLedger.employeeId)?.lastName} &bull; {selectedLoanForLedger.type}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedLoanForLedger(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block">Principal</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  {formatNaira(selectedLoanForLedger.principalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Repaid</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {formatNaira(selectedLoanForLedger.totalRepaid || 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Balance</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  {formatNaira(selectedLoanForLedger.remainingBalance || 0)}
                </span>
              </div>
            </div>

            {(selectedLoanForLedger.disbursementDate || selectedLoanForLedger.repaymentDate || selectedLoanForLedger.repaymentStartDate) && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono shrink-0">
                <span>Disbursed: {formatDate(selectedLoanForLedger.disbursementDate)}</span>
                <span>Repayment Date: {formatDate(selectedLoanForLedger.repaymentDate || selectedLoanForLedger.repaymentStartDate)}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[140px]">
              {(!selectedLoanForLedger.history || selectedLoanForLedger.history.length === 0) ? (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  No repayment history recorded yet.
                </div>
              ) : (
                selectedLoanForLedger.history.map((record, idx) => (
                  <div 
                    key={record.id || idx}
                    className="p-2.5 rounded border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>{record.notes || 'Repayment recorded'}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {record.paidAt ? formatDate(record.paidAt) : 'Recorded'}
                      </div>
                    </div>

                    <div className="font-mono font-medium text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">
                      +{formatNaira(record.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedLoanForLedger(null)}
                className="px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
