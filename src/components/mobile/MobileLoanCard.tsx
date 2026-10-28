import React from 'react';
import { 
  CreditCard, 
  PauseCircle, 
  PlayCircle, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import { EmployeeLoan } from '../../types';
import { formatNaira, formatDate } from '../../engine/payePensionEngine';

interface MobileLoanCardProps {
  loan: EmployeeLoan;
  employeeName: string;
  onPauseResume: (id: string) => void;
  onRecordPayment: (loan: EmployeeLoan) => void;
  isReadOnly?: boolean;
}

export const MobileLoanCard: React.FC<MobileLoanCardProps> = ({
  loan,
  employeeName,
  onPauseResume,
  onRecordPayment,
  isReadOnly = false,
}) => {
  const percentRepaid = loan.principalAmount > 0 
    ? Math.min(100, Math.round((loan.totalRepaid / loan.principalAmount) * 100))
    : 0;

  const isActive = loan.status === 'Active';
  const isPaid = loan.status === 'Paid';

  const dateLabel = loan.createdAt ? formatDate(loan.createdAt) : (loan.disbursementDate ? formatDate(loan.disbursementDate) : '');

  return (
    <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 shadow-xs space-y-3 select-none">
      
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {employeeName}
            </h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
              isPaid
                ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                : isActive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}>
              {loan.status}
            </span>
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {loan.type} {dateLabel ? `• Started ${dateLabel}` : ''}
          </p>
        </div>

        {/* Pause/Resume Switch */}
        {!isPaid && !isReadOnly && (
          <button
            type="button"
            onClick={() => onPauseResume(loan.id)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isActive
                ? 'text-zinc-500 hover:text-amber-600 border-zinc-200 dark:border-zinc-800'
                : 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
            }`}
            title={isActive ? 'Pause loan deductions' : 'Resume deductions'}
          >
            {isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">Repayment Progress</span>
          <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 text-[11px]">{percentRepaid}%</span>
        </div>
        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isPaid ? 'bg-emerald-500' : 'bg-emerald-600 dark:bg-emerald-400'
            }`}
            style={{ width: `${percentRepaid}%` }}
          />
        </div>
      </div>

      {/* Numbers Grid */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase font-medium">Remaining</span>
          <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {formatNaira(loan.remainingBalance)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-zinc-400 uppercase font-medium">Monthly Rate</span>
          <p className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
            {formatNaira(loan.monthlyDeduction)} <span className="text-[10px] text-zinc-400 font-normal">/ mo</span>
          </p>
        </div>
      </div>

      {/* Action Row */}
      {!isPaid && !isReadOnly && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex gap-2">
          <button
            type="button"
            onClick={() => onRecordPayment(loan)}
            className="w-full py-1.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Manual Payment</span>
          </button>
        </div>
      )}

    </div>
  );
};
