import React from 'react';
import { FileText, MailCheck } from 'lucide-react';
import { CalculatedPayrollItem } from '../../types';
import { formatNaira } from '../../engine/payePensionEngine';

interface MobilePayrollCardProps {
  item: CalculatedPayrollItem;
  onViewPayslip: (item: CalculatedPayrollItem) => void;
  isLocked?: boolean;
  isEmailed?: boolean;
}

export const MobilePayrollCard: React.FC<MobilePayrollCardProps> = ({
  item,
  onViewPayslip,
  isEmailed,
}) => {
  // Compute initials from fullName
  const nameParts = (item.fullName || 'Employee').trim().split(/\s+/);
  const initials = `${nameParts[0]?.charAt(0) || ''}${nameParts[1]?.charAt(0) || ''}`.toUpperCase() || 'E';

  return (
    <div 
      className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3 shadow-xs select-none"
    >
      <div className="flex items-center justify-between gap-2.5">
        {/* Left: Avatar with Initials & Employee Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="app-subtle-surface w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/80 shrink-0">
            {initials}
          </div>
          
          <div className="min-w-0 flex-1 flex items-center gap-1.5">
            <h4 className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug truncate">
              {item.fullName}
            </h4>
            {isEmailed && (
              <span 
                className="app-positive-text inline-flex items-center text-emerald-600 dark:text-emerald-400 shrink-0" 
                title="Payslip emailed"
              >
                <MailCheck className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>

        {/* Right: Net Take Home & View Payslip Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="app-money-text text-xs sm:text-[13px] font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-tight">
            {formatNaira(item.netTakeHome)}
          </div>

          <button
            type="button"
            onClick={() => onViewPayslip(item)}
            className="app-subtle-surface app-accent-text w-8 h-8 rounded-xl bg-emerald-50 hover:opacity-85 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center transition-all shadow-2xs active:scale-90 cursor-pointer shrink-0"
            title="View Payslip"
            aria-label="View Payslip"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
