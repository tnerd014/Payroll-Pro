import React, { useState, useMemo } from 'react';
import { PauseCircle, PlayCircle, X } from 'lucide-react';
import { EmployeeLoan, Employee, TeamMember } from '../../types';
import { formatNaira } from '../../engine/payePensionEngine';
import { MONTHS } from '../../store/usePayrollStore';

interface PauseLoanModalProps {
  isOpen: boolean;
  loan: EmployeeLoan | null;
  employee?: Employee;
  selectedMonth: string;
  selectedYear: number;
  currentUser?: TeamMember | null;
  onClose: () => void;
  onConfirmPause: (loanId: string, options: { reason: string; pausedUntilPeriodKey?: string; performedBy?: string }) => void;
  onConfirmResume: (loanId: string, options?: { reason?: string; performedBy?: string }) => void;
}

export const PauseLoanModal: React.FC<PauseLoanModalProps> = ({
  isOpen,
  loan,
  employee,
  selectedMonth,
  selectedYear,
  currentUser,
  onClose,
  onConfirmPause,
  onConfirmResume,
}) => {
  if (!isOpen || !loan) return null;

  const isAlreadyPaused = loan.status === 'Paused';

  // Build the next 6 month options + Indefinite + Custom
  const monthOptions = useMemo(() => {
    const curIdx = Math.max(0, MONTHS.findIndex(m => m.key.toLowerCase() === selectedMonth.toLowerCase()));
    const opts: { label: string; key: string }[] = [];
    for (let i = 1; i <= 6; i++) {
      const totalMonths = selectedYear * 12 + curIdx + i;
      const y = Math.floor(totalMonths / 12);
      const mIdx = totalMonths % 12;
      const m = MONTHS[mIdx];
      if (m) opts.push({ label: `${m.label.slice(0, 3)} ${y}`, key: `${y}-${m.key}` });
    }
    return opts;
  }, [selectedMonth, selectedYear]);

  // Selected mode: month key (e.g. "2027-mar") | "indefinite" | "custom"
  const [resumeMode, setResumeMode] = useState<string>(monthOptions[0]?.key ?? 'indefinite');

  // Custom month/year state
  const [customMonthKey, setCustomMonthKey] = useState<string>(() => {
    const curIdx = Math.max(0, MONTHS.findIndex(m => m.key.toLowerCase() === selectedMonth.toLowerCase()));
    const nextIdx = (curIdx + 7) % 12;
    return MONTHS[nextIdx]?.key || 'jan';
  });
  const [customYear, setCustomYear] = useState<number>(() => {
    const curIdx = Math.max(0, MONTHS.findIndex(m => m.key.toLowerCase() === selectedMonth.toLowerCase()));
    return curIdx + 7 >= 12 ? selectedYear + 1 : selectedYear;
  });

  // Reason state
  const REASONS = ['Hardship', 'Medical', 'Dispute', 'Leave', 'Admin', 'Custom'];
  const [reasonCategory, setReasonCategory] = useState<string>('Hardship');
  const [customReasonText, setCustomReasonText] = useState<string>('');

  // Handle Pause submit
  const handlePauseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const performer = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Payroll Administrator';

    let finalPeriodKey: string | undefined = undefined;
    if (resumeMode === 'custom') {
      finalPeriodKey = `${customYear}-${customMonthKey}`;
    } else if (resumeMode !== 'indefinite') {
      finalPeriodKey = resumeMode;
    }

    const finalReason = reasonCategory === 'Custom'
      ? (customReasonText.trim() || 'Custom')
      : reasonCategory;

    onConfirmPause(loan.id, {
      reason: finalReason,
      pausedUntilPeriodKey: finalPeriodKey,
      performedBy: performer,
    });
    onClose();
  };

  // Handle Resume submit
  const handleResumeSubmit = () => {
    const performer = currentUser ? `${currentUser.name} (${currentUser.role})` : 'Payroll Administrator';
    onConfirmResume(loan.id, { reason: 'Manually reactivated', performedBy: performer });
    onClose();
  };

  const empName = employee ? `${employee.firstName} ${employee.lastName}` : loan.type;

  // Custom month label for hint
  const customMonthObj = MONTHS.find(m => m.key.toLowerCase() === customMonthKey.toLowerCase());
  const customMonthLabel = customMonthObj ? `${customMonthObj.label.slice(0, 3)} ${customYear}` : `${customMonthKey} ${customYear}`;

  const availableYears = [selectedYear, selectedYear + 1, selectedYear + 2, selectedYear + 3];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white dark:bg-[#111113] border-t sm:border border-zinc-200/80 dark:border-zinc-800/80 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Pull Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-9 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {isAlreadyPaused ? 'Resume Deductions' : 'Pause Deductions'}
            </p>
            <p className="text-xs text-zinc-400 truncate">{empName} · {formatNaira(loan.remainingBalance)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        {isAlreadyPaused ? (
          <div className="p-4 space-y-4">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Paused reason</span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200 text-right max-w-[55%] truncate">{loan.pausedReason || '—'}</span>
              </div>
              {loan.pausedUntilPeriodKey && (
                <div className="flex justify-between text-zinc-500">
                  <span>Auto-resume</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{loan.pausedUntilPeriodKey}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-500">
                <span>Monthly deduction</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatNaira(loan.monthlyDeduction)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Keep Paused
              </button>
              <button
                type="button"
                onClick={handleResumeSubmit}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Resume
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePauseSubmit} className="flex flex-col">
            <div className="p-4 space-y-3.5">

              {/* Resume From Pills */}
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Resume From</p>
                <div className="flex flex-wrap gap-1.5">
                  {monthOptions.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setResumeMode(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        resumeMode === opt.key
                          ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setResumeMode('indefinite')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      resumeMode === 'indefinite'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    Indefinite
                  </button>

                  <button
                    type="button"
                    onClick={() => setResumeMode('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      resumeMode === 'custom'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Custom Month + Year Dropdowns */}
                {resumeMode === 'custom' && (
                  <div className="mt-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400 font-medium pl-1">Resume:</span>
                    <select
                      value={customMonthKey}
                      onChange={(e) => setCustomMonthKey(e.target.value)}
                      className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-amber-500"
                    >
                      {MONTHS.map(m => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      value={customYear}
                      onChange={(e) => setCustomYear(parseInt(e.target.value, 10))}
                      className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-amber-500"
                    >
                      {availableYears.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Reason Pills */}
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">Reason</p>
                <div className="flex flex-wrap gap-1.5">
                  {REASONS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReasonCategory(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        reasonCategory === r
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Custom Reason Input */}
                {reasonCategory === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Type custom reason..."
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    className="w-full mt-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                )}
              </div>

              {/* Status Hint */}
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 pt-0.5">
                {resumeMode === 'indefinite'
                  ? 'Paused indefinitely — resume manually when ready.'
                  : resumeMode === 'custom'
                  ? `Deductions auto-resume in ${customMonthLabel}.`
                  : `Deductions auto-resume in ${monthOptions.find(o => o.key === resumeMode)?.label || resumeMode}.`}
              </p>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Pause
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
