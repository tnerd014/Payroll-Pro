import React, { useState, useMemo, useEffect } from 'react';
import { 
  Palette, 
  Layers, 
  Type, 
  Sparkles, 
  Printer, 
  RotateCcw, 
  ArrowLeft, 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  GripVertical, 
  Check, 
  Sliders, 
  FileText,
  User,
  Layout,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Bookmark,
  Save,
  Trash2,
  Pipette,
  SlidersHorizontal,
  Table,
  CheckCircle2,
  FolderInput,
  Building2,
  Search,
  X,
  Plus
} from 'lucide-react';
import { 
  CompanyAccount,
  CompanyProfile, 
  Employee, 
  PayrollVariables, 
  PayeTaxVariables, 
  CalculatedPayrollItem, 
  PayslipDesignConfig, 
  PayslipCustomPreset,
  PayslipSectionId,
  PayslipThemeColor,
  PayslipHeaderLayout,
  PayslipFontFamily,
  PayslipFontSize,
  PayslipDensity,
  PayslipWatermark,
  DEFAULT_PAYSLIP_DESIGN,
  PRESET_HEX_MAP,
  EmployeeLoan,
  NetPayFontSize
} from '../../types';
import { calculatePayrollItem, formatDate } from '../../engine/payePensionEngine';
import { CustomizablePayslipView } from './CustomizablePayslipView';
import { PayslipThemeSelector } from './payslipThemes';
import { loadCompaniesRegistry, loadCompanyData } from '../../store/usePayrollStore';

interface PayslipDesignerPageProps {
  company: CompanyProfile;
  employees: Employee[];
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  monthLabel: string;
  selectedMonth: string;
  year: number;
  payslipDesign?: PayslipDesignConfig;
  onUpdatePayslipDesign: (updates: Partial<PayslipDesignConfig>) => void;
  onResetPayslipDesign: () => void;
  onBackToPayroll: () => void;
  savedPresets?: PayslipCustomPreset[];
  onSavePreset?: (name: string, config: PayslipDesignConfig, presetId?: string) => void;
  onDeletePreset?: (id: string) => void;
  loans?: EmployeeLoan[];
}

