import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Lock, 
  Unlock, 
  Search, 
  X, 
  FileSpreadsheet, 
  Printer, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  MoreVertical,
  Filter,
  Building2,
  ChevronDown,
  FileText,
  Mail,
  MailCheck
} from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  PayrollSnapshot, 
  Employee, 
  PayrollVariables, 
  PayeTaxVariables, 
  CompanyProfile,
  PayslipDesignConfig,
  TeamMember,
  EmailSettings,
  EmailedPayslipRecord
} from '../../../types';
import { formatNaira, formatCompactNaira } from '../../../engine/payePensionEngine';
import { MobilePayrollCard } from '../MobilePayrollCard';
import { MobilePayslipPreviewSheet } from '../MobilePayslipPreviewSheet';
import { FinalizeLockModal } from '../../payroll/FinalizeLockModal';
import { UnlockPayrollModal } from '../../payroll/UnlockPayrollModal';
import { exportNibssBankTransferCsv } from '../../../engine/bankPaymentEngine';
import { MobileDepartmentPicker } from '../MobileDepartmentPicker';

interface MobilePayrollRunViewProps {
  items: CalculatedPayrollItem[];
  activeSnapshot: PayrollSnapshot | undefined;
  monthLabel: string;
  selectedMonth?: string;
  year: number;
  onFinalizeAndLock: (notes: string) => void;
  onUnlock: (reason: string) => void;
  company: CompanyProfile;
  payslipDesign?: PayslipDesignConfig;
  departments?: string[];
  onNavigate?: (view: any) => void;
  currentUser?: TeamMember | null;
  employees?: Employee[];
  emailSettings?: EmailSettings;
  emailedPayslips?: Record<string, EmailedPayslipRecord>;
  onRecordEmailedPayslips?: (records: EmailedPayslipRecord[]) => void;
  onUpdateEmployeeEmail?: (id: string, email: string) => void;
  isAdmin?: boolean;
  onOpenEmailSettings?: () => void;
}

