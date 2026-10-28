import React, { useState, useMemo } from 'react';
import { 
  Landmark, 
  Plus, 
  Search, 
  X, 
  CreditCard, 
  PauseCircle, 
  PlayCircle,
  PlusCircle,
  Calendar
} from 'lucide-react';
import { EmployeeLoan, Employee, CalculatedPayrollItem, CompanyProfile, LoanType, LoanStatus, TeamMember } from '../../../types';
import { formatNaira, formatCompactNaira } from '../../../engine/payePensionEngine';
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
  onPauseResumeLoan: (id: string) => void;
  onRecordManualPayment: (id: string, amount: number, notes?: string, reference?: string) => void;
  currentUser?: TeamMember | null;
}

export const MobileLoansDirectoryView: React.FC<MobileLoansDirectoryViewProps> = ({
  loans = [],
  employees = [],
  monthLabel,
  selectedMonth,
  selectedYear,
  onAddLoan,
  onPauseResumeLoan,
  onRecordManualPayment,
  currentUser,
}) => {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | LoanStatus>('All');

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

  // Aggregated totals
  const totalDisbursed = loans.reduce((s, l) => s + l.principalAmount, 0);
  const totalRepaid = loans.reduce((s, l) => s + l.totalRepaid, 0);
  const totalOutstanding = loans.reduce((s, l) => s + l.remainingBalance, 0);

  // Map employee ID to Name
  const empMap = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach(e => {
      map.set(e.id, `${e.firstName} ${e.lastName}`);
    });
    return map;
  }, [employees]);

  // Filtered loans
  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      const empName = empMap.get(l.employeeId) || '';
      const matchesSearch = empName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'All' || l.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [loans, empMap, searchQuery, filterStatus]);

  const handleConfirmPayment = () => {
    if (isAuditor) return;
    if (!payingLoan || !paymentAmount) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;
    onRecordManualPayment(payingLoan.id, amt, paymentNotes || 'Mobile manual repayment');
    setPayingLoan(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleCreateLoan = () => {
    if (isAuditor) return;
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
              onPauseResume={(id) => onPauseResumeLoan(id)}
              onRecordPayment={(l) => setPayingLoan(l)}
              isReadOnly={isAuditor}
            />
          ))
        )}
      </div>

      {/* ── Android Material 3 FAB ── */}
      {!isAuditor && (
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

      {/* ── Record Payment Bottom Sheet ── */}
      <MobileBottomSheet
        isOpen={Boolean(payingLoan)}
        onClose={() => setPayingLoan(null)}
        title="Record Loan Repayment"
        subtitle={payingLoan ? `For ${empMap.get(payingLoan.employeeId)}` : ''}
      >
        <div className="space-y-4">
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

      {/* ── New Loan Bottom Sheet ── */}
      <MobileBottomSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Issue New Loan or Advance"
        subtitle="Deductions will be automatically applied each payroll cycle"
      >
        <div className="space-y-3.5">
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

    </div>
  );
};
