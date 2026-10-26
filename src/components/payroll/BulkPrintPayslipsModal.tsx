import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Printer, 
  X, 
  FileText, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Sliders, 
  Users, 
  RotateCcw,
  Palette,
  ArrowLeft,
  ChevronDown,
  Calendar
} from 'lucide-react';
import { MONTHS } from '../../store/usePayrollStore';
import { 
  CalculatedPayrollItem, 
  CompanyProfile, 
  PayslipDesignConfig, 
  DEFAULT_PAYSLIP_DESIGN,
  Employee,
  PayrollVariables,
  PayeTaxVariables,
  PayslipCustomPreset,
  PayslipSectionId,
  PayslipDensity,
  ALL_PAYSLIP_COLUMNS,
  normalizeVisibleColumns,
  DEFAULT_COLUMNS,
  PayslipColumnDef,
  PayrollSnapshot
} from '../../types';
import { formatNaira, DEFAULT_PAYROLL_VARIABLES, DEFAULT_PAYE_VARIABLES, calculatePayrollItem, isEmployeeActiveForPeriod } from '../../engine/payePensionEngine';
import { PayslipDesignerPage } from '../payslip/PayslipDesignerPage';
import { PayslipThemeSelector } from '../payslip/payslipThemes';
import { CustomizablePayslipView } from '../payslip/CustomizablePayslipView';

interface BulkPrintPayslipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CalculatedPayrollItem[];
  monthLabel: string;
  year: number;
  company: CompanyProfile;
  config?: PayslipDesignConfig;
  onOpenPayslipDesigner?: () => void;
  employees?: Employee[];
  payrollVariables?: PayrollVariables;
  payeTaxVariables?: PayeTaxVariables;
  selectedMonth?: string;
  snapshots?: PayrollSnapshot[];
  onUpdatePayslipDesign?: (updates: Partial<PayslipDesignConfig>) => void;
  onResetPayslipDesign?: () => void;
  savedPresets?: PayslipCustomPreset[];
  onSavePreset?: (name: string, config: PayslipDesignConfig) => void;
  onDeletePreset?: (id: string) => void;
}

