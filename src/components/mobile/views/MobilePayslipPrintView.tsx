import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  Palette, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Search, 
  X, 
  ChevronDown, 
  Calendar, 
  Bookmark, 
  Sparkles, 
  SlidersHorizontal, 
  RotateCcw,
  Mail
} from 'lucide-react';
import { 
  CompanyProfile, 
  Employee, 
  PayrollVariables, 
  PayeTaxVariables, 
  CalculatedPayrollItem, 
  PayslipDesignConfig, 
  DEFAULT_PAYSLIP_DESIGN,
  EmployeeLoan, 
  PayslipCustomPreset, 
  PayrollSnapshot,
  ALL_PAYSLIP_COLUMNS,
  DEFAULT_COLUMNS,
  normalizeVisibleColumns,
  EmailPayslipContext
} from '../../../types';
import { calculatePayrollItem, formatNaira } from '../../../engine/payePensionEngine';
import { CustomizablePayslipView } from '../../payslip/CustomizablePayslipView';
import { BUILTIN_THEMES } from '../../payslip/payslipThemes';
import { PinchZoomContainer } from '../PinchZoomContainer';
import { MONTHS } from '../../../store/usePayrollStore';
import { isEmployeeActiveForPeriod } from '../../../engine/dateUtils';

interface MobilePayslipPrintViewProps {
  company: CompanyProfile;
  employees: Employee[];
  items?: CalculatedPayrollItem[];
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  monthLabel: string;
  selectedMonth: string;
  year: number;
  payslipDesign?: PayslipDesignConfig;
  savedPresets?: PayslipCustomPreset[];
  snapshots?: PayrollSnapshot[];
  onUpdatePayslipDesign: (updates: Partial<PayslipDesignConfig>) => void;
  onResetPayslipDesign: () => void;
  onBack: () => void;
  loans?: EmployeeLoan[];
  isLocked?: boolean;
  onEmailPayslips?: (context?: EmailPayslipContext) => void;
}

