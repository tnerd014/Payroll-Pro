import React, { useMemo } from 'react';
import { 
  Building2, 
  Users, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  TrendingUp 
} from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  PayrollSnapshot, 
  AppView, 
  CompanyProfile 
} from '../../../types';
import { formatNaira, formatCompactNaira } from '../../../engine/payePensionEngine';

interface MobileDashboardViewProps {
  items: CalculatedPayrollItem[];
  staffCount: number;
  monthLabel: string;
  year: number;
  activeSnapshot: PayrollSnapshot | undefined;
  onNavigate: (view: AppView) => void;
  company: CompanyProfile;
}

export const MobileDashboardView: React.FC<MobileDashboardViewProps> = ({
  items,
  staffCount: _staffCount,
  monthLabel,
  year,
  activeSnapshot,
  onNavigate,
  company: _company,
}) => {
  const isLocked = Boolean(activeSnapshot?.isLocked);

  // Aggregated totals
  const totalGross = items.reduce((s, i) => s + i.monthlyGross, 0);
  const totalNet = items.reduce((s, i) => s + i.netTakeHome, 0);
  const totalPaye = items.reduce((s, i) => s + i.monthlyPaye, 0);
  const totalEmpPension = items.reduce((s, i) => s + i.employeePension, 0);
  const totalEmplrPension = items.reduce((s, i) => s + i.employerPension, 0);
  const totalDeductions = totalPaye + totalEmpPension;
  const totalEmployerCost = totalGross + totalEmplrPension;

  // Department distribution
  const deptList = useMemo(() => {
    const deptMap: { [key: string]: { count: number; gross: number } } = {};
    items.forEach(item => {
      const d = item.department || 'Unassigned';
      if (!deptMap[d]) deptMap[d] = { count: 0, gross: 0 };
      deptMap[d].count += 1;
      deptMap[d].gross += item.monthlyGross;
    });

    return Object.entries(deptMap)
      .map(([dept, data]) => ({
        name: dept,
        count: data.count,
        gross: data.gross,
        percentage: totalGross > 0 ? Math.round((data.gross / totalGross) * 100) : 0,
      }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 4);
  }, [items, totalGross]);

  return (
    <div className="space-y-4 pb-2 select-none">
      
      {/* ── 1. Hero Net Salary Commitment Card (SwiftUI Light Aesthetic) ── */}
      <div className="relative overflow-hidden bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-200/80 dark:border-zinc-800">
        
        {/* Subtle decorative Apple-style light mesh / gradient wash */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-100/40 via-teal-50/20 to-transparent dark:from-emerald-950/20 dark:via-transparent pointer-events-none rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-emerald-50/40 to-transparent dark:from-emerald-950/10 pointer-events-none rounded-full blur-xl" />

        {/* Top Header Row: Cycle Tag & Lock Status */}
        <div className="relative z-10 flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {monthLabel} {year} Cycle
            </span>
          </div>

          {isLocked && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 border shadow-2xs bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/70 dark:border-amber-800/60">
              <Lock className="w-3 h-3" />
              <span>Locked Run</span>
            </span>
          )}
        </div>

        {/* Main Amount & Metrics */}
        <div className="relative z-10 pt-4 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
            Total Net Salary Payout
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            {formatNaira(totalNet)}
          </div>
          
          {/* Frosted Micro-Metric Chips */}
          <div className="flex items-center gap-2 mt-3.5 flex-wrap">
            <div className="bg-zinc-100/80 dark:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-700/50 rounded-xl px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-medium shadow-2xs">
              <Users className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>{items.length} Enrolled Staff</span>
            </div>
            <div className="bg-zinc-100/80 dark:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-700/50 rounded-xl px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-medium shadow-2xs">
              <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px]">Gross:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{formatCompactNaira(totalGross)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── 2. Swipeable 2-Column KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Statutory Tax Liability */}
        <div 
          onClick={() => onNavigate('analytics')}
          className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 shadow-xs cursor-pointer active:scale-95 transition-transform"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">PAYE Tax</span>
            <ShieldCheck className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1.5">
            {formatCompactNaira(totalPaye)}
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            State IRS Remittance
          </p>
        </div>

        {/* Total Pension Remittance */}
        <div 
          onClick={() => onNavigate('analytics')}
          className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 shadow-xs cursor-pointer active:scale-95 transition-transform"
        >
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Pension</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1.5">
            {formatCompactNaira(totalEmpPension + totalEmplrPension)}
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            8% Emp + 10% Emplr
          </p>
        </div>

        {/* Total Employer Cost */}
        <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 shadow-xs col-span-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Employer Workforce Cost</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {formatNaira(totalEmployerCost)}
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Monthly Gross Salaries + 10% Mandatory Employer Pension
          </p>
        </div>

      </div>

      {/* ── 4. Department Payroll Distribution ── */}
      <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Department Allocation
          </h4>
          <span className="text-[10px] text-zinc-400 font-medium">By Monthly Gross</span>
        </div>

        <div className="space-y-3">
          {deptList.map((d) => (
            <div key={d.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                  {d.name} <span className="text-zinc-400 text-[10px]">({d.count})</span>
                </span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold text-xs">
                  {formatCompactNaira(d.gross)} ({d.percentage}%)
                </span>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full"
                  style={{ width: `${d.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
