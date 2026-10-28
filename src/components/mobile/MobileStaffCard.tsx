import React from 'react';
import { 
  Building2, 
  MapPin, 
  ChevronRight, 
  Edit3, 
  UserCheck, 
  UserX,
  CreditCard,
  Phone,
  Mail
} from 'lucide-react';
import { Employee } from '../../types';
import { formatNaira } from '../../engine/payePensionEngine';
import { formatDate } from '../../engine/dateUtils';

interface MobileStaffCardProps {
  employee: Employee;
  onView: (emp: Employee) => void;
  onEdit?: (emp: Employee) => void;
}

export const MobileStaffCard: React.FC<MobileStaffCardProps> = ({
  employee,
  onView,
  onEdit: _onEdit,
}) => {
  const initials = `${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}`.toUpperCase() || 'E';
  const isActive = employee.status === 'Active';

  return (
    <div 
      className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all select-none cursor-pointer active:scale-[0.99] group"
      onClick={() => onView(employee)}
    >
      <div className="flex items-start justify-between gap-2.5">
        {/* Left: Avatar & Identity with Full Name Wrapping */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/80 shrink-0 mt-0.5">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-snug break-words group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {employee.firstName} {employee.lastName}
            </h4>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 break-words">
              {employee.position || 'Staff Member'} &bull; <span className="font-medium text-zinc-700 dark:text-zinc-300">{employee.department || 'General'}</span>
            </p>

            {(employee.startDate || employee.endDate) && (
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                {employee.startDate && <span>Joined {formatDate(employee.startDate)}</span>}
                {employee.startDate && employee.endDate && <span>&bull;</span>}
                {employee.endDate && (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Exit {formatDate(employee.endDate)}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right Status Badge & Arrow */}
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
            isActive
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
            {employee.status}
          </span>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* Bottom Metadata Strip */}
      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-zinc-500">
          <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-semibold">
            {employee.code || 'ID'}
          </span>
          <span className="text-[11px] text-zinc-400">
            {employee.employmentType || 'Full-Time'}
          </span>
        </div>

        <div className="text-right">
          <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100">
            {formatNaira(employee.monthlyGross)}
          </span>
          <span className="text-[10px] text-zinc-400 font-normal"> / mo</span>
        </div>
      </div>

    </div>
  );
};