export const MobilePayslipPrintView: React.FC<MobilePayslipPrintViewProps> = ({
  company,
  employees = [],
  items = [],
  payrollVariables,
  payeTaxVariables,
  monthLabel,
  selectedMonth,
  year,
  payslipDesign = DEFAULT_PAYSLIP_DESIGN,
  savedPresets = [],
  snapshots = [],
  onUpdatePayslipDesign,
  onResetPayslipDesign,
  onBack,
  loans = [],
  isLocked = false,
  onEmailPayslips,
}) => {
  // Navigation & preview state
  const [selectedEmpIndex, setSelectedEmpIndex] = useState(0);
  const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [zoomFit, setZoomFit] = useState(true);

  // Dropdowns and modals state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);

  // Close popover dropdowns when tapping outside
  useEffect(() => {
    if (!isDatePickerOpen && !isThemePickerOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (isDatePickerOpen && datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
      if (isThemePickerOpen && themePickerRef.current && !themePickerRef.current.contains(target)) {
        setIsThemePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isDatePickerOpen, isThemePickerOpen]);

  // Date picker state: Year and Multi-Month selection
  const [printYear, setPrintYear] = useState<number>(year || new Date().getFullYear());
  const [selectedMonthKeys, setSelectedMonthKeys] = useState<string[]>([selectedMonth || 'oct']);

  // Visible columns selection state (Parity with Desktop Columns to Display)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    return (payslipDesign.visibleColumns && payslipDesign.visibleColumns.length > 0)
      ? normalizeVisibleColumns(payslipDesign.visibleColumns)
      : DEFAULT_COLUMNS;
  });

  // Sync visible columns when payslipDesign changes
  useEffect(() => {
    if (payslipDesign.visibleColumns && payslipDesign.visibleColumns.length > 0) {
      setSelectedColumns(normalizeVisibleColumns(payslipDesign.visibleColumns));
    }
  }, [payslipDesign.visibleColumns]);

  // Multi-month toggle
  const toggleMonthKey = (key: string) => {
    setSelectedMonthKeys(prev => 
      prev.includes(key)
        ? (prev.length > 1 ? prev.filter(k => k !== key) : prev)
        : [...prev, key]
    );
  };

  // Human-readable formatted period label
  const periodLabel = useMemo(() => {
    if (selectedMonthKeys.length === 0) return `${monthLabel} ${printYear}`;
    const sorted = MONTHS.filter(m => selectedMonthKeys.includes(m.key));
    if (sorted.length === 1) return `${sorted[0].label} ${printYear}`;
    if (sorted.length === 12) return `All 12 Months (${printYear})`;
    const indices = sorted.map(m => MONTHS.findIndex(mo => mo.key === m.key)).sort((a, b) => a - b);
    const isRange = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
    if (isRange && sorted.length >= 2) {
      return `${sorted[0].label.slice(0, 3)}–${sorted[sorted.length - 1].label.slice(0, 3)} ${printYear}`;
    }
    return `${sorted.length} Months (${printYear})`;
  }, [selectedMonthKeys, printYear, monthLabel]);

  // Active month key for the on-screen preview
  const activeMonthKey = selectedMonthKeys[0] || selectedMonth || 'oct';
  const activeMonthLabel = MONTHS.find(m => m.key === activeMonthKey)?.label || monthLabel;

  // Compute calculated items for all available employees for active preview month
  const computedItems: CalculatedPayrollItem[] = useMemo(() => {
    const snap = snapshots.find(s => s.year === printYear && s.monthKey === activeMonthKey);
    if (snap && snap.items && snap.items.length > 0) {
      return snap.items;
    }

    if (items && items.length > 0 && printYear === year && activeMonthKey === selectedMonth) {
      return items;
    }

    if (employees && employees.length > 0) {
      const activeEmps = employees.filter(emp => isEmployeeActiveForPeriod(emp, printYear, activeMonthKey));
      if (activeEmps.length > 0) {
        return activeEmps.map(emp => {
          const base = calculatePayrollItem(emp, payrollVariables, payeTaxVariables, activeMonthKey, printYear);
          const empLoan = loans.find(l => l.employeeId === emp.id && l.status === 'Active');
          const loanDed = empLoan ? Math.min(empLoan.monthlyDeduction || 0, empLoan.remainingBalance) : 0;
          return {
            ...base,
            loanDeduction: loanDed,
            totalDeductions: base.totalDeductions + loanDed,
            netTakeHome: Math.max(0, base.netTakeHome - loanDed),
          };
        });
      }
    }

    // Fallback item
    const sampleEmp: Employee = {
      id: 'emp-demo',
      code: 'EMP-001',
      firstName: 'Demo',
      lastName: 'Staff',
      email: 'demo@example.com',
      phone: '08000000000',
      bankName: 'Bank',
      accountNumber: '0000000000',
      department: 'Finance',
      position: 'Staff Member',
      monthlyGross: 250000,
      annualRent: 0,
      hasPension: true,
      hasPaye: true,
      status: 'Active',
      employmentType: 'Full-Time',
    };
    const sampleBase = calculatePayrollItem(sampleEmp, payrollVariables, payeTaxVariables, activeMonthKey, printYear);
    return [sampleBase];
  }, [items, employees, payrollVariables, payeTaxVariables, activeMonthKey, printYear, year, selectedMonth, loans, snapshots]);

  // Checked employees for batch printing / actions
  const [checkedEmployeeIds, setCheckedEmployeeIds] = useState<string[]>(() => {
    if (employees && employees.length > 0) return employees.map(e => e.id);
    if (items && items.length > 0) return items.map(i => i.employeeId);
    return [];
  });

  // Clamp selectedEmpIndex
  const safeEmpIndex = Math.min(selectedEmpIndex, Math.max(0, computedItems.length - 1));
  const previewItem = computedItems[safeEmpIndex] || computedItems[0];

  // Navigation across staff
  const handlePrevEmployee = () => {
    if (computedItems.length <= 1) return;
    setSelectedEmpIndex(prev => (prev > 0 ? prev - 1 : computedItems.length - 1));
  };

  const handleNextEmployee = () => {
    if (computedItems.length <= 1) return;
    setSelectedEmpIndex(prev => (prev < computedItems.length - 1 ? prev + 1 : 0));
  };

  // Staff search filter
  const filteredStaffList = useMemo(() => {
    if (!staffSearchQuery.trim()) return computedItems;
    const q = staffSearchQuery.toLowerCase();
    return computedItems.filter(item => 
      (item.fullName || '').toLowerCase().includes(q) ||
      (item.department || '').toLowerCase().includes(q)
    );
  }, [computedItems, staffSearchQuery]);

  // Toggle check/uncheck for an employee
  const toggleCheckEmployee = (empId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCheckedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleSelectAllEmployees = () => {
    setCheckedEmployeeIds(computedItems.map(i => i.employeeId));
  };

  const handleDeselectAllEmployees = () => {
    setCheckedEmployeeIds([]);
  };

  // Column toggling functions
  const toggleColumn = (colId: string) => {
    const next = selectedColumns.includes(colId)
      ? selectedColumns.filter(c => c !== colId)
      : [...selectedColumns, colId];
    setSelectedColumns(next);
    onUpdatePayslipDesign({ visibleColumns: next });
  };

  const handleSelectAllColumns = () => {
    const allIds = ALL_PAYSLIP_COLUMNS.map(c => c.id);
    setSelectedColumns(allIds);
    onUpdatePayslipDesign({ visibleColumns: allIds });
  };

  const handleResetColumns = () => {
    setSelectedColumns(DEFAULT_COLUMNS);
    if (onResetPayslipDesign) {
      onResetPayslipDesign();
    } else {
      onUpdatePayslipDesign({ visibleColumns: DEFAULT_COLUMNS });
    }
  };

  const handleClearAllColumns = () => {
    setSelectedColumns([]);
    onUpdatePayslipDesign({ visibleColumns: [] });
  };

  // Determine active theme name & accent color
  const currentAccent = payslipDesign.customColor || '#18181b';
  const matchingCustom = savedPresets.find(p => 
    p.design.customColor === payslipDesign.customColor &&
    p.design.headerLayout === payslipDesign.headerLayout
  );
  const matchingBuiltin = BUILTIN_THEMES.find(t => 
    t.config.customColor === payslipDesign.customColor &&
    t.config.headerLayout === payslipDesign.headerLayout
  );
  const activeThemeName = matchingCustom 
    ? matchingCustom.name 
    : matchingBuiltin 
    ? matchingBuiltin.name 
    : 'Theme';

  // Flat list of all items to print across selected months and checked employees
  const printItems = useMemo(() => {
    const list: { item: CalculatedPayrollItem; monthLabel: string; year: number }[] = [];
    
    selectedMonthKeys.forEach(mKey => {
      const mLabel = MONTHS.find(m => m.key === mKey)?.label || mKey;
      const snap = snapshots.find(s => s.year === printYear && s.monthKey === mKey);
      
      if (snap && snap.items && snap.items.length > 0) {
        snap.items.forEach(item => {
          if (checkedEmployeeIds.includes(item.employeeId)) {
            list.push({ item, monthLabel: mLabel, year: printYear });
          }
        });
      } else {
        employees.forEach(emp => {
          if (checkedEmployeeIds.includes(emp.id) && isEmployeeActiveForPeriod(emp, printYear, mKey)) {
            try {
              const calc = calculatePayrollItem(emp, payrollVariables, payeTaxVariables, mKey, printYear);
              const empLoan = loans.find(l => l.employeeId === emp.id && l.status === 'Active');
              const loanDed = empLoan ? Math.min(empLoan.monthlyDeduction || 0, empLoan.remainingBalance) : 0;
              const finalItem = {
                ...calc,
                loanDeduction: loanDed,
                totalDeductions: calc.totalDeductions + loanDed,
                netTakeHome: Math.max(0, calc.netTakeHome - loanDed),
              };
              list.push({ item: finalItem, monthLabel: mLabel, year: printYear });
            } catch (err) {
              console.warn('Payslip calc fallback for', emp.id, err);
            }
          }
        });
      }
    });

    return list.length > 0 ? list : [{ item: previewItem, monthLabel: activeMonthLabel, year: printYear }];
  }, [selectedMonthKeys, printYear, snapshots, employees, checkedEmployeeIds, payrollVariables, payeTaxVariables, loans, previewItem, activeMonthLabel]);

  // Native High-Fidelity A4 Printing (Supports Web & Android APK Native Print Spooler)
  const handlePrint = () => {
    document.body.classList.add('print-portal-active');

    const androidPrinter = (window as any).AndroidPrinter;
    if (androidPrinter && typeof androidPrinter.print === 'function') {
      try {
        androidPrinter.print();
      } catch (err) {
        console.warn('AndroidPrinter invocation fallback to window.print:', err);
        window.print();
      }
    } else {
      window.print();
    }

    setTimeout(() => {
      document.body.classList.remove('print-portal-active');
    }, 4000);
  };

  return (
    <div className="no-print space-y-3 pb-6 select-none">
      
      {/* ── 1. Minimalist Top Header Bar (Zero Clutter, Proper Dropdowns) ── */}
      <header className="relative bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-2 shadow-xs flex items-center justify-between gap-1.5 z-40">
        
        {/* Left: Compact Back Button + Date Period Dropdown */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-95"
            title="Back to Payroll"
            aria-label="Back to Payroll"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Date Period Dropdown Trigger & Popover */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => {
                setIsDatePickerOpen(prev => !prev);
                setIsThemePickerOpen(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 shadow-2xs hover:bg-emerald-100 dark:hover:bg-emerald-950/60 active:scale-95 transition-all cursor-pointer truncate max-w-[145px] sm:max-w-[180px]"
              title="Click to select month(s) & year"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{periodLabel}</span>
              <ChevronDown className={`w-3 h-3 shrink-0 opacity-60 transition-transform duration-150 ${isDatePickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Date Dropdown Popover */}
            {isDatePickerOpen && (
              <div className="absolute left-0 top-full mt-2 z-50 w-[275px] sm:w-[300px] bg-white dark:bg-[#18181b] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-2xl p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150 select-none">
                {/* Year Navigation */}
                <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                  <button
                    type="button"
                    onClick={() => setPrintYear(y => y - 1)}
                    className="w-7 h-7 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition cursor-pointer"
                    title="Previous Year"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {printYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPrintYear(y => y + 1)}
                    className="w-7 h-7 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition cursor-pointer"
                    title="Next Year"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Month Grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {MONTHS.map(m => {
                    const active = selectedMonthKeys.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => toggleMonthKey(m.key)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer relative active:scale-95 ${
                          active
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {m.label.slice(0, 3)}
                        {active && selectedMonthKeys.length > 1 && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Quick Shortcuts & Done */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMonthKeys(MONTHS.map(m => m.key))}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    All 12 Months
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Columns Modal Button + Theme Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Columns Modal Button */}
          <button
            type="button"
            onClick={() => {
              setIsColumnsModalOpen(true);
              setIsDatePickerOpen(false);
              setIsThemePickerOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
            title="Columns & Fields to Display"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden xs:inline">Columns</span>
          </button>

          {/* Theme Dropdown */}
          <div className="relative" ref={themePickerRef}>
            <button
              type="button"
              onClick={() => {
                setIsThemePickerOpen(prev => !prev);
                setIsDatePickerOpen(false);
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition shadow-2xs cursor-pointer active:scale-95 truncate max-w-[110px] sm:max-w-[140px]"
              title="Choose Payslip Theme"
            >
              <span 
                className="w-3 h-3 rounded-full border border-black/15 shrink-0 shadow-2xs" 
                style={{ backgroundColor: currentAccent }} 
              />
              <span className="truncate">
                {activeThemeName}
              </span>
              <ChevronDown className={`w-3 h-3 text-zinc-400 shrink-0 transition-transform duration-150 ${isThemePickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Theme Dropdown Popover */}
            {isThemePickerOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#18181b] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-2xl p-2.5 z-50 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150 max-h-[75vh] overflow-y-auto select-none">
                {/* User's Saved Themes from Payslip Studio */}
                {savedPresets.length > 0 && (
                  <div className="space-y-1 pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="px-1 text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Bookmark className="w-3 h-3" />
                      <span>My Studio Saved Themes ({savedPresets.length})</span>
                    </div>
                    <div className="space-y-1">
                      {savedPresets.map(preset => {
                        const isSelected = preset.name === activeThemeName;
                        const presetColor = preset.design.customColor || '#18181b';
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              onUpdatePayslipDesign(preset.design);
                              setIsThemePickerOpen(false);
                            }}
                            className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-bold border border-amber-300 dark:border-amber-800'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span 
                                className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 shadow-2xs" 
                                style={{ backgroundColor: presetColor }}
                              />
                              <span className="truncate">{preset.name}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Built-in Themes */}
                <div className="space-y-1">
                  <div className="px-1 text-[10px] uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span>Curated Built-in Themes</span>
                  </div>
                  <div className="space-y-1">
                    {BUILTIN_THEMES.map(theme => {
                      const isSelected = theme.name === activeThemeName;
                      return (
                        <button
                          key={theme.name}
                          type="button"
                          onClick={() => {
                            onUpdatePayslipDesign(theme.config);
                            setIsThemePickerOpen(false);
                          }}
                          className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-300 dark:border-emerald-800'
                              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 shadow-2xs" 
                              style={{ backgroundColor: theme.color }}
                            />
                            <div className="min-w-0">
                              <span className="block truncate">{theme.name}</span>
                              <span className="text-[10px] text-zinc-400 font-normal block truncate">{theme.desc}</span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </header>

      {/* ── 2. Staff Navigator Bar with Interactive Employee Selector ── */}
      <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-2.5 shadow-xs flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrevEmployee}
          disabled={computedItems.length <= 1}
          className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer active:scale-90 transition-colors shrink-0"
          title="Previous Employee"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Tappable Staff Identity Card (Opens Checkbox Staff Drawer) */}
        <button
          type="button"
          onClick={() => setIsStaffPickerOpen(true)}
          className="flex-1 min-w-0 text-left px-2.5 py-1 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer group"
          title="Tap to select and check employees"
        >
          <div className="flex items-start justify-between gap-1">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words group-hover:text-emerald-600 transition-colors">
              {previewItem.fullName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold truncate">
              {previewItem.department || 'GENERAL'}
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              {formatNaira(previewItem.netTakeHome)}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={handleNextEmployee}
          disabled={computedItems.length <= 1}
          className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer active:scale-90 transition-colors shrink-0"
          title="Next Employee"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── 3. Document Canvas Container with Silky Smooth GPU Zoom ── */}
      <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-3xl p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-zinc-400 font-medium">
              Staff {safeEmpIndex + 1} of {computedItems.length} &bull; <strong className="text-zinc-700 dark:text-zinc-300">{checkedEmployeeIds.length} checked</strong>
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">
            Pinch or double-tap to zoom
          </span>
        </div>

        {/* Scaled Preview Canvas Wrapper with Smooth GPU Gesture Zoom (snug-fit, zero blank space) */}
        <div className="w-full flex flex-col items-center justify-center bg-zinc-100/70 dark:bg-zinc-950 p-1.5 sm:p-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 overflow-hidden">
          <PinchZoomContainer
            zoomMode={zoomFit ? 'fit' : 'full'}
            onZoomModeChange={(mode) => setZoomFit(mode === 'fit')}
            className="w-full"
          >
            <CustomizablePayslipView
              item={previewItem}
              company={company}
              monthLabel={activeMonthLabel}
              year={printYear}
              config={payslipDesign}
              visibleColumns={selectedColumns}
              interactive={false}
            />
          </PinchZoomContainer>
        </div>
      </div>

      {/* ── 4. Bottom Action Dock: Side-by-Side Print & Email ── */}
      <div className={`pt-1 ${onEmailPayslips ? 'grid grid-cols-2 gap-2.5' : 'flex'} w-full`}>
        {/* Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          className={`h-12 px-4 rounded-2xl font-bold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer transition-all ${
            onEmailPayslips
              ? 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 border border-zinc-700/50 dark:border-zinc-200/50'
              : 'w-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
          title="Print Payslips"
        >
          <Printer className={`w-4 h-4 ${onEmailPayslips ? 'text-emerald-400 dark:text-emerald-600' : ''}`} />
          <span>Print</span>
        </button>

        {/* Email Button */}
        {onEmailPayslips && (
          <button
            type="button"
            onClick={() => {
              onEmailPayslips({
                selectedEmployeeIds: checkedEmployeeIds.length > 0
                  ? checkedEmployeeIds
                  : previewItem?.employeeId
                    ? [previewItem.employeeId]
                    : [],
                selectedMonthKeys: selectedMonthKeys,
                year: printYear,
              });
            }}
            className="h-12 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            title="Email Payslips"
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </button>
        )}
      </div>



      {/* ── 7. Columns & Fields to Display Modal (Desktop Feature in Non-Disruptive Mobile Modal) ── */}
      {isColumnsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 select-none">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3.5 shadow-2xl max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Columns to Display</span>
                </h3>
                <p className="text-[10px] text-zinc-400">
                  {selectedColumns.length} of {ALL_PAYSLIP_COLUMNS.length} fields enabled
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={handleResetColumns}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition cursor-pointer flex items-center gap-0.5"
                  title="Reset to recommended"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAllColumns}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setIsColumnsModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Column Checkbox Groups */}
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1">
              {[
                { sectionId: 'employee_meta', title: 'Employee Information' },
                { sectionId: 'earnings', title: 'Earnings Components' },
                { sectionId: 'deductions', title: 'Statutory Deductions' },
                { sectionId: 'net_pay', title: 'Net Pay Summary' },
                { sectionId: 'company_header', title: 'Company Header & Logo' },
                { sectionId: 'pay_period_banner', title: 'Pay Period Banner' },
                { sectionId: 'employer_contributions', title: 'Employer Contributions' },
                { sectionId: 'bank_details', title: 'Disbursement Details' },
                { sectionId: 'signatures', title: 'Signatures Block' },
                { sectionId: 'footer_notes', title: 'Footer & Disclaimer' },
              ].map(group => {
                const groupCols = ALL_PAYSLIP_COLUMNS.filter(c => c.sectionId === group.sectionId);
                if (groupCols.length === 0) return null;

                return (
                  <div key={group.sectionId} className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 px-1">
                      {group.title}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {groupCols.map(col => {
                        const isChecked = selectedColumns.includes(col.id);
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => toggleColumn(col.id)}
                            className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-zinc-900 dark:text-zinc-100'
                                : 'bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <span className="text-xs font-medium truncate pr-2">
                              {col.label}
                            </span>
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'border-2 border-zinc-300 dark:border-zinc-700'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Done Button */}
            <button
              type="button"
              onClick={() => setIsColumnsModalOpen(false)}
              className="w-full h-12 shrink-0 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-sm flex items-center justify-center transition shadow-md cursor-pointer"
            >
              Done ({selectedColumns.length} Fields Active)
            </button>

          </div>
        </div>
      )}

      {/* ── 8. Staff Selection Drawer with Check & Uncheck & Fixed Height Done Button ── */}
      {isStaffPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center sm:items-center sm:p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3.5 shadow-2xl max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Staff Selection
                </h3>
                <p className="text-[10px] text-zinc-400">
                  {checkedEmployeeIds.length} of {computedItems.length} checked for printing
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={checkedEmployeeIds.length === computedItems.length ? handleDeselectAllEmployees : handleSelectAllEmployees}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  {checkedEmployeeIds.length === computedItems.length ? 'Uncheck All' : 'Check All'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsStaffPickerOpen(false)}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input (40px Height) */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search staff, dept..."
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-9 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
              />
              {staffSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStaffSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Staff List with Checkboxes */}
            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-0.5">
              {filteredStaffList.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  No staff members matched "{staffSearchQuery}"
                </div>
              ) : (
                filteredStaffList.map((item, idx) => {
                  const isChecked = checkedEmployeeIds.includes(item.employeeId);
                  const isCurrentPreview = item.employeeId === previewItem.employeeId;

                  return (
                    <div
                      key={item.employeeId || idx}
                      onClick={() => {
                        const originalIndex = computedItems.findIndex(i => i.employeeId === item.employeeId);
                        if (originalIndex !== -1) setSelectedEmpIndex(originalIndex);
                      }}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isCurrentPreview
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500/40'
                          : 'bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => toggleCheckEmployee(item.employeeId, e)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          isChecked
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'border-2 border-zinc-300 dark:border-zinc-600 hover:border-zinc-400'
                        }`}
                        title={isChecked ? 'Uncheck employee' : 'Check employee'}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      {/* Employee Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug break-words">
                            {item.fullName}
                          </span>
                          {isCurrentPreview && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                              Previewing
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 uppercase font-semibold mt-0.5">
                          {item.department || 'GENERAL'}
                        </p>
                      </div>

                      {/* Net Pay */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                          {formatNaira(item.netTakeHome)}
                        </span>
                        <span className="text-[9px] text-zinc-400 block">
                          Net Pay
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Done Button (Fixed Height, 48px, never squished) */}
            <button
              type="button"
              onClick={() => setIsStaffPickerOpen(false)}
              className="w-full h-12 shrink-0 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-sm flex items-center justify-center transition shadow-md cursor-pointer"
            >
              Done ({checkedEmployeeIds.length} Selected)
            </button>

          </div>
        </div>
      )}

      {/* ── 9. Hidden Printable Unscaled Multi-Page Payslips (Pure A4 Native Print) ── */}
      {createPortal(
        <div className="hidden print:block print:w-full print:m-0 print:p-0">
          {printItems.map((p, idx) => (
            <div 
              key={`${p.item.employeeId}-${p.monthLabel}-${p.year}-${idx}`}
              className={`print:w-full print:break-inside-avoid mb-8 ${idx < printItems.length - 1 ? 'print:break-after-page' : ''}`}
            >
              <CustomizablePayslipView
                item={p.item}
                company={company}
                monthLabel={p.monthLabel}
                year={p.year}
                config={payslipDesign}
                visibleColumns={selectedColumns}
                interactive={false}
              />
            </div>
          ))}
        </div>,
        document.body
      )}

    </div>
  );
};