export const MobilePayrollRunView: React.FC<MobilePayrollRunViewProps> = ({
  items,
  activeSnapshot,
  monthLabel,
  selectedMonth = 'oct',
  year,
  onFinalizeAndLock,
  onUnlock,
  company,
  payslipDesign,
  departments = [],
  onNavigate,
  currentUser,
  employees = [],
  emailSettings,
  emailedPayslips = {},
  onRecordEmailedPayslips,
  onUpdateEmployeeEmail,
  isAdmin = true,
  onOpenEmailSettings,
}) => {
  const isAuditor = currentUser?.role === 'Auditor';
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedSlipItem, setSelectedSlipItem] = useState<CalculatedPayrollItem | null>(null);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);

  const periodKey = `${year}-${(selectedMonth || monthLabel || '').toLowerCase()}`;
  const emailedCountForPeriod = useMemo(() => {
    if (!emailedPayslips) return 0;
    return items.filter(i => Boolean(emailedPayslips[`${periodKey}_${i.employeeId}`])).length;
  }, [items, emailedPayslips, periodKey]);

  const isLocked = Boolean(activeSnapshot?.isLocked);

  // Department list
  const deptOptions = useMemo(() => {
    const list = Array.from(new Set(['ALL', ...departments, ...items.map(i => i.department).filter(Boolean)]));
    return list;
  }, [departments, items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const term = searchQuery.toLowerCase();
      const matchesSearch = 
        (item.fullName || '').toLowerCase().includes(term) ||
        (item.employeeCode || '').toLowerCase().includes(term) ||
        (item.department || '').toLowerCase().includes(term);

      const matchesDept = selectedDept === 'ALL' || item.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [items, searchQuery, selectedDept]);

  // Aggregated totals
  const totalNet = items.reduce((s, i) => s + i.netTakeHome, 0);
  const totalGross = items.reduce((s, i) => s + i.monthlyGross, 0);

  const handleExportBankSchedule = () => {
    exportNibssBankTransferCsv(items, [], company, monthLabel, year);
  };

  const hasMultipleActions = Boolean(isLocked);

  return (
    <div className="space-y-3.5 pb-2 select-none">
      
      {/* ── Top Period Banner & Search Filter Bar (Sticky & Compact) ── */}
      <div className="sticky -top-3.5 z-30 pt-1 pb-1 bg-[#fbfbfb] dark:bg-[#09090b]">
        <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-2.5 px-3 shadow-xs">
          {!isSearchOpen ? (
            <div className="flex items-center justify-between gap-2.5">
              {/* Left: Count & Lock Status */}
              <div className="min-w-0 flex-1 flex items-center gap-1.5">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                  {filteredItems.length} Enrolled{selectedDept !== 'ALL' ? ` • ${selectedDept}` : ''}
                </p>
                {isLocked && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border bg-amber-500/10 border-amber-500/20 shrink-0" title="Payroll Locked">
                    <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                  </span>
                )}
              </div>

              {/* Right: Compact Net Amount & Action Icons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Total Net Pill */}
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs shrink-0">
                  <span className="text-[8px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70 font-semibold">Net</span>
                  <span>{formatCompactNaira(totalNet)}</span>
                </div>

                {/* Minimalist Department Filter Dropdown Popover */}
                <MobileDepartmentPicker
                  selectedDept={selectedDept}
                  deptOptions={deptOptions}
                  onSelectDept={setSelectedDept}
                />

                {/* Search Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                    searchQuery
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
                  title="Search Personnel"
                  aria-label="Search Personnel"
                >
                  <Search className="w-3.5 h-3.5" />
                  {searchQuery && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                  )}
                </button>


                {/* Finalize & Lock / Unlock Quick Action */}
                {isAuditor ? (
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60"
                    title={isLocked ? 'Payroll Locked (Auditor View - Read Only)' : 'Payroll Draft (Auditor View - Read Only)'}
                  >
                    {isLocked ? <Lock className="w-3.5 h-3.5 text-zinc-400" /> : <Unlock className="w-3.5 h-3.5 text-zinc-400" />}
                  </div>
                ) : !isLocked ? (
                  <button
                    type="button"
                    onClick={() => setIsLockModalOpen(true)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all active:scale-95 cursor-pointer"
                    title={`Finalize & Lock Cycle (${formatCompactNaira(totalNet)})`}
                    aria-label="Finalize & Lock Cycle"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsUnlockModalOpen(true)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors cursor-pointer"
                    title="Unlock Cycle"
                    aria-label="Unlock Cycle"
                  >
                    <Unlock className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Full-Width Search Bar with Internal Dismiss (X) Button */
            <div className="relative w-full animate-in fade-in duration-150">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="Search staff, dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }
                }}
                className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-9 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Cancel search"
                aria-label="Cancel search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Employee Payroll Cards Stack ── */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-2">
            <Calculator className="w-8 h-8 text-zinc-400 mx-auto" />
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              No matching payroll records found
            </h4>
            <p className="text-[11px] text-zinc-400">
              Try adjusting your search query or department filter.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <MobilePayrollCard
              key={item.employeeId}
              item={item}
              onViewPayslip={(slip) => setSelectedSlipItem(slip)}
              isLocked={isLocked}
              isEmailed={Boolean(emailedPayslips?.[`${periodKey}_${item.employeeId}`])}
            />
          ))
        )}
      </div>

      {/* ── Speed Dial Backdrop ── */}
      {isSpeedDialOpen && hasMultipleActions && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
          onClick={() => setIsSpeedDialOpen(false)}
        />
      )}

      {/* ── Floating Action Button ── */}
      <div className="fixed bottom-[80px] right-4 z-50 flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Expanded Speed Dial Action Menu */}
        {isSpeedDialOpen && hasMultipleActions && (
          <div className="flex flex-col items-end gap-2 mb-1 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {/* Action 1: Bank Schedule (when locked) */}
            {isLocked && (
              <button
                type="button"
                onClick={() => {
                  setIsSpeedDialOpen(false);
                  handleExportBankSchedule();
                }}
                className="flex items-center gap-2.5 group cursor-pointer active:scale-95 transition-all outline-none"
              >
                <span className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-[#18181b]/95 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-[11px] font-medium shadow-sm backdrop-blur-md">
                  Bank Schedule
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center transition-transform group-hover:scale-105">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
              </button>
            )}

            {/* Action 2: View Payslips */}
            <button
              type="button"
              onClick={() => {
                setIsSpeedDialOpen(false);
                onNavigate?.('payslips');
              }}
              className="flex items-center gap-2.5 group cursor-pointer active:scale-95 transition-all outline-none"
            >
              <span className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-[#18181b]/95 border border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-[11px] font-medium shadow-sm backdrop-blur-md">
                View Payslips
              </span>
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-emerald-400 dark:text-emerald-600 border border-zinc-700/50 dark:border-zinc-200/50 shadow-md flex items-center justify-center transition-transform group-hover:scale-105">
                <FileText className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}

        {/* Primary Floating Action Button */}
        <button
          type="button"
          onClick={() => {
            if (!hasMultipleActions) {
              onNavigate?.('payslips');
            } else {
              setIsSpeedDialOpen(!isSpeedDialOpen);
            }
          }}
          className={`relative w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-90 outline-none focus:outline-none focus:ring-0 select-none ${
            isSpeedDialOpen && hasMultipleActions
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rotate-90 shadow-2xl'
              : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 border border-zinc-700/50 dark:border-zinc-200/50'
          }`}
          title={
            hasMultipleActions
              ? isSpeedDialOpen ? 'Close Actions' : 'Payroll Actions'
              : 'View Payslips'
          }
          aria-label={
            hasMultipleActions
              ? isSpeedDialOpen ? 'Close Actions' : 'Payroll Actions'
              : 'View Payslips'
          }
        >
          {isSpeedDialOpen && hasMultipleActions ? (
            <X className="w-5 h-5 transition-transform" />
          ) : (
            <div className="relative flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
              {emailedCountForPeriod > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900 dark:ring-zinc-100" />
              )}
            </div>
          )}
        </button>
      </div>

      {/* ── Modals & Drawers ── */}
      {selectedSlipItem && (
        <MobilePayslipPreviewSheet
          isOpen={Boolean(selectedSlipItem)}
          item={selectedSlipItem}
          monthLabel={monthLabel}
          year={year}
          company={company}
          isLocked={isLocked}
          payslipDesign={payslipDesign}
          onClose={() => setSelectedSlipItem(null)}
        />
      )}

      {isLockModalOpen && (
        <FinalizeLockModal
          isOpen={isLockModalOpen}
          monthLabel={monthLabel}
          year={year}
          items={items}
          nextVersion={(activeSnapshot?.version || 0) + 1}
          onConfirm={(notes) => {
            onFinalizeAndLock(notes);
            setIsLockModalOpen(false);
          }}
          onClose={() => setIsLockModalOpen(false)}
        />
      )}

      {isUnlockModalOpen && (
        <UnlockPayrollModal
          isOpen={isUnlockModalOpen}
          monthLabel={monthLabel}
          year={year}
          activeSnapshot={activeSnapshot}
          onConfirm={(reason) => {
            onUnlock(reason);
            setIsUnlockModalOpen(false);
          }}
          onClose={() => setIsUnlockModalOpen(false)}
        />
      )}

    </div>
  );
};
