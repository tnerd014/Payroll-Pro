import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  Palette, 
  Check, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Share2, 
  Search, 
  X, 
  ChevronDown, 
  Calendar,
  Bookmark,
  Sparkles
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
  PayrollSnapshot 
} from '../../../types';
import { calculatePayrollItem, formatNaira, isEmployeeActiveForPeriod } from '../../../engine/payePensionEngine';
import { CustomizablePayslipView } from '../../payslip/CustomizablePayslipView';
import { BUILTIN_THEMES } from '../../payslip/payslipThemes';
import { PinchZoomContainer } from '../PinchZoomContainer';
import { MONTHS } from '../../../store/usePayrollStore';

interface MobilePayslipDesignerViewProps {
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
}

export const MobilePayslipDesignerView: React.FC<MobilePayslipDesignerViewProps> = ({
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
}) => {
  // Navigation & preview state
  const [selectedEmpIndex, setSelectedEmpIndex] = useState(0);
  const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [zoomFit, setZoomFit] = useState(true);

  // Theme dropdown / modal state
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const themePickerRef = useRef<HTMLDivElement>(null);

  // Close theme picker on outside click
  useEffect(() => {
    if (!isThemePickerOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(e.target as Node)) {
        setIsThemePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isThemePickerOpen]);

  // Date picker state: Year and Multi-Month selection
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [printYear, setPrintYear] = useState<number>(year || new Date().getFullYear());
  const [selectedMonthKeys, setSelectedMonthKeys] = useState<string[]>([selectedMonth || 'oct']);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close date picker on outside click
  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isDatePickerOpen]);

  // Multi-month toggle
  const toggleMonthKey = (key: string) => {
    setSelectedMonthKeys(prev => 
      prev.includes(key)
        ? (prev.length > 1 ? prev.filter(k => k !== key) : prev)
        : [...prev, key]
    );
  };

  // Formatted human label for selected period
  const periodLabel = useMemo(() => {
    if (selectedMonthKeys.length === 0) return `${monthLabel} ${printYear}`;
    const sorted = MONTHS.filter(m => selectedMonthKeys.includes(m.key));
    if (sorted.length === 1) return `${sorted[0].label} ${printYear}`;
    if (sorted.length === 12) return `All 12 Months (${printYear})`;
    // Check consecutive range
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
    // If active snapshot exists for activeMonthKey and printYear, use it
    const snap = snapshots.find(s => s.year === printYear && s.monthKey === activeMonthKey);
    if (snap && snap.items && snap.items.length > 0) {
      return snap.items;
    }

    if (items && items.length > 0 && printYear === year && activeMonthKey === selectedMonth) {
      return items;
    }

    if (employees && employees.length > 0) {
      return employees.map(emp => {
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
    if (employees && employees.length > 0) {
      return employees.map(e => e.id);
    }
    if (items && items.length > 0) {
      return items.map(i => i.employeeId);
    }
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
      (item.employeeCode || '').toLowerCase().includes(q) ||
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

  // Determine active theme name
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
    : 'Custom Theme';

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
          if (checkedEmployeeIds.includes(emp.id)) {
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

  // Native High-Fidelity A4 Printing
  const handlePrint = () => {
    document.body.classList.add('print-portal-active');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-portal-active');
    }, 1500);
  };

  // Share Payslip Summary
  const handleShare = () => {
    const text = `*OFFICIAL SALARY PAYSLIP*\n` +
      `Company: ${company.name}\n` +
      `Staff: ${previewItem.fullName} (${previewItem.employeeCode})\n` +
      `Department: ${previewItem.department || 'General'}\n` +
      `Period: ${activeMonthLabel} ${printYear}\n` +
      `---------------------------\n` +
      `Gross Salary: ${formatNaira(previewItem.monthlyGross)}\n` +
      `PAYE Tax: -${formatNaira(previewItem.monthlyPaye)}\n` +
      `Employee Pension: -${formatNaira(previewItem.employeePension)}\n` +
      (previewItem.loanDeduction ? `Loan Deduction: -${formatNaira(previewItem.loanDeduction)}\n` : '') +
      `Total Deductions: -${formatNaira(previewItem.totalDeductions)}\n` +
      `*NET TAKE-HOME: ${formatNaira(previewItem.netTakeHome)}*\n` +
      `Status: ${isLocked ? 'Approved & Locked' : 'Active Calculation'}`;

    if (navigator.share) {
      navigator.share({
        title: `Payslip - ${previewItem.fullName} (${activeMonthLabel} ${printYear})`,
        text: text,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <div className="no-print space-y-3 pb-24 select-none">
      
      {/* ── 1. Minimalist Top Header Bar ── */}
      <header className="bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl px-3 py-2.5 shadow-xs flex items-center justify-between gap-2 z-30">
        
        {/* Left: Back button & Clickable Date Picker Chip */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-colors shrink-0 cursor-pointer active:scale-95"
            title="Back to Payroll"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Clickable Date Picker Popover Trigger */}
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 shadow-2xs hover:bg-emerald-100 dark:hover:bg-emerald-950/60 active:scale-95 transition-all cursor-pointer truncate max-w-[170px]"
              title="Click to select month(s) & year"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{periodLabel}</span>
              <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-150 ${isDatePickerOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Date Picker Popover (Desktop-grade multi-month selector) */}
            {isDatePickerOpen && (
              <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                {/* Year Navigation */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setPrintYear(y => y - 1)}
                    className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {printYear}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPrintYear(y => y + 1)}
                    className="w-7 h-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition cursor-pointer"
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
                        className={`py-1.5 px-1 rounded-xl text-[11px] font-bold transition cursor-pointer relative ${
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

                {/* Quick Shortcuts */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedMonthKeys(MONTHS.map(m => m.key))}
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    All 12 Months
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(false)}
                    className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Theme Picker (Replaces redundant top print/share/reload) */}
        <div className="relative shrink-0" ref={themePickerRef}>
          <button
            type="button"
            onClick={() => setIsThemePickerOpen(!isThemePickerOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition shadow-2xs cursor-pointer active:scale-95"
            title="Choose Payslip Theme"
          >
            <span 
              className="w-3 h-3 rounded-full border border-black/15 shrink-0 shadow-2xs" 
              style={{ backgroundColor: currentAccent }} 
            />
            <span className="font-semibold max-w-[105px] truncate">
              {activeThemeName}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${isThemePickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Theme Picker Dropdown Popover */}
          {isThemePickerOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2.5 z-50 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150 max-h-[75vh] overflow-y-auto">
              
              {/* User's Saved Themes from Payslip Studio */}
              {savedPresets.length > 0 && (
                <div className="space-y-1 pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="px-1 text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Bookmark className="w-3 h-3" />
                    <span>My Saved Themes ({savedPresets.length})</span>
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
                              className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" 
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
                  <span>Curated Themes</span>
                </div>
                <div className="space-y-1">
                  {BUILTIN_THEMES.map(theme => {
                    const isSelected = theme.name === activeThemeName;
                    return (
                      <button
                        key={theme.id}
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
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" 
                            style={{ backgroundColor: theme.color }}
                          />
                          <div className="min-w-0">
                            <span className="block truncate">{theme.name}</span>
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
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 transition-colors">
              {previewItem.fullName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <span className="text-[10px] text-zinc-400 truncate">
              {previewItem.employeeCode} &bull; {previewItem.department || 'GENERAL'}
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

      {/* ── 3. Document Canvas Container with Hand Gesture Zoom (Pinch / Pan / Double-Tap) ── */}
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

        {/* Scaled Preview Canvas Wrapper with Gesture Zoom */}
        <div className="w-full flex flex-col items-center justify-start bg-zinc-100/70 dark:bg-zinc-950 p-1.5 sm:p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 overflow-hidden min-h-[420px]">
          <PinchZoomContainer
            zoomMode={zoomFit ? 'fit' : 'full'}
            onZoomModeChange={(mode) => setZoomFit(mode === 'fit')}
            className="rounded-xl overflow-hidden shadow-sm bg-white"
          >
            <CustomizablePayslipView
              item={previewItem}
              company={company}
              monthLabel={activeMonthLabel}
              year={printYear}
              config={payslipDesign}
              interactive={false}
            />
          </PinchZoomContainer>
        </div>
      </div>

      {/* ── 4. Bottom Action Dock ── */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={handlePrint}
          className="h-12 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>
            {printItems.length > 1
              ? `Print ${printItems.length} Payslips (A4)`
              : 'Print / Save PDF'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="h-12 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs tracking-wide shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {copiedShare ? (
            <>
              <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share Summary</span>
            </>
          )}
        </button>
      </div>

      {/* ── 5. Staff Selection Drawer with Check & Uncheck ── */}
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
                placeholder="Search by staff name, code, dept..."
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
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
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
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {item.fullName}
                          </span>
                          {isCurrentPreview && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                              Previewing
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {item.employeeCode} &bull; {item.department || 'GENERAL'}
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

            {/* Bottom Done button */}
            <button
              type="button"
              onClick={() => setIsStaffPickerOpen(false)}
              className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center transition cursor-pointer"
            >
              Done ({checkedEmployeeIds.length} Selected)
            </button>

          </div>
        </div>
      )}

      {/* ── 6. Hidden Printable Unscaled Multi-Page Payslips (Pure A4 Native Print) ── */}
      {createPortal(
        <div className="hidden print:block print:w-full print:m-0 print:p-0">
          {printItems.map((p, idx) => (
            <div 
              key={`${p.item.employeeId}-${p.monthLabel}-${p.year}-${idx}`}
              className="print:w-full print:break-inside-avoid print:break-after-page mb-8"
            >
              <CustomizablePayslipView
                item={p.item}
                company={company}
                monthLabel={p.monthLabel}
                year={p.year}
                config={payslipDesign}
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