export const PayslipDesignerPage: React.FC<PayslipDesignerPageProps> = ({
  company,
  employees,
  payrollVariables,
  payeTaxVariables,
  monthLabel,
  selectedMonth,
  year,
  payslipDesign = DEFAULT_PAYSLIP_DESIGN,
  onUpdatePayslipDesign,
  onResetPayslipDesign,
  onBackToPayroll,
  savedPresets = [],
  onSavePreset,
  onDeletePreset,
  loans = [],
}) => {
  const [activeTab, setActiveTab] = useState<'layout' | 'theme' | 'text' | 'presets'>('layout');
  const [selectedEmpId] = useState<string>('sample');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [customPresetName, setCustomPresetName] = useState<string>('');
  const [showSaveThemeModal, setShowSaveThemeModal] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Active custom preset tracker (remembers which preset is being edited)
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [activePresetName, setActivePresetName] = useState<string | null>(null);

  // Active loaded preset
  const activeCustomPreset = useMemo(() => {
    if (activePresetId) {
      const match = savedPresets.find(p => p.id === activePresetId);
      if (match) return match;
    }
    if (activePresetName) {
      const match = savedPresets.find(p => p.name.trim().toLowerCase() === activePresetName.trim().toLowerCase());
      if (match) return match;
    }
    return savedPresets.find(p => 
      p.design.customColor === payslipDesign.customColor &&
      p.design.headerLayout === payslipDesign.headerLayout &&
      p.design.themeColor === payslipDesign.themeColor
    ) || null;
  }, [savedPresets, activePresetId, activePresetName, payslipDesign]);

  const handleUpdateCurrentPreset = (presetToUpdate?: PayslipCustomPreset | null) => {
    const target = presetToUpdate || activeCustomPreset;
    if (!target) {
      setShowSaveThemeModal(true);
      return;
    }
    if (onSavePreset) {
      onSavePreset(target.name, payslipDesign, target.id);
      setActivePresetId(target.id);
      setActivePresetName(target.name);
      setSaveMessage(`Updated "${target.name}" successfully!`);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Font scale calculation & handlers
  const currentFontScale = typeof payslipDesign.fontScale === 'number' && payslipDesign.fontScale >= 60 && payslipDesign.fontScale <= 160
    ? payslipDesign.fontScale
    : payslipDesign.fontSize === 'compact'
    ? 88
    : payslipDesign.fontSize === 'large'
    ? 114
    : payslipDesign.fontSize === 'xl'
    ? 128
    : 100;

  const handleSetFontSizePreset = (size: PayslipFontSize, scale: number) => {
    onUpdatePayslipDesign({ fontSize: size, fontScale: scale });
  };

  const handleAdjustFontScale = (delta: number) => {
    const next = Math.max(76, Math.min(140, currentFontScale + delta));
    const size: PayslipFontSize = 
      next <= 90 ? 'compact' :
      next <= 105 ? 'standard' :
      next <= 120 ? 'large' : 'xl';
    onUpdatePayslipDesign({ fontScale: next, fontSize: size });
  };

  // Import Design State & Logic
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importSearchTerm, setImportSearchTerm] = useState<string>('');
  const [selectedImportCompanyId, setSelectedImportCompanyId] = useState<string>('');
  const [selectedDesignKey, setSelectedDesignKey] = useState<string>('active');
  const [alsoSaveAsPreset, setAlsoSaveAsPreset] = useState<boolean>(false);

  // Helper to resolve color hex
  const resolveDesignColor = (design: PayslipDesignConfig) => {
    return (
      design.customColor ||
      (design.themeColor?.startsWith('#')
        ? design.themeColor
        : PRESET_HEX_MAP[design.themeColor] || '#18181b')
    );
  };

  // Load companies for the import modal
  const allCompanies: CompanyAccount[] = useMemo(() => {
    if (!showImportModal) return [];
    try {
      return loadCompaniesRegistry();
    } catch {
      return [];
    }
  }, [showImportModal]);

  const filteredImportCompanies = useMemo(() => {
    const q = importSearchTerm.trim().toLowerCase();
    if (!q) return allCompanies;
    return allCompanies.filter(
      c => c.name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q))
    );
  }, [allCompanies, importSearchTerm]);

  // Set default selected company when modal opens
  useEffect(() => {
    if (showImportModal && allCompanies.length > 0) {
      if (!selectedImportCompanyId || !allCompanies.some(c => c.id === selectedImportCompanyId)) {
        const otherComp = allCompanies.find(c => c.id !== company.id) || allCompanies[0];
        if (otherComp) {
          setSelectedImportCompanyId(otherComp.id);
          setSelectedDesignKey('active');
        }
      }
    }
  }, [showImportModal, allCompanies, company.id, selectedImportCompanyId]);

  const targetCompanyAccount = useMemo(() => {
    return allCompanies.find(c => c.id === selectedImportCompanyId);
  }, [allCompanies, selectedImportCompanyId]);

  const targetCompanyData = useMemo(() => {
    if (!selectedImportCompanyId) return null;
    try {
      return loadCompanyData(selectedImportCompanyId, targetCompanyAccount);
    } catch (e) {
      console.warn('Failed to load target company data:', e);
      return null;
    }
  }, [selectedImportCompanyId, targetCompanyAccount]);

  const targetActiveDesign = targetCompanyData?.payslipDesign || DEFAULT_PAYSLIP_DESIGN;
  const targetSavedPresets = targetCompanyData?.savedPayslipPresets || [];

  const activeSelectedDesign: PayslipDesignConfig = useMemo(() => {
    if (selectedDesignKey === 'active' || !targetCompanyData) {
      return targetActiveDesign;
    }
    const found = targetSavedPresets.find(p => p.id === selectedDesignKey);
    return found ? found.design : targetActiveDesign;
  }, [selectedDesignKey, targetCompanyData, targetActiveDesign, targetSavedPresets]);

  const activeSelectedDesignName = useMemo(() => {
    if (selectedDesignKey === 'active') {
      return `${targetCompanyAccount?.name || 'Company'} Active Design`;
    }
    const found = targetSavedPresets.find(p => p.id === selectedDesignKey);
    return found ? found.name : 'Custom Preset';
  }, [selectedDesignKey, targetCompanyAccount, targetSavedPresets]);

  const handleApplyImportedDesign = () => {
    if (!activeSelectedDesign) return;
    onUpdatePayslipDesign(activeSelectedDesign);
    if (alsoSaveAsPreset && onSavePreset) {
      const presetName = `${targetCompanyAccount?.name || 'Imported'} - ${activeSelectedDesignName}`;
      onSavePreset(presetName, activeSelectedDesign);
    }
    setSaveMessage(`Imported design from ${targetCompanyAccount?.name || 'company'}!`);
    setShowImportModal(false);
    setTimeout(() => setSaveMessage(''), 3500);
  };

  const handleSaveCustomPreset = (nameToSave?: unknown, presetId?: string) => {
    const rawName = typeof nameToSave === 'string' ? nameToSave : customPresetName;
    const trimmed = rawName.trim();
    if (!trimmed || !onSavePreset) return;
    onSavePreset(trimmed, payslipDesign, presetId);
    setActivePresetName(trimmed);
    if (presetId) setActivePresetId(presetId);
    setSaveMessage(`Theme "${trimmed}" saved!`);
    setCustomPresetName('');
    setShowSaveThemeModal(false);
    setTimeout(() => setSaveMessage(''), 3500);
  };

  // Generate or pick active payroll item for the preview
  const previewItem: CalculatedPayrollItem = useMemo(() => {
    const found = employees.find(e => e.id === selectedEmpId);
    if (found) {
      const base = calculatePayrollItem(
        found,
        payrollVariables,
        payeTaxVariables,
        selectedMonth,
        year
      );
      const currentPeriodKey = `${year}-${selectedMonth}`;
      let totalLoanDeduction = 0;
      (loans || []).forEach(l => {
        if (!l || l.employeeId !== found.id) return;
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
    }

    // Default sample employee
    const sampleEmp: Employee = {
      id: 'sample-1',
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

    const sampleBase = calculatePayrollItem(
      sampleEmp,
      payrollVariables,
      payeTaxVariables,
      selectedMonth,
      year
    );

    const sampleLoan = 45000;
    return {
      ...sampleBase,
      loanDeduction: sampleLoan,
      totalDeductions: sampleBase.totalDeductions + sampleLoan,
      netTakeHome: Math.max(0, sampleBase.netTakeHome - sampleLoan),
    };
  }, [employees, selectedEmpId, payrollVariables, payeTaxVariables, company, year, selectedMonth, loans]);

  // Handle reordering sections
  const handleMoveSection = (id: PayslipSectionId, direction: 'up' | 'down') => {
    const list = [...payslipDesign.sectionOrder];
    const index = list.findIndex(s => s.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    onUpdatePayslipDesign({ sectionOrder: list });
  };

  // Handle toggle section visibility
  const handleToggleSection = (id: PayslipSectionId) => {
    const list = payslipDesign.sectionOrder.map(s => {
      if (s.id === id) {
        return { ...s, enabled: !s.enabled };
      }
      return s;
    });
    onUpdatePayslipDesign({ sectionOrder: list });
  };

  // Header options
  const headerLayoutOptions: { id: PayslipHeaderLayout; label: string; desc: string }[] = [
    { id: 'modern', label: 'Modern Split', desc: 'Logo on left, Title & Pay Period on right' },
    { id: 'centered', label: 'Centered Corporate', desc: 'Centered logo, company name, address & banner' },
    { id: 'banner', label: 'Full Top Banner', desc: 'Solid accent-colored banner across the entire header' },
    { id: 'clean', label: 'Clean Hairline', desc: 'Minimalist typography with subtle hairline dividers' },
  ];

  // Presets
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'modern-indigo':
        onUpdatePayslipDesign({
          themeColor: 'indigo',
          customColor: '#4f46e5',
          accentTintStyle: 'soft',
          tableStyle: 'minimal',
          cornerRadius: 'md',
          headerLayout: 'modern',
          fontFamily: 'sans',
          density: 'standard',
          breakdownLayout: 'two-column',
          roundedCorners: true,
          watermark: 'none',
          payslipTitle: 'OFFICIAL SALARY PAYSLIP',
          payslipSubtitle: 'Strictly Private & Confidential',
          sectionOrder: [
            { id: 'company_header', label: 'Company Header & Logo', enabled: true },
            { id: 'pay_period_banner', label: 'Pay Period & Status Banner', enabled: true },
            { id: 'employee_meta', label: 'Employee Information Grid', enabled: true },
            { id: 'earnings', label: 'Earnings Breakdown', enabled: true },
            { id: 'deductions', label: 'Deductions Breakdown', enabled: true },
            { id: 'net_pay', label: 'Net Take-Home Highlight Card', enabled: true },
            { id: 'employer_contributions', label: 'Employer Contributions & Total Cost', enabled: true },
            { id: 'bank_details', label: 'Bank Disbursement Details', enabled: true },
            { id: 'signatures', label: 'Signatures & Authorization Block', enabled: false },
            { id: 'footer_notes', label: 'Footer Disclaimer & Notes', enabled: true },
          ]
        });
        break;
      case 'executive-emerald':
        onUpdatePayslipDesign({
          themeColor: 'emerald',
          customColor: '#059669',
          accentTintStyle: 'solid',
          tableStyle: 'striped',
          cornerRadius: 'md',
          headerLayout: 'banner',
          fontFamily: 'sans',
          density: 'spacious',
          breakdownLayout: 'two-column',
          roundedCorners: true,
          watermark: 'confidential',
          watermarkOpacity: 0.06,
          payslipTitle: 'EMPLOYEE SALARY ADVICE',
          payslipSubtitle: 'Direct Bank Transfer Remittance Advice',
          sectionOrder: [
            { id: 'company_header', label: 'Company Header & Logo', enabled: true },
            { id: 'employee_meta', label: 'Employee Information Grid', enabled: true },
            { id: 'earnings', label: 'Earnings Breakdown', enabled: true },
            { id: 'deductions', label: 'Deductions Breakdown', enabled: true },
            { id: 'net_pay', label: 'Net Take-Home Highlight Card', enabled: true },
            { id: 'bank_details', label: 'Bank Disbursement Details', enabled: true },
            { id: 'employer_contributions', label: 'Employer Contributions & Total Cost', enabled: true },
            { id: 'signatures', label: 'Signatures & Authorization Block', enabled: true },
            { id: 'footer_notes', label: 'Footer Disclaimer & Notes', enabled: true },
            { id: 'pay_period_banner', label: 'Pay Period & Status Banner', enabled: false },
          ]
        });
        break;
      case 'minimal-mono':
        onUpdatePayslipDesign({
          themeColor: 'black',
          customColor: '#18181b',
          accentTintStyle: 'minimal',
          tableStyle: 'bordered',
          cornerRadius: 'none',
          headerLayout: 'clean',
          fontFamily: 'mono',
          density: 'compact',
          breakdownLayout: 'two-column',
          roundedCorners: false,
          watermark: 'none',
          payslipTitle: 'PAYMENT VOUCHER & STATEMENT',
          payslipSubtitle: 'Confidential Emoluments Statement',
          sectionOrder: [
            { id: 'company_header', label: 'Company Header & Logo', enabled: true },
            { id: 'pay_period_banner', label: 'Pay Period & Status Banner', enabled: true },
            { id: 'employee_meta', label: 'Employee Information Grid', enabled: true },
            { id: 'earnings', label: 'Earnings Breakdown', enabled: true },
            { id: 'deductions', label: 'Deductions Breakdown', enabled: true },
            { id: 'net_pay', label: 'Net Take-Home Highlight Card', enabled: true },
            { id: 'bank_details', label: 'Bank Disbursement Details', enabled: true },
            { id: 'signatures', label: 'Signatures & Authorization Block', enabled: true },
            { id: 'footer_notes', label: 'Footer Disclaimer & Notes', enabled: true },
            { id: 'employer_contributions', label: 'Employer Contributions & Total Cost', enabled: false },
          ]
        });
        break;
      case 'formal-corporate':
        onUpdatePayslipDesign({
          themeColor: 'blue',
          customColor: '#1e3a8a',
          accentTintStyle: 'soft',
          tableStyle: 'bordered',
          cornerRadius: 'sm',
          headerLayout: 'centered',
          fontFamily: 'serif',
          density: 'standard',
          breakdownLayout: 'two-column',
          roundedCorners: false,
          watermark: 'official',
          watermarkOpacity: 0.05,
          payslipTitle: 'OFFICIAL CERTIFICATE OF EMOLUMENTS',
          payslipSubtitle: 'Statutory Payroll Remuneration Advice',
          sectionOrder: [
            { id: 'company_header', label: 'Company Header & Logo', enabled: true },
            { id: 'pay_period_banner', label: 'Pay Period & Status Banner', enabled: true },
            { id: 'employee_meta', label: 'Employee Information Grid', enabled: true },
            { id: 'earnings', label: 'Earnings Breakdown', enabled: true },
            { id: 'deductions', label: 'Deductions Breakdown', enabled: true },
            { id: 'net_pay', label: 'Net Take-Home Highlight Card', enabled: true },
            { id: 'employer_contributions', label: 'Employer Contributions & Total Cost', enabled: true },
            { id: 'bank_details', label: 'Bank Disbursement Details', enabled: true },
            { id: 'signatures', label: 'Signatures & Authorization Block', enabled: true },
            { id: 'footer_notes', label: 'Footer Disclaimer & Notes', enabled: true },
          ]
        });
        break;
      default:
        onResetPayslipDesign();
    }
  };

  const handlePrintSample = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-36px)] overflow-hidden bg-zinc-50/50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
      
      {/* Top Header Bar - Fixed at top */}
      <div className="shrink-0 z-30 bg-[#fbfbfb]/95 dark:bg-[#09090b]/95 backdrop-blur-md px-4 sm:px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 no-print">
        <div className="flex flex-row justify-between items-center gap-3 whitespace-nowrap">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onBackToPayroll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Back to Payroll"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
              <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Payslip Designer
              </h1>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-nowrap min-w-0">
            {/* Status message */}
            {saveMessage && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{saveMessage}</span>
              </div>
            )}

            {/* Theme Selector Dropdown */}
            <PayslipThemeSelector
              currentConfig={payslipDesign}
              savedPresets={savedPresets}
              activePresetName={activePresetName || activeCustomPreset?.name}
              onSelectTheme={(cfg, preset) => {
                if (preset) {
                  setActivePresetId(preset.id);
                  setActivePresetName(preset.name);
                } else {
                  setActivePresetId(null);
                  setActivePresetName(null);
                }
                onUpdatePayslipDesign(cfg);
              }}
            />

            {/* Save / Update Theme Action */}
            {activeCustomPreset ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleUpdateCurrentPreset(activeCustomPreset)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-2xs cursor-pointer shrink-0"
                  title={`Update and overwrite saved theme "${activeCustomPreset.name}" with current changes`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update "{activeCustomPreset.name}"</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCustomPresetName('');
                    setShowSaveThemeModal(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs cursor-pointer shrink-0"
                  title="Save current styling & layout as a new separate theme"
                >
                  <Plus className="w-3 h-3" />
                  <span className="hidden sm:inline">Save as New</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSaveThemeModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-2xs cursor-pointer shrink-0"
                title="Save current styling & layout as a reusable theme"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save Theme</span>
              </button>
            )}

            {/* Reset Template */}
            <button
              type="button"
              onClick={onResetPayslipDesign}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer shrink-0"
              title="Reset to default design"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Import Design */}
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Import design from another company"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Import Design</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Studio Layout: Studio columns have independent scroll! */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-4 sm:p-5 overflow-hidden">
        
        {/* Left Control Panel (5 Cols) - Scrollable independently */}
        <div className="lg:col-span-5 h-full overflow-y-auto bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-5 shadow-2xs no-print pr-3">
          
          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium gap-4">
            <button
              onClick={() => setActiveTab('layout')}
              className={`pb-2 transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'layout' 
                  ? 'text-zinc-900 dark:text-zinc-100 font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Arrangement</span>
              {activeTab === 'layout' && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('theme')}
              className={`pb-2 transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'theme' 
                  ? 'text-zinc-900 dark:text-zinc-100 font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Theme & Style</span>
              {activeTab === 'theme' && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('text')}
              className={`pb-2 transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'text' 
                  ? 'text-zinc-900 dark:text-zinc-100 font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Headers & Text</span>
              {activeTab === 'text' && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('presets')}
              className={`pb-2 transition-colors relative flex items-center gap-1.5 ${
                activeTab === 'presets' 
                  ? 'text-zinc-900 dark:text-zinc-100 font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Presets</span>
              {activeTab === 'presets' && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
              )}
            </button>
          </div>

          {/* TAB 1: Section Arrangement ("able to move it around like design it") */}
          {activeTab === 'layout' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Section Order & Visibility
                </span>
                <span className="text-[11px] text-zinc-400">
                  Use arrows to reorder sections
                </span>
              </div>

              {/* Interactive Section List */}
              <div className="space-y-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 bg-zinc-50/50 dark:bg-zinc-950/40">
                {payslipDesign.sectionOrder.map((section, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === payslipDesign.sectionOrder.length - 1;

                  return (
                    <div
                      key={section.id}
                      className={`flex items-center justify-between p-2 rounded-md border text-xs transition-all ${
                        section.enabled
                          ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                          : 'bg-zinc-100/60 dark:bg-zinc-900/30 border-transparent text-zinc-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-3.5 h-3.5 text-zinc-400 cursor-grab" />
                        <span className="font-mono text-[10px] text-zinc-400 w-4">{idx + 1}.</span>
                        <span className="font-medium">{section.label}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveSection(section.id, 'up')}
                          disabled={isFirst}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-20"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveSection(section.id, 'down')}
                          disabled={isLast}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 disabled:opacity-20"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle visibility */}
                        <button
                          type="button"
                          onClick={() => handleToggleSection(section.id)}
                          className={`p-1 rounded transition-colors ${
                            section.enabled 
                              ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800' 
                              : 'text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                          title={section.enabled ? 'Hide Section' : 'Show Section'}
                        >
                          {section.enabled ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Layout Options */}
              <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Earnings & Deductions Layout</span>
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => onUpdatePayslipDesign({ breakdownLayout: 'two-column' })}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                        payslipDesign.breakdownLayout === 'two-column'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                          : 'text-zinc-500'
                      }`}
                    >
                      Side by Side
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdatePayslipDesign({ breakdownLayout: 'single-column' })}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                        payslipDesign.breakdownLayout === 'single-column'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                          : 'text-zinc-500'
                      }`}
                    >
                      Stacked
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Vertical Density</span>
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                    {(['compact', 'standard', 'spacious'] as PayslipDensity[]).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onUpdatePayslipDesign({ density: d })}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition ${
                          payslipDesign.density === d
                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                            : 'text-zinc-500'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Rounded Cards</span>
                  <button
                    type="button"
                    onClick={() => onUpdatePayslipDesign({ 
                      roundedCorners: !payslipDesign.roundedCorners,
                      cornerRadius: !payslipDesign.roundedCorners ? 'md' : 'none'
                    })}
                    className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                  >
                    <span className="text-[11px] text-zinc-500">
                      {payslipDesign.roundedCorners ? 'Enabled' : 'Sharp (0px)'}
                    </span>
                    <input
                      type="checkbox"
                      checked={payslipDesign.roundedCorners}
                      onChange={() => onUpdatePayslipDesign({ 
                        roundedCorners: !payslipDesign.roundedCorners,
                        cornerRadius: !payslipDesign.roundedCorners ? 'md' : 'none'
                      })}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Theme & Appearance ("the theme") */}
          {activeTab === 'theme' && (() => {
            const activeColorHex = 
              payslipDesign.customColor || 
              (payslipDesign.themeColor && payslipDesign.themeColor.startsWith('#')
                ? payslipDesign.themeColor
                : PRESET_HEX_MAP[payslipDesign.themeColor] || '#18181b');

            const currentTableStyle = payslipDesign.tableStyle || 'minimal';
            const currentAccentTint = payslipDesign.accentTintStyle || 'soft';
            const currentCornerRadius = !payslipDesign.roundedCorners ? 'none' : (payslipDesign.cornerRadius || 'md');
            const currentWatermarkOpacity = typeof payslipDesign.watermarkOpacity === 'number' ? payslipDesign.watermarkOpacity : 0.04;

            return (
              <div className="space-y-4">
                {/* 1. Interactive Color Swatch & Native Color Picker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                      <span>Brand Accent Color</span>
                    </label>
                    <span className="font-mono text-[10px] text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                      {activeColorHex}
                    </span>
                  </div>

                  {/* Primary Color Picker Input Card */}
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs space-y-2.5">
                    <div className="flex items-center gap-3">
                      {/* Live Circular Swatch that triggers color input on click */}
                      <label className="relative cursor-pointer group shrink-0" title="Click to open color palette picker">
                        <div
                          style={{ backgroundColor: activeColorHex }}
                          className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-900 shadow-md ring-2 ring-zinc-300 dark:ring-zinc-700 group-hover:scale-105 transition-transform"
                        />
                        <input
                          type="color"
                          value={activeColorHex.length === 7 ? activeColorHex : '#18181b'}
                          onChange={(e) => onUpdatePayslipDesign({ customColor: e.target.value, themeColor: e.target.value })}
                          className="sr-only"
                        />
                      </label>

                      {/* HEX text input with # prefix */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                            Custom Brand Color
                          </span>
                          <span className="text-[10px] text-zinc-400">Any Hex Code</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 select-none">#</span>
                            <input
                              type="text"
                              value={activeColorHex.replace('#', '').toUpperCase()}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
                                if (raw.length === 6) {
                                  onUpdatePayslipDesign({ customColor: `#${raw}`, themeColor: `#${raw}` });
                                } else {
                                  onUpdatePayslipDesign({ customColor: `#${raw}` });
                                }
                              }}
                              className="w-full pl-6 pr-2 py-1.5 text-xs font-mono uppercase rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/60 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 font-semibold"
                              placeholder="059669"
                              maxLength={6}
                            />
                          </div>
                          <label className="px-2.5 py-1.5 text-xs font-medium rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 cursor-pointer flex items-center gap-1.5 shrink-0 transition">
                            <Pipette className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Picker</span>
                            <input
                              type="color"
                              value={activeColorHex.length === 7 ? activeColorHex : '#18181b'}
                              onChange={(e) => onUpdatePayslipDesign({ customColor: e.target.value, themeColor: e.target.value })}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Accent Tint & Fill Style */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Accent Fill & Tint Style
                    </label>
                    <span className="text-[10px] text-zinc-400">Card & table intensity</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'soft', label: 'Soft Pastel', desc: 'Light 8% tint' },
                      { id: 'solid', label: 'Solid Bold', desc: 'Full contrast' },
                      { id: 'minimal', label: 'Minimal Outline', desc: 'Ink-saver line' },
                    ].map(tint => (
                      <button
                        key={tint.id}
                        type="button"
                        onClick={() => onUpdatePayslipDesign({ accentTintStyle: tint.id as any })}
                        className={`p-2 rounded-md border text-center transition cursor-pointer ${
                          currentAccentTint === tint.id
                            ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-2xs'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900/40'
                        }`}
                      >
                        <span className="text-xs block font-medium">{tint.label}</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">{tint.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Table & Row Presentation */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Table & Row Presentation
                    </label>
                    <span className="text-[10px] text-zinc-400">Earnings & deductions</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'minimal', label: 'Clean Whitespace', desc: 'Airy dividers' },
                      { id: 'striped', label: 'Zebra Striped', desc: 'Alternating rows' },
                      { id: 'bordered', label: 'Audited Grid', desc: 'Ledger borders' },
                    ].map(tbl => (
                      <button
                        key={tbl.id}
                        type="button"
                        onClick={() => onUpdatePayslipDesign({ tableStyle: tbl.id as any })}
                        className={`p-2 rounded-md border text-center transition cursor-pointer ${
                          currentTableStyle === tbl.id
                            ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-2xs'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900/40'
                        }`}
                      >
                        <span className="text-xs block font-medium">{tbl.label}</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">{tbl.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Corner Radius */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Corner Radius
                    </label>
                    <span className="text-[10px] text-zinc-400">Border smoothness</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'none', label: 'Sharp', desc: '0px' },
                      { id: 'sm', label: 'Subtle', desc: '4px' },
                      { id: 'md', label: 'Modern', desc: '8px' },
                      { id: 'lg', label: 'Pill', desc: '16px' },
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onUpdatePayslipDesign({ 
                          cornerRadius: r.id as any,
                          roundedCorners: r.id !== 'none'
                        })}
                        className={`p-1.5 rounded-md border text-center transition cursor-pointer ${
                          currentCornerRadius === r.id
                            ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-2xs'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900/40'
                        }`}
                      >
                        <span className="text-xs block font-medium">{r.label}</span>
                        <span className="text-[10px] text-zinc-400 block">{r.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Header Layout Options */}
                <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Header Layout Style
                  </label>
                  <div className="space-y-1.5">
                    {headerLayoutOptions.map(h => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => onUpdatePayslipDesign({ headerLayout: h.id })}
                        className={`w-full flex items-start gap-3 p-2.5 rounded-md border text-left text-xs transition cursor-pointer ${
                          payslipDesign.headerLayout === h.id
                            ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 font-semibold ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-2xs'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="headerLayout"
                          checked={payslipDesign.headerLayout === h.id}
                          onChange={() => onUpdatePayslipDesign({ headerLayout: h.id })}
                          className="mt-0.5 cursor-pointer"
                        />
                        <div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                            {h.label}
                          </span>
                          <span className="text-[11px] text-zinc-500 block">
                            {h.desc}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Typography & Font Size */}
                <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Typography Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'sans' as PayslipFontFamily, label: 'Modern Sans', preview: 'Inter / Sans' },
                        { id: 'serif' as PayslipFontFamily, label: 'Editorial Serif', preview: 'Merriweather' },
                        { id: 'mono' as PayslipFontFamily, label: 'Tabular Mono', preview: 'JetBrains' },
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onUpdatePayslipDesign({ fontFamily: f.id })}
                          className={`p-2 rounded-md border text-center text-xs transition cursor-pointer ${
                            payslipDesign.fontFamily === f.id
                              ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 font-bold ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-2xs'
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900/40'
                          }`}
                        >
                          <span className="block font-medium">{f.label}</span>
                          <span className="text-[10px] text-zinc-400 block mt-0.5">{f.preview}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text & Font Size Controls */}
                  <div className="space-y-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Text & Font Size
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                        {currentFontScale}% {currentFontScale === 100 ? '(Default)' : ''}
                      </span>
                    </div>

                    {/* 4 Quick Presets */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'compact' as PayslipFontSize, scale: 88, label: 'Small' },
                        { id: 'standard' as PayslipFontSize, scale: 100, label: 'Normal' },
                        { id: 'large' as PayslipFontSize, scale: 114, label: 'Large' },
                        { id: 'xl' as PayslipFontSize, scale: 128, label: 'Extra Lg' },
                      ].map(p => {
                        const isActive = (payslipDesign.fontSize === p.id && (!payslipDesign.fontScale || payslipDesign.fontScale === p.scale)) ||
                          (payslipDesign.fontScale === p.scale);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSetFontSizePreset(p.id, p.scale)}
                            className={`py-1.5 px-1 rounded border text-center transition cursor-pointer ${
                              isActive
                                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-bold shadow-2xs'
                                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-400 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <span className="text-xs block font-semibold leading-tight">{p.label}</span>
                            <span className="text-[9.5px] block opacity-75 mt-0.5">{p.scale}%</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Stepper & Slider */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustFontScale(-4)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold cursor-pointer shrink-0"
                        title="Decrease text font size by 4%"
                      >
                        -
                      </button>

                      <input
                        type="range"
                        min={76}
                        max={140}
                        step={2}
                        value={currentFontScale}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const size: PayslipFontSize = val <= 90 ? 'compact' : val <= 105 ? 'standard' : val <= 120 ? 'large' : 'xl';
                          onUpdatePayslipDesign({ fontScale: val, fontSize: size });
                        }}
                        className="flex-1 accent-zinc-900 dark:accent-zinc-100 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                        title="Adjust text font size slider"
                      />

                      <button
                        type="button"
                        onClick={() => handleAdjustFontScale(4)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold cursor-pointer shrink-0"
                        title="Increase text font size by 4%"
                      >
                        +
                      </button>

                      {currentFontScale !== 100 && (
                        <button
                          type="button"
                          onClick={() => handleSetFontSizePreset('standard', 100)}
                          className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline cursor-pointer shrink-0"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 7. Watermark & Custom Text */}
                <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Background Watermark
                    </label>
                    <span className="text-[10px] text-zinc-400">Security / Advice Stamp</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      { id: 'none', label: 'No Watermark' },
                      { id: 'confidential', label: 'CONFIDENTIAL' },
                      { id: 'official', label: 'OFFICIAL PAYSLIP' },
                      { id: 'paid', label: 'PAID & DISBURSED' },
                      { id: 'copy', label: 'EMPLOYEE COPY' },
                      { id: 'custom', label: 'Custom Text...' },
                    ].map(w => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onUpdatePayslipDesign({ watermark: w.id as any })}
                        className={`p-2 rounded border text-left text-xs transition cursor-pointer ${
                          payslipDesign.watermark === w.id
                            ? 'border-zinc-900 dark:border-zinc-100 font-bold bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-900 dark:ring-zinc-100 shadow-2xs'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 bg-white dark:bg-zinc-900/40'
                        }`}
                      >
                        <span className="truncate block">{w.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* If custom watermark or watermark is active, show text & opacity controls */}
                  {payslipDesign.watermark !== 'none' && (
                    <div className="space-y-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
                      {payslipDesign.watermark === 'custom' && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">
                            Custom Watermark Text
                          </label>
                          <input
                            type="text"
                            value={payslipDesign.customWatermarkText || ''}
                            onChange={(e) => onUpdatePayslipDesign({ customWatermarkText: e.target.value })}
                            placeholder="e.g. LONGFORD ACADEMY"
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 uppercase font-semibold outline-none focus:border-zinc-500"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-600 dark:text-zinc-400 font-medium">Watermark Opacity</span>
                          <span className="font-mono text-[10px] text-zinc-400">
                            {Math.round(currentWatermarkOpacity * 100)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { value: 0.03, label: '3% Faint' },
                            { value: 0.06, label: '6% Subtle' },
                            { value: 0.12, label: '12% Clear' },
                            { value: 0.20, label: '20% Bold' },
                          ].map(op => (
                            <button
                              key={op.value}
                              type="button"
                              onClick={() => onUpdatePayslipDesign({ watermarkOpacity: op.value })}
                              className={`py-1 px-1.5 text-[10px] font-medium rounded border transition cursor-pointer ${
                                Math.abs(currentWatermarkOpacity - op.value) < 0.015
                                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-bold'
                                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900'
                              }`}
                            >
                              {op.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 8. Header Visibility & Card Borders */}
                <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700 dark:text-zinc-300">Show Company Logo</span>
                    <input
                      type="checkbox"
                      checked={payslipDesign.showLogo}
                      onChange={(e) => onUpdatePayslipDesign({ showLogo: e.target.checked })}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700 dark:text-zinc-300">Show Company Address</span>
                    <input
                      type="checkbox"
                      checked={payslipDesign.showCompanyAddress}
                      onChange={(e) => onUpdatePayslipDesign({ showCompanyAddress: e.target.checked })}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700 dark:text-zinc-300">Show Phone & Email</span>
                    <input
                      type="checkbox"
                      checked={payslipDesign.showCompanyPhoneEmail}
                      onChange={(e) => onUpdatePayslipDesign({ showCompanyPhoneEmail: e.target.checked })}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700 dark:text-zinc-300">Show Outer Border on Payslip</span>
                    <input
                      type="checkbox"
                      checked={payslipDesign.showBorders}
                      onChange={(e) => onUpdatePayslipDesign({ showBorders: e.target.checked })}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 9. Instant Save Theme as Preset (Directly on this tab!) */}
                <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Save className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                      <span>Save Current Theme as Preset</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Save this color palette, header style, typography, and layout so you can apply it anytime across all employee payslips.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={customPresetName}
                      onChange={(e) => setCustomPresetName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomPreset()}
                      placeholder="e.g. Longford School Emerald 2026"
                      className="flex-1 px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-xs outline-none focus:border-zinc-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomPreset}
                      disabled={!customPresetName.trim()}
                      className="px-3.5 py-1.5 rounded font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs text-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Preset</span>
                    </button>
                  </div>
                  {saveMessage && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in flex items-center gap-1 pt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{saveMessage}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 3: Text & Headers ("the text header") */}
          {activeTab === 'text' && (
            <div className="space-y-3.5 text-xs">
              {/* Text & Font Size Quick Settings */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                      Text & Font Size
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    {currentFontScale}% {currentFontScale === 100 ? '(Default)' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'compact' as PayslipFontSize, scale: 88, label: 'Small' },
                    { id: 'standard' as PayslipFontSize, scale: 100, label: 'Normal' },
                    { id: 'large' as PayslipFontSize, scale: 114, label: 'Large' },
                    { id: 'xl' as PayslipFontSize, scale: 128, label: 'Extra Lg' },
                  ].map(p => {
                    const isActive = (payslipDesign.fontSize === p.id && (!payslipDesign.fontScale || payslipDesign.fontScale === p.scale)) ||
                      (payslipDesign.fontScale === p.scale);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSetFontSizePreset(p.id, p.scale)}
                        className={`py-1.5 px-1 rounded border text-center transition cursor-pointer ${
                          isActive
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-bold shadow-2xs'
                            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-400 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <span className="text-xs block font-medium">{p.label}</span>
                        <span className="text-[9.5px] block opacity-75">{p.scale}%</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleAdjustFontScale(-4)}
                    className="w-6 h-6 flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold cursor-pointer shrink-0"
                    title="Decrease font size"
                  >
                    -
                  </button>

                  <input
                    type="range"
                    min={76}
                    max={140}
                    step={2}
                    value={currentFontScale}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const size: PayslipFontSize = val <= 90 ? 'compact' : val <= 105 ? 'standard' : val <= 120 ? 'large' : 'xl';
                      onUpdatePayslipDesign({ fontScale: val, fontSize: size });
                    }}
                    className="flex-1 accent-zinc-900 dark:accent-zinc-100 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                    title="Adjust font size"
                  />

                  <button
                    type="button"
                    onClick={() => handleAdjustFontScale(4)}
                    className="w-6 h-6 flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold cursor-pointer shrink-0"
                    title="Increase font size"
                  >
                    +
                  </button>

                  {currentFontScale !== 100 && (
                    <button
                      type="button"
                      onClick={() => handleSetFontSizePreset('standard', 100)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline cursor-pointer shrink-0"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Payslip Main Title
                </label>
                <input
                  type="text"
                  value={payslipDesign.payslipTitle}
                  onChange={(e) => onUpdatePayslipDesign({ payslipTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 font-mono text-xs"
                  placeholder="e.g. OFFICIAL SALARY PAYSLIP"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Subtitle / Confidentiality Notice
                </label>
                <input
                  type="text"
                  value={payslipDesign.payslipSubtitle}
                  onChange={(e) => onUpdatePayslipDesign({ payslipSubtitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 text-xs"
                  placeholder="e.g. Strictly Private & Confidential"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Earnings Section Header
                </label>
                <input
                  type="text"
                  value={payslipDesign.earningsTitle}
                  onChange={(e) => onUpdatePayslipDesign({ earningsTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 text-xs"
                  placeholder="e.g. Earnings Breakdown"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Deductions Section Header
                </label>
                <input
                  type="text"
                  value={payslipDesign.deductionsTitle}
                  onChange={(e) => onUpdatePayslipDesign({ deductionsTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 text-xs"
                  placeholder="e.g. Statutory Deductions"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Net Pay Section Header
                </label>
                <input
                  type="text"
                  value={payslipDesign.netPayTitle}
                  onChange={(e) => onUpdatePayslipDesign({ netPayTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 text-xs"
                  placeholder="e.g. Net Take-Home Pay"
                />
              </div>

              {/* Net Pay Font Size */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Net Pay Font Size
                  </label>
                  <span className="text-[10px] text-zinc-400">Title & Amount scale</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                  {(
                    [
                      { id: 'small', label: 'Small', desc: 'Compact' },
                      { id: 'standard', label: 'Standard', desc: 'Default' },
                      { id: 'large', label: 'Large', desc: 'Prominent' },
                      { id: 'xl', label: 'X-Large', desc: 'Maximum' }
                    ] as const
                  ).map((opt) => {
                    const currentSize: NetPayFontSize = payslipDesign.netPayFontSize || 'standard';
                    const isSelected = currentSize === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onUpdatePayslipDesign({ netPayFontSize: opt.id })}
                        className={`px-2 py-1.5 rounded text-xs border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold shadow-xs'
                            : 'bg-white dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        <span className="text-[11px] leading-tight font-medium">{opt.label}</span>
                        <span className={`text-[9px] ${isSelected ? 'opacity-80' : 'text-zinc-400 dark:text-zinc-500'}`}>
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Total Gross / Emolument Custom Label */}
              <div className="space-y-1 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Total Gross / Emolument Label
                  </label>
                  <span className="text-[10px] text-zinc-400">e.g. Total Emolument</span>
                </div>
                <input
                  type="text"
                  value={payslipDesign.grossPayLabel || 'Total Gross Remuneration'}
                  onChange={(e) => onUpdatePayslipDesign({ grossPayLabel: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 text-xs font-medium"
                  placeholder="e.g. Total Emolument"
                />
                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                  {['Total Emolument', 'Total Gross Remuneration', 'Gross Earnings', 'Gross Salary'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => onUpdatePayslipDesign({ grossPayLabel: chip })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition cursor-pointer ${
                        (payslipDesign.grossPayLabel || 'Total Gross Remuneration') === chip
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-medium'
                          : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Deductions Custom Label */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Total Deductions Label
                </label>
                <input
                  type="text"
                  value={payslipDesign.totalDeductionsLabel || 'Total Deductions'}
                  onChange={(e) => onUpdatePayslipDesign({ totalDeductionsLabel: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 text-xs"
                  placeholder="e.g. Total Deductions"
                />
                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                  {['Total Deductions', 'Deductions Total', 'Total Statutory Deductions'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => onUpdatePayslipDesign({ totalDeductionsLabel: chip })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition cursor-pointer ${
                        (payslipDesign.totalDeductionsLabel || 'Total Deductions') === chip
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-medium'
                          : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Employer Cost Custom Label */}
              <div className="space-y-1">
                <label className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Total Employer Cost / CTC Label
                </label>
                <input
                  type="text"
                  value={payslipDesign.employerCostLabel || 'Total Employer Cost'}
                  onChange={(e) => onUpdatePayslipDesign({ employerCostLabel: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 text-xs"
                  placeholder="e.g. Total Employer Cost"
                />
                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                  {['Total Employer Cost', 'Total Monthly Emolument Cost', 'Cost to Company (CTC)'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => onUpdatePayslipDesign({ employerCostLabel: chip })}
                      className={`px-1.5 py-0.5 rounded text-[10px] border transition cursor-pointer ${
                        (payslipDesign.employerCostLabel || 'Total Employer Cost') === chip
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-medium'
                          : 'bg-zinc-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <label className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Footer Disclaimer / Legal Note
                </label>
                <textarea
                  rows={3}
                  value={payslipDesign.footerNote}
                  onChange={(e) => onUpdatePayslipDesign({ footerNote: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 text-xs leading-relaxed"
                  placeholder="e.g. This is a computer generated payslip..."
                />
              </div>
            </div>
          )}

          {/* TAB 4: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-4 text-xs">
              {/* Active Preset Quick Update Banner */}
              {activeCustomPreset && (
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5 text-xs">
                      <Save className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Currently Editing: "{activeCustomPreset.name}"
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentPreset(activeCustomPreset)}
                      className="px-3 py-1 rounded font-medium bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>Update "{activeCustomPreset.name}"</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Click "Update" to overwrite and save your current adjustments directly into "{activeCustomPreset.name}".
                  </p>
                </div>
              )}

              {/* Save Current Layout Box - Minimalist & Easy */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                  <Bookmark className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  Save as New Preset
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customPresetName}
                    onChange={(e) => setCustomPresetName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCustomPreset(); }}
                    placeholder="New preset name (e.g. My Emolument Template)"
                    className="flex-1 px-2.5 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomPreset}
                    disabled={!customPresetName.trim()}
                    className="px-3 py-1.5 rounded font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
                {saveMessage && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
                    ✓ {saveMessage}
                  </p>
                )}
              </div>

              {/* User Saved Presets */}
              {savedPresets.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    My Saved Presets ({savedPresets.length})
                  </span>
                  <div className="space-y-1.5">
                    {savedPresets.map(preset => {
                      const presetColor = 
                        preset.design.customColor || 
                        (preset.design.themeColor?.startsWith('#') 
                          ? preset.design.themeColor 
                          : PRESET_HEX_MAP[preset.design.themeColor] || '#18181b');
                      return (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 transition group hover:border-zinc-300 dark:hover:border-zinc-700 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div
                              style={{ backgroundColor: presetColor }}
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 dark:border-white/10 shadow-2xs"
                            />
                            <div className="min-w-0">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block truncate">
                                {preset.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 block">
                                Saved {formatDate(preset.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActivePresetId(preset.id);
                                setActivePresetName(preset.name);
                                onUpdatePayslipDesign(preset.design);
                                setSaveMessage(`Loaded preset "${preset.name}"`);
                                setTimeout(() => setSaveMessage(''), 2500);
                              }}
                              className="px-2.5 py-1 text-xs font-medium rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition cursor-pointer shadow-2xs"
                            >
                              Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeletePreset?.(preset.id)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                              title="Delete Preset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Built-in Presets */}
              <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                  Built-in Design Templates
                </span>
                {[
                  { id: 'modern-indigo', label: 'Modern Indigo', desc: 'Sleek tech vibe, split header, rounded cards, two-column' },
                  { id: 'executive-emerald', label: 'Executive Emerald Banner', desc: 'Top solid banner, spacious density, confidential watermark' },
                  { id: 'formal-corporate', label: 'Corporate Blue Serif', desc: 'Centered logo, editorial serif typography, signatures block enabled' },
                  { id: 'minimal-mono', label: 'High-Contrast Monochrome', desc: 'Technical mono, compact voucher, sharp corners' },
                ].map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900/60 text-left transition group shadow-2xs cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {preset.label}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                        Apply &rarr;
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      {preset.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Preview Canvas (7 Cols) - Stationary / Independent scroll */}
        <div className="lg:col-span-7 h-full overflow-y-auto flex flex-col items-center pr-1">
          
          {/* Zoom and Preview Toolbar */}
          <div className="w-full flex items-center justify-between mb-2 px-1 text-xs text-zinc-500 no-print shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-[11px] uppercase tracking-wider">
                Live Interactive Canvas
              </span>
              <span className="text-zinc-400">&bull; Hover sections to move or toggle</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Text & Font Size Quick Tool */}
              <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 shadow-2xs">
                <Type className="w-3 h-3 text-zinc-400 ml-0.5" />
                <button
                  type="button"
                  onClick={() => handleAdjustFontScale(-4)}
                  className="px-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-bold text-xs cursor-pointer"
                  title="Decrease Text Font Size (A-)"
                >
                  A-
                </button>
                <span className="font-mono text-[11px] min-w-9 text-center text-zinc-700 dark:text-zinc-300 font-medium">
                  {currentFontScale}%
                </span>
                <button
                  type="button"
                  onClick={() => handleAdjustFontScale(4)}
                  className="px-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-bold text-xs cursor-pointer"
                  title="Increase Text Font Size (A+)"
                >
                  A+
                </button>
                {currentFontScale !== 100 && (
                  <button
                    type="button"
                    onClick={() => handleSetFontSizePreset('standard', 100)}
                    className="text-[10px] px-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border-l border-zinc-200 dark:border-zinc-800 pl-1 cursor-pointer"
                    title="Reset to 100% normal font size"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Canvas Zoom Controls */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel(Math.max(70, zoomLevel - 10))}
                  className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  title="Zoom Out Canvas"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="font-mono text-[11px] w-9 text-center text-zinc-700 dark:text-zinc-300">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(Math.min(130, zoomLevel + 10))}
                  className="p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                  title="Zoom In Canvas"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="text-[10px] px-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border-l border-zinc-200 dark:border-zinc-800 pl-1.5 cursor-pointer"
                >
                  100%
                </button>
              </div>
            </div>
          </div>

          {/* Scaled Preview Canvas Wrapper */}
          <div className="w-full flex justify-center bg-zinc-200/50 dark:bg-zinc-950 p-4 sm:p-6 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-x-auto min-h-[600px] mb-8">
            <div 
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-[700px] transition-transform duration-150"
            >
              <CustomizablePayslipView
                item={previewItem}
                company={company}
                monthLabel={monthLabel}
                year={year}
                config={payslipDesign}
                interactive={true}
                onMoveSectionUp={(id) => handleMoveSection(id, 'up')}
                onMoveSectionDown={(id) => handleMoveSection(id, 'down')}
                onToggleSection={handleToggleSection}
                onUpdateConfig={onUpdatePayslipDesign}
              />
            </div>
          </div>

        </div>

      </div>

      {/* Save As Theme Modal Dialog */}
      {showSaveThemeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Save As Theme</h3>
                <p className="text-xs text-zinc-500">Save this styling & layout as a reusable preset.</p>
              </div>
            </div>

            {activeCustomPreset && (
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-2">
                <div className="text-zinc-600 dark:text-zinc-300">
                  Currently active theme: <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{activeCustomPreset.name}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateCurrentPreset(activeCustomPreset);
                    setShowSaveThemeModal(false);
                  }}
                  className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update & Overwrite "{activeCustomPreset.name}"</span>
                </button>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center font-medium">
                  — or enter a name below to save as a new theme —
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {activeCustomPreset ? 'Save as New Theme Name' : 'Theme Name'}
              </label>
              <input
                type="text"
                value={customPresetName}
                onChange={(e) => setCustomPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCustomPreset();
                  if (e.key === 'Escape') setShowSaveThemeModal(false);
                }}
                autoFocus
                placeholder="e.g. Modern Executive 2026"
                className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-zinc-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveThemeModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveCustomPreset()}
                disabled={!customPresetName.trim()}
                className="px-3.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-md transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Theme</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Design Modal Dialog */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs">
                  <FolderInput className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Import Payslip Design</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Select a company to browse and import its active payslip style or custom themes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - 2 Columns */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
              
              {/* Left Column: Companies List */}
              <div className="md:col-span-5 flex flex-col h-full bg-zinc-50/60 dark:bg-zinc-900/30 p-3.5 space-y-3 overflow-hidden">
                {/* Search Company */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={importSearchTerm}
                    onChange={(e) => setImportSearchTerm(e.target.value)}
                    placeholder="Search company..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:text-zinc-100"
                  />
                </div>

                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-1">
                  Registered Companies ({filteredImportCompanies.length})
                </div>

                {/* Company Accounts List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {filteredImportCompanies.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400">
                      No companies match your search.
                    </div>
                  ) : (
                    filteredImportCompanies.map(comp => {
                      const isCurrent = comp.id === company.id;
                      const isSelected = comp.id === selectedImportCompanyId;
                      return (
                        <button
                          key={comp.id}
                          type="button"
                          onClick={() => {
                            setSelectedImportCompanyId(comp.id);
                            setSelectedDesignKey('active');
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border transition flex items-center gap-2.5 cursor-pointer ${
                            isSelected
                              ? 'bg-white dark:bg-zinc-800 border-zinc-900/20 dark:border-zinc-600 shadow-sm ring-1 ring-zinc-900/10 dark:ring-zinc-100/10'
                              : 'bg-white/70 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800/60'
                          }`}
                        >
                          {/* Logo or Initial Avatar */}
                          {comp.logoUrl ? (
                            <img
                              src={comp.logoUrl}
                              alt={comp.name}
                              className="w-8 h-8 rounded-lg object-contain bg-white border border-zinc-200 dark:border-zinc-700 p-0.5 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-200 shrink-0 uppercase">
                              {comp.name.slice(0, 2)}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                                {comp.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0">
                                  Current
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate block">
                              {comp.subtitle || comp.email || 'Payroll Account'}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Designs & Themes Available */}
              <div className="md:col-span-7 flex flex-col h-full p-4 overflow-y-auto space-y-4">
                {targetCompanyAccount ? (
                  <>
                    {/* Selected Company Info Banner */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Designs from</span>
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {targetCompanyAccount.name}
                        </h4>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                        {1 + targetSavedPresets.length} available {1 + targetSavedPresets.length === 1 ? 'style' : 'styles'}
                      </span>
                    </div>

                    {/* Design Option 1: Active Working Design */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                        Company Live / Default Design
                      </span>
                      <div
                        onClick={() => setSelectedDesignKey('active')}
                        className={`p-3 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                          selectedDesignKey === 'active'
                            ? 'bg-zinc-50 dark:bg-zinc-800/70 border-zinc-900 dark:border-zinc-400 ring-1 ring-zinc-900 dark:ring-zinc-400 shadow-2xs'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              style={{ backgroundColor: resolveDesignColor(targetActiveDesign) }}
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                            />
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              Active Working Payslip Design
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Live
                            </span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              selectedDesignKey === 'active'
                                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                                : 'border-zinc-300 dark:border-zinc-600'
                            }`}>
                              {selectedDesignKey === 'active' && <Check className="w-2.5 h-2.5" />}
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 capitalize">
                            Header: {targetActiveDesign.headerLayout}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 capitalize">
                            Font: {targetActiveDesign.fontFamily}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 capitalize">
                            Density: {targetActiveDesign.density}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Design Option 2: Custom Saved Presets / Themes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          Custom Saved Themes ({targetSavedPresets.length})
                        </span>
                      </div>

                      {targetSavedPresets.length === 0 ? (
                        <div className="p-3.5 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-400">
                          No custom saved themes in this company yet. You can import its active working design above.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {targetSavedPresets.map(preset => {
                            const isSelected = selectedDesignKey === preset.id;
                            const color = resolveDesignColor(preset.design);
                            return (
                              <div
                                key={preset.id}
                                onClick={() => setSelectedDesignKey(preset.id)}
                                className={`p-3 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                                  isSelected
                                    ? 'bg-zinc-50 dark:bg-zinc-800/70 border-zinc-900 dark:border-zinc-400 ring-1 ring-zinc-900 dark:ring-zinc-400 shadow-2xs'
                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div
                                      style={{ backgroundColor: color }}
                                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                                    />
                                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                      {preset.name}
                                    </span>
                                  </div>
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    isSelected
                                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                                      : 'border-zinc-300 dark:border-zinc-600'
                                  }`}>
                                    {isSelected && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 capitalize">
                                    Header: {preset.design.headerLayout}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 capitalize">
                                    Font: {preset.design.fontFamily}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 capitalize">
                                    Density: {preset.design.density}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                                    Saved {formatDate(preset.createdAt)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selected Design Preview / Specifications Card */}
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                        Design Attributes Preview
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-[10px] text-zinc-400 block">Accent Color</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div
                              style={{ backgroundColor: resolveDesignColor(activeSelectedDesign) }}
                              className="w-3 h-3 rounded-full shrink-0"
                            />
                            <span className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200 font-medium truncate">
                              {resolveDesignColor(activeSelectedDesign)}
                            </span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-[10px] text-zinc-400 block">Header Style</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 capitalize mt-0.5 block truncate">
                            {activeSelectedDesign.headerLayout}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-[10px] text-zinc-400 block">Font Family</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 capitalize mt-0.5 block truncate">
                            {activeSelectedDesign.fontFamily}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-[10px] text-zinc-400 block">Table Style</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 capitalize mt-0.5 block truncate">
                            {activeSelectedDesign.tableStyle || 'Bordered'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-[10px] text-zinc-400 block">Density</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 capitalize mt-0.5 block truncate">
                            {activeSelectedDesign.density}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-[10px] text-zinc-400 block">Watermark</span>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 capitalize mt-0.5 block truncate">
                            {activeSelectedDesign.watermark}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
                    <Building2 className="w-10 h-10 mb-2 opacity-40" />
                    <p className="text-xs">Select a company from the left to view its designs.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={alsoSaveAsPreset}
                  onChange={(e) => setAlsoSaveAsPreset(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0"
                />
                <span>Also save as a custom preset in My Themes</span>
              </label>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyImportedDesign}
                  disabled={!activeSelectedDesign}
                  className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 rounded-lg transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <FolderInput className="w-3.5 h-3.5" />
                  <span>Import & Apply Design</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
