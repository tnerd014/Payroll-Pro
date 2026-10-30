import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  X,
  Filter, 
  Edit3, 
  Trash2, 
  FileSpreadsheet,
  MoreVertical,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Building2,
  Phone,
  Mail,
  Landmark,
  ShieldCheck,
  Banknote,
  MapPin,
  BadgeCheck,
  Calendar,
  AlertTriangle,
  RotateCcw,
  LogOut,
  Eye
} from 'lucide-react';
import { Employee, SalaryCalculationMode, EmploymentTypeRule, EmployeeLoan, TeamMember } from '../../types';
import { formatNaira, getEmployeeGrossForPeriod, formatDate } from '../../engine/payePensionEngine';
import { EmployeeFormModal } from './EmployeeFormModal';
import { TablePagination } from '../common/TablePagination';
import { SortableHeader, SortDirection } from '../common/SortableHeader';

// ── Month keys in display order ──────────────────────────────────────────────
const MONTHS = [
  { key: 'jan', label: 'Jan' }, { key: 'feb', label: 'Feb' },
  { key: 'mar', label: 'Mar' }, { key: 'apr', label: 'Apr' },
  { key: 'may', label: 'May' }, { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' }, { key: 'aug', label: 'Aug' },
  { key: 'sep', label: 'Sep' }, { key: 'oct', label: 'Oct' },
  { key: 'nov', label: 'Nov' }, { key: 'dec', label: 'Dec' },
];

// ── Comprehensive Employee View Modal ────────────────────────────────────────
interface EmployeeViewModalProps {
  emp: Employee;
  currentMonth?: string;
  currentYear?: number;
  onClose: () => void;
  onEdit: (emp: Employee) => void;
  isReadOnly?: boolean;
}

const InfoRow: React.FC<{ label: string; value: React.ReactNode; icon?: React.ReactNode; mono?: boolean; wide?: boolean }> =
  ({ label, value, icon, mono, wide }) => (
    <div className={wide ? 'col-span-2' : ''}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1">
        {icon && <span className="opacity-70 shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-xs text-zinc-800 dark:text-zinc-200 ${mono ? 'font-mono' : 'font-medium'} break-words leading-snug`}>
        {value || <span className="text-zinc-400 dark:text-zinc-600 font-normal">—</span>}
      </div>
    </div>
  );

const EmployeeViewModal: React.FC<EmployeeViewModalProps> = ({ emp, currentMonth, currentYear, onClose, onEdit, isReadOnly }) => {
  // Active payroll cycle month/year for highlighting
  const now = new Date();
  const activeCycleYear = currentYear || now.getFullYear();
  const activeCycleMonth = currentMonth || MONTHS[now.getMonth()].key;

  const thisYear = activeCycleYear;
  const [selectedYear, setSelectedYear] = useState(thisYear);

  // Build year options: 3 years back, current, 1 ahead
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = thisYear - 3; y <= thisYear + 1; y++) years.push(y);
    return years;
  }, [thisYear]);

  // Build 12-month breakdown for selectedYear
  const monthlyBreakdown = useMemo(() => {
    return MONTHS.map(({ key, label }) => {
      const gross = getEmployeeGrossForPeriod(emp, key, selectedYear);
      return { key, label, gross };
    });
  }, [emp, selectedYear]);

  const annualTotal = monthlyBreakdown.reduce((s, m) => s + m.gross, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[calc(100vh-3rem)]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Landscape Header ── */}
        <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 font-bold text-base border border-zinc-200 dark:border-zinc-700 shadow-xs shrink-0 select-none">
                {emp.firstName.charAt(0).toUpperCase()}{emp.lastName?.charAt(0)?.toUpperCase() || ''}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base tracking-tight truncate">
                    {emp.firstName} {emp.lastName}
                  </h3>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    emp.status === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    {emp.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
                  <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] text-zinc-700 dark:text-zinc-300 font-semibold border border-zinc-200/60 dark:border-zinc-700/60">
                    {emp.code}
                  </span>
                  {emp.position && <><span>·</span><span className="font-medium text-zinc-600 dark:text-zinc-300">{emp.position}</span></>}
                  {emp.department && <><span>·</span><span className="font-medium text-zinc-600 dark:text-zinc-300">{emp.department}</span></>}
                  {emp.stateOfResidence && <><span>·</span><span className="text-zinc-500">{emp.stateOfResidence}</span></>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 dark:text-zinc-500">Contract Base</span>
                <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {formatNaira(emp.monthlyGross)}<span className="text-[10px] text-zinc-400 font-normal"> / mo</span>
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable Landscape Body ── */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            {/* ── Left Column: Unified Profile & Statutory Details (50%) ── */}
            <div className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-5">
              
              {/* Section 1: Employment & Tenure */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                  <Building2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Employment &amp; Role
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoRow icon={<Building2 className="w-3 h-3" />} label="Department" value={emp.department} />
                  <InfoRow icon={<BadgeCheck className="w-3 h-3" />} label="Position / Role" value={emp.position} />
                  <InfoRow icon={<BadgeCheck className="w-3 h-3" />} label="Employment Type" value={emp.employmentType || 'Full-Time'} />
                  <InfoRow icon={<MapPin className="w-3 h-3" />} label="State of Residence" value={emp.stateOfResidence || 'Lagos'} />
                  <InfoRow icon={<Calendar className="w-3 h-3" />} label="Start Date" value={formatDate(emp.startDate)} />
                  <InfoRow icon={<Calendar className="w-3 h-3" />} label="End Date" value={formatDate(emp.endDate)} />
                </div>
              </div>

              {/* Hairline Divider */}
              <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/60" />

              {/* Section 2: Contact & Banking */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                  <Landmark className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Contact &amp; Banking
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoRow icon={<Mail className="w-3 h-3" />} label="Work Email" value={emp.email} />
                  <InfoRow icon={<Phone className="w-3 h-3" />} label="Phone Number" value={emp.phone} />
                  <InfoRow icon={<Landmark className="w-3 h-3" />} label="Bank Name" value={emp.bankName} />
                  <InfoRow icon={<Banknote className="w-3 h-3" />} label="Account Number" value={emp.accountNumber} mono />
                </div>
              </div>

              {/* Hairline Divider */}
              <div className="h-px bg-zinc-200/60 dark:bg-zinc-800/60" />

              {/* Section 3: Statutory & Tax Compliance */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                  <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Statutory &amp; Tax Compliance
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <InfoRow
                    icon={<ShieldCheck className="w-3 h-3" />}
                    label="PAYE Tax ID"
                    value={emp.hasPaye
                      ? (emp.payeNumber || 'Active')
                      : 'Exempt'}
                    mono={Boolean(emp.hasPaye && emp.payeNumber)}
                  />
                  <InfoRow
                    icon={<ShieldCheck className="w-3 h-3" />}
                    label="Pension (RSA)"
                    value={emp.hasPension
                      ? (emp.pensionNumber
                          ? (emp.pfaName ? <><span className="block">{emp.pfaName}</span><span className="block font-mono text-zinc-500">{emp.pensionNumber}</span></> : emp.pensionNumber)
                          : (emp.pfaName || 'Active'))
                      : 'Exempt'}
                  />
                  <InfoRow
                    icon={<Banknote className="w-3 h-3" />}
                    label="Annual Rent Relief"
                    value={emp.annualRent && emp.annualRent > 0 ? formatNaira(emp.annualRent) : 'None'}
                    mono
                  />
                  <InfoRow
                    icon={<BadgeCheck className="w-3 h-3" />}
                    label="Profile Status"
                    value={emp.status || 'Active'}
                  />
                </div>
              </div>

            </div>

            {/* ── Right Column: Compensation & 12-Month Schedule (50%) ── */}
            <div className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              
              {/* Header with Year Selector */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      12-Month Remuneration Schedule
                    </h4>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Gross salary distribution for {selectedYear}
                    </p>
                  </div>
                </div>

                <div className="relative flex items-center">
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 pl-3 pr-8 py-1.5 focus:outline-none cursor-pointer shadow-xs"
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Key Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-white dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-0.5">
                    {selectedYear} Annual Gross
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 truncate block">
                    {formatNaira(annualTotal)}
                  </span>
                </div>

                <div className="bg-white dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-3 shadow-xs">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-0.5">
                    Monthly Base
                  </span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 truncate block">
                    {formatNaira(emp.monthlyGross)}
                  </span>
                </div>

                <div className="bg-white dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-3 shadow-xs col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-0.5">
                    Payroll Cycle
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {MONTHS.find(m => m.key === activeCycleMonth)?.label} {activeCycleYear}
                  </span>
                </div>
              </div>

              {/* 12-Month Grid (3 columns × 4 rows) */}
              <div className="grid grid-cols-3 gap-2 flex-1">
                {monthlyBreakdown.map(({ key, label, gross }) => {
                  const isCurrentMonth = key === activeCycleMonth && selectedYear === activeCycleYear;
                  const isOverridden = emp.monthlySalaries?.[`${selectedYear}-${key}`] !== undefined &&
                                       emp.monthlySalaries[`${selectedYear}-${key}`] !== emp.monthlyGross;

                  return (
                    <div
                      key={key}
                      className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isCurrentMonth
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm'
                          : isOverridden
                          ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-zinc-900 dark:text-zinc-100'
                          : 'bg-white dark:bg-zinc-950/70 border-zinc-200/70 dark:border-zinc-800/70 text-zinc-900 dark:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isCurrentMonth ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400 dark:text-zinc-500'
                        }`}>
                          {label}
                        </span>
                        {isCurrentMonth ? (
                          <span className="text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-emerald-500 text-white tracking-wide">
                            Active
                          </span>
                        ) : isOverridden ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Custom monthly override" />
                        ) : null}
                      </div>
                      <div className={`text-[11px] font-mono font-bold leading-tight ${
                        isCurrentMonth ? 'text-white dark:text-zinc-900' : 'text-zinc-800 dark:text-zinc-200'
                      }`}>
                        {formatNaira(gross)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footnote on overrides */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[11px] text-zinc-400 dark:text-zinc-500">
                <span>* Contracted gross remuneration per cycle.</span>
                {emp.monthlySalaries && Object.keys(emp.monthlySalaries).length > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Custom overrides active
                  </span>
                )}
              </div>

            </div>

          </div>
        </div>

        {/* ── Landscape Footer ── */}
        <div className="px-6 py-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:block">
            Viewing comprehensive staff record &bull; <span className="font-mono text-zinc-600 dark:text-zinc-400 font-medium">[{emp.code}]</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => onEdit(emp)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ExitEmployeeModalProps {
  isOpen: boolean;
  employee: Employee | null;
  activeLoan?: EmployeeLoan | null;
  onClose: () => void;
  onConfirm: (empId: string, exitDate: string, reason: string, notes: string) => void;
}

const ExitEmployeeModal: React.FC<ExitEmployeeModalProps> = ({
  isOpen,
  employee,
  activeLoan,
  onClose,
  onConfirm,
}) => {
  const [exitDate, setExitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('Resignation');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setExitDate(new Date().toISOString().split('T')[0]);
      setReason('Resignation');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Mark Employee as Inactive / Exited
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {employee.firstName} {employee.lastName} ({employee.code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {activeLoan && (activeLoan.remainingBalance || 0) > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-900 dark:text-amber-200 space-y-0.5">
                <div className="font-semibold">Outstanding Loan Notice</div>
                <div>
                  This employee has an active {activeLoan.type} with <strong>{formatNaira(activeLoan.remainingBalance)}</strong> remaining. Ensure this is recovered or settled prior to exit.
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Exit / End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={exitDate}
              onChange={e => setExitDate(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Reason for Departure
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 cursor-pointer"
            >
              <option value="Resignation">Resignation</option>
              <option value="Contract Completion">Contract Completion</option>
              <option value="Termination">Termination / Dismissal</option>
              <option value="Retirement">Retirement</option>
              <option value="Redundancy">Redundancy / Layoff</option>
              <option value="Sabbatical / Leave of Absence">Sabbatical / Leave of Absence</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Departure Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Completed handover to Operations team..."
              rows={2}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 resize-none"
            />
          </div>

          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            💡 <strong>Payroll Rule:</strong> {employee.firstName} will be included in the payroll of their exit month ({formatDate(exitDate)}), and automatically omitted from all following months.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(employee.id, exitDate, reason, notes)}
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-xs transition cursor-pointer"
          >
            Confirm Deactivation
          </button>
        </div>
      </div>
    </div>
  );
};

interface ReactivateEmployeeModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onConfirm: (empId: string, resumptionDate: string, newGross: number) => void;
}

const ReactivateEmployeeModal: React.FC<ReactivateEmployeeModalProps> = ({
  isOpen,
  employee,
  onClose,
  onConfirm,
}) => {
  const [resumptionDate, setResumptionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [grossSalary, setGrossSalary] = useState<number>(0);

  useEffect(() => {
    if (isOpen && employee) {
      setResumptionDate(new Date().toISOString().split('T')[0]);
      setGrossSalary(employee.monthlyGross || 0);
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Re-activate / Re-hire Employee
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {employee.firstName} {employee.lastName} ({employee.code})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 text-xs">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-[11px] text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <span>Multi-Stint Employment History Preserved</span>
            </div>
            <div>
              Their previous tenure ({formatDate(employee.startDate)} → {formatDate(employee.endDate)}) will be preserved in their permanent history. RSA PIN, Tax ID, and bank details remain active.
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              New Resumption / Re-hire Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={resumptionDate}
              onChange={e => setResumptionDate(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Monthly Gross Salary (₦)
            </label>
            <input
              type="number"
              value={grossSalary}
              onChange={e => setGrossSalary(Number(e.target.value))}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
          </div>

          <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
            💡 <strong>Payroll Inclusion:</strong> {employee.firstName} will start appearing on payroll again from their resumption month ({formatDate(resumptionDate)}) onwards. Past gap months will remain untouched.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(employee.id, resumptionDate, grossSalary)}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium shadow-xs transition cursor-pointer"
          >
            Confirm Re-hire &amp; Activate
          </button>
        </div>
      </div>
    </div>
  );
};

interface EmployeeListViewProps {
  employees: Employee[];
  departments?: string[];
  loans?: EmployeeLoan[];
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onAddEmployees?: (emps: Omit<Employee, 'id'>[]) => void;
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  onNavigateToExcel: () => void;
  currentYear?: number;
  currentMonth?: string;
  salaryCalculationMode?: SalaryCalculationMode;
  employmentTypeRules?: EmploymentTypeRule[];
  addEmployeeTrigger?: number;
  currentUser?: TeamMember | null;
}

export const EmployeeListView: React.FC<EmployeeListViewProps> = ({
  employees,
  departments: configuredDepartments = [],
  loans = [],
  onAddEmployee,
  onAddEmployees,
  onUpdateEmployee,
  onDeleteEmployee,
  onNavigateToExcel,
  currentYear,
  currentMonth,
  salaryCalculationMode = 'gross-to-net',
  employmentTypeRules,
  addEmployeeTrigger,
  currentUser,
}) => {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'quick' | 'standard'>('quick');
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [viewingEmp, setViewingEmp] = useState<Employee | null>(null);
  const [activeMenuEmpId, setActiveMenuEmpId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);
  const [exitingEmp, setExitingEmp] = useState<Employee | null>(null);
  const [reactivatingEmp, setReactivatingEmp] = useState<Employee | null>(null);

  const handleConfirmExit = (empId: string, exitDate: string, reason: string, notes: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const currentStints = emp.stints && Array.isArray(emp.stints) ? [...emp.stints] : [];
    const openStintIdx = currentStints.findIndex(s => !s.endDate);
    if (openStintIdx >= 0) {
      currentStints[openStintIdx] = {
        ...currentStints[openStintIdx],
        endDate: exitDate,
        exitReason: reason,
        notes,
      };
    } else {
      currentStints.push({
        stintId: `stint-${Date.now()}`,
        startDate: emp.startDate || emp.originalHireDate || exitDate,
        endDate: exitDate,
        exitReason: reason,
        notes,
      });
    }

    onUpdateEmployee(empId, {
      status: 'Inactive',
      endDate: exitDate,
      originalHireDate: emp.originalHireDate || emp.startDate || '',
      stints: currentStints,
    });

    setExitingEmp(null);
  };

  const handleConfirmReactivate = (empId: string, resumptionDate: string, newGross: number) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const currentStints = emp.stints && Array.isArray(emp.stints) ? [...emp.stints] : [];
    if (emp.endDate && !currentStints.some(s => s.endDate === emp.endDate)) {
      currentStints.push({
        stintId: `stint-${Date.now() - 1}`,
        startDate: emp.startDate || emp.originalHireDate || '',
        endDate: emp.endDate,
        exitReason: 'Previous Departure',
      });
    }

    currentStints.push({
      stintId: `stint-${Date.now()}`,
      startDate: resumptionDate,
      endDate: '',
    });

    onUpdateEmployee(empId, {
      status: 'Active',
      originalHireDate: emp.originalHireDate || emp.startDate || resumptionDate,
      startDate: resumptionDate,
      endDate: '',
      monthlyGross: newGross > 0 ? newGross : emp.monthlyGross,
      stints: currentStints,
    });

    setReactivatingEmp(null);
  };

  const lastAddTriggerRef = React.useRef(addEmployeeTrigger || 0);

  useEffect(() => {
    if (addEmployeeTrigger && addEmployeeTrigger > lastAddTriggerRef.current) {
      lastAddTriggerRef.current = addEmployeeTrigger;
      setEditingEmp(null);
      setModalTab('quick');
      setIsModalOpen(true);
    }
  }, [addEmployeeTrigger]);

  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        activeMenuEmpId &&
        !(e.target as Element).closest('.employee-actions-menu') &&
        !(e.target as Element).closest('.employee-actions-dropdown')
      ) {
        setActiveMenuEmpId(null);
        setMenuCoords(null);
      }
    };

    const handleScrollOrResize = () => {
      if (activeMenuEmpId) {
        setActiveMenuEmpId(null);
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
  }, [activeMenuEmpId]);

  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees.filter(Boolean) : [], [employees]);
  const departments = ['ALL', ...Array.from(new Set([...configuredDepartments, ...safeEmployees.map(e => e.department)].filter(Boolean)))];
  const employmentTypes = ['ALL', 'Full-Time', 'Part-Time', 'Contract', 'Intern / NYSC'];

  const filteredEmployees = safeEmployees.filter(emp => {
    if (!emp) return false;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (emp.firstName || '').toLowerCase().includes(term) ||
      (emp.lastName || '').toLowerCase().includes(term) ||
      (emp.code || '').toLowerCase().includes(term) ||
      (emp.department || '').toLowerCase().includes(term) ||
      (emp.employmentType || '').toLowerCase().includes(term) ||
      (emp.payeNumber || '').toLowerCase().includes(term) ||
      (emp.pensionNumber || '').toLowerCase().includes(term) ||
      (emp.pfaName || '').toLowerCase().includes(term);
    
    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
    const matchesType = selectedType === 'ALL' || (emp.employmentType || 'Full-Time') === selectedType;
    const matchesStatus = selectedStatus === 'ALL' || (emp.status || 'Active') === selectedStatus;
    return matchesSearch && matchesDept && matchesType && matchesStatus;
  });

  // Sorting State
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedEmployees = useMemo(() => {
    if (!sortField) return filteredEmployees;
    return [...filteredEmployees].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name': {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'department': {
          const deptA = `${a.department || ''} ${a.position || ''}`.trim().toLowerCase();
          const deptB = `${b.department || ''} ${b.position || ''}`.trim().toLowerCase();
          comparison = deptA.localeCompare(deptB);
          break;
        }
        case 'gross': {
          const grossA = getEmployeeGrossForPeriod(a, currentMonth, currentYear);
          const grossB = getEmployeeGrossForPeriod(b, currentMonth, currentYear);
          comparison = grossA - grossB;
          break;
        }
        case 'rent': {
          comparison = (a.annualRent || 0) - (b.annualRent || 0);
          break;
        }
        case 'bank': {
          const bankA = `${a.bankName || ''} ${a.accountNumber || ''}`.trim().toLowerCase();
          const bankB = `${b.bankName || ''} ${b.accountNumber || ''}`.trim().toLowerCase();
          comparison = bankA.localeCompare(bankB);
          break;
        }
        case 'type': {
          const typeA = (a.employmentType || 'Full-Time').toLowerCase();
          const typeB = (b.employmentType || 'Full-Time').toLowerCase();
          comparison = typeA.localeCompare(typeB);
          break;
        }
        case 'status': {
          const statusA = (a.status || 'Active').toLowerCase();
          const statusB = (b.status || 'Active').toLowerCase();
          comparison = statusA.localeCompare(statusB);
          break;
        }
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredEmployees, sortField, sortDirection, currentMonth, currentYear]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDept, selectedType, selectedStatus]);

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedEmployees.slice(start, start + pageSize);
  }, [sortedEmployees, currentPage, pageSize]);

  const totalGrossCommitment = employees
    .filter(e => e.status === 'Active')
    .reduce((sum, e) => sum + e.monthlyGross, 0);

  const handleEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmp(null);
  };

  const handleSave = (empData: Omit<Employee, 'id'>) => {
    if (editingEmp) {
      onUpdateEmployee(editingEmp.id, empData);
    } else {
      onAddEmployee(empData);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pt-2.5 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Employee Directory
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage staff profiles, monthly gross remuneration, and statutory deduction flags.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isAuditor && (
              <button
                onClick={() => { setEditingEmp(null); setModalTab('quick'); setIsModalOpen(true); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-none cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Employee</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overview Stat Badges */}
      {showStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Total Staff</span>
            <p className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {employees.length}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Active Staff</span>
            <p className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {employees.filter(e => e.status === 'Active').length}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 col-span-2">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              {salaryCalculationMode === 'net-to-gross' ? 'Monthly Target Net Commitment' : 'Monthly Gross Commitment'}
            </span>
            <p className="text-lg font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
              {formatNaira(totalGrossCommitment)}
            </p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code, dept, PAYE ID, or RSA PIN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded pl-8 pr-7 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer font-medium"
              title="Filter by Employment Type"
            >
              {employmentTypes.map(t => (
                <option key={t} value={t}>{t === 'ALL' ? 'All Employment Types' : t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as 'ALL' | 'Active' | 'Inactive')}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer font-medium"
              title="Filter by Status"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Toggle Stats for More Table Room */}
          <button
            type="button"
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded px-2.5 py-1.5 text-xs font-medium transition cursor-pointer shadow-2xs"
            title={showStats ? "Hide summary stats to maximize table room" : "Show summary stats"}
          >
            {showStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{showStats ? "Hide Stats" : "Show Stats"}</span>
          </button>
        </div>
      </div>

      {/* Employees Table Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-xs">
        <div className={`overflow-x-auto overflow-y-auto ${showStats ? 'max-h-[calc(100vh-285px)]' : 'max-h-[calc(100vh-185px)]'}`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[11px] font-semibold shadow-xs">
            <tr>
              <th className="py-2.5 px-3.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 rounded-tl-lg">
                <SortableHeader
                  label="Full Name"
                  field="name"
                  currentSortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                />
              </th>
              <th className="py-2.5 px-3.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <SortableHeader
                  label="Department & Role"
                  field="department"
                  currentSortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                />
              </th>
              <th className="py-2.5 px-3.5 text-right bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <SortableHeader
                  label={salaryCalculationMode === 'net-to-gross' ? 'Target Net Pay' : 'Monthly Gross'}
                  field="gross"
                  currentSortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
              </th>
              <th className="py-2.5 px-3.5 text-right bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <SortableHeader
                  label="Annual Rent"
                  field="rent"
                  currentSortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="right"
                />
              </th>
              <th className="py-2.5 px-3.5 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <SortableHeader
                  label="Bank Account"
                  field="bank"
                  currentSortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="left"
                />
              </th>
              <th className="py-2.5 px-3.5 text-center bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <SortableHeader
                  label="Type"
                  field="type"
                  currentSortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="center"
                />
              </th>
              <th className="py-2.5 px-3.5 text-center bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <SortableHeader
                  label="Status"
                  field="status"
                  currentSortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  align="center"
                />
              </th>
              <th className="py-2.5 px-3.5 text-right font-semibold uppercase tracking-wider text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 rounded-tr-lg">
                Actions
              </th>
            </tr>
          </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-400 text-xs">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp, index) => {
                  const isDropUp = paginatedEmployees.length >= 4
                    ? index >= paginatedEmployees.length - 2
                    : paginatedEmployees.length === 3
                    ? index === 2
                    : false;

                  return (
                    <tr 
                      key={emp.id} 
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button, select, a, input, .employee-actions-menu')) return;
                        setViewingEmp(emp);
                      }}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3.5">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{emp.firstName} {emp.lastName}</div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[200px]">{emp.email || 'No email on file'}</div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="text-zinc-800 dark:text-zinc-200 font-medium text-xs">{emp.department}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{emp.position || '—'}</div>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100 text-right">
                        {formatNaira(getEmployeeGrossForPeriod(emp, currentMonth, currentYear))}
                        {emp.monthlySalaries && Object.keys(emp.monthlySalaries).length > 0 && (
                          <span className="block text-[11px] font-sans text-amber-600 dark:text-amber-400 font-medium">
                            Variable schedule
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-xs text-zinc-500 dark:text-zinc-400 text-right">
                        {emp.annualRent > 0 ? formatNaira(emp.annualRent) : '—'}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="text-zinc-800 dark:text-zinc-200 text-xs font-medium">{emp.bankName || '—'}</div>
                        <div className="font-mono text-[11px] text-zinc-400 tracking-wider">{emp.accountNumber || '—'}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span className="inline-block text-[11px] px-2.5 py-0.5 rounded font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/60">
                          {emp.employmentType || 'Full-Time'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <button
                          disabled={isAuditor}
                          onClick={() => {
                            if (isAuditor) return;
                            if (emp.status === 'Active') {
                              setExitingEmp(emp);
                            } else {
                              setReactivatingEmp(emp);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium transition border ${
                            isAuditor ? 'cursor-default opacity-90' : 'cursor-pointer'
                          } ${
                            emp.status === 'Active' 
                              ? `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ${!isAuditor ? 'hover:bg-emerald-500/20' : ''} border-emerald-500/20` 
                              : `bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 ${!isAuditor ? 'hover:bg-zinc-500/20' : ''} border-zinc-500/20`
                          }`}
                          title={isAuditor ? `Status: ${emp.status}` : (emp.status === 'Active' ? 'Click to mark as inactive / exited' : 'Click to re-activate / re-hire')}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                          <span>{emp.status}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="relative inline-block text-left employee-actions-menu">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeMenuEmpId === emp.id) {
                                setActiveMenuEmpId(null);
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
                                setActiveMenuEmpId(emp.id);
                              }
                            }}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              activeMenuEmpId === emp.id
                                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                                : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                            title="Actions menu"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuEmpId === emp.id && menuCoords && (
                            <div 
                              style={{ 
                                top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
                                bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
                                right: `${menuCoords.right}px` 
                              }}
                              className="fixed w-48 bg-white dark:bg-[#18181d] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 text-xs z-[9999] animate-in fade-in text-left employee-actions-dropdown"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuEmpId(null);
                                  setMenuCoords(null);
                                  setViewingEmp(emp);
                                }}
                                className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                <span>View Profile</span>
                              </button>

                              {!isAuditor && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuEmpId(null);
                                      setMenuCoords(null);
                                      handleEdit(emp);
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Edit Employee</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuEmpId(null);
                                      setMenuCoords(null);
                                      if (emp.status === 'Active') {
                                        setExitingEmp(emp);
                                      } else {
                                        setReactivatingEmp(emp);
                                      }
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                  >
                                    {emp.status === 'Active' ? (
                                      <>
                                        <UserX className="w-3.5 h-3.5 text-amber-500" />
                                        <span>Mark Inactive</span>
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>Mark Active</span>
                                      </>
                                    )}
                                  </button>

                                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuEmpId(null);
                                      setMenuCoords(null);
                                      if (confirm(`Are you sure you want to delete ${emp.firstName} ${emp.lastName}?`)) {
                                        onDeleteEmployee(emp.id);
                                      }
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete Employee</span>
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
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="staff"
        />
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <EmployeeFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          onSaveMultiple={onAddEmployees || ((emps) => emps.forEach(onAddEmployee))}
          onDelete={onDeleteEmployee}
          existingEmployees={employees}
          editingEmployee={editingEmp}
          currentYear={currentYear}
          availableDepartments={configuredDepartments}
          salaryCalculationMode={salaryCalculationMode}
          employmentTypeRules={employmentTypeRules}
          initialTab={modalTab}
        />
      )}

      {/* ── Comprehensive Employee View Modal ── */}
      {viewingEmp && (
        <EmployeeViewModal
          emp={viewingEmp}
          currentMonth={currentMonth}
          currentYear={currentYear}
          onClose={() => setViewingEmp(null)}
          onEdit={(e) => { setViewingEmp(null); handleEdit(e); }}
          isReadOnly={isAuditor}
        />
      )}

      {/* ── Exit Employee Modal ── */}
      <ExitEmployeeModal
        isOpen={!!exitingEmp}
        employee={exitingEmp}
        activeLoan={loans.find(l => l.employeeId === exitingEmp?.id && l.status === 'Active' && (l.remainingBalance || 0) > 0)}
        onClose={() => setExitingEmp(null)}
        onConfirm={handleConfirmExit}
      />

      {/* ── Reactivate Employee Modal ── */}
      <ReactivateEmployeeModal
        isOpen={!!reactivatingEmp}
        employee={reactivatingEmp}
        onClose={() => setReactivatingEmp(null)}
        onConfirm={handleConfirmReactivate}
      />
    </div>
  );
};
