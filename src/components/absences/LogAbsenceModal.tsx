import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  CalendarOff, 
  Clock, 
  AlertTriangle, 
  Info, 
  Calendar, 
  DollarSign, 
  User,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { 
  Employee, 
  EmployeeAbsenceRecord, 
  AbsenceType, 
  PayrollVariables,
  WorkSchedule 
} from '../../types';
import { formatNaira, getScheduleWorkdays } from '../../engine/payePensionEngine';

interface LogAbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  payrollVariables?: PayrollVariables;
  selectedMonth: string;
  selectedYear: number;
  monthLabel: string;
  initialEmployeeId?: string;
  existingAbsence?: EmployeeAbsenceRecord | null;
  onSaveAbsence: (absenceData: Omit<EmployeeAbsenceRecord, 'id' | 'createdAt'> & { id?: string }) => void;
  onDeleteAbsence?: (id: string) => void;
  isReadOnly?: boolean;
}

export const LogAbsenceModal: React.FC<LogAbsenceModalProps> = ({
  isOpen,
  onClose,
  employees,
  payrollVariables,
  selectedMonth,
  selectedYear,
  monthLabel,
  initialEmployeeId,
  existingAbsence,
  onSaveAbsence,
  onDeleteAbsence,
  isReadOnly = false,
}) => {
  const currentPeriodKey = `${selectedYear}-${selectedMonth}`;

  // Form State
  const [employeeId, setEmployeeId] = useState<string>(
    existingAbsence?.employeeId || initialEmployeeId || (employees[0]?.id || '')
  );
  const [daysAbsent, setDaysAbsent] = useState<number>(
    existingAbsence ? Number(existingAbsence.daysAbsent) : 1
  );
  const [absenceType, setAbsenceType] = useState<AbsenceType>(
    existingAbsence?.absenceType || 'unauthorized_absence'
  );
  const [customOverride, setCustomOverride] = useState<boolean>(
    Boolean(existingAbsence?.customOverride)
  );
  const [customDeductionAmount, setCustomDeductionAmount] = useState<number>(
    existingAbsence ? Number(existingAbsence.deductionAmount) : 0
  );
  const [notes, setNotes] = useState<string>(existingAbsence?.notes || '');
  const [selectedDates, setSelectedDates] = useState<string[]>(
    existingAbsence?.dates && Array.isArray(existingAbsence.dates) ? existingAbsence.dates : []
  );

  // Reset when initialEmployeeId or existingAbsence changes
  useEffect(() => {
    if (existingAbsence) {
      setEmployeeId(existingAbsence.employeeId);
      setDaysAbsent(Number(existingAbsence.daysAbsent) || 0);
      setAbsenceType(existingAbsence.absenceType || 'unauthorized_absence');
      setCustomOverride(Boolean(existingAbsence.customOverride));
      setCustomDeductionAmount(Number(existingAbsence.deductionAmount) || 0);
      setNotes(existingAbsence.notes || '');
      setSelectedDates(Array.isArray(existingAbsence.dates) ? existingAbsence.dates : []);
    } else if (initialEmployeeId) {
      setEmployeeId(initialEmployeeId);
      setDaysAbsent(0);
      setAbsenceType('unauthorized_absence');
      setCustomOverride(false);
      setCustomDeductionAmount(0);
      setNotes('');
      setSelectedDates([]);
    }
  }, [existingAbsence, initialEmployeeId]);

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === employeeId);
  }, [employees, employeeId]);

  // Work Schedule & Workdays calculation
  const workSchedule: WorkSchedule = selectedEmployee?.workSchedule || '5-day';
  const divisorRule = payrollVariables?.workdayDivisorRule || 'actual_weekdays';
  
  const scheduledWorkdays = useMemo(() => {
    return getScheduleWorkdays(selectedYear, selectedMonth, workSchedule, divisorRule);
  }, [selectedYear, selectedMonth, workSchedule, divisorRule]);

  const contractualGross = Number(selectedEmployee?.monthlyGross) || 0;
  
  const dailyRate = useMemo(() => {
    if (scheduledWorkdays <= 0) return 0;
    return contractualGross / scheduledWorkdays;
  }, [contractualGross, scheduledWorkdays]);

  const calculatedDeduction = useMemo(() => {
    if (customOverride) {
      return Math.max(0, customDeductionAmount);
    }
    const multiplier = absenceType === 'suspension_half_pay' ? 0.5 : 1.0;
    return Math.round(dailyRate * daysAbsent * multiplier * 100) / 100;
  }, [customOverride, customDeductionAmount, dailyRate, daysAbsent, absenceType]);

  const proratedGross = Math.max(0, contractualGross - calculatedDeduction);

  const MONTH_INDEX_MAP: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const mIdx = MONTH_INDEX_MAP[selectedMonth.toLowerCase()] ?? 10;
  const totalDaysInMonth = new Date(selectedYear, mIdx + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, mIdx, 1).getDay(); // 0 = Sun
  const mondayOffset = (firstDayOfWeek + 6) % 7;

  const monthCalendarDays = useMemo(() => {
    const list: Array<{
      day: number;
      dateStr: string;
      isWeekend: boolean;
      isWorkday: boolean;
      dayOfWeekName: string;
    }> = [];

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dObj = new Date(selectedYear, mIdx, d);
      const dow = dObj.getDay();
      const isSun = dow === 0;
      const isSat = dow === 6;
      const isWeekend = isSun || (workSchedule === '5-day' && isSat);
      const dateStr = `${selectedYear}-${String(mIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      list.push({
        day: d,
        dateStr,
        isWeekend,
        isWorkday: !isWeekend,
        dayOfWeekName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dow]
      });
    }
    return list;
  }, [selectedYear, mIdx, totalDaysInMonth, workSchedule]);

  const toggleDate = (dateStr: string, isWeekend: boolean) => {
    if (isReadOnly) return;
    let nextDates: string[];
    if (selectedDates.includes(dateStr)) {
      nextDates = selectedDates.filter(d => d !== dateStr);
    } else {
      nextDates = [...selectedDates, dateStr].sort();
    }
    setSelectedDates(nextDates);

    // Count workdays among selected dates
    const workdaysCount = nextDates.filter(ds => {
      const parts = ds.split('-');
      const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dow = dObj.getDay();
      return !(dow === 0 || (workSchedule === '5-day' && dow === 6));
    }).length;

    setDaysAbsent(workdaysCount);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      alert('Please select an employee.');
      return;
    }
    if (selectedDates.length === 0 && daysAbsent <= 0 && !customOverride) {
      alert('Please select at least one absence date on the calendar.');
      return;
    }

    onSaveAbsence({
      id: existingAbsence?.id,
      employeeId,
      periodKey: currentPeriodKey,
      daysAbsent,
      absenceType,
      deductionAmount: calculatedDeduction,
      customOverride,
      notes: notes.trim(),
      dates: selectedDates,
    });

    onClose();
  };

  const handleDelete = () => {
    if (!existingAbsence?.id || !onDeleteAbsence) return;
    if (confirm('Are you sure you want to remove this absence record? The employee will receive their full contractual salary.')) {
      onDeleteAbsence(existingAbsence.id);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#121215] border-t sm:border border-zinc-200/90 dark:border-zinc-800/90 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CalendarOff className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {existingAbsence ? 'Edit Absence' : 'Log Employee Absence'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                  {monthLabel} {selectedYear}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Prorate contractual salary for unpaid non-working days
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition shrink-0 ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
          {/* Employee Selection */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Select Employee
            </label>
            <select
              value={employeeId}
              disabled={Boolean(existingAbsence) || isReadOnly}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs disabled:opacity-60"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.code} — {emp.firstName} {emp.lastName} ({emp.department || 'General'})
                </option>
              ))}
            </select>
          </div>

          {/* Schedule & Daily Rate Info Strip */}
          {selectedEmployee && (
            <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 block">
                  Schedule & Workdays
                </span>
                <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                  {workSchedule === '6-day' ? '6-Day (Mon–Sat)' : '5-Day (Mon–Fri)'} &bull; <span className="font-mono text-zinc-500">{scheduledWorkdays} days</span>
                </p>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 block">
                  Daily Rate
                </span>
                <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                  {formatNaira(dailyRate)}
                </p>
              </div>
            </div>
          )}

          {/* Calendar Date Picker & Absence Duration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Select Absence Dates
              </label>
              {selectedDates.length > 0 && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDates([]);
                    setDaysAbsent(0);
                  }}
                  className="text-[11px] text-zinc-400 hover:text-rose-500 transition cursor-pointer"
                >
                  Clear selection
                </button>
              )}
            </div>

            <div className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800/70 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {selectedMonth} {selectedYear}
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                  {daysAbsent} {daysAbsent === 1 ? 'day' : 'days'} absent
                </span>
              </div>

              {/* Day of week headers (Mon -> Sun) */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayHeader, idx) => (
                  <div
                    key={idx}
                    className={`text-[10px] font-bold py-1 ${
                      idx >= 5 ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {dayHeader}
                  </div>
                ))}

                {/* Empty cells for Monday offset */}
                {Array.from({ length: mondayOffset }).map((_, i) => (
                  <div key={`offset-${i}`} className="h-7" />
                ))}

                {/* Days of Month */}
                {monthCalendarDays.map((calDay) => {
                  const isSelected = selectedDates.includes(calDay.dateStr);
                  return (
                    <button
                      type="button"
                      key={calDay.dateStr}
                      disabled={isReadOnly}
                      onClick={() => toggleDate(calDay.dateStr, calDay.isWeekend)}
                      title={`${calDay.dayOfWeekName}, ${calDay.dateStr}${calDay.isWeekend ? ' (Weekend / Non-working day)' : ''}`}
                      className={`h-7 rounded-lg text-xs font-mono transition flex items-center justify-center cursor-pointer select-none ${
                        isSelected
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs scale-[0.98]'
                          : calDay.isWeekend
                          ? 'text-zinc-300 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 font-medium'
                      }`}
                    >
                      {calDay.day}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
                <span>Click dates to toggle</span>
                <span>{workSchedule === '5-day' ? 'Mon–Fri schedule' : 'Mon–Sat schedule'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Absence Type
              </label>
              <select
                value={absenceType}
                disabled={isReadOnly}
                onChange={(e) => setAbsenceType(e.target.value as AbsenceType)}
                className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
              >
                <option value="unauthorized_absence">Unauthorized Absence (100% Unpaid)</option>
                <option value="unpaid_leave">Authorized Unpaid Leave</option>
                <option value="suspension_half_pay">Suspension (50% Pay)</option>
                <option value="suspension_unpaid">Disciplinary (100% Unpaid)</option>
              </select>
            </div>
          </div>

          {/* Custom Deduction Override Toggle */}
          <div className="pt-0.5 space-y-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customOverride}
                disabled={isReadOnly}
                onChange={(e) => setCustomOverride(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Override calculated amount with a custom lump-sum deduction
              </span>
            </label>

            {customOverride && (
              <div className="relative flex items-center animate-in fade-in duration-150">
                <span className="absolute left-3 text-xs text-zinc-400 font-mono">₦</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0.00"
                  value={customDeductionAmount || ''}
                  disabled={isReadOnly}
                  onChange={(e) => setCustomDeductionAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-2 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* Notes or Reason */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Notes / Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Unannounced absence without prior notice"
              value={notes}
              disabled={isReadOnly}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 shadow-2xs"
            />
          </div>

          {/* Minimalist Statutory Computation Preview */}
          <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2 text-xs">
            <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400">
              <span>Contractual Monthly Gross</span>
              <span className="font-mono">{formatNaira(contractualGross)}</span>
            </div>
            <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-medium">
              <span>Unpaid Days Deduction ({daysAbsent}d)</span>
              <span className="font-mono font-bold">-{formatNaira(calculatedDeduction)}</span>
            </div>
            <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 pt-2 flex justify-between items-center font-bold text-zinc-900 dark:text-zinc-100">
              <span>Adjusted Earned Gross</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatNaira(proratedGross)}</span>
            </div>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 pt-1 leading-normal border-t border-zinc-100 dark:border-zinc-800">
              Section 5 Compliance: Unpaid absence reduces taxable earned gross before PAYE & Pension calculations. Arbitrary fines are prohibited.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80 gap-2">
            {existingAbsence?.id && !isReadOnly ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 active:scale-95 transition shadow-sm cursor-pointer"
                >
                  Save Record
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

