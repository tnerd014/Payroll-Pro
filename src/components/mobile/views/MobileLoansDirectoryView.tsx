import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Landmark, 
  Plus, 
  Search, 
  X, 
  CreditCard, 
  PauseCircle, 
  PlayCircle,
  PlusCircle,
  Calendar,
  Edit3,
  Trash2,
  History,
  MoreVertical,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User
} from 'lucide-react';
import { EmployeeLoan, Employee, CalculatedPayrollItem, CompanyProfile, LoanType, LoanStatus, TeamMember } from '../../../types';
import { formatNaira, formatCompactNaira, formatDate } from '../../../engine/payePensionEngine';
import { MobileLoanCard } from '../MobileLoanCard';
import { MobileBottomSheet } from '../MobileBottomSheet';

interface MobileLoansDirectoryViewProps {
  loans: EmployeeLoan[];
  employees: Employee[];
  payrollItems?: CalculatedPayrollItem[];
  company?: CompanyProfile;
  monthLabel: string;
  selectedMonth: string;
  selectedYear: number;
  onAddLoan: (loan: Omit<EmployeeLoan, 'id' | 'totalRepaid' | 'remainingBalance' | 'status' | 'createdAt' | 'history'>) => void;
  onUpdateLoan?: (id: string, updates: Partial<EmployeeLoan>) => void;
  onDeleteLoan?: (id: string) => void;
  onPauseResumeLoan: (id: string) => void;
  onRecordManualPayment: (id: string, amount: number, notes?: string, reference?: string) => void;
  currentUser?: TeamMember | null;
  isReadOnly?: boolean;
}

