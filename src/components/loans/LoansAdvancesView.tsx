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
  Edit3,
  Eye,
  AlertTriangle,
  Banknote,
  Zap,
  Landmark,
  Layers,
  Lock,
  SkipForward,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import { Employee, EmployeeLoan, LoanType, LoanStatus, CalculatedPayrollItem, CompanyProfile, TeamMember } from '../../types';
import { formatNaira, formatDate } from '../../engine/payePensionEngine';
import { TablePagination } from '../common/TablePagination';
import { PauseLoanModal } from './PauseLoanModal';

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
  onPauseResumeLoan: (id: string, options?: { reason?: string; pausedUntilPeriodKey?: string; performedBy?: string }) => void;
  onRecordManualPayment: (id: string, amount: number, notes?: string, reference?: string) => void;
  onApplyLoanDeduction?: (loanId: string, periodKey?: string) => void;
  onApplyAllLoanDeductions?: (periodKey?: string) => void;
  currentUser?: TeamMember | null;
  isReadOnly?: boolean;
}

// Helper to sort loans by most recent business date first (repayment due date, disbursement date, or start period)
const getLoanRecencyScore = (loan: EmployeeLoan): number => {
  const parseDateToMs = (val?: string | null): number => {
    if (!val) return 0;
    const str = val.trim();
    const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmy) {
      const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
      if (!isNaN(d.getTime())) return d.getTime();
    }
    const ymd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
      const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
      if (!isNaN(d.getTime())) return d.getTime();
    }
    const t = new Date(str).getTime();
    if (!isNaN(t)) return t;
    return 0;
  };

  const parsePeriodKeyToMs = (key?: string | null): number => {
    if (!key) return 0;
    const parts = key.split('-');
    if (parts.length === 2) {
      const y = parseInt(parts[0], 10);
      const monthIdxs: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
      };
      const mIdx = monthIdxs[parts[1].toLowerCase()] ?? 0;
      return new Date(y, mIdx, 1).getTime();
    }
    return 0;
  };

  // 1. Primary visible dates on the card/table: Due Date, Disbursement Date, or Start Period
  const due = parseDateToMs(loan.repaymentDate || loan.repaymentStartDate);
  const disb = parseDateToMs(loan.disbursementDate);
  const period = parsePeriodKeyToMs(loan.startPeriodKey);

  const businessDate = Math.max(due, disb, period);
  if (businessDate > 0) return businessDate;

  // 2. Only if no business date was provided, fall back to record creation timestamp
  return parseDateToMs(loan.createdAt);
};

