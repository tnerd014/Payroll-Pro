import React, { useState, useRef, useEffect } from 'react';
import { 
  CreditCard, 
  PauseCircle, 
  PlayCircle, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  MoreVertical,
  Edit3,
  History,
  Trash2
} from 'lucide-react';
import { EmployeeLoan } from '../../types';
import { formatNaira, formatDate } from '../../engine/payePensionEngine';

interface MobileLoanCardProps {
  loan: EmployeeLoan;
  employeeName: string;
  onViewDetails: (loan: EmployeeLoan) => void;
  onEdit: (loan: EmployeeLoan) => void;
  onPauseResume: (id: string) => void;
  onViewLedger: (loan: EmployeeLoan) => void;
  onDelete: (loan: EmployeeLoan) => void;
  isReadOnly?: boolean;
}

export const MobileLoanCard: React.FC<MobileLoanCardProps> = ({
  loan,
  employeeName,
  onViewDetails,
  onEdit,
  onPauseResume,
  onViewLedger,
  onDelete,
  isReadOnly = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const percentRepaid = loan.principalAmount > 0 
    ? Math.min(100, Math.round((loan.totalRepaid / loan.principalAmount) * 100))
    : 0;

  const isActive = loan.status === 'Active';
  const isPaused = loan.status === 'Paused';
  const isPaid = loan.status === 'Paid';

  const dateLabel = loan.createdAt ? formatDate(loan.createdAt) : (loan.disbursementDate ? formatDate(loan.disbursementDate) : '');

  // Close 3-dot menu on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleGlobalClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [isMenuOpen]);

  return (
    <div 
      onClick={() => onViewDetails(loan)}
      className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 shadow-xs space-y-3 select-none relative cursor-pointer active:scale-[0.99] transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
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

        {/* 3-Dot Action Menu Button */}
        <div 
          ref={menuRef} 
          className="relative shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsMenuOpen(prev => !prev)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
            title="Loan Actions"
            aria-label="Loan Actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Minimalist 3-dot dropdown matching Desktop & Mobile standards */}
          {isMenuOpen && (
            <div 
              className="absolute right-0 top-9 w-48 bg-white dark:bg-[#18181d] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Edit Facility */}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit(loan);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Edit Facility</span>
                </button>
              )}

              {/* 2. Pause / Resume Deductions */}
              {!isPaid && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onPauseResume(loan.id);
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

              {/* 3. Repayment Ledger */}
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onViewLedger(loan);
                }}
                className="w-full px-3 py-2 flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Repayment Ledger</span>
              </button>

              {/* 4. Delete Facility */}
              {!isReadOnly && (
                <>
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete(loan);
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

    </div>
  );
};