export const MobileLoansDirectoryView: React.FC<MobileLoansDirectoryViewProps> = ({
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
  currentUser,
  isReadOnly = false,
}) => {
  const isAuditor = currentUser?.role === 'Auditor';
  const isWriteDisabled = isAuditor || isReadOnly;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | LoanStatus>('All');

  // Modal / Sheet States
  const [selectedLoanForDetails, setSelectedLoanForDetails] = useState<EmployeeLoan | null>(null);
  const [selectedLoanForLedger, setSelectedLoanForLedger] = useState<EmployeeLoan | null>(null);
  const [editingLoan, setEditingLoan] = useState<EmployeeLoan | null>(null);
  const [deleteConfirmLoan, setDeleteConfirmLoan] = useState<EmployeeLoan | null>(null);

  // Manual payment state
  const [payingLoan, setPayingLoan] = useState<EmployeeLoan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Add loan bottom sheet state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newPrincipal, setNewPrincipal] = useState('');
  const [newMonthly, setNewMonthly] = useState('');
  const [newLoanType, setNewLoanType] = useState<LoanType>('Salary Advance');

  // Edit loan form state
  const [editType, setEditType] = useState<LoanType>('Salary Advance');
  const [editStatus, setEditStatus] = useState<LoanStatus>('Active');
  const [editPrincipal, setEditPrincipal] = useState<string>('');
  const [editMonthly, setEditMonthly] = useState<string>('');
  const [editRemaining, setEditRemaining] = useState<string>('');
  const [editDisbursedDate, setEditDisbursedDate] = useState<string>('');
  const [editRepaymentDate, setEditRepaymentDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');

  // Details sheet 3-dot menu state
  const [isDetailsMenuOpen, setIsDetailsMenuOpen] = useState(false);
  const detailsMenuRef = useRef<HTMLDivElement>(null);

  // Aggregated totals
  const totalDisbursed = loans.reduce((s, l) => s + l.principalAmount, 0);
  const totalRepaid = loans.reduce((s, l) => s + l.totalRepaid, 0);
  const totalOutstanding = loans.reduce((s, l) => s + l.remainingBalance, 0);

  // Map employee ID to Name and Object
  const empMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach(e => {
      map.set(e.id, `${e.firstName} ${e.lastName}`);
    });
    return map;
  }, [employees]);

  const empObjectMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => {
      map.set(e.id, e);
    });
    return map;
  }, [employees]);

  // Keep details loan in sync with loans state
  const activeDetailsLoan = useMemo(() => {
    if (!selectedLoanForDetails) return null;
    return loans.find(l => l.id === selectedLoanForDetails.id) || selectedLoanForDetails;
  }, [loans, selectedLoanForDetails]);

  // Keep ledger loan in sync with loans state
  const activeLedgerLoan = useMemo(() => {
    if (!selectedLoanForLedger) return null;
    return loans.find(l => l.id === selectedLoanForLedger.id) || selectedLoanForLedger;
  }, [loans, selectedLoanForLedger]);

  // Filtered loans
  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const empName = empMap.get(l.employeeId) || '';
      const matchesSearch = empName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'All' || l.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [loans, empMap, searchQuery, filterStatus]);

  // Close details 3-dot menu on outside click
  useEffect(() => {
    if (!isDetailsMenuOpen) return;
    const handleGlobalClick = (e: MouseEvent) => {
      if (detailsMenuRef.current && !detailsMenuRef.current.contains(e.target as Node)) {
        setIsDetailsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [isDetailsMenuOpen]);

  // Open Edit form
  const handleStartEdit = (loan: EmployeeLoan) => {
    if (isWriteDisabled) return;
    setEditingLoan(loan);
    setEditType(loan.type);
    setEditStatus(loan.status);
    setEditPrincipal(loan.principalAmount.toString());
    setEditMonthly(loan.monthlyDeduction.toString());
    setEditRemaining(loan.remainingBalance.toString());
    setEditDisbursedDate(loan.disbursementDate || '');
    setEditRepaymentDate(loan.repaymentDate || '');
    setEditNotes(loan.notes || loan.description || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isWriteDisabled || !editingLoan || !onUpdateLoan) return;

    const principal = parseFloat(editPrincipal);
    const monthly = parseFloat(editMonthly);
    const remaining = parseFloat(editRemaining);

    if (isNaN(principal) || isNaN(monthly) || isNaN(remaining)) {
      alert('Please enter valid numeric amounts.');
      return;
    }

    onUpdateLoan(editingLoan.id, {
      type: editType,
      status: editStatus,
      principalAmount: principal,
      monthlyDeduction: monthly,
      remainingBalance: remaining,
      disbursementDate: editDisbursedDate || undefined,
      repaymentDate: editRepaymentDate || undefined,
      notes: editNotes || undefined,
      description: editNotes || undefined,
    });

    setEditingLoan(null);
  };

  const handleConfirmDelete = () => {
    if (isWriteDisabled || !deleteConfirmLoan || !onDeleteLoan) return;
    onDeleteLoan(deleteConfirmLoan.id);
    if (selectedLoanForDetails?.id === deleteConfirmLoan.id) {
      setSelectedLoanForDetails(null);
    }
    setDeleteConfirmLoan(null);
  };

  const handleConfirmPayment = () => {
    if (isWriteDisabled) return;
    if (!payingLoan || !paymentAmount) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;
    onRecordManualPayment(payingLoan.id, amt, paymentNotes || 'Mobile manual repayment');
    setPayingLoan(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleCreateLoan = () => {
    if (isWriteDisabled) return;
    if (!newEmpId || !newPrincipal || !newMonthly) return;
    const principal = parseFloat(newPrincipal);
    const monthly = parseFloat(newMonthly);
    if (isNaN(principal) || isNaN(monthly)) return;

    onAddLoan({
      employeeId: newEmpId,
      principalAmount: principal,
      monthlyDeduction: monthly,
      type: newLoanType,
      startPeriodKey: `${selectedYear}-${selectedMonth}`,
      description: `${newLoanType} issued via mobile`,
    });

    setIsAddOpen(false);
    setNewEmpId('');
    setNewPrincipal('');
    setNewMonthly('');
  };

  return (
    <div className="space-y-3.5 pb-2 select-none relative">
      
      {/* ── Top Summary Metric Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 shadow-xs col-span-2">
          <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
            Outstanding Loan Portfolio
          </span>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatNaira(totalOutstanding)}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1.5">
            <span>Disbursed: <strong>{formatCompactNaira(totalDisbursed)}</strong></span>
            <span>&bull;</span>
            <span>Repaid: <strong>{formatCompactNaira(totalRepaid)}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Filter & Search Header ── */}
      <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Loans &amp; Advances Roster
          </h3>
          <span className="text-[11px] text-zinc-500 font-medium">
            {filteredLoans.length} active records
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search employee loan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-9 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {(['All', 'Active', 'Paid', 'Paused'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
                filterStatus === st
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loans List ── */}
      <div className="space-y-2.5">
        {filteredLoans.length === 0 ? (
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-2">
            <Landmark className="w-8 h-8 text-zinc-400 mx-auto" />
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              No loans or salary advances found
            </h4>
            <p className="text-[11px] text-zinc-400">
              Tap the "+" button below to issue an advance or company loan.
            </p>
          </div>
        ) : (
          filteredLoans.map((loan) => (
            <MobileLoanCard
              key={loan.id}
              loan={loan}
              employeeName={empMap.get(loan.employeeId) || 'Unknown Staff'}
              onViewDetails={(l) => setSelectedLoanForDetails(l)}
              onEdit={(l) => handleStartEdit(l)}
              onPauseResume={(id) => onPauseResumeLoan(id)}
              onViewLedger={(l) => setSelectedLoanForLedger(l)}
              onDelete={(l) => setDeleteConfirmLoan(l)}
              isReadOnly={isWriteDisabled}
            />
          ))
        )}
      </div>

      {/* ── Android Material 3 FAB ── */}
      {!isWriteDisabled && (
        <div className="fixed bottom-[80px] right-4 z-50 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-2xl flex items-center justify-center transition-all cursor-pointer border border-emerald-500/40 ring-4 ring-emerald-500/10"
            title="Issue New Loan"
            aria-label="Issue New Loan"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* ── 1. LOAN DETAILS BOTTOM SHEET ── */}
      {activeDetailsLoan && (
        <MobileBottomSheet
          isOpen={Boolean(activeDetailsLoan)}
          onClose={() => {
            setSelectedLoanForDetails(null);
            setIsDetailsMenuOpen(false);
          }}
          title="Facility Details"
          subtitle={`${empMap.get(activeDetailsLoan.employeeId) || 'Staff Member'} • ${activeDetailsLoan.type}`}
        >
          {(() => {
            const emp = empObjectMap.get(activeDetailsLoan.employeeId);
            const empName = empMap.get(activeDetailsLoan.employeeId) || 'Unknown Staff';
            const initials = `${emp?.firstName?.charAt(0) || ''}${emp?.lastName?.charAt(0) || ''}`.toUpperCase() || 'E';
            const isActive = activeDetailsLoan.status === 'Active';
            const isPaused = activeDetailsLoan.status === 'Paused';
            const isPaid = activeDetailsLoan.status === 'Paid';
            const percentRepaid = activeDetailsLoan.principalAmount > 0 
              ? Math.min(100, Math.round((activeDetailsLoan.totalRepaid / activeDetailsLoan.principalAmount) * 100))
              : 0;

            return (
              <div className="space-y-4 text-xs select-none pb-2">
                
                {/* Employee Card & Header 3-Dot Actions */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-bold flex items-center justify-center text-sm shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                          {empName}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isPaid
                            ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                            : isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {activeDetailsLoan.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {emp?.department || 'General'} &bull; {emp?.code || 'EMP'}
                      </p>
                    </div>
                  </div>

                  {/* 3-Dot Menu in Details Sheet Header */}
                  <div ref={detailsMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsDetailsMenuOpen(prev => !prev)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Facility Actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isDetailsMenuOpen && (
                      <div 
                        className="absolute right-0 top-9 w-48 bg-white dark:bg-[#18181d] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100 text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isWriteDisabled && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsDetailsMenuOpen(false);
                              handleStartEdit(activeDetailsLoan);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>Edit Facility</span>
                          </button>
                        )}

                        {!isPaid && !isWriteDisabled && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsDetailsMenuOpen(false);
                              onPauseResumeLoan(activeDetailsLoan.id);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
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

                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailsMenuOpen(false);
                            setSelectedLoanForLedger(activeDetailsLoan);
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>Repayment Ledger</span>
                        </button>

                        {!isWriteDisabled && (
                          <>
                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                            <button
                              type="button"
                              onClick={() => {
                                setIsDetailsMenuOpen(false);
                                setDeleteConfirmLoan(activeDetailsLoan);
                              }}
                              className="w-full px-3 py-2 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
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

                {/* Progress Card */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-medium">Repayment Progress</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{percentRepaid}% Repaid</span>
                  </div>
                  <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isPaid ? 'bg-emerald-500' : 'bg-emerald-600 dark:bg-emerald-400'
                      }`}
                      style={{ width: `${percentRepaid}%` }}
                    />
                  </div>
                </div>

                {/* Financial Summary Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Principal Facility</span>
                    <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                      {formatNaira(activeDetailsLoan.principalAmount)}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Total Repaid</span>
                    <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      {formatNaira(activeDetailsLoan.totalRepaid || 0)}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Remaining Balance</span>
                    <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                      {formatNaira(activeDetailsLoan.remainingBalance || 0)}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Monthly Deduction</span>
                    <span className="font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                      {formatNaira(activeDetailsLoan.monthlyDeduction)} <span className="text-[10px] text-zinc-400 font-normal">/ mo</span>
                    </span>
                  </div>
                </div>

                {/* Dates & Purpose List */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-0.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-zinc-400">Facility Type</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{activeDetailsLoan.type}</span>
                  </div>

                  <div className="flex justify-between items-center py-0.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                    <span className="text-zinc-400">Disbursed / Started</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">
                      {activeDetailsLoan.disbursementDate ? formatDate(activeDetailsLoan.disbursementDate) : (activeDetailsLoan.createdAt ? formatDate(activeDetailsLoan.createdAt) : 'Initial')}
                    </span>
                  </div>

                  {activeDetailsLoan.repaymentDate && (
                    <div className="flex justify-between items-center py-0.5 border-b border-zinc-200/60 dark:border-zinc-800/60">
                      <span className="text-zinc-400">Target Repayment Date</span>
                      <span className="font-mono text-zinc-800 dark:text-zinc-200">
                        {formatDate(activeDetailsLoan.repaymentDate)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-start py-0.5">
                    <span className="text-zinc-400 shrink-0">Notes / Purpose</span>
                    <span className="text-zinc-700 dark:text-zinc-300 text-right max-w-[60%] truncate">
                      {activeDetailsLoan.notes || activeDetailsLoan.description || 'Standard facility deduction'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons in Details Sheet */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedLoanForLedger(activeDetailsLoan)}
                    className="w-full h-11 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <History className="w-4 h-4 text-zinc-500" />
                    <span>View Repayment Ledger</span>
                  </button>

                  {!isPaid && !isWriteDisabled && (
                    <button
                      type="button"
                      onClick={() => setPayingLoan(activeDetailsLoan)}
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Record Manual Repayment</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })()}
        </MobileBottomSheet>
      )}

      {/* ── 2. EDIT LOAN FACILITY BOTTOM SHEET ── */}
      {editingLoan && (
        <MobileBottomSheet
          isOpen={Boolean(editingLoan)}
          onClose={() => setEditingLoan(null)}
          title="Edit Loan Facility"
          subtitle={`For ${empMap.get(editingLoan.employeeId) || 'Employee'}`}
        >
          <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs pb-2">
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Facility Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Salary Advance', 'Staff Loan'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditType(t)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                      editType === t
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-500'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Facility Status
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as LoanStatus)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Paid">Fully Paid</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Principal Amount (₦)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editPrincipal}
                  onChange={(e) => setEditPrincipal(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Remaining Balance (₦)
                </label>
                <input
                  type="number"
                  step="any"
                  value={editRemaining}
                  onChange={(e) => setEditRemaining(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Monthly Deduction Rate (₦)
              </label>
              <input
                type="number"
                step="any"
                value={editMonthly}
                onChange={(e) => setEditMonthly(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Disbursed Date
                </label>
                <input
                  type="date"
                  value={editDisbursedDate}
                  onChange={(e) => setEditDisbursedDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Repayment Date
                </label>
                <input
                  type="date"
                  value={editRepaymentDate}
                  onChange={(e) => setEditRepaymentDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                Notes / Purpose
              </label>
              <input
                type="text"
                placeholder="e.g. Relocation, Medical loan"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingLoan(null)}
                className="flex-1 py-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </MobileBottomSheet>
      )}

      {/* ── 3. REPAYMENT LEDGER BOTTOM SHEET ── */}
      {activeLedgerLoan && (
        <MobileBottomSheet
          isOpen={Boolean(activeLedgerLoan)}
          onClose={() => setSelectedLoanForLedger(null)}
          title="Repayment Ledger"
          subtitle={`${empMap.get(activeLedgerLoan.employeeId) || 'Employee'} • ${activeLedgerLoan.type}`}
        >
          <div className="space-y-3.5 text-xs pb-2">
            {/* 3 Metric Pills */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block">Principal</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {formatNaira(activeLedgerLoan.principalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Repaid</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNaira(activeLedgerLoan.totalRepaid || 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block">Balance</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {formatNaira(activeLedgerLoan.remainingBalance || 0)}
                </span>
              </div>
            </div>

            {/* Repayment History List */}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {(!activeLedgerLoan.history || activeLedgerLoan.history.length === 0) ? (
                <div className="py-8 text-center text-zinc-400 text-xs bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                  No repayment history recorded yet.
                </div>
              ) : (
                activeLedgerLoan.history.map((record, idx) => (
                  <div 
                    key={record.id || idx}
                    className="p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 truncate">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{record.notes || 'Repayment recorded'}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {record.paidAt ? formatDate(record.paidAt) : 'Recorded'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatNaira(record.amount)}
                      </span>
                      {record.periodKey && (
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {record.periodKey}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Record Payment from Ledger */}
            {activeLedgerLoan.status !== 'Paid' && !isWriteDisabled && (
              <button
                type="button"
                onClick={() => {
                  setSelectedLoanForLedger(null);
                  setPayingLoan(activeLedgerLoan);
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Record Manual Repayment</span>
              </button>
            )}
          </div>
        </MobileBottomSheet>
      )}

      {/* ── 4. RECORD PAYMENT BOTTOM SHEET ── */}
      <MobileBottomSheet
        isOpen={Boolean(payingLoan)}
        onClose={() => setPayingLoan(null)}
        title="Record Loan Repayment"
        subtitle={payingLoan ? `For ${empMap.get(payingLoan.employeeId)}` : ''}
      >
        <div className="space-y-4 text-xs pb-2">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Repayment Amount (₦)
            </label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
              Notes / Transaction Reference
            </label>
            <input
              type="text"
              placeholder="e.g. Direct bank transfer ref 4928"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={handleConfirmPayment}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            Confirm Repayment
          </button>
        </div>
      </MobileBottomSheet>

      {/* ── 5. NEW LOAN BOTTOM SHEET ── */}
      <MobileBottomSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Issue New Loan or Advance"
        subtitle="Deductions will be automatically applied each payroll cycle"
      >
        <div className="space-y-3.5 text-xs pb-2">
          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Beneficiary Employee
            </label>
            <select
              value={newEmpId}
              onChange={(e) => setNewEmpId(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
            >
              <option value="">Select Employee...</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.department || 'General'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Loan Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Salary Advance', 'Staff Loan'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewLoanType(t)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${
                    newLoanType === t
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-500'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Total Principal Amount (₦)
            </label>
            <input
              type="number"
              placeholder="e.g. 200000"
              value={newPrincipal}
              onChange={(e) => setNewPrincipal(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
              Monthly Deduction Rate (₦)
            </label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={newMonthly}
              onChange={(e) => setNewMonthly(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={handleCreateLoan}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors mt-2 cursor-pointer"
          >
            Create Loan Record
          </button>
        </div>
      </MobileBottomSheet>

      {/* ── 6. DELETE CONFIRMATION OVERLAY MODAL ── */}
      {deleteConfirmLoan && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-5 animate-in fade-in duration-150">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setDeleteConfirmLoan(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-900/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Delete Loan Facility?
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  {empMap.get(deleteConfirmLoan.employeeId) || 'Employee'} &bull; {deleteConfirmLoan.type}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to delete this facility record? Any remaining balance of <strong>{formatNaira(deleteConfirmLoan.remainingBalance)}</strong> will no longer be deducted on upcoming payroll runs.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmLoan(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