export const LoansAdvancesView: React.FC<LoansAdvancesViewProps> = ({
  loans = [],
  employees = [],
  payrollItems = [],
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
  const [sortOption, setSortOption] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'principal-desc' | 'balance-desc'>('date-desc');

  // Stats visibility state
  const [showStats, setShowStats] = useState(true);

  // Table Density Mode (Synced with app-wide table preference)
  const [isCompactMode, setIsCompactMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('payroll_pro_table_compact');
      if (stored !== null) return stored === 'true';
    } catch {}
    return true; // Default to Compact on all tables
  });

  const toggleCompactMode = () => {
    setIsCompactMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('payroll_pro_table_compact', String(next));
      } catch {}
      return next;
    });
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus, sortOption]);

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
  const [viewingLoan, setViewingLoan] = useState<EmployeeLoan | null>(null);
  const [pauseModalLoan, setPauseModalLoan] = useState<EmployeeLoan | null>(null);

  // Schedule row 3-dot menu & inline month override editor state
  const [scheduleMenuPeriodKey, setScheduleMenuPeriodKey] = useState<string | null>(null);
  const [scheduleMenuCoords, setScheduleMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [editingSchedulePeriodKey, setEditingSchedulePeriodKey] = useState<string | null>(null);
  const [editingScheduleAmount, setEditingScheduleAmount] = useState<number | ''>('');
  const [autoAdjustSchedule, setAutoAdjustSchedule] = useState(true);

  useEffect(() => {
    if (!viewingLoan) {
      setScheduleMenuPeriodKey(null);
      setScheduleMenuCoords(null);
      setEditingSchedulePeriodKey(null);
    }
  }, [viewingLoan]);

  useEffect(() => {
    if (!scheduleMenuPeriodKey) return;
    const handleClose = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.schedule-actions-menu') && !target.closest('.schedule-actions-dropdown')) {
        setScheduleMenuPeriodKey(null);
        setScheduleMenuCoords(null);
      }
    };
    const handleScrollOrResize = () => {
      setScheduleMenuPeriodKey(null);
      setScheduleMenuCoords(null);
    };
    document.addEventListener('mousedown', handleClose);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClose);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [scheduleMenuPeriodKey]);

  const applyMonthOverride = (
    loan: EmployeeLoan,
    periodKey: string,
    label: string,
    mode: 'payroll' | 'direct' | 'skip' | 'custom' | 'reset',
    customAmount?: number
  ) => {
    if (!onUpdateLoan) return;
    const existingHistory = (loan.history || []).filter(h => h.periodKey !== periodKey);
    const otherPaid = existingHistory.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    const maxAllowed = Math.max(0, (loan.principalAmount || 0) - otherPaid);

    let nextHistory = [...existingHistory];
    const nowIso = new Date().toISOString();

    if (mode === 'payroll') {
      const amt = Math.min(loan.monthlyDeduction || 0, maxAllowed);
      nextHistory.push({
        id: `repay-payroll-${periodKey}-${Date.now()}`,
        periodKey,
        amount: amt,
        paidAt: nowIso,
        notes: `Payroll deduction (${label})`,
      });
    } else if (mode === 'direct') {
      const amt = Math.min(loan.monthlyDeduction || 0, maxAllowed);
      nextHistory.push({
        id: `repay-direct-${periodKey}-${Date.now()}`,
        periodKey,
        amount: amt,
        paidAt: nowIso,
        notes: `Paid Direct — Cash / Transfer (${label})`,
      });
    } else if (mode === 'skip') {
      nextHistory.push({
        id: `repay-skip-${periodKey}-${Date.now()}`,
        periodKey,
        amount: 0,
        paidAt: nowIso,
        notes: `Skipped month (${label})`,
      });
    } else if (mode === 'custom') {
      const amt = Math.max(0, Math.min(Number(customAmount) || 0, maxAllowed));
      nextHistory.push({
        id: `repay-custom-${periodKey}-${Date.now()}`,
        periodKey,
        amount: amt,
        paidAt: nowIso,
        notes: `Payroll deduction set to ${formatNaira(amt)} (${label})`,
      });
    }

    const newTotalRepaid = nextHistory.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    const newRemaining = Math.max(0, (loan.principalAmount || 0) - newTotalRepaid);
    const newStatus: LoanStatus = newRemaining <= 0 ? 'Paid' : (loan.status === 'Paid' ? 'Active' : loan.status);

    onUpdateLoan(loan.id, {
      history: nextHistory,
      totalRepaid: newTotalRepaid,
      remainingBalance: newRemaining,
      status: newStatus,
    });

    setScheduleMenuPeriodKey(null);
    setScheduleMenuCoords(null);
    setEditingSchedulePeriodKey(null);
    setToastMessage(
      mode === 'reset'
        ? `Reset ${label} to scheduled deduction.`
        : mode === 'skip'
          ? `Skipped ${label} deduction (₦0.00 in payslip).`
          : mode === 'direct'
            ? `Marked ${label} as Paid Direct (outside payroll).`
            : `Updated ${label} deduction.`
    );
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Manual Payment Modal State
  const [paymentModalLoan, setPaymentModalLoan] = useState<EmployeeLoan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  const openPaymentModal = (loan: EmployeeLoan) => {
    setPaymentModalLoan(loan);
    setPaymentAmount(loan.monthlyDeduction);
    setPaymentNotes('');
  };

  const handleSubmitManualPayment = () => {
    if (!paymentModalLoan || !onRecordManualPayment) return;
    const amt = Number(paymentAmount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid payment amount greater than zero.');
      return;
    }
    onRecordManualPayment(
      paymentModalLoan.id,
      amt,
      paymentNotes.trim() || `Manual payment — ${monthLabel}`
    );
    const emp = employeeMap.get(paymentModalLoan.employeeId);
    setToastMessage(`Recorded ${formatNaira(Math.min(amt, paymentModalLoan.remainingBalance))} payment for ${emp?.firstName || 'Staff'}.`);
    setTimeout(() => setToastMessage(''), 3500);
    setPaymentModalLoan(null);
  };

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

  useEffect(() => {
    if (!isAddModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen]);

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

  const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const MONTH_LABELS: Record<string, string> = {
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
    jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec'
  };

  // Convert a "YYYY-mon" period key to a comparable number (YYYYMM)
  const periodKeyToNum = (key?: string | null): number => {
    if (!key) return 0;
    const parts = key.split('-');
    if (parts.length < 2) return 0;
    const y = parseInt(parts[0], 10);
    const mIdx = MONTH_KEYS.indexOf(parts[1].toLowerCase());
    if (isNaN(y) || mIdx < 0) return 0;
    return y * 100 + (mIdx + 1);
  };

  const getEffectiveStartPeriodKey = (loan: EmployeeLoan): string => {
    const repDate = loan.repaymentStartDate || loan.repaymentDate;
    if (repDate) return getPeriodKeyFromDate(repDate, selectedYear, selectedMonth);
    if (loan.startPeriodKey) return loan.startPeriodKey;
    return currentPeriodKey;
  };

  // Has the repayment/deduction period for this loan started?
  const hasDeductionStarted = (loan: EmployeeLoan): boolean => {
    const startNum = periodKeyToNum(getEffectiveStartPeriodKey(loan));
    const currentNum = periodKeyToNum(currentPeriodKey);
    if (!startNum) return true;
    return currentNum >= startNum;
  };

  const formatPeriodLabel = (key?: string | null): string => {
    if (!key) return '—';
    const parts = key.split('-');
    if (parts.length < 2) return key;
    const mLabel = MONTH_LABELS[parts[1].toLowerCase()] ?? parts[1];
    return `${mLabel} ${parts[0]}`;
  };

  const buildRepaymentSchedule = (loan: EmployeeLoan) => {
    const startKey = getEffectiveStartPeriodKey(loan);
    const parts = startKey.split('-');
    let startYear = parseInt(parts[0], 10) || selectedYear;
    let startMonthIdx = MONTH_KEYS.indexOf((parts[1] || '').toLowerCase());
    if (startMonthIdx < 0) startMonthIdx = 0;

    const isSalaryAdvance = loan.type === 'Salary Advance';
    const monthly = isSalaryAdvance
      ? loan.principalAmount
      : (loan.monthlyDeduction > 0 ? loan.monthlyDeduction : loan.principalAmount);
    const totalMonths = isSalaryAdvance
      ? 1
      : (monthly > 0 ? Math.max(1, Math.ceil(loan.principalAmount / monthly)) : 1);

    const historyByPeriod = new Map<string, { amount: number; isManual: boolean; isDirect: boolean; isSkipped: boolean; isCustom: boolean; notes?: string }>();
    (loan.history || []).forEach(h => {
      const id = h.id || '';
      const existing = historyByPeriod.get(h.periodKey);
      const isManual = id.startsWith('repay-manual-');
      const isDirect = id.startsWith('repay-direct-');
      const isSkipped = id.startsWith('repay-skip-') || (Number(h.amount) === 0);
      const isCustom = id.startsWith('repay-custom-');
      if (existing) {
        existing.amount += h.amount;
        existing.isManual = existing.isManual || isManual;
        existing.isDirect = existing.isDirect || isDirect;
        existing.isSkipped = existing.isSkipped && isSkipped;
        existing.isCustom = existing.isCustom || isCustom;
      } else {
        historyByPeriod.set(h.periodKey, { amount: h.amount, isManual, isDirect, isSkipped, isCustom, notes: h.notes });
      }
    });

    // Also compute cumulative coverage if a lump-sum manual payment covered multiple months
    let remainingPaidPool = loan.totalRepaid || 0;
    const rows: Array<{
      index: number;
      periodKey: string;
      label: string;
      expectedAmount: number;
      paidAmount: number;
      hasOverride: boolean;
      subtitle?: string;
      status: 'paid-payroll' | 'paid-manual' | 'paid-direct' | 'covered' | 'skipped' | 'paused' | 'scheduled';
    }> = [];

    for (let i = 0; i < totalMonths; i++) {
      const totalM = startMonthIdx + i;
      const y = startYear + Math.floor(totalM / 12);
      const mIdx = totalM % 12;
      const pKey = `${y}-${MONTH_KEYS[mIdx]}`;
      const label = `${MONTH_LABELS[MONTH_KEYS[mIdx]]} ${y}`;

      const isLast = i === totalMonths - 1;
      const expected = isLast
        ? Math.max(0, loan.principalAmount - monthly * (totalMonths - 1))
        : monthly;

      const hist = historyByPeriod.get(pKey);
      let status: 'paid-payroll' | 'paid-manual' | 'paid-direct' | 'covered' | 'skipped' | 'paused' | 'scheduled' = 'scheduled';
      let paidAmount = 0;
      let hasOverride = Boolean(hist);
      let subtitle: string | undefined;

      if (hist) {
        if (hist.isSkipped && hist.amount === 0) {
          status = 'skipped';
          subtitle = 'Skipped (₦0.00 in payslip)';
        } else if (hist.isDirect) {
          paidAmount = hist.amount;
          status = 'paid-direct';
          subtitle = 'Paid direct (₦0.00 in payslip)';
          remainingPaidPool = Math.max(0, remainingPaidPool - hist.amount);
        } else if (hist.isManual) {
          paidAmount = hist.amount;
          status = 'paid-manual';
          remainingPaidPool = Math.max(0, remainingPaidPool - hist.amount);
        } else {
          paidAmount = hist.amount;
          status = 'paid-payroll';
          if (hist.isCustom || hist.amount !== expected) {
            subtitle = `Payroll deduction set to ${formatNaira(hist.amount)}`;
          }
          remainingPaidPool = Math.max(0, remainingPaidPool - hist.amount);
        }
      } else if (remainingPaidPool >= expected && expected > 0) {
        paidAmount = expected;
        status = 'covered';
        remainingPaidPool = Math.max(0, remainingPaidPool - expected);
      } else if (loan.status === 'Paused') {
        status = 'paused';
      }

      rows.push({
        index: i + 1,
        periodKey: pKey,
        label,
        expectedAmount: expected,
        paidAmount,
        hasOverride,
        subtitle,
        status,
      });
    }

    return { rows, totalMonths };
  };

  // Employee lookup map
  const employeeMap = useMemo(() => {
    return new Map(employees.map(e => [e.id, e]));
  }, [employees]);

  // Payroll item lookup map for the currently selected month/year
  const payrollItemMap = useMemo(() => {
    return new Map(payrollItems.map(p => [p.employeeId, p]));
  }, [payrollItems]);

  const getEmployeeTakeHome = (employeeId: string) => {
    const emp = employeeMap.get(employeeId);
    const item = payrollItemMap.get(employeeId);
    if (item) {
      const existingLoanDeduction = Number(item.loanDeduction) || 0;
      const currentNetTakeHome = Number(item.netTakeHome) || 0;
      const takeHomeBeforeLoans = currentNetTakeHome + existingLoanDeduction;
      return {
        hasPayrollData: true,
        takeHomeBeforeLoans,
        currentNetTakeHome,
        existingLoanDeduction,
      };
    }
    const grossFallback = Number(emp?.monthlyGross) || 0;
    return {
      hasPayrollData: false,
      takeHomeBeforeLoans: grossFallback,
      currentNetTakeHome: grossFallback,
      existingLoanDeduction: 0,
    };
  };

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

  // Filtered loans list sorted with most recent at the top
  const filteredLoans = useMemo(() => {
    return loans
      .filter(loan => {
        const emp = employeeMap.get(loan.employeeId);
        const empName = emp ? `${emp.firstName} ${emp.lastName}`.toLowerCase() : '';
        const empCode = emp?.code?.toLowerCase() || '';
        const notes = (loan.notes || '').toLowerCase();
        const q = searchQuery.toLowerCase().trim();

        const matchesSearch = !q || empName.includes(q) || empCode.includes(q) || notes.includes(q);
        const matchesType = filterType === 'All' || loan.type === filterType;
        const matchesStatus = filterStatus === 'All' || loan.status === filterStatus;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        if (sortOption === 'date-asc') {
          return getLoanRecencyScore(a) - getLoanRecencyScore(b);
        }
        if (sortOption === 'name-asc') {
          const empA = employeeMap.get(a.employeeId);
          const empB = employeeMap.get(b.employeeId);
          const nameA = empA ? `${empA.firstName} ${empA.lastName}` : '';
          const nameB = empB ? `${empB.firstName} ${empB.lastName}` : '';
          return nameA.localeCompare(nameB);
        }
        if (sortOption === 'principal-desc') {
          return (b.principalAmount || 0) - (a.principalAmount || 0);
        }
        if (sortOption === 'balance-desc') {
          return (b.remainingBalance || 0) - (a.remainingBalance || 0);
        }
        // Default: 'date-desc' (most recent date on top)
        const scoreB = getLoanRecencyScore(b);
        const scoreA = getLoanRecencyScore(a);
        if (scoreB !== scoreA) return scoreB - scoreA;
        const tB = new Date(b.createdAt || 0).getTime();
        const tA = new Date(a.createdAt || 0).getTime();
        return tB - tA;
      });
  }, [loans, employeeMap, searchQuery, filterType, filterStatus, sortOption]);

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

    const targetEmp = employees.find(e => e.id === newEmployeeId);
    const { takeHomeBeforeLoans, currentNetTakeHome, hasPayrollData } = getEmployeeTakeHome(newEmployeeId);
    const deductionNum = Number(newMonthlyDeduction) || 0;
    const monthsNum = Number(newRepayMonths) || 1;
    const deduction = newLoanType === 'Salary Advance'
      ? principalNum
      : (deductionNum > 0 ? deductionNum : Math.ceil(principalNum / monthsNum));
    const effectiveMonthlyHit = newLoanType === 'Salary Advance' ? principalNum : deduction;

    if (takeHomeBeforeLoans > 0 && effectiveMonthlyHit > takeHomeBeforeLoans) {
      const payLabel = hasPayrollData ? `${monthLabel} take-home pay` : 'monthly salary';
      if (!window.confirm(
        `Warning: ${newLoanType === 'Salary Advance' ? 'Salary Advance' : 'Monthly loan deduction'} of ${formatNaira(effectiveMonthlyHit)} exceeds ${targetEmp?.firstName || 'staff'}'s ${payLabel} of ${formatNaira(takeHomeBeforeLoans)}.\n\nThis will result in a negative or zero net pay for ${monthLabel}.\n\nDo you want to proceed anyway?`
      )) {
        return;
      }
    } else if (hasPayrollData && currentNetTakeHome > 0 && effectiveMonthlyHit > currentNetTakeHome) {
      if (!window.confirm(
        `Notice: ${targetEmp?.firstName || 'Staff'} already has existing loan deductions in ${monthLabel}. Adding ${formatNaira(effectiveMonthlyHit)}/mo exceeds their remaining net take-home pay of ${formatNaira(currentNetTakeHome)}.\n\nDo you want to proceed anyway?`
      )) {
        return;
      }
    }
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
      if (newLoanType === 'Salary Advance') setNewMonthlyDeduction('');
      return;
    }
    const amount = Number(val);
    setNewPrincipal(amount);
    if (newLoanType === 'Salary Advance') {
      setNewMonthlyDeduction(amount);
      return;
    }
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

    const targetEmp = employeeMap.get(editingLoan.employeeId);
    const { takeHomeBeforeLoans, hasPayrollData } = getEmployeeTakeHome(editingLoan.employeeId);
    const effectiveMonthlyHit = editType === 'Salary Advance' ? principalNum : deductionNum;

    if (takeHomeBeforeLoans > 0 && effectiveMonthlyHit > takeHomeBeforeLoans) {
      const payLabel = hasPayrollData ? `${monthLabel} take-home pay` : 'monthly salary';
      if (!window.confirm(
        `Warning: ${editType === 'Salary Advance' ? 'Salary Advance' : 'Monthly deduction'} of ${formatNaira(effectiveMonthlyHit)} exceeds ${targetEmp?.firstName || 'staff'}'s ${payLabel} of ${formatNaira(takeHomeBeforeLoans)}.\n\nDo you want to proceed with this exception?`
      )) {
        return;
      }
    }

    const updatedStatus: LoanStatus = balanceNum <= 0 ? 'Paid' : editStatus;
    const updatedStartPeriod = editRepaymentDate
      ? getPeriodKeyFromDate(editRepaymentDate, selectedYear, selectedMonth)
      : editingLoan.startPeriodKey;

    onUpdateLoan(editingLoan.id, {
      type: editType,
      principalAmount: principalNum,
      remainingBalance: balanceNum,
      monthlyDeduction: deductionNum,
      status: updatedStatus,
      disbursementDate: editDisbursementDate,
      repaymentDate: editRepaymentDate,
      repaymentStartDate: editRepaymentDate,
      startPeriodKey: updatedStartPeriod,
      notes: editNotes.trim() || undefined,
    });

    setToastMessage(`Updated ${editType} record successfully.`);
    setTimeout(() => setToastMessage(''), 3000);
    setEditingLoan(null);
  };

  return (
    <div className="space-y-4">
      {/* ── Top Header ── */}
      <div className="pt-3.5 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Staff Loans &amp; Salary Advances
            </h1>

          </div>

          <div className="flex items-center gap-2">
            {!isWriteDisabled && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="app-primary-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors cursor-pointer shadow-none"
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
          <div className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Total Disbursed</span>
            <div className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">
              {formatNaira(stats.totalDisbursed)}
            </div>
          </div>

          <div className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Total Repaid</span>
            <div className="app-money-text text-lg font-semibold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {formatNaira(stats.totalRepaid)}
            </div>
          </div>

          <div className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Active Balance</span>
            <div className="text-lg font-semibold tracking-tight text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {formatNaira(stats.activeOutstanding)}
            </div>
          </div>

          <div className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block">Active Borrowers</span>
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
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff, code, or notes..."
            className="app-subtle-surface w-full bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-md pl-8 pr-7 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="app-subtle-surface h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] px-2.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
          >
            <option value="All" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">All Types</option>
            <option value="Staff Loan" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Staff Loan</option>
            <option value="Salary Advance" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Salary Advance</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="app-subtle-surface h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] px-2.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer"
          >
            <option value="All" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">All Statuses</option>
            <option value="Active" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Active</option>
            <option value="Paused" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Paused</option>
            <option value="Paid" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Fully Paid</option>
          </select>

          {/* Sort Control */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="app-subtle-surface h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] px-2.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none cursor-pointer font-medium"
            title="Sort facilities list"
          >
            <option value="date-desc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Sort: Newest Date First</option>
            <option value="date-asc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Sort: Oldest Date First</option>
            <option value="name-asc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Sort: Staff Name (A–Z)</option>
            <option value="principal-desc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Sort: Highest Principal</option>
            <option value="balance-desc" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Sort: Highest Balance</option>
          </select>

          {/* Table Density Switcher */}
          <button
            type="button"
            onClick={toggleCompactMode}
            className={`h-8 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1 transition cursor-pointer ${
              isCompactMode 
                ? 'app-active-tab bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent' 
                : 'app-surface-card border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
            }`}
            title="Toggle table row density"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{isCompactMode ? 'Compact' : 'Comfortable'}</span>
          </button>

          {/* Toggle Stats for More Table Room */}
          <button
            type="button"
            onClick={() => setShowStats(!showStats)}
            className="app-surface-card h-8 flex items-center gap-1.5 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md px-2.5 text-xs font-medium transition cursor-pointer shadow-2xs"
            title={showStats ? "Hide summary stats to maximize table room" : "Show summary stats"}
          >
            {showStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showStats ? "Hide Stats" : "Show Stats"}</span>
          </button>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="app-surface-card rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs overflow-hidden">
        <div className={`overflow-x-auto overflow-y-auto ${showStats ? 'max-h-[calc(100vh-285px)]' : 'max-h-[calc(100vh-185px)]'}`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="app-subtle-surface sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider select-none shadow-xs">
              <tr>
                <th
                  className="app-subtle-surface py-2.5 px-3 sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 rounded-tl-lg cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 select-none transition"
                  onClick={() => setSortOption(prev => prev === 'name-asc' ? 'date-desc' : 'name-asc')}
                  title="Click to sort by Staff Name"
                >
                  <div className="flex items-center gap-1">
                    <span>Staff Member</span>
                    {sortOption === 'name-asc' && <span className="text-[10px] text-zinc-500 font-mono">▲</span>}
                  </div>
                </th>
                <th
                  className="app-subtle-surface py-2.5 px-3 sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 select-none transition"
                  onClick={() => setSortOption(prev => prev === 'date-desc' ? 'date-asc' : 'date-desc')}
                  title="Click to toggle Newest/Oldest Date"
                >
                  <div className="flex items-center gap-1">
                    <span>Type & Date</span>
                    {sortOption === 'date-desc' && <span className="app-accent-text text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">▼ Newest</span>}
                    {sortOption === 'date-asc' && <span className="app-accent-text text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">▲ Oldest</span>}
                  </div>
                </th>
                <th
                  className="app-subtle-surface py-2.5 px-3 text-right sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 select-none transition"
                  onClick={() => setSortOption(prev => prev === 'principal-desc' ? 'date-desc' : 'principal-desc')}
                  title="Click to sort by Principal"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Principal</span>
                    {sortOption === 'principal-desc' && <span className="text-[10px] text-zinc-500 font-mono">▼</span>}
                  </div>
                </th>
                <th className="app-subtle-surface py-2.5 px-3 text-right sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900" title="Automatically deducted from take-home pay each payroll cycle">Auto Deduct</th>
                <th className="app-subtle-surface py-2.5 px-3 min-w-[130px] sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900">Progress</th>
                <th
                  className="app-subtle-surface py-2.5 px-3 text-right sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 select-none transition"
                  onClick={() => setSortOption(prev => prev === 'balance-desc' ? 'date-desc' : 'balance-desc')}
                  title="Click to sort by Remaining Balance"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Balance</span>
                    {sortOption === 'balance-desc' && <span className="text-[10px] text-zinc-500 font-mono">▼</span>}
                  </div>
                </th>
                <th className="app-subtle-surface py-2.5 px-3 text-center sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900">Status</th>
                <th className="app-subtle-surface py-2.5 px-3 text-right sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 rounded-tr-lg">Actions</th>
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
                      onClick={() => setViewingLoan(loan)}
                      className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer ${activeMenuLoanId === loan.id ? 'relative z-30' : 'relative z-0'
                        }`}
                    >
                      <td className={`${isCompactMode ? 'py-1.5' : 'py-2.5'} px-3`}>
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {empFullName}
                          </div>
                          {!isCompactMode && (
                            <div className="text-[10px] text-zinc-400 font-mono truncate">
                              {emp?.code || 'NO-ID'} &bull; {emp?.department || 'Operations'}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className={`${isCompactMode ? 'py-1.5' : 'py-2.5'} px-3 whitespace-nowrap`}>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${loan.type === 'Salary Advance'
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

                      <td className={`${isCompactMode ? 'py-1.5' : 'py-2.5'} px-3 text-right font-mono text-zinc-800 dark:text-zinc-200 whitespace-nowrap`}>
                        {formatNaira(loan.principalAmount)}
                      </td>

                      <td className={`${isCompactMode ? 'py-1.5' : 'py-2.5'} px-3 text-right font-mono text-zinc-600 dark:text-zinc-400 whitespace-nowrap`} title="Auto-deducted from salary">
                        {(() => {
                          const { takeHomeBeforeLoans } = getEmployeeTakeHome(loan.employeeId);
                          const exceedsTakeHome = !isPaid && takeHomeBeforeLoans > 0 && loan.monthlyDeduction > takeHomeBeforeLoans;
                          return (
                            <span className="inline-flex items-center justify-end gap-1">
                              {exceedsTakeHome && (
                                <span title={`Exceeds ${monthLabel} take-home pay (${formatNaira(takeHomeBeforeLoans)})`}>
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                </span>
                              )}
                              <span className={exceedsTakeHome ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                                {formatNaira(loan.monthlyDeduction)}
                              </span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Upgraded & Clear Progress Column */}
                      <td className={`${isCompactMode ? 'py-1.5' : 'py-2.5'} px-3 min-w-[155px]`}>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {formatNaira(loan.totalRepaid || 0)}
                            </span>
                            <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${isPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800'
                              }`}>
                              {percentRepaid}%
                            </span>
                          </div>

                          <div className="app-subtle-surface w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${isPaid ? 'bg-emerald-500' : 'app-accent-bar bg-zinc-900 dark:bg-zinc-100'
                                }`}
                              style={{ width: `${percentRepaid}%` }}
                            />
                          </div>

                          {!isCompactMode && (
                            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                              {isPaid ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Fully Repaid</span>
                              ) : isPaused ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  Paused{loan.pausedUntilPeriodKey ? ` until ${formatPeriodLabel(loan.pausedUntilPeriodKey)}` : ''}
                                </span>
                              ) : !hasDeductionStarted(loan) ? (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  Starts {formatPeriodLabel(getEffectiveStartPeriodKey(loan))} ({formatNaira(loan.monthlyDeduction)}/mo)
                                </span>
                              ) : loan.type === 'Salary Advance' ? (
                                <span>Full deduction on pay</span>
                              ) : (
                                <span>Auto-deducts {formatNaira(loan.monthlyDeduction)}/mo</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className={`${isCompactMode ? 'py-1.5' : 'py-2.5'} px-3 text-right font-mono font-medium whitespace-nowrap`}>
                        <span className={loan.remainingBalance > 0 ? 'text-zinc-900 dark:text-zinc-100' : 'text-emerald-600 dark:text-emerald-400'}>
                          {formatNaira(loan.remainingBalance || 0)}
                        </span>
                      </td>

                      <td className={`${isCompactMode ? 'py-1.5' : 'py-2.5'} px-3 text-center whitespace-nowrap`}>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                          <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : isPaused ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                          {loan.status}
                        </span>
                      </td>

                      {/* Simplified Actions: Direct "View" + 3-Dot Menu */}
                      <td className={`${isCompactMode ? 'py-1.5' : 'py-2.5'} px-3 text-right whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingLoan(loan);
                            }}
                            className="px-2.5 py-1 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            title="View facility details"
                          >
                            View
                          </button>

                          <div className="relative inline-block text-left loan-actions-menu" onClick={(e) => e.stopPropagation()}>
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
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${activeMenuLoanId === loan.id
                                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                              title="Actions menu"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMenuLoanId === loan.id && menuCoords && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
                                  bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
                                  right: `${menuCoords.right}px`
                                }}
                                className="app-surface-card fixed w-48 bg-white dark:bg-[#18181d] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 text-xs z-[9999] animate-in fade-in text-left loan-actions-dropdown"
                              >
                                {/* 0. View Facility */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuLoanId(null);
                                    setMenuCoords(null);
                                    setViewingLoan(loan);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span>View Details</span>
                                </button>

                                {/* 1. Edit Facility */}
                                {!isWriteDisabled && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuLoanId(null);
                                      setMenuCoords(null);
                                      setPauseModalLoan(loan);
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuLoanId(null);
                                    setMenuCoords(null);
                                    setViewingLoan(loan);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                >
                                  <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  <span>Repayment Ledger</span>
                                </button>

                                {/* 4. Record Manual Payment */}
                                {!isPaid && !isWriteDisabled && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuLoanId(null);
                                      setMenuCoords(null);
                                      openPaymentModal(loan);
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                                  >
                                    <Banknote className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span>Record Payment</span>
                                  </button>
                                )}

                                {/* 5. Delete Facility */}
                                {!isWriteDisabled && (
                                  <>
                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setActiveMenuLoanId(null);
                                        setMenuCoords(null);
                                        setViewingLoan(null);
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
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="app-surface-card relative bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                New Loan or Salary Advance
              </h2>
            </div>

            <form onSubmit={handleCreateLoan} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
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

                {/* Employee Take-Home Pay Banner for Selected Period */}
                {newEmployeeId && (() => {
                  const { hasPayrollData, takeHomeBeforeLoans, currentNetTakeHome, existingLoanDeduction } = getEmployeeTakeHome(newEmployeeId);
                  return (
                    <div className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 text-[11px]">
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {hasPayrollData ? `${monthLabel} Take-Home (before loans):` : 'Monthly Gross Salary:'}
                        </span>
                        {existingLoanDeduction > 0 && (
                          <div className="text-[10px] text-zinc-400">
                            Existing {monthLabel} loan deductions: <span className="font-mono">{formatNaira(existingLoanDeduction)}</span> &bull; Net left: <span className="font-mono font-semibold text-zinc-600 dark:text-zinc-300">{formatNaira(currentNetTakeHome)}</span>
                          </div>
                        )}
                      </div>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                        {formatNaira(takeHomeBeforeLoans)}
                      </span>
                    </div>
                  );
                })()}

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

                {/* Take-Home Pay Exceeded Warning (Staff Loan & Salary Advance) */}
                {newEmployeeId && (() => {
                  const { hasPayrollData, takeHomeBeforeLoans, currentNetTakeHome } = getEmployeeTakeHome(newEmployeeId);
                  const monthlyHit = newLoanType === 'Salary Advance'
                    ? Number(newPrincipal) || 0
                    : Number(newMonthlyDeduction) || 0;
                  if (takeHomeBeforeLoans > 0 && monthlyHit > takeHomeBeforeLoans) {
                    return (
                      <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          {newLoanType === 'Salary Advance' ? 'Advance' : 'Monthly deduction'} ({formatNaira(monthlyHit)}) exceeds {hasPayrollData ? `${monthLabel} take-home pay` : 'monthly salary'} ({formatNaira(takeHomeBeforeLoans)}).
                        </span>
                      </div>
                    );
                  }
                  if (hasPayrollData && currentNetTakeHome > 0 && monthlyHit > currentNetTakeHome) {
                    return (
                      <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          Deduction ({formatNaira(monthlyHit)}) exceeds remaining {monthLabel} net pay after existing loans ({formatNaira(currentNetTakeHome)}).
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Duration (Months)
                    </label>
                    <input
                      type="number"
                      value={newLoanType === 'Salary Advance' ? 1 : newRepayMonths}
                      onChange={e => handleRepayMonthsChange(e.target.value)}
                      disabled={newLoanType === 'Salary Advance'}
                      step="any"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none disabled:opacity-60 disabled:bg-zinc-50 dark:disabled:bg-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      {newLoanType === 'Salary Advance' ? 'Month-End Deduction (₦) *' : 'Monthly Deduct (₦) *'}
                    </label>
                    <input
                      type="number"
                      value={newLoanType === 'Salary Advance' ? newPrincipal : newMonthlyDeduction}
                      onChange={e => setNewMonthlyDeduction(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={newLoanType === 'Salary Advance'}
                      step="any"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none disabled:opacity-60 disabled:bg-zinc-50 dark:disabled:bg-zinc-900"
                      required
                    />
                  </div>
                </div>
                {newLoanType === 'Salary Advance' && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 -mt-1.5">
                    Salary advances are deducted 100% in full at the end of the selected month.
                  </p>
                )}

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
                      {newLoanType === 'Salary Advance' ? 'Repayment Date' : 'Repayment Start Date'}
                    </label>
                    <input
                      type="date"
                      value={newRepaymentDate}
                      onChange={e => setNewRepaymentDate(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      {newLoanType === 'Salary Advance'
                        ? 'Month when full advance is deducted.'
                        : 'Payroll deductions begin from this month.'}
                    </p>
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
              </div>

              <div className="app-subtle-surface flex items-center justify-end gap-2 p-3.5 px-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-primary-btn px-3.5 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition cursor-pointer"
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
          <div className="app-surface-card relative bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
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
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLoan} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
                {(() => {
                  const { hasPayrollData, takeHomeBeforeLoans, currentNetTakeHome, existingLoanDeduction } = getEmployeeTakeHome(editingLoan.employeeId);
                  return (
                    <div className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-2 text-[11px]">
                      <div>
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {hasPayrollData ? `${monthLabel} Take-Home (before loans):` : 'Monthly Gross Salary:'}
                        </span>
                        {existingLoanDeduction > 0 && (
                          <div className="text-[10px] text-zinc-400">
                            Existing {monthLabel} loan deductions: <span className="font-mono">{formatNaira(existingLoanDeduction)}</span> &bull; Net left: <span className="font-mono font-semibold text-zinc-600 dark:text-zinc-300">{formatNaira(currentNetTakeHome)}</span>
                          </div>
                        )}
                      </div>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                        {formatNaira(takeHomeBeforeLoans)}
                      </span>
                    </div>
                  );
                })()}
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

                {/* Take-Home Pay Exceeded Warning for Edit (Staff Loan & Salary Advance) */}
                {(() => {
                  const { hasPayrollData, takeHomeBeforeLoans } = getEmployeeTakeHome(editingLoan.employeeId);
                  const monthlyHit = editType === 'Salary Advance'
                    ? Number(editPrincipal) || 0
                    : Number(editMonthlyDeduction) || 0;
                  if (takeHomeBeforeLoans > 0 && monthlyHit > takeHomeBeforeLoans) {
                    return (
                      <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          {editType === 'Salary Advance' ? 'Advance' : 'Monthly deduction'} ({formatNaira(monthlyHit)}) exceeds {hasPayrollData ? `${monthLabel} take-home pay` : 'monthly salary'} ({formatNaira(takeHomeBeforeLoans)}).
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

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
                      {editType === 'Salary Advance' ? 'Repayment Date' : 'Repayment Start Date'}
                    </label>
                    <input
                      type="date"
                      value={editRepaymentDate}
                      onChange={e => setEditRepaymentDate(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      {editType === 'Salary Advance'
                        ? 'Month when full advance is deducted.'
                        : 'Payroll deductions begin from this month.'}
                    </p>
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

              </div>

              <div className="app-subtle-surface flex items-center justify-end gap-2 p-3.5 px-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingLoan(null)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="app-primary-btn px-3.5 py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium hover:opacity-90 transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VIEW FACILITY DETAILS MODAL ================= */}
      {viewingLoan && (() => {
        const currentLoan = loans.find(l => l.id === viewingLoan.id) || viewingLoan;
        const emp = employeeMap.get(currentLoan.employeeId);
        const empFullName = emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Staff';
        const percentExact = currentLoan.principalAmount > 0
          ? Math.min(100, ((currentLoan.totalRepaid || 0) / currentLoan.principalAmount) * 100)
          : 100;
        const isPaid = currentLoan.status === 'Paid' || (currentLoan.remainingBalance || 0) <= 0;
        const isPaused = currentLoan.status === 'Paused';
        const { rows: scheduleRows, totalMonths } = buildRepaymentSchedule(currentLoan);
        const coveredMonths = scheduleRows.filter(
          r => r.status === 'paid-payroll' || r.status === 'paid-manual' || r.status === 'paid-direct' || r.status === 'covered'
        ).length;
        const remainingMonths = Math.max(0, totalMonths - coveredMonths);
        const payStartDisplay = (currentLoan.repaymentDate || currentLoan.repaymentStartDate)
          ? formatDate(currentLoan.repaymentDate || currentLoan.repaymentStartDate)
          : formatPeriodLabel(getEffectiveStartPeriodKey(currentLoan));

        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">

              {/* Header */}
              <div className="flex items-start justify-between p-5 pb-4 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                    <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {empFullName}
                      </h2>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                        {currentLoan.type}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${isPaid
                        ? 'app-positive-badge bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/60'
                        : isPaused
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/70 dark:border-amber-800/60'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200/70 dark:border-blue-800/60'
                        }`}>
                        {isPaid ? 'Completed' : currentLoan.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5 flex-wrap">
                      {currentLoan.type === 'Salary Advance' ? (
                        <>
                          <span>Month-End Deduction: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{payStartDisplay}</strong></span>
                          <span>&bull;</span>
                          <span>Full Deduction (100%): <strong className="font-mono text-zinc-700 dark:text-zinc-300">{formatNaira(currentLoan.principalAmount)}</strong></span>
                        </>
                      ) : (
                        <>
                          <span>Pay Start: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{payStartDisplay}</strong></span>
                          <span>&bull;</span>
                          <span>Duration: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{totalMonths} {totalMonths === 1 ? 'month' : 'months'}</strong></span>
                          <span>&bull;</span>
                          <span>Monthly: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{formatNaira(currentLoan.monthlyDeduction)}</strong></span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

                {/* Summary & Progress Card */}
                <div className="app-subtle-surface p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 space-y-3.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Principal</span>
                      <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                        {formatNaira(currentLoan.principalAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Total Paid</span>
                      <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        {formatNaira(currentLoan.totalRepaid || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Remaining</span>
                      <span className={`text-sm font-bold font-mono mt-0.5 block ${currentLoan.remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                        {formatNaira(currentLoan.remainingBalance || 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                        {currentLoan.type === 'Salary Advance' ? 'Cycles Covered' : 'Months Covered'}
                      </span>
                      <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                        {coveredMonths} / {totalMonths}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-zinc-500 dark:text-zinc-400">Repayment Progress</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{percentExact.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isPaid ? 'bg-emerald-500' : 'app-accent-bar bg-blue-600 dark:bg-blue-500'
                          }`}
                        style={{ width: `${percentExact}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Lump Sum / Payment Action CTA */}
                {!isPaid && !isWriteDisabled && (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const loanToView = currentLoan;
                        setViewingLoan(null);
                        openPaymentModal(loanToView);
                      }}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      {currentLoan.type === 'Salary Advance' ? <Banknote className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                      <span>{currentLoan.type === 'Salary Advance' ? 'Record Direct Settlement' : 'Pay Multiple Months / Lump Sum'}</span>
                    </button>
                    {!hasDeductionStarted(currentLoan) && (
                      <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 px-2.5 py-1 rounded-md">
                        Auto-deductions begin {formatPeriodLabel(getEffectiveStartPeriodKey(currentLoan))}
                      </span>
                    )}
                  </div>
                )}

                {/* Pause Info Banner */}
                {isPaused && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
                      <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Deductions Paused</span>
                    </div>
                    {viewingLoan.pausedReason && (
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Reason: <span className="font-medium">{viewingLoan.pausedReason}</span>
                      </p>
                    )}
                    {viewingLoan.pausedUntilPeriodKey ? (
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Auto-resumes: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatPeriodLabel(viewingLoan.pausedUntilPeriodKey)}</span>
                      </p>
                    ) : (
                      <p className="text-zinc-500 italic">Paused indefinitely — requires manual resume.</p>
                    )}
                  </div>
                )}

                {/* Notes */}
                {viewingLoan.notes && (
                  <div className="p-2.5 rounded-lg border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Notes / Purpose</span>
                    <p className="text-zinc-700 dark:text-zinc-300 italic">{viewingLoan.notes}</p>
                  </div>
                )}

                {/* Repayment Schedule & Month Overrides */}
                <div className="app-surface-card rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-[#121215]">
                  <div className="app-subtle-surface px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/70 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      Repayment Schedule &amp; Month Overrides
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      {remainingMonths} {remainingMonths === 1 ? 'month' : 'months'} remaining
                    </span>
                  </div>

                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70 max-h-72 overflow-y-auto">
                    {scheduleRows.map((row) => {
                      const isRowPaid =
                        row.status === 'paid-payroll' ||
                        row.status === 'paid-manual' ||
                        row.status === 'paid-direct' ||
                        row.status === 'covered';
                      const isCurrentMonth = row.periodKey === currentPeriodKey;
                      const isMenuOpen = scheduleMenuPeriodKey === row.periodKey;
                      const isEditingThisRow = editingSchedulePeriodKey === row.periodKey;
                      const maxPayRemaining = Math.max(0, (currentLoan.remainingBalance || 0) + (row.paidAmount || 0));

                      return (
                        <div key={row.periodKey} className="transition-colors">
                          <div className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-zinc-50/70 dark:hover:bg-zinc-900/30">
                            <div className="flex items-start gap-3 min-w-0">
                              <span className="text-[11px] font-mono text-zinc-400 w-5 shrink-0 pt-0.5">{row.index}.</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{row.label}</span>
                                  {isCurrentMonth && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/50 text-[9px] font-bold uppercase tracking-wider">
                                      Current
                                    </span>
                                  )}
                                </div>
                                {row.subtitle && (
                                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                                    {row.subtitle}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <div className="text-right">
                                <div className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                  {formatNaira(row.status === 'skipped' ? 0 : (row.paidAmount > 0 ? row.paidAmount : row.expectedAmount))}
                                </div>
                                <div className="text-[10px] text-zinc-400 font-mono">
                                  {row.status === 'paid-payroll'
                                    ? `Payroll: ${formatNaira(row.paidAmount)}`
                                    : row.status === 'paid-direct'
                                      ? 'Payroll: ₦0.00'
                                      : row.status === 'paid-manual'
                                        ? `Manual: ${formatNaira(row.paidAmount)}`
                                        : row.status === 'covered'
                                          ? `Covered: ${formatNaira(row.paidAmount)}`
                                          : row.status === 'skipped'
                                            ? 'Payroll: ₦0.00'
                                            : `Scheduled: ${formatNaira(row.expectedAmount)}`}
                                </div>
                              </div>

                              {isRowPaid ? (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold whitespace-nowrap ${row.status === 'paid-direct'
                                  ? 'border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                  : 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                  }`}>
                                  {row.status === 'paid-direct' ? <Banknote className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                  {row.status === 'paid-direct'
                                    ? 'Paid (Direct)'
                                    : row.status === 'paid-manual'
                                      ? 'Paid (Manual)'
                                      : row.status === 'covered'
                                        ? 'Paid (Lump Sum)'
                                        : 'Paid (Payroll)'}
                                </span>
                              ) : row.status === 'skipped' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold whitespace-nowrap">
                                  <SkipForward className="w-3 h-3" />
                                  Skipped
                                </span>
                              ) : row.status === 'paused' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold whitespace-nowrap">
                                  <PauseCircle className="w-3 h-3" />
                                  Paused
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium whitespace-nowrap">
                                  <Clock className="w-3 h-3 text-zinc-400" />
                                  Upcoming
                                </span>
                              )}

                              {/* 3-Dot Month Actions Menu */}
                              {!isWriteDisabled && onUpdateLoan && (
                                <div className="relative schedule-actions-menu">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isMenuOpen) {
                                        setScheduleMenuPeriodKey(null);
                                        setScheduleMenuCoords(null);
                                      } else {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const spaceBelow = window.innerHeight - rect.bottom;
                                        const spaceAbove = rect.top;
                                        const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
                                        setScheduleMenuCoords({
                                          top: openUp ? undefined : rect.bottom + 4,
                                          bottom: openUp ? Math.max(10, window.innerHeight - rect.top + 4) : undefined,
                                          right: Math.max(10, window.innerWidth - rect.right),
                                        });
                                        setScheduleMenuPeriodKey(row.periodKey);
                                      }
                                    }}
                                    className={`p-1.5 rounded-lg border transition cursor-pointer ${isMenuOpen
                                      ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                                      : 'border-transparent text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                      }`}
                                    title={`${row.label} actions`}
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {isMenuOpen && scheduleMenuCoords && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        top: scheduleMenuCoords.top !== undefined ? `${scheduleMenuCoords.top}px` : undefined,
                                        bottom: scheduleMenuCoords.bottom !== undefined ? `${scheduleMenuCoords.bottom}px` : undefined,
                                        right: `${scheduleMenuCoords.right}px`,
                                      }}
                                      className="app-surface-card fixed w-72 bg-white dark:bg-[#18181d] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden text-xs z-[9999] animate-in fade-in text-left schedule-actions-dropdown"
                                    >
                                      <div className="px-3.5 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 font-semibold text-zinc-500 dark:text-zinc-400 text-[11px]">
                                        {row.label} Actions
                                      </div>

                                      <div className="py-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setScheduleMenuPeriodKey(null);
                                            setScheduleMenuCoords(null);
                                            setEditingSchedulePeriodKey(row.periodKey);
                                            setEditingScheduleAmount(row.paidAmount > 0 ? row.paidAmount : row.expectedAmount);
                                          }}
                                          className="w-full px-3.5 py-2 flex items-start gap-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition text-left cursor-pointer"
                                        >
                                          <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                          <div>
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Edit Payslip Amount / Pay Remaining</div>
                                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Deduct custom or full remaining balance in {row.label}</div>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => applyMonthOverride(currentLoan, row.periodKey, row.label, 'payroll')}
                                          className="w-full px-3.5 py-2 flex items-start gap-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition text-left cursor-pointer"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                          <div>
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Mark Paid via Payroll</div>
                                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Deducts standard {formatNaira(row.expectedAmount)} in payslip</div>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => applyMonthOverride(currentLoan, row.periodKey, row.label, 'direct')}
                                          className="w-full px-3.5 py-2 flex items-start gap-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition text-left cursor-pointer"
                                        >
                                          <Banknote className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                          <div>
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Mark Paid Direct (Cash / Transfer)</div>
                                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Paid outside payroll (₦0.00 in payslip)</div>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => applyMonthOverride(currentLoan, row.periodKey, row.label, 'skip')}
                                          className="w-full px-3.5 py-2 flex items-start gap-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition text-left cursor-pointer"
                                        >
                                          <SkipForward className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                          <div>
                                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Skip This Month</div>
                                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Pause deduction (₦0.00 in payslip, balance stays due)</div>
                                          </div>
                                        </button>
                                      </div>

                                      <div className="border-t border-zinc-100 dark:border-zinc-800 py-1">
                                        <button
                                          type="button"
                                          disabled={!row.hasOverride}
                                          onClick={() => applyMonthOverride(currentLoan, row.periodKey, row.label, 'reset')}
                                          className="w-full px-3.5 py-2 flex items-start gap-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 disabled:opacity-40 disabled:cursor-not-allowed transition text-left cursor-pointer"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                                          <div>
                                            <div className="font-semibold text-zinc-700 dark:text-zinc-200">Reset to Scheduled</div>
                                            <div className="text-[11px] text-zinc-400">Remove manual override for this month</div>
                                          </div>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Inline Month Deduction Editor */}
                          {isEditingThisRow && (
                            <div className="mx-4 mb-3 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/30 dark:bg-blue-950/20 space-y-3 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                                  Edit {row.label} Payslip Deduction (₦)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingScheduleAmount(maxPayRemaining)}
                                  className="px-2.5 py-1 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition cursor-pointer"
                                >
                                  Pay All Remaining ({formatNaira(maxPayRemaining)})
                                </button>
                              </div>

                              <div className="flex items-center gap-3 flex-wrap">
                                <input
                                  type="number"
                                  value={editingScheduleAmount}
                                  onChange={e => setEditingScheduleAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                  step="any"
                                  min="0"
                                  className="w-40 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                                  autoFocus
                                />
                                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={autoAdjustSchedule}
                                    onChange={e => setAutoAdjustSchedule(e.target.checked)}
                                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span>Auto-adjust remaining balance into next month(s)</span>
                                </label>
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingSchedulePeriodKey(null)}
                                  className="h-8 px-3 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => applyMonthOverride(currentLoan, row.periodKey, row.label, 'custom', Number(editingScheduleAmount) || 0)}
                                  className="h-8 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
                                >
                                  Save Deduction
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Repayment History Ledger (actual transactions) */}
                {(viewingLoan.history || []).length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 px-0.5">
                      <span>Transaction Log ({viewingLoan.history?.length || 0})</span>
                      <span className="font-mono">Total: {formatNaira(viewingLoan.totalRepaid || 0)}</span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {(viewingLoan.history || []).map((record, idx) => (
                        <div
                          key={record.id || idx}
                          className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 truncate">
                              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate">{record.notes || `Payroll deduction (${record.periodKey || 'Cycle'})`}</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {record.paidAt ? formatDate(record.paidAt) : 'Recorded'}
                            </div>
                          </div>
                          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap ml-2">
                            +{formatNaira(record.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pause Event History */}
                {(viewingLoan.pauseHistory || []).length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider px-0.5">Pause / Resume Log</div>
                    {(viewingLoan.pauseHistory || []).map((evt, idx) => (
                      <div key={evt.id || idx} className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${evt.action === 'pause'
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40'
                        : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
                        }`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {evt.action === 'pause'
                            ? <PauseCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            : <PlayCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          }
                          <div className="min-w-0">
                            <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                              {evt.action === 'pause' ? 'Paused' : 'Resumed'}{evt.reason ? `: ${evt.reason}` : ''}
                            </div>
                            {evt.performedBy && (
                              <div className="text-[10px] text-zinc-400">By: {evt.performedBy}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono shrink-0">
                          {formatDate(evt.date)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clean Uniform Footer */}
              <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {!isWriteDisabled && (
                    <button
                      type="button"
                      onClick={() => {
                        const loanToEdit = viewingLoan;
                        setViewingLoan(null);
                        setEditingLoan(loanToEdit);
                      }}
                      className="h-8 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 shrink-0" />
                      <span>Edit Facility</span>
                    </button>
                  )}
                  {!isPaid && !isWriteDisabled && (
                    <button
                      type="button"
                      onClick={() => {
                        const loanToEdit = viewingLoan;
                        setViewingLoan(null);
                        setPauseModalLoan(loanToEdit);
                      }}
                      className={`h-8 px-3 rounded-lg border text-xs font-medium transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${isPaused
                        ? 'border-emerald-200 dark:border-emerald-800 bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        : 'border-amber-200 dark:border-amber-800 bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                        }`}
                    >
                      {isPaused ? <PlayCircle className="w-3.5 h-3.5 shrink-0" /> : <PauseCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span>{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                  )}
                  {!isWriteDisabled && (
                    <button
                      type="button"
                      onClick={() => {
                        const loanToDelete = viewingLoan;
                        if (window.confirm(`Delete ${loanToDelete.type} record for ${empFullName}?`)) {
                          setViewingLoan(null);
                          onDeleteLoan(loanToDelete.id);
                        }
                      }}
                      className="h-8 px-3 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30 transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setViewingLoan(null)}
                  className="app-primary-btn h-8 px-4 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition whitespace-nowrap cursor-pointer shrink-0"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Legacy Repayment Ledger Modal Fallback */}
      {selectedLoanForLedger && !viewingLoan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-3.5 max-h-[80vh] flex flex-col">
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
                <span>{selectedLoanForLedger.type === 'Salary Advance' ? 'Repayment Date' : 'Repayment Start'}: {formatDate(selectedLoanForLedger.repaymentStartDate || selectedLoanForLedger.repaymentDate)}</span>
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
                className="app-primary-btn px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MANUAL PAYMENT MODAL ================= */}
      {paymentModalLoan && (() => {
        const loan = paymentModalLoan;
        const emp = employeeMap.get(loan.employeeId);
        const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Staff';
        const monthlyAmt = loan.monthlyDeduction || 0;
        const remaining = loan.remainingBalance || 0;
        const payAmt = Number(paymentAmount) || 0;
        const willOverpay = payAmt > remaining;
        const effectiveAmt = Math.min(payAmt, remaining);
        const willPayOff = effectiveAmt >= remaining && remaining > 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-100 flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Record Manual Payment</h2>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {empName} &bull; <span className="font-mono">{emp?.code || 'Staff'}</span> &bull; {loan.type}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentModalLoan(null)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Monthly Deduct</span>
                    <span className="text-sm font-bold font-mono text-zinc-800 dark:text-zinc-200 mt-0.5 block">{formatNaira(monthlyAmt)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Remaining Balance</span>
                    <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">{formatNaira(remaining)}</span>
                  </div>
                </div>

                {/* Quick amount presets */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Quick Select
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3].map(multiplier => {
                      const presetAmt = Math.min(multiplier * monthlyAmt, remaining);
                      const isActive = paymentAmount === presetAmt;
                      return (
                        <button
                          key={multiplier}
                          type="button"
                          disabled={monthlyAmt <= 0 || remaining <= 0}
                          onClick={() => setPaymentAmount(presetAmt)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${isActive
                            ? 'app-active-tab border-emerald-500 bg-emerald-500 text-white'
                            : 'app-subtle-surface border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                            }`}
                        >
                          <Zap className="w-3 h-3" />
                          {multiplier}× <span className="font-mono">{formatNaira(presetAmt)}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={remaining <= 0}
                      onClick={() => setPaymentAmount(remaining)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${paymentAmount === remaining && remaining > 0
                        ? 'app-active-tab border-emerald-500 bg-emerald-500 text-white'
                        : 'app-subtle-surface border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
                        }`}
                    >
                      Pay Full Balance
                    </button>
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Payment Amount (₦) *
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    step="any"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition"
                    placeholder="Enter amount..."
                    autoFocus
                  />
                  {willOverpay && payAmt > 0 && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Amount exceeds remaining balance. Only <strong className="font-mono">{formatNaira(remaining)}</strong> will be recorded — the loan will be marked fully paid.</span>
                    </div>
                  )}
                  {willPayOff && !willOverpay && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>This will clear the entire outstanding balance — loan will be marked <strong>Paid</strong>.</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Note <span className="text-zinc-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    placeholder={`Manual payment — ${monthLabel}`}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition"
                  />
                </div>

                {/* Effective amount preview */}
                {payAmt > 0 && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                    <span>Effective deduction:</span>
                    <span className="font-mono font-bold">{formatNaira(effectiveAmt)}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="app-subtle-surface flex items-center justify-end gap-2 p-3.5 px-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setPaymentModalLoan(null)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitManualPayment}
                  disabled={!paymentAmount || Number(paymentAmount) <= 0}
                  className="app-primary-btn px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pause / Resume Loan Modal */}
      <PauseLoanModal
        isOpen={pauseModalLoan !== null}
        loan={pauseModalLoan}
        employee={employees.find(e => e.id === pauseModalLoan?.employeeId)}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        currentUser={currentUser}
        onClose={() => setPauseModalLoan(null)}
        onConfirmPause={(loanId, options) => {
          onPauseResumeLoan(loanId, options);
          setPauseModalLoan(null);
        }}
        onConfirmResume={(loanId, options) => {
          onPauseResumeLoan(loanId, options);
          setPauseModalLoan(null);
        }}
      />
    </div>
  );
};