export const BulkPrintPayslipsModal: React.FC<BulkPrintPayslipsModalProps> = ({
  isOpen,
  onClose,
  items,
  monthLabel,
  year,
  company,
  config = DEFAULT_PAYSLIP_DESIGN,
  onOpenPayslipDesigner,
  employees = [],
  payrollVariables,
  payeTaxVariables,
  selectedMonth,
  snapshots = [],
  onUpdatePayslipDesign,
  onResetPayslipDesign,
  savedPresets = [],
  onSavePreset,
  onDeletePreset,
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'sections'>('employees');
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [previewEmployeeId, setPreviewEmployeeId] = useState<string>('');

  // --- Date picker state ---
  // Default automatically to current real-world month and year upon entry
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [printYear, setPrintYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonthKeys, setSelectedMonthKeys] = useState<string[]>(() => [
    MONTHS[new Date().getMonth()].key
  ]);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    if (isDatePickerOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen]);

  const toggleMonthKey = (key: string) => {
    setSelectedMonthKeys(prev =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]
    );
  };

  // Build a readable label for the selected months/year
  const printPeriodLabel = useMemo(() => {
    const currentMonthObj = MONTHS[new Date().getMonth()];
    if (selectedMonthKeys.length === 0) return `${currentMonthObj.label} ${new Date().getFullYear()}`;
    const sorted = MONTHS.filter(m => selectedMonthKeys.includes(m.key));
    if (sorted.length === 1) return `${sorted[0].label} ${printYear}`;
    if (sorted.length === 12) return `All Months ${printYear}`;
    // Try to detect a consecutive range
    const indices = sorted.map(m => MONTHS.findIndex(mo => mo.key === m.key)).sort((a, b) => a - b);
    const isRange = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
    if (isRange && sorted.length >= 3) {
      return `${sorted[0].label}–${sorted[sorted.length - 1].label} ${printYear}`;
    }
    return sorted.map(m => m.label.slice(0, 3)).join(', ') + ` ${printYear}`;
  }, [selectedMonthKeys, printYear]);

  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    return (config.visibleColumns && config.visibleColumns.length > 0)
      ? normalizeVisibleColumns(config.visibleColumns)
      : DEFAULT_COLUMNS;
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    company_header: false,
    pay_period_banner: false,
    employee_meta: true,
    earnings: true,
    deductions: true,
    employer_contributions: true,
  });

  React.useEffect(() => {
    if (config.visibleColumns && config.visibleColumns.length > 0) {
      setSelectedColumns(normalizeVisibleColumns(config.visibleColumns));
    }
  }, [config.visibleColumns]);
  
  // Filters for staff directory
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const safeItems = useMemo(() => (Array.isArray(items) ? items.filter(Boolean) : []), [items]);

  const fallbackEmployees: Employee[] = useMemo(() => {
    if (employees && employees.length > 0) return employees;
    return safeItems.map(item => ({
      id: item.employeeId,
      code: item.employeeCode,
      firstName: item.fullName.split(' ')[0] || item.fullName,
      lastName: item.fullName.split(' ').slice(1).join(' ') || '',
      department: item.department,
      position: item.position,
      email: '',
      phone: '',
      monthlyGross: item.monthlyGross,
      annualRent: 0,
      bankName: item.bankName,
      accountNumber: item.accountNumber,
      hasPension: item.employeePension > 0,
      hasPaye: item.monthlyPaye > 0,
      payeNumber: item.payeNumber,
      pensionNumber: item.pensionNumber,
      pfaName: item.pfaName,
      status: 'Active',
      employmentType: 'Full-Time',
    }));
  }, [employees, safeItems]);

  // Initialize selection and reset to current month and year when page is entered / modal opened
  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setPrintYear(now.getFullYear());
      setSelectedMonthKeys([MONTHS[now.getMonth()].key]);
      setActivePeriodIdx(0);

      if (safeItems.length > 0) {
        const allIds = safeItems.map(i => i.employeeId);
        setSelectedEmployees(allIds);
        if (!previewEmployeeId || !allIds.includes(previewEmployeeId)) {
          setPreviewEmployeeId(allIds[0] || '');
        }
      }
    }
  }, [isOpen, safeItems]);

  // Departments list
  const departments = useMemo(() => {
    return ['ALL', ...Array.from(new Set(safeItems.map(i => i.department).filter(Boolean)))];
  }, [safeItems]);

  // Filtered employees in sidebar list
  const filteredEmployees = useMemo(() => {
    return safeItems.filter(emp => {
      if (!emp) return false;
      if (deptFilter !== 'ALL' && emp.department !== deptFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (emp.fullName || '').toLowerCase().includes(q);
        const matchCode = (emp.employeeCode || '').toLowerCase().includes(q);
        const matchRole = (emp.position || '').toLowerCase().includes(q);
        const matchTax = (emp.payeNumber || '').toLowerCase().includes(q);
        const matchPension = (emp.pensionNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchRole && !matchTax && !matchPension) return false;
      }
      return true;
    });
  }, [safeItems, deptFilter, searchQuery]);

  // Selected items to print
  const selectedItems = useMemo(() => {
    return safeItems.filter(i => i && selectedEmployees.includes(i.employeeId));
  }, [safeItems, selectedEmployees]);

  // Active item for live on-screen preview
  const currentPreviewItem = useMemo(() => {
    // If no employees are selected, preview should be completely blank
    if (selectedEmployees.length === 0) {
      return null;
    }
    // If focused previewEmployeeId is among selected, preview that employee
    if (previewEmployeeId && selectedEmployees.includes(previewEmployeeId)) {
      const found = safeItems.find(i => i.employeeId === previewEmployeeId);
      if (found) return found;
    }
    // Otherwise fallback to first selected employee
    if (selectedItems.length > 0) {
      return selectedItems[0];
    }
    return null;
  }, [safeItems, previewEmployeeId, selectedEmployees, selectedItems]);

  const previewIndex = useMemo(() => {
    return selectedItems.findIndex(i => i.employeeId === currentPreviewItem?.employeeId);
  }, [selectedItems, currentPreviewItem]);

  // Build payslips per selected period (month × year)
  // For each period: use locked snapshot if found, else live-calculate from employees
  const periodPayslips = useMemo(() => {
    const pv = payrollVariables || DEFAULT_PAYROLL_VARIABLES;
    const pt = payeTaxVariables || DEFAULT_PAYE_VARIABLES;

    return MONTHS
      .filter(m => selectedMonthKeys.includes(m.key))
      .map(m => {
        const periodKey = `${printYear}-${m.key}`;
        // Try locked snapshot first
        const snap = snapshots.find(s => s.monthKey === m.key && s.year === printYear && s.isLocked);

        let periodItems: CalculatedPayrollItem[];

        if (snap && snap.items && snap.items.length > 0) {
          // Use snapshot data
          periodItems = snap.items.filter(i => i && selectedEmployees.includes(i.employeeId));
        } else if (employees.length > 0) {
          // Live-calculate for this period
          const activeEmps = employees.filter(e => isEmployeeActiveForPeriod(e, printYear, m.key));
          periodItems = activeEmps
            .filter(e => selectedEmployees.includes(e.id))
            .map(emp => {
              try {
                return calculatePayrollItem(emp, pv, pt, m.key, printYear);
              } catch {
                return null;
              }
            })
            .filter(Boolean) as CalculatedPayrollItem[];
        } else {
          // Fallback: use passed-in items (single period) filtered for selected employees
          periodItems = safeItems.filter(i => i && selectedEmployees.includes(i.employeeId));
        }

        return {
          periodKey,
          monthKey: m.key,
          monthLabel: m.label,
          year: printYear,
          items: periodItems,
          isSnapshot: Boolean(snap),
        };
      })
      .filter(p => p.items.length > 0);
  }, [selectedMonthKeys, printYear, snapshots, employees, payrollVariables, payeTaxVariables, selectedEmployees, safeItems]);

  // Total printed payslip count across all periods
  const totalPrintCount = useMemo(() =>
    periodPayslips.reduce((sum, p) => sum + p.items.length, 0),
    [periodPayslips]
  );

  // Which period is currently shown in the preview (index into periodPayslips)
  const [activePeriodIdx, setActivePeriodIdx] = useState(0);

  // Clamp activePeriodIdx when periods change
  useEffect(() => {
    setActivePeriodIdx(prev => Math.min(prev, Math.max(0, periodPayslips.length - 1)));
  }, [periodPayslips.length]);

  // The period currently shown on screen
  const activePeriod = periodPayslips[activePeriodIdx] ?? null;
  // Items for the active period (used by the header employee pager)
  const activePeriodItems = activePeriod?.items ?? [];

  const toggleAccordion = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const isCol = (id: string) => selectedColumns.includes(id);

  const toggleColumn = (id: string, sectionId?: PayslipSectionId) => {
    let next: string[];
    if (selectedColumns.includes(id)) {
      next = selectedColumns.filter(c => c !== id);
    } else {
      next = [...selectedColumns, id];
    }
    setSelectedColumns(next);

    if (sectionId && !selectedColumns.includes(id) && onUpdatePayslipDesign) {
      const currentSections = config.sectionOrder || DEFAULT_PAYSLIP_DESIGN.sectionOrder;
      const targetSec = currentSections.find(s => s.id === sectionId);
      if (targetSec && !targetSec.enabled) {
        const updated = currentSections.map(s => s.id === sectionId ? { ...s, enabled: true } : s);
        onUpdatePayslipDesign({ visibleColumns: next, sectionOrder: updated });
        return;
      }
    }
    onUpdatePayslipDesign?.({ visibleColumns: next });
  };

  const handleSelectAllColumns = () => {
    const allIds = ALL_PAYSLIP_COLUMNS.map(c => c.id);
    setSelectedColumns(allIds);
    handleEnableAllSections();
    onUpdatePayslipDesign?.({ visibleColumns: allIds });
  };

  const handleResetColumns = () => {
    setSelectedColumns(DEFAULT_COLUMNS);
    if (onResetPayslipDesign) {
      onResetPayslipDesign();
    } else {
      onUpdatePayslipDesign?.({ visibleColumns: DEFAULT_COLUMNS });
    }
  };

  const handleClearAllColumns = () => {
    setSelectedColumns([]);
    onUpdatePayslipDesign?.({ visibleColumns: [] });
  };

  const handleToggleSection = (sectionId: PayslipSectionId) => {
    if (!onUpdatePayslipDesign) return;
    const currentSections = config.sectionOrder || DEFAULT_PAYSLIP_DESIGN.sectionOrder;
    const updated = currentSections.map(s => 
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    );
    onUpdatePayslipDesign({ sectionOrder: updated });
  };

  const handleEnableAllSections = () => {
    if (!onUpdatePayslipDesign) return;
    const currentSections = config.sectionOrder || DEFAULT_PAYSLIP_DESIGN.sectionOrder;
    const updated = currentSections.map(s => ({ ...s, enabled: true }));
    onUpdatePayslipDesign({ sectionOrder: updated });
  };

  const handleUpdateConfig = (updates: Partial<PayslipDesignConfig>) => {
    if (onUpdatePayslipDesign) {
      onUpdatePayslipDesign(updates);
    }
  };

  const toggleEmployee = (id: string) => {
    if (selectedEmployees.includes(id)) {
      setSelectedEmployees(selectedEmployees.filter(e => e !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, id]);
      setPreviewEmployeeId(id);
    }
  };

  const handleSelectAllEmployees = () => {
    const allIds = safeItems.map(i => i.employeeId);
    setSelectedEmployees(allIds);
    if (!previewEmployeeId || !allIds.includes(previewEmployeeId)) {
      setPreviewEmployeeId(allIds[0] || '');
    }
  };

  const handleDeselectAllEmployees = () => {
    setSelectedEmployees([]);
    setPreviewEmployeeId('');
  };

  const handlePrint = () => {
    if (selectedEmployees.length === 0) return;
    const beforePrint = () => document.body.classList.add('print-portal-active');
    const afterPrint = () => document.body.classList.remove('print-portal-active');
    window.addEventListener('beforeprint', beforePrint, { once: true });
    window.addEventListener('afterprint', afterPrint, { once: true });
    document.body.classList.add('print-portal-active');
    window.print();
  };

  const scrollToVoucher = (empId: string) => {
    setPreviewEmployeeId(empId);
    setTimeout(() => {
      const el = document.getElementById(`voucher-${empId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 40);
  };

  const goToNextPreview = () => {
    if (activePeriodItems.length <= 1) return;
    const nextIdx = (previewIndex + 1) % activePeriodItems.length;
    scrollToVoucher(activePeriodItems[nextIdx].employeeId);
  };

  const goToPrevPreview = () => {
    if (activePeriodItems.length <= 1) return;
    const prevIdx = (previewIndex - 1 + activePeriodItems.length) % activePeriodItems.length;
    scrollToVoucher(activePeriodItems[prevIdx].employeeId);
  };

  if (isDesignerOpen) {
    return createPortal(
      <div className="fixed top-9 inset-x-0 bottom-0 z-50 bg-zinc-100 dark:bg-[#09090b] flex flex-col select-none overflow-hidden print:top-0 print:inset-0">
        <PayslipDesignerPage
          company={company}
          employees={fallbackEmployees}
          payrollVariables={payrollVariables || DEFAULT_PAYROLL_VARIABLES}
          payeTaxVariables={payeTaxVariables || DEFAULT_PAYE_VARIABLES}
          monthLabel={monthLabel}
          selectedMonth={selectedMonth || 'jan'}
          year={year}
          payslipDesign={config}
          onUpdatePayslipDesign={onUpdatePayslipDesign || (() => {})}
          onResetPayslipDesign={onResetPayslipDesign || (() => {})}
          onBackToPayroll={() => setIsDesignerOpen(false)}
          savedPresets={savedPresets}
          onSavePreset={onSavePreset}
          onDeletePreset={onDeletePreset}
        />
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="print-modal-root fixed top-9 inset-x-0 bottom-0 z-50 bg-zinc-100 dark:bg-[#09090b] flex flex-col select-none print:top-0 print:inset-0">
      
      {/* ── Minimalist Top Header Bar ── */}
      <div className="no-print h-11 bg-white dark:bg-[#121215] border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-4 flex items-center gap-2 text-zinc-900 dark:text-zinc-100 shrink-0">

        {/* Back */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          title="Back to Payroll (Esc)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <span className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 shrink-0" />

        {/* Title */}
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 shrink-0 hidden sm:inline">Print Payslips</span>

        {/* Clickable Date Chip with Popover */}
        <div className="relative" ref={datePickerRef}>
          <button
            type="button"
            onClick={() => setIsDatePickerOpen(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
              isDatePickerOpen
                ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Click to change print period"
          >
            <Calendar className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
            <span>{printPeriodLabel}</span>
            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-150 ${isDatePickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDatePickerOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden">
              {/* Year Nav */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPrintYear(y => y - 1)}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{printYear}</span>
                <button
                  type="button"
                  onClick={() => setPrintYear(y => y + 1)}
                  className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-4 gap-1 p-2">
                {MONTHS.map(m => {
                  const active = selectedMonthKeys.includes(m.key);
                  const isCurrent = m.key === MONTHS[new Date().getMonth()].key && printYear === new Date().getFullYear();
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => toggleMonthKey(m.key)}
                      className={`relative flex items-center justify-center py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                        active
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                          : isCurrent
                          ? 'border border-zinc-400 dark:border-zinc-500 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/40'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                      title={isCurrent ? `${m.label} (Current Month)` : m.label}
                    >
                      {m.label.slice(0, 3)}
                      {active && selectedMonthKeys.length > 1 && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer hints */}
              <div className="px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setPrintYear(now.getFullYear());
                    setSelectedMonthKeys([MONTHS[now.getMonth()].key]);
                  }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline transition cursor-pointer"
                >
                  Current Month
                </button>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(false)}
                  className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Center: Employee pager for active period */}
        {activePeriodItems.length > 0 && currentPreviewItem && (
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <button
              onClick={goToPrevPreview}
              disabled={activePeriodItems.length <= 1}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Previous employee"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
              {previewIndex >= 0 ? previewIndex + 1 : 1}
              <span className="mx-1 text-zinc-300 dark:text-zinc-700">/</span>
              {activePeriodItems.length}
            </span>
            <span className="text-[11px] text-zinc-700 dark:text-zinc-200 font-medium max-w-[160px] truncate hidden lg:inline">
              {currentPreviewItem.fullName}
            </span>
            <button
              onClick={goToNextPreview}
              disabled={activePeriodItems.length <= 1}
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Next employee"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Theme Selector */}
          <PayslipThemeSelector
            currentConfig={config}
            savedPresets={savedPresets}
            onSelectTheme={onUpdatePayslipDesign || (() => {})}
          />

          {/* Design Layout — icon only */}
          <button
            type="button"
            onClick={() => setIsDesignerOpen(true)}
            className="p-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-md transition cursor-pointer"
            title="Design & customize payslip layout"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>

          {/* Print all selected */}
          <button
            onClick={handlePrint}
            disabled={totalPrintCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-xs font-medium transition cursor-pointer"
            title={`Print ${totalPrintCount} payslip${totalPrintCount === 1 ? '' : 's'} (${selectedEmployees.length} employee${selectedEmployees.length !== 1 ? 's' : ''} × ${periodPayslips.length} period${periodPayslips.length !== 1 ? 's' : ''})`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print {totalPrintCount}</span>
          </button>
        </div>

      </div>

      {/* Main Split Window */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Control Sidebar */}
        <aside className="no-print w-80 bg-white dark:bg-[#121215] border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 text-zinc-700 dark:text-zinc-300">
          
          {/* Tab Navigation: Staff Selection vs Sections & Style */}
          <div className="grid grid-cols-2 border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('employees')}
              className={`py-2.5 flex items-center justify-center gap-2 border-b-2 transition ${
                activeTab === 'employees'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/40'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff ({selectedEmployees.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={`py-2.5 flex items-center justify-center gap-2 border-b-2 transition ${
                activeTab === 'sections'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/40'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Columns &amp; Style ({selectedColumns.length})</span>
            </button>
          </div>

          {/* TAB 1: EMPLOYEES SELECTION */}
          {activeTab === 'employees' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Search & Dept Controls */}
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filter by name, code or role..."
                    className="w-full pl-8 pr-7 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition p-0.5 rounded cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 shrink-0">
                      {selectedEmployees.length}/{safeItems.length}
                    </span>
                    <select
                      value={deptFilter}
                      onChange={e => setDeptFilter(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-zinc-700 dark:text-zinc-300 text-xs focus:outline-none"
                    >
                      {departments.map(dept => (
                        <option key={dept} value={dept}>
                          {dept === 'ALL' ? 'All Departments' : dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAllEmployees}
                      className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                    >
                      All
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <button
                      onClick={handleDeselectAllEmployees}
                      className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>
              </div>

              {/* Employee Scrollable List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredEmployees.map(emp => {
                  const isChecked = selectedEmployees.includes(emp.employeeId);
                  const isCurrentPreview = currentPreviewItem?.employeeId === emp.employeeId;

                  return (
                    <div
                      key={emp.employeeId}
                      onClick={() => {
                        if (!selectedEmployees.includes(emp.employeeId)) {
                          setSelectedEmployees(prev => [...prev, emp.employeeId]);
                        }
                        scrollToVoucher(emp.employeeId);
                      }}
                      className={`group flex items-center justify-between p-2 rounded-md cursor-pointer border text-xs transition ${
                        isCurrentPreview 
                          ? 'border-zinc-400 dark:border-zinc-600 bg-zinc-100/70 dark:bg-zinc-800/60 shadow-2xs' 
                          : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            e.stopPropagation();
                            toggleEmployee(emp.employeeId);
                          }}
                          className="w-3.5 h-3.5 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        />
                        <div className="truncate">
                          <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {emp.fullName}
                          </p>
                          <p className="text-[10px] text-zinc-400 font-mono">
                            {emp.employeeCode} &bull; {emp.department}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300">
                          {formatNaira(emp.netTakeHome)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <div className="text-center py-8 text-xs text-zinc-400">
                    No employees matched the filter.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: SECTIONS & QUICK STYLE CONTROLS */}
          {activeTab === 'sections' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Sections Header & Quick Actions */}
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold text-[10px]">
                  Fields ({selectedColumns.length}/{ALL_PAYSLIP_COLUMNS.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllColumns}
                    className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                  >
                    All
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <button
                    type="button"
                    onClick={handleResetColumns}
                    className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline flex items-center gap-1"
                    title="Reset to recommended fields"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllColumns}
                    className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Scrollable controls */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                
                {/* 1. Expandable Sections & Columns List */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                    Sections &amp; Columns
                  </h4>
                  
                  {(config.sectionOrder || DEFAULT_PAYSLIP_DESIGN.sectionOrder).map(sec => {
                    const sectionCols = ALL_PAYSLIP_COLUMNS.filter(c => c.sectionId === sec.id);
                    const isExpanded = expandedSections[sec.id] ?? false;
                    const checkedColsCount = sectionCols.filter(c => selectedColumns.includes(c.id)).length;
                    const hasSubCols = sectionCols.length > 0;

                    return (
                      <div 
                        key={sec.id}
                        className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900/60"
                      >
                        {/* Section Header Row */}
                        <div className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                          <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sec.enabled}
                              onChange={() => handleToggleSection(sec.id)}
                              className="w-3.5 h-3.5 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                            />
                            <span className={`text-xs font-medium truncate ${sec.enabled ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 line-through'}`}>
                              {sec.label}
                            </span>
                          </label>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {hasSubCols && (
                              <span className="text-[10px] text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                {checkedColsCount}/{sectionCols.length}
                              </span>
                            )}
                            {hasSubCols && (
                              <button
                                type="button"
                                onClick={() => toggleAccordion(sec.id)}
                                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                                title={isExpanded ? 'Collapse columns' : 'Expand columns'}
                              >
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Collapsible Column Checkboxes */}
                        {hasSubCols && isExpanded && (
                          <div className="border-t border-zinc-100 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/30 p-2 pl-4 space-y-1.5">
                            {sectionCols.map(col => {
                              const isChecked = selectedColumns.includes(col.id);
                              return (
                                <label 
                                  key={col.id}
                                  className="flex items-center gap-2 py-0.5 px-1 rounded cursor-pointer hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleColumn(col.id, sec.id)}
                                    className="w-3 h-3 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                                  />
                                  <span className={`text-[11px] ${isChecked ? 'text-zinc-800 dark:text-zinc-200 font-medium' : 'text-zinc-400'}`}>
                                    {col.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 2. Layout & Density */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                    Print Density
                  </h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['compact', 'standard', 'spacious'] as PayslipDensity[]).map(densityOption => (
                      <button
                        key={densityOption}
                        type="button"
                        onClick={() => handleUpdateConfig({ density: densityOption })}
                        className={`py-1.5 px-2 text-center rounded text-[11px] font-medium capitalize border transition ${
                          config.density === densityOption
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {densityOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Breakdown Layout */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
                    Breakdown Layout
                  </h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateConfig({ breakdownLayout: 'two-column' })}
                      className={`py-1.5 px-2 text-center rounded text-[11px] font-medium border transition ${
                        config.breakdownLayout !== 'single-column'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      2 Columns
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateConfig({ breakdownLayout: 'single-column' })}
                      className={`py-1.5 px-2 text-center rounded text-[11px] font-medium border transition ${
                        config.breakdownLayout === 'single-column'
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      Stacked
                    </button>
                  </div>
                </div>

                {/* 4. Visual Frame Toggles */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
                    Frame &amp; Borders
                  </h4>
                  <label className="flex items-center justify-between py-1 px-1 rounded cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <span className="text-xs">Outer Borders</span>
                    <input
                      type="checkbox"
                      checked={config.showBorders !== false}
                      onChange={e => handleUpdateConfig({ showBorders: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between py-1 px-1 rounded cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <span className="text-xs">Section Dividers</span>
                    <input
                      type="checkbox"
                      checked={config.showDividers !== false}
                      onChange={e => handleUpdateConfig({ showDividers: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between py-1 px-1 rounded cursor-pointer text-zinc-700 dark:text-zinc-300">
                    <span className="text-xs">Rounded Corners</span>
                    <input
                      type="checkbox"
                      checked={config.roundedCorners !== false}
                      onChange={e => handleUpdateConfig({ roundedCorners: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                    />
                  </label>
                </div>

              </div>

            </div>
          )}

        </aside>

        {/* Right Preview Area */}
        <div className="flex-1 bg-zinc-100 dark:bg-[#09090b] overflow-y-auto p-6 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          {totalPrintCount === 0 ? (
            <div className="w-full max-w-sm mx-auto py-24 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-zinc-200/50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 mb-3.5">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                No Employee Selected
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
                Select one or more employees from the list on the left to preview and print their payslips.
              </p>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllEmployees}
                  className="mt-4 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition cursor-pointer"
                >
                  Select All Staff ({items.length})
                </button>
              )}
            </div>
          ) : (
            <div className="w-full max-w-3xl flex flex-col gap-0 print:max-w-none">

              {/* ── Period nav bar (only shown when multiple periods selected) ── */}
              {periodPayslips.length > 1 && activePeriod && (
                <div className="no-print flex items-center gap-2 mb-5 px-1">
                  <button
                    type="button"
                    onClick={() => setActivePeriodIdx(i => Math.max(0, i - 1))}
                    disabled={activePeriodIdx === 0}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer text-zinc-500 dark:text-zinc-400"
                    title="Previous period"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                      {activePeriod.monthLabel} {activePeriod.year}
                    </span>
                    {activePeriod.isSnapshot ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        Locked
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                        Live Calc
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                      {activePeriod.items.length} payslip{activePeriod.items.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono shrink-0">
                      {activePeriodIdx + 1} / {periodPayslips.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActivePeriodIdx(i => Math.min(periodPayslips.length - 1, i + 1))}
                    disabled={activePeriodIdx === periodPayslips.length - 1}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer text-zinc-500 dark:text-zinc-400"
                    title="Next period"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Payslips for the active period only ── */}
              {activePeriod && (
                <div className="flex flex-col items-center gap-8 print:gap-0">
                  {/* Screen: only active period */}
                  {activePeriod.items.map((item) => (
                    <div
                      key={`${activePeriod.periodKey}-${item.employeeId}`}
                      id={`voucher-${item.employeeId}`}
                      className="screen-voucher w-full flex flex-col items-center scroll-mt-6"
                    >
                      {/* Per-payslip indicator — only shown when multiple employees */}
                      {activePeriod.items.length > 1 && (
                        <div className="no-print w-full flex items-center justify-between px-3 py-1.5 mb-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-200/60 dark:bg-zinc-800/60 rounded border border-zinc-300/40 dark:border-zinc-700/50">
                          <strong className="text-zinc-800 dark:text-zinc-200 font-sans">{item.fullName}</strong>
                          <span className="text-[10px] uppercase tracking-wider">{item.employeeCode} • {item.department}</span>
                        </div>
                      )}
                      <div className="w-full shadow-xs bg-white rounded-lg">
                        <CustomizablePayslipView
                          item={item}
                          company={company}
                          monthLabel={activePeriod.monthLabel}
                          year={activePeriod.year}
                          config={config}
                          isCol={isCol}
                          visibleColumns={selectedColumns}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* ── Print-only: ALL selected payslips, always rendered off-screen so the browser lays them out ── */}
      <div
        aria-hidden="true"
        className="print-all-payslips no-select"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '210mm',
          pointerEvents: 'none',
          zIndex: -1,
          visibility: 'hidden',
        }}
      >
        {periodPayslips.map(period =>
          period.items.map(item => (
            <div
              key={`print-${period.periodKey}-${item.employeeId}`}
              className="w-full flex flex-col items-center print-page"
            >
              <div className="w-full bg-white">
                <CustomizablePayslipView
                  item={item}
                  company={company}
                  monthLabel={period.monthLabel}
                  year={period.year}
                  config={config}
                  isCol={isCol}
                  visibleColumns={selectedColumns}
                />
              </div>
            </div>
          ))
        )}
      </div>

    </div>,
    document.body
  );
};
