import React from 'react';
import { FileText } from 'lucide-react';
import { CalculatedPayrollItem } from '../../types';
import { formatNaira } from '../../engine/payePensionEngine';

interface MobilePayrollCardProps {
  item: CalculatedPayrollItem;
  onViewPayslip: (item: CalculatedPayrollItem) => void;
  isLocked?: boolean;
}

export const MobilePayrollCard: React.FC<MobilePayrollCardProps> = ({
  item,
  onViewPayslip,
}) => {
  // Compute initials from fullName
  const nameParts = (item.fullName || 'Employee').trim().split(/\s+/);
  const initials = `${nameParts[0]?.charAt(0) || ''}${nameParts[1]?.charAt(0) || ''}`.toUpperCase() || 'E';

  return (
    <div 
      className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3 shadow-xs transition-all select-none cursor-pointer active:scale-[0.99] group hover:border-emerald-500/40"
      onClick={() => onViewPayslip(item)}
      title="Tap to preview payslip"
    >
      <div className="flex items-start justify-between gap-2.5">
        {/* Left: Avatar with Initials & Personnel Details */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/80 shrink-0 mt-0.5 group-hover:border-emerald-500/50 transition-colors">
            {initials}
          </div>
          
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors break-words">
              {item.fullName}
            </h4>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide uppercase mt-0.5">
              {item.department || 'General'}
            </p>
          </div>
        </div>

        {/* Right Financials & Minimalist Icon Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-xs sm:text-[13px] font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-tight">
              {formatNaira(item.netTakeHome)}
            </div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
              Gross: <span className="font-mono">{formatNaira(item.monthlyGross)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewPayslip(item);
            }}
            className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center transition-all shadow-2xs active:scale-90 cursor-pointer shrink-0"
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
