import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  RotateCcw,
  Palette,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Type,
  Building2,
  ShieldCheck,
  Save,
  Sliders,
  Printer,
  Share2,
  Eye,
  Search,
  X,
  User,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  CreditCard,
  Briefcase,
  Plus,
  Trash2,
  Bookmark
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
import { calculatePayrollItem, formatNaira, formatCompactNaira } from '../../../engine/payePensionEngine';
import { isEmployeeActiveForPeriod } from '../../../engine/dateUtils';
import { CustomizablePayslipView } from '../../payslip/CustomizablePayslipView';
import { BUILTIN_THEMES } from '../../payslip/payslipThemes';
import { PinchZoomContainer } from '../PinchZoomContainer';

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
  onSavePreset?: (name: string, config: PayslipDesignConfig) => void;
  onDeletePreset?: (id: string) => void;
  onBack: () => void;
  loans?: EmployeeLoan[];
  isLocked?: boolean;
  isReadOnly?: boolean;
}

const BRAND_PALETTES = [
  { id: 'emerald', label: 'Emerald', hex: '#059669' },
  { id: 'indigo', label: 'Indigo', hex: '#4f46e5' },
  { id: 'blue', label: 'Blue', hex: '#1d4ed8' },
  { id: 'slate', label: 'Slate', hex: '#64748b' },
  { id: 'violet', label: 'Violet', hex: '#7c3aed' },
  { id: 'amber', label: 'Amber', hex: '#d97706' },
  { id: 'rose', label: 'Rose', hex: '#e11d48' },
  { id: 'black', label: 'Monochrome', hex: '#18181b' },
];

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
  onSavePreset,
  onDeletePreset,
  onBack,
  loans = [],
  isLocked = false,
  isReadOnly = false,
}) => {
  // Navigation & view mode: Design Studio as default
  const [activeTab, setActiveTab] = useState<'customize' | 'preview'>('customize');
  const [selectedEmpIndex, setSelectedEmpIndex] = useState(0);
  const [isStaffPickerOpen, setIsStaffPickerOpen] = useState(false);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  // Save preset modal & feedback toasts
  const [isSavePresetModalOpen, setIsSavePresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Custom Hex Color State
  const [customHexInput, setCustomHexInput] = useState(payslipDesign.customColor || '');

  // Document Text & Headings Accordion State
  const [isTextControlsOpen, setIsTextControlsOpen] = useState(false);

  // Compute calculated items for all available employees
  const computedItems: CalculatedPayrollItem[] = useMemo(() => {
    if (items && items.length > 0) {
      return items;
    }

    if (employees && employees.length > 0) {
      const activeEmps = employees.filter(emp => isEmployeeActiveForPeriod(emp, year, selectedMonth));
      if (activeEmps.length > 0) {
        const currentPeriodKey = `${year}-${selectedMonth}`;
        return activeEmps.map(emp => {
          const base = calculatePayrollItem(emp, payrollVariables, payeTaxVariables, selectedMonth, year);
          let totalLoanDeduction = 0;
          (loans || []).forEach(l => {
            if (!l || l.employeeId !== emp.id) return;
            const periodRecord = (l.history || []).find(h => h.periodKey === currentPeriodKey);
            if (periodRecord) {
              totalLoanDeduction += Math.max(0, Number(periodRecord.amount) || 0);
            } else if (l.status === 'Active' && (l.remainingBalance || 0) > 0) {
              const monthly = l.type === 'Salary Advance'
                ? (l.remainingBalance || 0)
                : Math.min(Number(l.monthlyDeduction) || 0, Number(l.remainingBalance) || 0);
              totalLoanDeduction += Math.max(0, monthly);
            }
          });

          return {
            ...base,
            loanDeduction: totalLoanDeduction,
            totalDeductions: base.totalDeductions + totalLoanDeduction,
            netTakeHome: Math.max(0, base.netTakeHome - totalLoanDeduction),
          };
        });
      }
    }

    // Fallback sample employee if company has no staff yet
    const sampleEmp: Employee = {
      id: 'sample-demo-1',
      code: 'EMP-001',
      firstName: 'Engr. Babatunde',
      lastName: 'Adeleke',
      department: 'ENGINEERING',
      position: 'Lead Infrastructure Engineer',
      monthlyGross: 750000,
      annualRent: 2400000,
      bankName: 'Zenith Bank PLC',
      accountNumber: '1029384756',
      hasPension: true,
      hasPaye: true,
      payeNumber: 'LAG-PAYE-89210',
      pensionNumber: 'PEN1008273910',
      pfaName: 'Stanbic IBTC Pension Managers',
      email: 'b.adeleke@example.com',
      phone: '+234 803 123 4567',
      status: 'Active',
      employmentType: 'Full-Time',
    };
    const sampleBase = calculatePayrollItem(sampleEmp, payrollVariables, payeTaxVariables, selectedMonth, year);
    return [{
      ...sampleBase,
      loanDeduction: 45000,
      totalDeductions: sampleBase.totalDeductions + 45000,
      netTakeHome: Math.max(0, sampleBase.netTakeHome - 45000),
    }];
  }, [items, employees, payrollVariables, payeTaxVariables, selectedMonth, year, loans]);

  // Active preview item
  const previewItem = computedItems[selectedEmpIndex] || computedItems[0];

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

  // Native High-Fidelity A4 Printing
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
    }, 1500);
  };

  const handleSaveCurrentDesign = () => {
    if (isReadOnly) return;
    setSaveToast('Design settings saved & applied!');
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleCreateNewPreset = () => {
    if (isReadOnly) return;
    if (!newPresetName.trim()) return;
    if (onSavePreset) {
      onSavePreset(newPresetName.trim(), payslipDesign);
      setSaveToast(`Preset "${newPresetName.trim()}" saved!`);
      setTimeout(() => setSaveToast(null), 2500);
      setNewPresetName('');
      setIsSavePresetModalOpen(false);
    }
  };

  const isSectionEnabled = (id: string) => {
    return Boolean(payslipDesign.sectionOrder?.find(s => s.id === id)?.enabled);
  };

  const handleToggleSection = (id: string) => {
    const list = (payslipDesign.sectionOrder || []).map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    onUpdatePayslipDesign({ sectionOrder: list });
  };

  const handleMoveSection = (id: string, direction: 'up' | 'down') => {
    const sections = [...(payslipDesign.sectionOrder || [])];
    const index = sections.findIndex(s => s.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const temp = sections[index];
    sections[index] = sections[targetIndex];
    sections[targetIndex] = temp;
    onUpdatePayslipDesign({ sectionOrder: sections });
  };

  const activeColor = payslipDesign.customColor || payslipDesign.themeColor || '#059669';

  return (
    <div className="flex flex-col min-h-screen bg-[#fbfbfb] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 pb-6 select-none">

      {/* ── 1. Top Minimalist App Header ── */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md px-3.5 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer active:scale-95 text-xs font-semibold shrink-0"
            title="Return to Payroll"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
              <span>Payslip Designer</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 font-mono font-bold uppercase shrink-0">
                Studio
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Save as Preset Button */}
          {onSavePreset && (
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => {
                if (isReadOnly) return;
                setIsSavePresetModalOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800/60 text-pink-700 dark:text-pink-300 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              title={isReadOnly ? "Preset saving disabled in offline mode" : "Save current styling as a new reusable preset"}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Preset</span>
            </button>
          )}

          {/* Reset Design Button */}
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => {
              if (isReadOnly) return;
              onResetPayslipDesign();
            }}
            className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
            title={isReadOnly ? "Reset disabled in offline mode" : "Reset to Default Design"}
            aria-label="Reset to Default Design"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Toast Feedback Notification ── */}
      {saveToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 dark:bg-zinc-100/90 text-white dark:text-zinc-900 text-xs font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* ── 2. Segmented Mode Switcher (Studio vs Full Preview) ── */}
      <div className="px-3.5 pt-3 pb-1">
        <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('customize')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'customize'
                ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
          >
            <Palette className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span>Design Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'preview'
                ? 'bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Full Preview &amp; Print</span>
          </button>
        </div>
      </div>

      <div className="px-3.5 pt-2 space-y-4">

        {/* ══════════════════════════════════════════════════════
            TAB 1: DESIGN STUDIO (CUSTOMIZE CONTROLS)
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'customize' && (
          <div className="space-y-4 animate-in fade-in duration-150">

            {/* 1-Tap Theme Presets (Swipeable Horizontal Carousel) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  1-Tap Theme Presets
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">Swipe to choose</span>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none snap-x">
                {/* Custom Saved Presets */}
                {savedPresets && savedPresets.length > 0 && savedPresets.map(preset => {
                  const isSelected = payslipDesign.themeColor === preset.design.themeColor &&
                    payslipDesign.customColor === preset.design.customColor &&
                    payslipDesign.headerLayout === preset.design.headerLayout;

                  return (
                    <div
                      key={preset.id}
                      className={`relative snap-start shrink-0 w-36 p-3 rounded-2xl border text-left transition-all cursor-pointer ${isSelected
                          ? 'bg-pink-50/80 dark:bg-pink-950/40 border-pink-500 shadow-xs ring-1 ring-pink-500/50'
                          : 'bg-white dark:bg-[#121215] border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      onClick={() => onUpdatePayslipDesign(preset.design)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          style={{ backgroundColor: preset.design.customColor || preset.design.themeColor || '#059669' }}
                          className="w-5 h-5 rounded-full shadow-2xs border border-white dark:border-zinc-900"
                        />
                        <div className="flex items-center gap-1">
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-pink-600 text-white flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                          {onDeletePreset && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeletePreset(preset.id);
                              }}
                              className="w-4 h-4 text-zinc-400 hover:text-red-500 cursor-pointer"
                              title="Delete preset"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {preset.name}
                      </p>
                      <p className="text-[10px] text-pink-600 dark:text-pink-400 font-semibold truncate mt-0.5">
                        Custom Preset
                      </p>
                    </div>
                  );
                })}

                {/* Built-in Presets */}
                {BUILTIN_THEMES.map(theme => {
                  const isSelected = payslipDesign.themeColor === theme.config.themeColor ||
                    (payslipDesign.customColor && payslipDesign.customColor === theme.color);

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onUpdatePayslipDesign(theme.config)}
                      className={`snap-start shrink-0 w-36 p-3 rounded-2xl border text-left transition-all cursor-pointer active:scale-95 ${isSelected
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-xs ring-1 ring-emerald-500/50'
                          : 'bg-white dark:bg-[#121215] border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          style={{ backgroundColor: theme.color }}
                          className="w-5 h-5 rounded-full shadow-2xs border border-white dark:border-zinc-900"
                        />
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {theme.name}
                      </p>
                      <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                        {theme.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Accent Color & Custom Hex */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-zinc-500" />
                  Brand Accent Color
                </span>
                <span className="text-[11px] font-mono font-semibold text-zinc-500">
                  {activeColor.toUpperCase()}
                </span>
              </div>

              {/* Color Swatches */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                {BRAND_PALETTES.map(c => {
                  const isActive = activeColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onUpdatePayslipDesign({ customColor: c.hex, themeColor: c.id as any });
                        setCustomHexInput(c.hex);
                      }}
                      style={{ backgroundColor: c.hex }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform cursor-pointer shadow-xs active:scale-90 ${isActive ? 'scale-110 ring-3 ring-pink-500/50 ring-offset-2 dark:ring-offset-[#121215]' : 'hover:scale-105'
                        }`}
                      title={c.label}
                    >
                      {isActive && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Hex Code Input */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-500 font-medium">Custom Hex:</span>
                <div className="flex items-center gap-2">
                  <div
                    style={{ backgroundColor: activeColor }}
                    className="w-5 h-5 rounded-full border border-zinc-300 dark:border-zinc-700 shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="#0A3871"
                    value={customHexInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomHexInput(val);
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        onUpdatePayslipDesign({ customColor: val });
                      }
                    }}
                    className="w-24 h-8 px-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono uppercase text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              {/* Tint Style */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-1">
                <span className="text-[11px] text-zinc-500 font-medium">Style:</span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'soft', label: 'Pastel' },
                    { id: 'solid', label: 'Solid' },
                    { id: 'minimal', label: 'Outline' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onUpdatePayslipDesign({ accentTintStyle: t.id as any })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${payslipDesign.accentTintStyle === t.id
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                        }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Layout & Typography */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 space-y-3.5 shadow-xs">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                Layout &amp; Typography
              </span>

              {/* Header Style */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-zinc-500 font-medium">Header Format</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'modern', label: 'Modern' },
                    { id: 'banner', label: 'Top Banner' },
                    { id: 'centered', label: 'Centered' },
                  ].map(h => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => onUpdatePayslipDesign({ headerLayout: h.id as any })}
                      className={`py-2 px-1 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${payslipDesign.headerLayout === h.id
                          ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-500 text-pink-700 dark:text-pink-300 shadow-2xs'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-zinc-50/50 dark:bg-zinc-900/40'
                        }`}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Earnings & Deductions Columns */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-zinc-500 font-medium">Earnings &amp; Deductions</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdatePayslipDesign({ breakdownLayout: 'two-column' })}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${payslipDesign.breakdownLayout === 'two-column'
                        ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-500 text-pink-700 dark:text-pink-300 shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-zinc-50/50 dark:bg-zinc-900/40'
                      }`}
                  >
                    ◫ Side-by-Side
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdatePayslipDesign({ breakdownLayout: 'single-column' })}
                    className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${payslipDesign.breakdownLayout === 'single-column'
                        ? 'bg-pink-50 dark:bg-pink-950/40 border-pink-500 text-pink-700 dark:text-pink-300 shadow-2xs'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 bg-zinc-50/50 dark:bg-zinc-900/40'
                      }`}
                  >
                    ☰ Stacked
                  </button>
                </div>
              </div>

              {/* Density & Font */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                <div>
                  <span className="text-[11px] text-zinc-500 font-medium block mb-1">Density</span>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                    {(['compact', 'standard', 'spacious'] as const).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onUpdatePayslipDesign({ density: d })}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md capitalize transition-colors cursor-pointer ${payslipDesign.density === d
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                      >
                        {d[0].toUpperCase() + d.slice(1, 4)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-zinc-500 font-medium block mb-1">Font</span>
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                    {[
                      { id: 'sans', label: 'Sans' },
                      { id: 'serif', label: 'Serif' },
                      { id: 'mono', label: 'Mono' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => onUpdatePayslipDesign({ fontFamily: f.id as any })}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${payslipDesign.fontFamily === f.id
                            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Document Headings & Text Labels (Editable Template Constants) */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 space-y-3.5 shadow-xs">
              <div
                className="flex items-center justify-between cursor-pointer select-none"
                onClick={() => setIsTextControlsOpen(prev => !prev)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                    <Type className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>Document Headings &amp; Text</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-200/60 dark:border-emerald-800/60">
                        Safe Constants
                      </span>
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Tap preview text directly or edit fields below
                    </p>
                  </div>
                </div>
                <div className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isTextControlsOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isTextControlsOpen && (
                <div className="space-y-3 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 animate-in fade-in duration-150">
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                    💡 <strong className="text-zinc-700 dark:text-zinc-300">100% Safe to Customize:</strong> These text constants only customize printed document terminology and titles. Your payroll calculations, tax formulas, and employee salaries remain completely mathematically secure.
                  </p>

                  {/* Document Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                      <span>Document Title</span>
                      <span className="text-[9px] text-zinc-400">e.g. OFFICIAL SALARY ADVICE</span>
                    </label>
                    <input
                      type="text"
                      value={payslipDesign.payslipTitle || ''}
                      onChange={(e) => onUpdatePayslipDesign({ payslipTitle: e.target.value })}
                      placeholder="CONFIDENTIAL SALARY ADVICE"
                      className="w-full h-9 px-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 transition-colors font-medium"
                    />
                  </div>

                  {/* Document Subtitle */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center justify-between">
                      <span>Document Subtitle</span>
                      <span className="text-[9px] text-zinc-400">e.g. Private & Confidential</span>
                    </label>
                    <input
                      type="text"
                      value={payslipDesign.payslipSubtitle || ''}
                      onChange={(e) => onUpdatePayslipDesign({ payslipSubtitle: e.target.value })}
                      placeholder="Strictly Private & Confidential"
                      className="w-full h-9 px-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 transition-colors font-medium"
                    />
                  </div>

                  {/* 2-Col: Earnings & Gross Label */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                        Earnings Section Title
                      </label>
                      <input
                        type="text"
                        value={payslipDesign.earningsTitle || ''}
                        onChange={(e) => onUpdatePayslipDesign({ earningsTitle: e.target.value })}
                        placeholder="EARNINGS BREAKDOWN"
                        className="w-full h-9 px-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                        Total Gross Pay Label
                      </label>
                      <input
                        type="text"
                        value={payslipDesign.grossPayLabel || ''}
                        onChange={(e) => onUpdatePayslipDesign({ grossPayLabel: e.target.value })}
                        placeholder="Total Gross Remuneration"
                        className="w-full h-9 px-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* 2-Col: Deductions & Total Deductions Label */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                        Deductions Section Title
                      </label>
                      <input
                        type="text"
                        value={payslipDesign.deductionsTitle || ''}
                        onChange={(e) => onUpdatePayslipDesign({ deductionsTitle: e.target.value })}
                        placeholder="STATUTORY DEDUCTIONS"
                        className="w-full h-9 px-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                        Total Deductions Label
                      </label>
                      <input
                        type="text"
                        value={payslipDesign.totalDeductionsLabel || ''}
                        onChange={(e) => onUpdatePayslipDesign({ totalDeductionsLabel: e.target.value })}
                        placeholder="Total Deductions"
                        className="w-full h-9 px-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Net Pay Title & Employer Cost Label */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                        Net Take-Home Title
                      </label>
                      <input
                        type="text"
                        value={payslipDesign.netPayTitle || ''}
                        onChange={(e) => onUpdatePayslipDesign({ netPayTitle: e.target.value })}
                        placeholder="NET TAKE-HOME PAY"
                        className="w-full h-9 px-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                        Employer Cost Label
                      </label>
                      <input
                        type="text"
                        value={payslipDesign.employerCostLabel || ''}
                        onChange={(e) => onUpdatePayslipDesign({ employerCostLabel: e.target.value })}
                        placeholder="Total Monthly Emolument Cost"
                        className="w-full h-9 px-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Footer Note */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      Footer Disclaimer / Custom Note
                    </label>
                    <textarea
                      rows={2}
                      value={payslipDesign.footerNote || ''}
                      onChange={(e) => onUpdatePayslipDesign({ footerNote: e.target.value })}
                      placeholder="This is a computer-generated payslip and requires no physical signature."
                      className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500 transition-colors font-medium resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Visible Components Toggles */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                Visible Components
              </span>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'showLogo', label: 'Company Logo', active: payslipDesign.showLogo, toggle: () => onUpdatePayslipDesign({ showLogo: !payslipDesign.showLogo }) },
                  { id: 'showCompanyAddress', label: 'Company Address', active: payslipDesign.showCompanyAddress, toggle: () => onUpdatePayslipDesign({ showCompanyAddress: !payslipDesign.showCompanyAddress }) },
                  { id: 'showCompanyPhoneEmail', label: 'Phone & Email', active: payslipDesign.showCompanyPhoneEmail, toggle: () => onUpdatePayslipDesign({ showCompanyPhoneEmail: !payslipDesign.showCompanyPhoneEmail }) },
                  { id: 'bank_details', label: 'Bank Details', active: isSectionEnabled('bank_details'), toggle: () => handleToggleSection('bank_details') },
                  { id: 'employer_contributions', label: 'Employer Cost', active: isSectionEnabled('employer_contributions'), toggle: () => handleToggleSection('employer_contributions') },
                  { id: 'signatures', label: 'Signatures Block', active: isSectionEnabled('signatures'), toggle: () => handleToggleSection('signatures') },
                  { id: 'footer_notes', label: 'Footer Disclaimer', active: isSectionEnabled('footer_notes'), toggle: () => handleToggleSection('footer_notes') },
                  {
                    id: 'watermark',
                    label: 'Confidential Mark',
                    active: payslipDesign.watermark === 'confidential',
                    toggle: () => onUpdatePayslipDesign({
                      watermark: payslipDesign.watermark === 'confidential' ? 'none' : 'confidential',
                      watermarkOpacity: 0.06
                    })
                  },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.toggle}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer active:scale-98 ${item.active
                        ? 'bg-pink-50/70 dark:bg-pink-950/30 border-pink-500/40 text-pink-800 dark:text-pink-200'
                        : 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800 text-zinc-400'
                      }`}
                  >
                    <span className="truncate pr-1">{item.label}</span>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${item.active
                        ? 'bg-pink-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-700 text-transparent'
                      }`}>
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>


          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2: FULL PREVIEW & PRINT
            ══════════════════════════════════════════════════════ */}
        {activeTab === 'preview' && (
          <div className="space-y-3 animate-in fade-in duration-150">

            {/* Staff Selector Bar */}
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

              {/* Tappable Staff Identity Card */}
              <button
                type="button"
                onClick={() => setIsStaffPickerOpen(true)}
                className="flex-1 min-w-0 text-left px-2 py-1 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors cursor-pointer group"
                title="Tap to switch employee"
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

            {/* Document Canvas Container with GPU Pinch Zoom */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800/90 rounded-3xl p-3 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between px-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Staff {selectedEmpIndex + 1} of {computedItems.length}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-medium">
                  Pinch or drag to inspect
                </span>
              </div>

              {/* Pinch Zoom Container (snug-fit, zero blank space) */}
              <div className="w-full flex flex-col items-center justify-center bg-zinc-100/70 dark:bg-zinc-950 p-1.5 sm:p-3 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 overflow-hidden">
                <PinchZoomContainer
                  className="w-full"
                  contentWidth={700}
                >
                  <CustomizablePayslipView
                    item={previewItem}
                    company={company}
                    monthLabel={monthLabel}
                    year={year}
                    config={payslipDesign}
                    interactive={true}
                    onUpdateConfig={onUpdatePayslipDesign}
                    onMoveSectionUp={(id) => handleMoveSection(id, 'up')}
                    onMoveSectionDown={(id) => handleMoveSection(id, 'down')}
                    onToggleSection={handleToggleSection}
                  />
                </PinchZoomContainer>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Payslip (A4)</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* ── 3. Quick Employee Picker Modal ── */}
      {isStaffPickerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-h-[80vh] bg-white dark:bg-[#121215] border-t border-zinc-200 dark:border-zinc-800 rounded-t-3xl p-4 flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Select Staff Member
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffPickerOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="pt-3 pb-2">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff name, code, dept..."
                  value={staffSearchQuery}
                  onChange={e => setStaffSearchQuery(e.target.value)}
                  className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-9 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                />
                {staffSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStaffSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Staff List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 py-1 max-h-[50vh]">
              {filteredStaffList.length === 0 ? (
                <div className="py-8 text-center text-zinc-400 text-xs">
                  No staff members matched "{staffSearchQuery}"
                </div>
              ) : (
                filteredStaffList.map((item, idx) => {
                  const isSelected = item.employeeId === previewItem.employeeId;
                  return (
                    <button
                      key={item.employeeId || idx}
                      type="button"
                      onClick={() => {
                        const originalIndex = computedItems.findIndex(i => i.employeeId === item.employeeId);
                        setSelectedEmpIndex(originalIndex !== -1 ? originalIndex : 0);
                        setIsStaffPickerOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${isSelected
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40'
                          : 'bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {item.fullName}
                          </span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {item.employeeCode} &bull; {item.department || 'GENERAL'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                          {formatNaira(item.netTakeHome)}
                        </span>
                        <span className="text-[9px] text-zinc-400 block">
                          Net Pay
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── 4. Save Custom Preset Modal ── */}
      {isSavePresetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-pink-600" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Save Custom Theme Preset
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSavePresetModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Save your current colors, font, layout, and toggled sections as a preset. It will be available in the Theme Picker across the app.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                Preset Name
              </label>
              <input
                type="text"
                placeholder="e.g. Executive Slate 2026"
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                autoFocus
                className="w-full h-10 px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSavePresetModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewPreset}
                disabled={isReadOnly || !newPresetName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:cursor-not-allowed"
              >
                Save Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Hidden Printable Unscaled Payslip (for crisp native A4 print) ── */}
      {createPortal(
        <div className="hidden print:block print:w-full print:m-0 print:p-0">
          <CustomizablePayslipView
            item={previewItem}
            company={company}
            monthLabel={monthLabel}
            year={year}
            config={payslipDesign}
            interactive={false}
          />
        </div>,
        document.body
      )}

      {/* ── Sticky Save & Apply Design Button ── */}
      <div className="sticky bottom-0 z-20 px-3.5 py-3 bg-[#fbfbfb]/95 dark:bg-[#09090b]/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80">
        <button
          type="button"
          disabled={isReadOnly}
          onClick={handleSaveCurrentDesign}
          className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs tracking-wide shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title={isReadOnly ? "Saving disabled in offline mode" : undefined}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>Save &amp; Apply Design</span>
        </button>
      </div>

    </div>
  );
};
