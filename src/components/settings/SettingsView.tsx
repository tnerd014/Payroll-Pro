import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Sliders, 
  FileSpreadsheet, 
  AlertOctagon, 
  Upload, 
  Check, 
  Image as ImageIcon,
  Plus, 
  Trash2, 
  RotateCcw, 
  Save, 
  Download, 
  AlertTriangle, 
  ShieldAlert,
  ArrowRight,
  Info,
  Edit2,
  X,
  Calculator,
  ArrowRightLeft,
  HelpCircle,
  CheckCircle2,
  FileText,
  Sparkles,
  BookOpen,
  Layers,
  Users,
  ShieldCheck,
  Briefcase,
  History
} from 'lucide-react';
import { 
  CompanyProfile, 
  PayrollVariables, 
  PayeTaxVariables, 
  TaxBracket, 
  Employee, 
  CalculatedPayrollItem, 
  PayrollSnapshot,
  AppView,
  EmploymentTypeRule,
  ResetOptions
} from '../../types';
import { 
  DEFAULT_PAYROLL_VARIABLES, 
  DEFAULT_PAYE_VARIABLES,
  DEFAULT_EMPLOYMENT_TYPE_RULES, 
  formatNaira 
} from '../../engine/payePensionEngine';
import { 
  exportPayrollProToExcel, 
  parseEmployeesFromExcel,
  downloadExcelImportTemplate,
  ExportOptions 
} from '../../engine/excelEngine';
import { ExportScopeModal } from '../excel/ExportScopeModal';
import { MONTHS } from '../../store/usePayrollStore';

export type SettingsTab = 'branding' | 'tax' | 'excel' | 'reset';

export interface DirtyStateInfo {
  isDirty: boolean;
  tabName?: string;
  save: () => boolean;
  discard: () => void;
}

interface SettingsViewProps {
  initialTab?: SettingsTab;
  company: CompanyProfile;
  onUpdateCompany: (profile: Partial<CompanyProfile>) => void;
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  onUpdatePayrollVariables: (v: Partial<PayrollVariables>) => void;
  onUpdatePayeTaxVariables: (v: Partial<PayeTaxVariables>) => void;
  departments?: string[];
  onAddDepartment?: (name: string) => void;
  onUpdateDepartment?: (oldName: string, newName: string) => void;
  onDeleteDepartment?: (name: string) => void;
  employees: Employee[];
  payrollItems: CalculatedPayrollItem[];
  monthLabel: string;
  selectedMonth?: string;
  year: number;
  activeSnapshot: PayrollSnapshot | undefined;
  snapshotsCount?: number;
  onImportEmployees: (items: Partial<Employee>[], mode: 'merge' | 'overwrite', scope?: 'all' | 'salary-only' | 'bank-only') => void;
  onResetAllData: (options?: ResetOptions) => void;
  onNavigate: (view: AppView) => void;
  onRegisterDirtyState?: (info: DirtyStateInfo | null) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  initialTab = 'branding',
  company,
  onUpdateCompany,
  payrollVariables,
  payeTaxVariables,
  onUpdatePayrollVariables,
  onUpdatePayeTaxVariables,
  departments = [],
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  employees,
  payrollItems,
  monthLabel,
  selectedMonth = 'jan',
  year,
  activeSnapshot,
  snapshotsCount = 0,
  onImportEmployees,
  onResetAllData,
  onNavigate,
  onRegisterDirtyState
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // --- BRANDING STATE ---
  const [companyForm, setCompanyForm] = useState<CompanyProfile>(company);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Sync if company prop changes externally when not dirty
  useEffect(() => {
    setCompanyForm(company);
  }, [company]);

  // Track dirty state for Tab 1 (Company & Branding)
  const isBrandingDirty = useMemo(() => {
    return (
      (companyForm.name || '').trim() !== (company.name || '').trim() ||
      (companyForm.subtitle || '').trim() !== (company.subtitle || '').trim() ||
      (companyForm.address || '').trim() !== (company.address || '').trim() ||
      (companyForm.phone || '').trim() !== (company.phone || '').trim() ||
      (companyForm.email || '').trim() !== (company.email || '').trim() ||
      (companyForm.logoUrl || '') !== (company.logoUrl || '')
    );
  }, [companyForm, company]);

  const saveBranding = (): boolean => {
    onUpdateCompany(companyForm);
    setBrandingSaved(true);
    setTimeout(() => setBrandingSaved(false), 2500);
    return true;
  };

  const discardBranding = () => {
    setCompanyForm(company);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCompanyForm(prev => ({ ...prev, logoUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    saveBranding();
  };

  // --- TAX & VARIABLES STATE ---
  const [pv, setPv] = useState<PayrollVariables>(payrollVariables);
  const [tv, setTv] = useState<PayeTaxVariables>(payeTaxVariables);
  const [taxSaved, setTaxSaved] = useState(false);

  // Sync if variables prop changes externally
  useEffect(() => {
    setPv(payrollVariables);
    setTv(payeTaxVariables);
  }, [payrollVariables, payeTaxVariables]);

  const percentageSum = pv.basic + pv.housing + pv.transport + pv.otherAllowances;
  const isPercentageValid = percentageSum === 100;

  // Track dirty state for Tab 2 (Tax & Variables)
  const isTaxDirty = useMemo(() => {
    const pvChanged = 
      pv.basic !== payrollVariables.basic ||
      pv.housing !== payrollVariables.housing ||
      pv.transport !== payrollVariables.transport ||
      pv.otherAllowances !== payrollVariables.otherAllowances ||
      pv.employeePensionRate !== payrollVariables.employeePensionRate ||
      pv.employerPensionRate !== payrollVariables.employerPensionRate ||
      (pv.salaryCalculationMode || 'gross-to-net') !== (payrollVariables.salaryCalculationMode || 'gross-to-net') ||
      JSON.stringify(pv.employmentTypeRules || []) !== JSON.stringify(payrollVariables.employmentTypeRules || []);

    const tvChanged = 
      tv.craBase !== payeTaxVariables.craBase ||
      tv.rentReliefRate !== payeTaxVariables.rentReliefRate ||
      tv.rentReliefCap !== payeTaxVariables.rentReliefCap ||
      JSON.stringify(tv.taxBrackets || []) !== JSON.stringify(payeTaxVariables.taxBrackets || []);

    return pvChanged || tvChanged;
  }, [pv, tv, payrollVariables, payeTaxVariables]);

  const saveTax = (): boolean => {
    if (!isPercentageValid) {
      alert('Allowances percentage sum must equal exactly 100%');
      return false;
    }
    onUpdatePayrollVariables(pv);
    onUpdatePayeTaxVariables(tv);
    setTaxSaved(true);
    setTimeout(() => setTaxSaved(false), 2500);
    return true;
  };

  const discardTax = () => {
    setPv(payrollVariables);
    setTv(payeTaxVariables);
  };

  const handleSaveTax = () => {
    saveTax();
  };

  // Register dirty state with App.tsx for leaving Settings
  useEffect(() => {
    if (!onRegisterDirtyState) return;

    const isDirty = isBrandingDirty || isTaxDirty;
    const tabName = isBrandingDirty && isTaxDirty
      ? 'Company Branding and Tax Variables'
      : isBrandingDirty
        ? 'Company & Branding'
        : isTaxDirty
          ? 'Tax & Variables'
          : undefined;

    onRegisterDirtyState({
      isDirty,
      tabName,
      save: () => {
        let ok = true;
        if (isBrandingDirty) {
          ok = saveBranding();
        }
        if (ok && isTaxDirty) {
          ok = saveTax();
        }
        return ok;
      },
      discard: () => {
        if (isBrandingDirty) discardBranding();
        if (isTaxDirty) discardTax();
      }
    });

    return () => {
      onRegisterDirtyState(null);
    };
  }, [isBrandingDirty, isTaxDirty, companyForm, pv, tv, company, payrollVariables, payeTaxVariables, onRegisterDirtyState, isPercentageValid]);

  // Window beforeunload prompt if dirty
  useEffect(() => {
    const isDirty = isBrandingDirty || isTaxDirty;
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isBrandingDirty, isTaxDirty]);

  // Tab switching guard within SettingsView
  const [pendingTab, setPendingTab] = useState<SettingsTab | null>(null);
  const [isTabModalOpen, setIsTabModalOpen] = useState(false);

  const handleTabChange = (targetTab: SettingsTab) => {
    if (targetTab === activeTab) return;

    if (activeTab === 'branding' && isBrandingDirty) {
      setPendingTab(targetTab);
      setIsTabModalOpen(true);
      return;
    }

    if (activeTab === 'tax' && isTaxDirty) {
      setPendingTab(targetTab);
      setIsTabModalOpen(true);
      return;
    }

    setActiveTab(targetTab);
  };

  const handleSaveAndSwitchTab = () => {
    let ok = true;
    if (activeTab === 'branding') {
      ok = saveBranding();
    } else if (activeTab === 'tax') {
      ok = saveTax();
    }

    if (ok && pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
      setIsTabModalOpen(false);
    }
  };

  const handleDiscardAndSwitchTab = () => {
    if (activeTab === 'branding') {
      discardBranding();
    } else if (activeTab === 'tax') {
      discardTax();
    }

    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
      setIsTabModalOpen(false);
    }
  };

  const handleResetTaxDefaults = () => {
    if (confirm('Reset all allowance variables and PAYE tax brackets to Nigerian statutory defaults?')) {
      setPv(DEFAULT_PAYROLL_VARIABLES);
      setTv(DEFAULT_PAYE_VARIABLES);
      onUpdatePayrollVariables(DEFAULT_PAYROLL_VARIABLES);
      onUpdatePayeTaxVariables(DEFAULT_PAYE_VARIABLES);
    }
  };

  const handleAddBracket = () => {
    const newId = `tier_${Date.now()}`;
    const newBracket: TaxBracket = {
      id: newId,
      rate: 0.25,
      upTo: null,
      label: 'Additional Tax Tier'
    };
    setTv({
      ...tv,
      taxBrackets: [...tv.taxBrackets, newBracket]
    });
  };

  const handleRemoveBracket = (id: string) => {
    if (tv.taxBrackets.length <= 1) {
      alert('You must have at least one tax bracket');
      return;
    }
    setTv({
      ...tv,
      taxBrackets: tv.taxBrackets.filter(b => b.id !== id)
    });
  };

  // --- DEPARTMENT MANAGEMENT STATE ---
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editingDeptValue, setEditingDeptValue] = useState('');
  const [deptFeedback, setDeptFeedback] = useState<string | null>(null);

  const showDeptNotice = (msg: string) => {
    setDeptFeedback(msg);
    setTimeout(() => setDeptFeedback(null), 3000);
  };

  const handleAddDept = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newDepartmentName.trim().toUpperCase();
    if (!trimmed) return;
    if (departments.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Department "${trimmed}" already exists.`);
      return;
    }
    onAddDepartment?.(trimmed);
    setNewDepartmentName('');
    showDeptNotice(`Department "${trimmed}" added.`);
  };

  const handleStartEditDept = (dept: string) => {
    setEditingDept(dept);
    setEditingDeptValue(dept);
  };

  const handleSaveEditDept = (oldDept: string) => {
    const trimmed = editingDeptValue.trim().toUpperCase();
    if (!trimmed) {
      setEditingDept(null);
      return;
    }
    if (trimmed.toLowerCase() !== oldDept.toLowerCase()) {
      if (departments.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
        alert(`Department "${trimmed}" already exists.`);
        return;
      }
      onUpdateDepartment?.(oldDept, trimmed);
      showDeptNotice(`Updated "${oldDept}" to "${trimmed}".`);
    }
    setEditingDept(null);
  };

  const handleDeleteDept = (dept: string) => {
    const assignedStaffCount = employees.filter(
      e => (e.department || '').toLowerCase() === dept.toLowerCase()
    ).length;
    let message = `Are you sure you want to remove the "${dept}" department?`;
    if (assignedStaffCount > 0) {
      message = `There are currently ${assignedStaffCount} employee(s) assigned to "${dept}".\n\nRemoving this department will remove it from future employee selection dropdowns, but existing employee records will remain intact.\n\nDo you want to proceed?`;
    }
    if (confirm(message)) {
      onDeleteDepartment?.(dept);
      showDeptNotice(`Department "${dept}" removed.`);
    }
  };

  // --- EMPLOYMENT TYPES & DEMARCATION STATE ---
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePaye, setNewTypePaye] = useState(true);
  const [newTypePension, setNewTypePension] = useState(true);
  const [typeFeedback, setTypeFeedback] = useState<string | null>(null);

  const showTypeNotice = (msg: string) => {
    setTypeFeedback(msg);
    setTimeout(() => setTypeFeedback(null), 3000);
  };

  const activeEmploymentRules: EmploymentTypeRule[] = pv.employmentTypeRules && pv.employmentTypeRules.length > 0 
    ? pv.employmentTypeRules 
    : DEFAULT_EMPLOYMENT_TYPE_RULES;

  const handleToggleRulePaye = (ruleId: string) => {
    const updated = activeEmploymentRules.map(r => 
      r.id === ruleId ? { ...r, hasPayeDefault: !r.hasPayeDefault } : r
    );
    const updatedPv = { ...pv, employmentTypeRules: updated };
    setPv(updatedPv);
    onUpdatePayrollVariables(updatedPv);
    showTypeNotice('Updated PAYE demarcation rule.');
  };

  const handleToggleRulePension = (ruleId: string) => {
    const updated = activeEmploymentRules.map(r => 
      r.id === ruleId ? { ...r, hasPensionDefault: !r.hasPensionDefault } : r
    );
    const updatedPv = { ...pv, employmentTypeRules: updated };
    setPv(updatedPv);
    onUpdatePayrollVariables(updatedPv);
    showTypeNotice('Updated Pension demarcation rule.');
  };

  const handleAddEmploymentRule = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    if (activeEmploymentRules.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Employment category "${trimmed}" already exists.`);
      return;
    }
    const newRule: EmploymentTypeRule = {
      id: 'et-' + Date.now(),
      name: trimmed,
      hasPayeDefault: newTypePaye,
      hasPensionDefault: newTypePension,
      description: `Custom employment category. Default statutory PAYE: ${newTypePaye ? 'YES' : 'EXEMPT'}, Pension: ${newTypePension ? 'YES' : 'EXEMPT'}.`
    };
    const updated = [...activeEmploymentRules, newRule];
    const updatedPv = { ...pv, employmentTypeRules: updated };
    setPv(updatedPv);
    onUpdatePayrollVariables(updatedPv);
    setNewTypeName('');
    setNewTypePaye(true);
    setNewTypePension(true);
    showTypeNotice(`Added "${trimmed}" category.`);
  };

  const handleDeleteEmploymentRule = (ruleId: string) => {
    const target = activeEmploymentRules.find(r => r.id === ruleId);
    if (!target) return;
    if (confirm(`Remove the employment type "${target.name}"? Existing employees assigned to this type will retain their current settings.`)) {
      const updated = activeEmploymentRules.filter(r => r.id !== ruleId);
      const updatedPv = { ...pv, employmentTypeRules: updated };
      setPv(updatedPv);
      onUpdatePayrollVariables(updatedPv);
      showTypeNotice(`Removed "${target.name}".`);
    }
  };

  // --- EXCEL STATE ---
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedData, setParsedData] = useState<Partial<Employee>[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [importScope, setImportScope] = useState<'all' | 'salary-only' | 'bank-only'>('all');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState(false);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenExportModal = () => {
    setIsExportModalOpen(true);
  };

  const handleExportConfirm = (options: ExportOptions) => {
    try {
      const targetMonthLabel = options.selectedMonth
        ? (MONTHS.find(m => m.key === options.selectedMonth)?.label || monthLabel)
        : monthLabel;
      const targetYear = options.selectedYear || year;

      exportPayrollProToExcel(
        employees,
        payrollItems,
        payrollVariables,
        payeTaxVariables,
        targetMonthLabel,
        targetYear,
        activeSnapshot,
        company,
        options
      );
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      alert('Error exporting Excel workbook: ' + (err as Error).message);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadExcelImportTemplate();
      setTemplateSuccess(true);
      setTimeout(() => setTemplateSuccess(false), 3000);
    } catch (err) {
      alert('Error downloading import template: ' + (err as Error).message);
    }
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseEmployeesFromExcel(file);
      setParsedData(result.employees);
      setImportErrors(result.errors);
      setIsImportModalOpen(true);
    } catch (err) {
      alert('Failed to parse Excel file: ' + (err as Error).message);
    } finally {
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData || parsedData.length === 0) return;
    onImportEmployees(parsedData, importMode, importScope);
    setIsImportModalOpen(false);
    setParsedData(null);
    setImportErrors([]);
    onNavigate('employees');
  };

  // --- RESET STATE ("DANGER ZONE" / SELECTIVE RESET) ---
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [resetOptions, setResetOptions] = useState<ResetOptions>({
    resetEmployees: true,
    resetSnapshots: true,
    resetVariables: false, // Default to FALSE: Omit the variables page and preserve formulas by default!
    resetCompany: false,
    resetDepartments: false,
  });

  const selectedResetCount = Object.values(resetOptions).filter(Boolean).length;

  const handleTriggerReset = () => {
    if (resetConfirmationText.trim() !== 'RESET') return;
    if (selectedResetCount === 0) return;

    onResetAllData(resetOptions);
    setIsResetModalOpen(false);
    setResetConfirmationText('');

    const cleared: string[] = [];
    if (resetOptions.resetEmployees) cleared.push(`Employee Directory (${employees.length} records)`);
    if (resetOptions.resetSnapshots) cleared.push(`Payroll History (${snapshotsCount} runs)`);
    if (resetOptions.resetVariables) cleared.push('Statutory Tax & Calculation Variables');
    if (resetOptions.resetCompany) cleared.push('Company Profile & Branding');
    if (resetOptions.resetDepartments) cleared.push('Departments List');

    const preserved: string[] = [];
    if (!resetOptions.resetVariables) preserved.push('Statutory & Tax Variables (Formulas intact)');
    if (!resetOptions.resetCompany) preserved.push('Company Profile & Branding');
    if (!resetOptions.resetDepartments) preserved.push('Departments List');
    if (!resetOptions.resetEmployees) preserved.push('Employee Directory');
    if (!resetOptions.resetSnapshots) preserved.push('Payroll History');

    alert(`Reset Complete!\n\nCleared:\n• ${cleared.join('\n• ')}${preserved.length > 0 ? `\n\nPreserved intact:\n• ${preserved.join('\n• ')}` : ''}`);

    if (resetOptions.resetEmployees) {
      onNavigate('employees');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sticky Header & Tabs Container with Persistent Save Button */}
      <div className="sticky -top-6 md:-top-8 z-30 bg-[#fbfbfb]/95 dark:bg-[#09090b]/95 backdrop-blur-md pt-2 pb-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 border-b border-zinc-200/80 dark:border-zinc-800/80 space-y-2.5 transition-all">
        
        {/* Top Row: Title + Persistent Action */}
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              System Settings
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate hidden sm:block">
              Configure company branding, statutory tax variables, Excel data sync, and system reset.
            </p>
          </div>

          {/* Always-Visible Save Action */}
          <div className="flex items-center gap-2 shrink-0">
            {activeTab === 'branding' && (
              <>
                {brandingSaved && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in duration-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveBranding()}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs ${
                    isBrandingDirty
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 ring-2 ring-blue-500/25'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  title={isBrandingDirty ? 'Unsaved modifications ready to save' : 'Save branding'}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                  {isBrandingDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </button>
              </>
            )}

            {activeTab === 'tax' && (
              <>
                {taxSaved && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in duration-200">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveTax()}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs ${
                    isTaxDirty
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 ring-2 ring-blue-500/25'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  title={isTaxDirty ? 'Unsaved modifications ready to save' : 'Save tax variables'}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Variables</span>
                  {isTaxDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 text-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => handleTabChange('branding')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition shrink-0 cursor-pointer ${
              activeTab === 'branding'
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Company &amp; Branding</span>
            {isBrandingDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Unsaved modifications" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('tax')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition shrink-0 cursor-pointer ${
              activeTab === 'tax'
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tax &amp; Variables</span>
            {isTaxDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Unsaved modifications" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('excel')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition shrink-0 cursor-pointer ${
              activeTab === 'excel'
                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel Sync</span>
          </button>

          <button
            onClick={() => handleTabChange('reset')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition ml-auto shrink-0 cursor-pointer ${
              activeTab === 'reset'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 font-semibold'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Reset System</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: BRANDING ================= */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="space-y-6 max-w-3xl">
          
          {/* Logo Card */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Company Logo &amp; Print Header
            </h2>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 overflow-hidden shrink-0">
                {companyForm.logoUrl ? (
                  <img src={companyForm.logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-zinc-400" />
                )}
              </div>

              <div className="flex-1 space-y-1.5 text-xs">
                <p className="font-medium text-zinc-800 dark:text-zinc-200">Official Letterhead Logo</p>
                <p className="text-zinc-500 text-[11px]">
                  Uploaded logo is rendered on printable employee payslips, bulk PDF exports, and schedules. Supports PNG, JPG, or SVG.
                </p>

                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="settings-logo-upload"
                />

                <div className="flex items-center gap-2 pt-2">
                  <label
                    htmlFor="settings-logo-upload"
                    className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded font-medium text-xs cursor-pointer hover:opacity-90 inline-flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo</span>
                  </label>
                  {companyForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setCompanyForm(prev => ({ ...prev, logoUrl: '' }))}
                      className="px-3 py-1.5 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs transition"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Company Details Card */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Organization Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Company / Organization Legal Name</label>
                <input
                  type="text"
                  required
                  value={companyForm.name}
                  onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                  placeholder="e.g. DEWATERING CONSTRUCTION ETC LIMITED"
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Subtitle / Business Description</label>
                <input
                  type="text"
                  value={companyForm.subtitle}
                  onChange={e => setCompanyForm({ ...companyForm, subtitle: e.target.value })}
                  placeholder="e.g. Ground Water Control & Engineering Specialist"
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Physical / Registered Address</label>
                <textarea
                  rows={2}
                  value={companyForm.address}
                  onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                  placeholder="e.g. Plot 12, Commercial Avenue, Victoria Island, Lagos, Nigeria"
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Official Phone Number</label>
                <input
                  type="text"
                  value={companyForm.phone}
                  onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  placeholder="e.g. +234 800 339 2837"
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Official Email Address</label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                  placeholder="e.g. info@dewateringconstruction.com"
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded font-medium text-xs hover:opacity-90 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Company Branding</span>
            </button>

            {brandingSaved && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>Branding saved successfully!</span>
              </span>
            )}
          </div>

        </form>
      )}

      {/* ================= TAB 2: TAX & VARIABLES ================= */}
      {activeTab === 'tax' && (
        <div className="space-y-6 max-w-4xl">
          
          {/* Salary Calculation Model (Minimalist) */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Salary Calculation Mode
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Choose how employee base salaries are interpreted.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Gross-to-Net */}
              <button
                type="button"
                onClick={() => {
                  const updated = { ...pv, salaryCalculationMode: 'gross-to-net' as const };
                  setPv(updated);
                  onUpdatePayrollVariables(updated);
                }}
                className={`text-left p-3.5 rounded-md border transition flex items-center justify-between gap-3 ${
                  (pv.salaryCalculationMode || 'gross-to-net') === 'gross-to-net'
                    ? 'bg-zinc-50 dark:bg-zinc-800/80 border-blue-500 dark:border-blue-400 shadow-2xs'
                    : 'bg-white dark:bg-[#141418] border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Gross to Net
                    </span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      Standard
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Entered salary is Gross; PAYE &amp; pension are deducted.
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  (pv.salaryCalculationMode || 'gross-to-net') === 'gross-to-net'
                    ? 'border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}>
                  {(pv.salaryCalculationMode || 'gross-to-net') === 'gross-to-net' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </button>

              {/* Option 2: Net-to-Gross */}
              <button
                type="button"
                onClick={() => {
                  const updated = { ...pv, salaryCalculationMode: 'net-to-gross' as const };
                  setPv(updated);
                  onUpdatePayrollVariables(updated);
                }}
                className={`text-left p-3.5 rounded-md border transition flex items-center justify-between gap-3 ${
                  (pv.salaryCalculationMode || 'gross-to-net') === 'net-to-gross'
                    ? 'bg-zinc-50 dark:bg-zinc-800/80 border-amber-500 dark:border-amber-400 shadow-2xs'
                    : 'bg-white dark:bg-[#141418] border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Net to Gross
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-medium">
                      Take-Home
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Entered salary is exact Net; Gross is back-calculated.
                  </p>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  (pv.salaryCalculationMode || 'gross-to-net') === 'net-to-gross'
                    ? 'border-amber-600 dark:border-amber-500 bg-amber-600 dark:bg-amber-500'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}>
                  {(pv.salaryCalculationMode || 'gross-to-net') === 'net-to-gross' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Company Departments & Cost Centers */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Company Departments &amp; Cost Centers
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {departments.length} Departments
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Manage company operational units. Add, edit, or remove departments used across employee records and payroll cost reporting.
                </p>
              </div>

              {deptFeedback && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>{deptFeedback}</span>
                </div>
              )}
            </div>

            {/* Add Department Input */}
            <form onSubmit={handleAddDept} className="flex gap-2">
              <input
                type="text"
                value={newDepartmentName}
                onChange={e => setNewDepartmentName(e.target.value)}
                placeholder="Enter department name (e.g. MARKETING, AUDIT, LOGISTICS)..."
                className="flex-1 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-400 uppercase tracking-wide placeholder:normal-case"
              />
              <button
                type="submit"
                disabled={!newDepartmentName.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded font-medium text-xs hover:opacity-90 disabled:opacity-40 transition whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
            </form>

            {/* Department List */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden">
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                {departments.length === 0 ? (
                  <div className="p-4 text-center text-zinc-400 text-xs">
                    No departments added yet. Add your first department above.
                  </div>
                ) : (
                  departments.map((dept) => {
                    const assignedStaffCount = employees.filter(
                      e => (e.department || '').toLowerCase() === dept.toLowerCase()
                    ).length;
                    const isEditing = editingDept === dept;

                    return (
                      <div
                        key={dept}
                        className="flex items-center justify-between p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition gap-3"
                      >
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingDeptValue}
                              onChange={e => setEditingDeptValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEditDept(dept);
                                if (e.key === 'Escape') setEditingDept(null);
                              }}
                              autoFocus
                              className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 uppercase"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditDept(dept)}
                              className="p-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="Save changes"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDept(null)}
                              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                                {dept}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                                  assignedStaffCount > 0
                                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                                    : 'text-zinc-400'
                                }`}
                              >
                                {assignedStaffCount} {assignedStaffCount === 1 ? 'employee' : 'employees'}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditDept(dept)}
                                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                                  title={`Edit ${dept}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDept(dept)}
                                  className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                                  title={`Delete ${dept}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Employment Types & Statutory Demarcation Rules */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Employment Types &amp; Statutory Demarcation Rules
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {activeEmploymentRules.length} Rules Active
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Set default statutory tax and pension deductions per employment category. Full-Time pays PAYE &amp; Pension by default; Part-Time and Contract are exempt. Defaults apply when onboarding staff, and can also be overridden per employee.
                </p>
              </div>

              {typeFeedback && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>{typeFeedback}</span>
                </div>
              )}
            </div>

            {/* Existing Rules Table */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden">
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                {activeEmploymentRules.map(rule => {
                  const assignedStaffCount = employees.filter(
                    e => (e.employmentType || 'Full-Time').toLowerCase() === rule.name.toLowerCase()
                  ).length;
                  const isCoreType = ['Full-Time', 'Part-Time', 'Contract', 'Intern / NYSC'].includes(rule.name);

                  return (
                    <div 
                      key={rule.id}
                      className="p-3.5 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                            {rule.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
                            {assignedStaffCount} {assignedStaffCount === 1 ? 'employee' : 'employees'}
                          </span>
                          {isCoreType && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 font-medium uppercase">
                              Standard
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          {rule.description}
                        </p>
                      </div>

                      {/* Demarcation Toggles */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {/* PAYE Demarcation Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleRulePaye(rule.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                            rule.hasPayeDefault
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                              : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-750 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                          title={`Click to ${rule.hasPayeDefault ? 'exempt' : 'enable'} PAYE tax by default for ${rule.name}`}
                        >
                          {rule.hasPayeDefault ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>PAYE Tax Active</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5 text-zinc-400" />
                              <span>PAYE Exempt</span>
                            </>
                          )}
                        </button>

                        {/* Pension Demarcation Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleRulePension(rule.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                            rule.hasPensionDefault
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60'
                              : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-750 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          }`}
                          title={`Click to ${rule.hasPensionDefault ? 'exempt' : 'enable'} statutory pension by default for ${rule.name}`}
                        >
                          {rule.hasPensionDefault ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>8% Pension Active</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Pension Exempt</span>
                            </>
                          )}
                        </button>

                        {/* Delete Custom Rule */}
                        {!isCoreType && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEmploymentRule(rule.id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title={`Delete "${rule.name}" category`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Employment Category Form */}
            <form onSubmit={handleAddEmploymentRule} className="bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-2.5">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 text-xs flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-zinc-500" />
                Add Custom Employment Category
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                <input
                  type="text"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  placeholder="Category Name (e.g. Expatriate, Consultant)..."
                  className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={newTypePaye}
                      onChange={e => setNewTypePaye(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>PAYE Deducted</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={newTypePension}
                      onChange={e => setNewTypePension(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Pension Deducted</span>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newTypeName.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded font-medium text-xs hover:opacity-90 disabled:opacity-40 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Category</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Statutory Allowances Ratio */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Gross Remuneration Allowance Structure
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Standard Nigerian breakdown percentages. The 4 components must total exactly 100%.
                </p>
              </div>

              <div className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${
                isPercentageValid 
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' 
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
              }`}>
                Sum: {percentageSum}% {isPercentageValid ? '(Balanced)' : '(Must be 100%)'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Basic Allowance (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={pv.basic}
                  onChange={e => setPv({ ...pv, basic: Number(e.target.value) || 0 })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Housing Allowance (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={pv.housing}
                  onChange={e => setPv({ ...pv, housing: Number(e.target.value) || 0 })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Transport Allowance (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={pv.transport}
                  onChange={e => setPv({ ...pv, transport: Number(e.target.value) || 0 })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Other Allowances (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={pv.otherAllowances}
                  onChange={e => setPv({ ...pv, otherAllowances: Number(e.target.value) || 0 })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Pension Statutory Contribution Rates */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Pension Reform Act 2014 Contribution Rates
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Applied to Pensionable Emoluments (Basic + Housing + Transport).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Employee Pension Rate (Standard: 8%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={pv.employeePensionRate}
                    onChange={e => setPv({ ...pv, employeePensionRate: Number(e.target.value) || 0 })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                    {(pv.employeePensionRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Employer Pension Rate (Standard: 10%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={pv.employerPensionRate}
                    onChange={e => setPv({ ...pv, employerPensionRate: Number(e.target.value) || 0 })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                    {(pv.employerPensionRate * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Consolidated Relief & Rent Relief */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                PITA Tax Relief Parameters
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Consolidated Relief Allowance (CRA) calculation variables and annual Rent Relief caps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">CRA Base Statutory (₦)</label>
                <input
                  type="number"
                  value={tv.craBase}
                  onChange={e => setTv({ ...tv, craBase: Number(e.target.value) || 0 })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Rent Relief Rate (20% = 0.20)</label>
                <input
                  type="number"
                  step="0.01"
                  value={tv.rentReliefRate}
                  onChange={e => setTv({ ...tv, rentReliefRate: Number(e.target.value) || 0 })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-600 dark:text-zinc-400 font-medium">Rent Relief Max Cap (₦)</label>
                <input
                  type="number"
                  value={tv.rentReliefCap}
                  onChange={e => setTv({ ...tv, rentReliefCap: Number(e.target.value) || 0 })}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Progressive PAYE Brackets Table */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Progressive PAYE Tax Brackets (Sixth Schedule)
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Sequential tax rates applied progressively to chargeable income.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddBracket}
                className="flex items-center gap-1 px-2.5 py-1 text-xs border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tier</span>
              </button>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-500">
                  <tr>
                    <th className="p-2.5">Tier Description</th>
                    <th className="p-2.5">Band Chunk (₦)</th>
                    <th className="p-2.5">Rate (%)</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {tv.taxBrackets.map((bracket, index) => (
                    <tr key={bracket.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={bracket.label}
                          onChange={e => {
                            const updated = [...tv.taxBrackets];
                            updated[index].label = e.target.value;
                            setTv({ ...tv, taxBrackets: updated });
                          }}
                          className="bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-zinc-500 w-full focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          placeholder="No limit (balance)"
                          value={bracket.upTo === null ? '' : bracket.upTo}
                          onChange={e => {
                            const updated = [...tv.taxBrackets];
                            updated[index].upTo = e.target.value === '' ? null : Number(e.target.value);
                            setTv({ ...tv, taxBrackets: updated });
                          }}
                          className="w-32 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 font-mono text-xs"
                        />
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={bracket.rate}
                            onChange={e => {
                              const updated = [...tv.taxBrackets];
                              updated[index].rate = Number(e.target.value) || 0;
                              setTv({ ...tv, taxBrackets: updated });
                            }}
                            className="w-20 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 font-mono text-xs"
                          />
                          <span className="text-zinc-400 font-mono">({(bracket.rate * 100).toFixed(0)}%)</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveBracket(bracket.id)}
                          className="p-1 text-zinc-400 hover:text-rose-500 rounded transition"
                          title="Remove bracket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveTax}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded font-medium text-xs hover:opacity-90 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Tax Variables</span>
              </button>

              {taxSaved && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Tax configuration saved!</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetTaxDefaults}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Statutory Defaults</span>
            </button>
          </div>

        </div>
      )}

      {/* ================= TAB 3: EXCEL SYNC ================= */}
      {activeTab === 'excel' && (
        <div className="space-y-6 max-w-4xl">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Export Card */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Export to Excel
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Download complete payroll registers, statutory remittance schedules, and annual matrices in .xlsx format.
                  </p>
                </div>
              </div>

              <div className="pt-6 space-y-2">
                <button
                  type="button"
                  onClick={handleOpenExportModal}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs shadow-2xs transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Configure &amp; Export...</span>
                </button>
                {downloadSuccess && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 text-center font-medium">
                    ✓ Workbook exported successfully
                  </p>
                )}
              </div>
            </div>

            {/* Import Card */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col justify-between shadow-2xs">
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Import Staff Directory
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Upload a spreadsheet to synchronize employee records, salaries, designations, and bank details.
                  </p>
                </div>
              </div>

              <div className="pt-6 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="file"
                    ref={excelFileInputRef}
                    accept=".xlsx, .xls"
                    onChange={handleExcelFileChange}
                    className="hidden"
                    id="settings-excel-import-file"
                  />
                  <label
                    htmlFor="settings-excel-import-file"
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 rounded-lg font-medium text-xs cursor-pointer transition text-center"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>Upload File</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium text-xs transition cursor-pointer text-center"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                    <span>Template (.xlsx)</span>
                  </button>
                </div>

                {templateSuccess && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 text-center font-medium">
                    ✓ Template downloaded
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* Import Preview Modal */}
          {isImportModalOpen && parsedData && (
            <div className="fixed top-9 inset-x-0 bottom-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg max-w-xl w-full p-5 space-y-4 shadow-xl">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Confirm Staff Excel Import ({parsedData.length} Found)
                </h3>

                {importErrors.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded text-xs text-amber-800 dark:text-amber-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Validation Notices:</span>
                    </p>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5">
                      {importErrors.slice(0, 4).map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Scope of Import Selector */}
                <div className="space-y-2 text-xs">
                  <label className="text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>What would you like to import from this Excel file?</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Option 1: Full Employee Record */}
                    <div
                      onClick={() => setImportScope('all')}
                      className={`cursor-pointer rounded-lg p-2.5 border transition flex flex-col justify-between gap-1.5 ${
                        importScope === 'all'
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${importScope === 'all' ? 'bg-emerald-600' : 'bg-zinc-400'}`} />
                          Full Profile Record
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                        Imports all columns: personal details, employment type, bank accounts, and gross salary.
                      </p>
                    </div>

                    {/* Option 2: Salary & Net Pay Only */}
                    <div
                      onClick={() => setImportScope('salary-only')}
                      className={`cursor-pointer rounded-lg p-2.5 border transition flex flex-col justify-between gap-1.5 ${
                        importScope === 'salary-only'
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${importScope === 'salary-only' ? 'bg-amber-600' : 'bg-zinc-400'}`} />
                          Salary &amp; Net Pay Only
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                        Updates monthly salaries/net pay without touching bank accounts, tax IDs, or personal records.
                      </p>
                    </div>

                    {/* Option 3: Bank & Remittance Credentials Only */}
                    <div
                      onClick={() => setImportScope('bank-only')}
                      className={`cursor-pointer rounded-lg p-2.5 border transition flex flex-col justify-between gap-1.5 ${
                        importScope === 'bank-only'
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-500'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${importScope === 'bank-only' ? 'bg-blue-600' : 'bg-zinc-400'}`} />
                          Bank &amp; Tax IDs Only
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                        Updates bank accounts, sort codes, PAYE Tax IDs, and RSA Pension PINs.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Import Mode (Merge vs Replace) */}
                <div className="space-y-1.5 text-xs pt-1">
                  <label className="text-zinc-700 dark:text-zinc-300 font-semibold block">
                    Roster Replacement Strategy:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                      importMode === 'merge' ? 'border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900/60' : 'border-zinc-200 dark:border-zinc-800'
                    }`}>
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="mt-0.5 text-zinc-900"
                      />
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">Merge &amp; Update (Recommended)</span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Updates existing matching staff by Code/Name, preserving unmentioned employees.</span>
                      </div>
                    </label>

                    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                      importMode === 'overwrite' ? 'border-rose-400 dark:border-rose-700 bg-rose-50/30 dark:bg-rose-950/20' : 'border-zinc-200 dark:border-zinc-800'
                    }`}>
                      <input
                        type="radio"
                        name="importMode"
                        value="overwrite"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                        className="mt-0.5 text-rose-600"
                      />
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">Replace All Staff (Full Overwrite)</span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Replaces the entire staff database with the records found in this file.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => { setIsImportModalOpen(false); setParsedData(null); }}
                    className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="px-4 py-1.5 text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded hover:opacity-90"
                  >
                    Apply Import
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ================= TAB 4: RESET SYSTEM ("DANGER ZONE" / SELECTIVE RESET) ================= */}
      {activeTab === 'reset' && (
        <div className="space-y-4 max-w-3xl">
          
          {/* Minimalist Header & Quick Presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                Selective System Reset
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Select which modules to wipe. Keep <span className="font-medium text-zinc-700 dark:text-zinc-300">Variables</span> unchecked to protect custom tax formulas and calculation brackets.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setResetOptions({
                  resetEmployees: true,
                  resetSnapshots: true,
                  resetVariables: false, // Keep formulas!
                  resetCompany: false,
                  resetDepartments: false,
                })}
                className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Keep Formulas</span>
              </button>
              <button
                type="button"
                onClick={() => setResetOptions({
                  resetEmployees: true,
                  resetSnapshots: true,
                  resetVariables: true,
                  resetCompany: true,
                  resetDepartments: true,
                })}
                className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition font-medium cursor-pointer"
              >
                All Modules
              </button>
              <button
                type="button"
                onClick={() => setResetOptions({
                  resetEmployees: false,
                  resetSnapshots: false,
                  resetVariables: false,
                  resetCompany: false,
                  resetDepartments: false,
                })}
                className="text-[11px] px-2 py-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition cursor-pointer"
              >
                Deselect
              </button>
            </div>
          </div>

          {/* Minimalist Unified Modules Checklist */}
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden shadow-2xs">
            
            {/* 1. Employee Directory */}
            <div 
              onClick={() => setResetOptions(o => ({ ...o, resetEmployees: !o.resetEmployees }))}
              className={`p-3.5 transition flex items-center justify-between gap-3 cursor-pointer ${
                resetOptions.resetEmployees
                  ? 'bg-rose-50/30 dark:bg-rose-950/15'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={resetOptions.resetEmployees}
                  onChange={() => {}} // handled by row click
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                />
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      Employee Directory &amp; Staff Records
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">
                      {employees.length} records
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                    Profiles, monthly gross salaries, bank accounts, and tax IDs
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${
                resetOptions.resetEmployees 
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}>
                {resetOptions.resetEmployees ? 'Will be cleared' : 'Keep intact'}
              </span>
            </div>

            {/* 2. Payroll History & Finalized Snapshots */}
            <div 
              onClick={() => setResetOptions(o => ({ ...o, resetSnapshots: !o.resetSnapshots }))}
              className={`p-3.5 transition flex items-center justify-between gap-3 cursor-pointer ${
                resetOptions.resetSnapshots
                  ? 'bg-rose-50/30 dark:bg-rose-950/15'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={resetOptions.resetSnapshots}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                />
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                  <History className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      Payroll History &amp; Snapshots
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">
                      {snapshotsCount} locked run(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                    Locked month-end snapshots and historical run archives
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${
                resetOptions.resetSnapshots 
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}>
                {resetOptions.resetSnapshots ? 'Will be cleared' : 'Keep intact'}
              </span>
            </div>

            {/* 3. Statutory Tax & Calculation Variables */}
            <div 
              onClick={() => setResetOptions(o => ({ ...o, resetVariables: !o.resetVariables }))}
              className={`p-3.5 transition flex items-center justify-between gap-3 cursor-pointer ${
                resetOptions.resetVariables
                  ? 'bg-rose-50/30 dark:bg-rose-950/15'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={resetOptions.resetVariables}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                />
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      Statutory Tax &amp; Calculation Variables
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-medium">
                      Variables Page
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                    CRA relief, Pension rates, NHF %, and Nigerian 6-tier PAYE brackets
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${
                resetOptions.resetVariables 
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400' 
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
              }`}>
                {resetOptions.resetVariables ? 'Will reset to defaults' : '✓ Kept Safe (Omitted)'}
              </span>
            </div>

            {/* 4. Company Profile & Branding */}
            <div 
              onClick={() => setResetOptions(o => ({ ...o, resetCompany: !o.resetCompany }))}
              className={`p-3.5 transition flex items-center justify-between gap-3 cursor-pointer ${
                resetOptions.resetCompany
                  ? 'bg-rose-50/30 dark:bg-rose-950/15'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={resetOptions.resetCompany}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                />
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      Company Profile &amp; Letterhead Branding
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[140px]">
                      {company.name || 'Default'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                    Company name, address, contact details, and uploaded header logo
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${
                resetOptions.resetCompany 
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}>
                {resetOptions.resetCompany ? 'Will be cleared' : 'Keep intact'}
              </span>
            </div>

            {/* 5. Custom Departments */}
            <div 
              onClick={() => setResetOptions(o => ({ ...o, resetDepartments: !o.resetDepartments }))}
              className={`p-3.5 transition flex items-center justify-between gap-3 cursor-pointer ${
                resetOptions.resetDepartments
                  ? 'bg-rose-50/30 dark:bg-rose-950/15'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={resetOptions.resetDepartments}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700 cursor-pointer shrink-0"
                />
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      Department List
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-mono">
                      {departments.length} depts
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                    Revert customized departments list back to 8 standard org units
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 ${
                resetOptions.resetDepartments 
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}>
                {resetOptions.resetDepartments ? 'Will be cleared' : 'Keep intact'}
              </span>
            </div>

          </div>

          {/* Minimalist Action Bar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {selectedResetCount} of 5 modules
              </span>
              {' '}marked for reset &bull;{' '}
              <span className={resetOptions.resetVariables ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
                {resetOptions.resetVariables ? 'Variables will reset' : 'Variables kept safe'}
              </span>
            </div>

            <button
              type="button"
              disabled={selectedResetCount === 0}
              onClick={() => {
                setResetConfirmationText('');
                setIsResetModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedResetCount > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {selectedResetCount === 0 ? 'Select Modules' : `Reset Selected (${selectedResetCount})...`}
              </span>
            </button>
          </div>

        </div>
      )}

      {/* ================= RESET CONFIRMATION MODAL ================= */}
      {isResetModalOpen && (
        <div className="fixed top-9 inset-x-0 bottom-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-rose-300 dark:border-rose-900/60 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-150">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Confirm Selective Reset
                </h3>
                <p className="text-xs text-zinc-500">
                  Review the components that will be cleared vs. preserved:
                </p>
              </div>
            </div>

            {/* Clear Summary */}
            <div className="space-y-2.5">
              {selectedResetCount > 0 && (
                <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-md p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>To be cleared ({selectedResetCount}):</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-700 dark:text-rose-400 text-[11px]">
                    {resetOptions.resetEmployees && <li>Employee directory ({employees.length} records)</li>}
                    {resetOptions.resetSnapshots && <li>Payroll history ({snapshotsCount} locked runs)</li>}
                    {resetOptions.resetVariables && <li>Statutory Tax &amp; Calculation Variables (Reverted to default)</li>}
                    {resetOptions.resetCompany && <li>Company profile &amp; branding logo</li>}
                    {resetOptions.resetDepartments && <li>Department list</li>}
                  </ul>
                </div>
              )}

              {/* Preserved Summary */}
              {(5 - selectedResetCount) > 0 && (
                <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-md p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>To remain safe &amp; preserved ({5 - selectedResetCount}):</span>
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-emerald-700 dark:text-emerald-400 text-[11px]">
                    {!resetOptions.resetVariables && (
                      <li className="font-semibold text-emerald-800 dark:text-emerald-300">
                        Variables Page: Tax formulas, CRA rules &amp; tax brackets PRESERVED
                      </li>
                    )}
                    {!resetOptions.resetCompany && <li>Company profile &amp; branding logo kept</li>}
                    {!resetOptions.resetDepartments && <li>Department structure kept</li>}
                    {!resetOptions.resetEmployees && <li>Employee directory kept</li>}
                    {!resetOptions.resetSnapshots && <li>Payroll history kept</li>}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-zinc-700 dark:text-zinc-300 font-medium block">
                Please type <span className="font-mono font-bold text-rose-600 dark:text-rose-400 select-all">RESET</span> below to confirm:
              </label>
              <input
                type="text"
                autoFocus
                value={resetConfirmationText}
                onChange={e => setResetConfirmationText(e.target.value)}
                placeholder="Type RESET to confirm"
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-3 py-2 text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-rose-500 dark:focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetConfirmationText('');
                }}
                className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              
              <button
                type="button"
                disabled={resetConfirmationText.trim() !== 'RESET' || selectedResetCount === 0}
                onClick={handleTriggerReset}
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold transition ${
                  resetConfirmationText.trim() === 'RESET' && selectedResetCount > 0
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-sm'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Selected ({selectedResetCount})</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= UNSAVED CHANGES TAB SWITCH MODAL ================= */}
      {isTabModalOpen && (
        <div className="fixed top-9 inset-x-0 bottom-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-amber-300 dark:border-amber-900/60 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Unsaved Changes
                </h3>
                <p className="text-xs text-zinc-500">
                  You have unsaved changes in {activeTab === 'branding' ? 'Company & Branding' : 'Tax & Variables'}.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Do you want to save your modifications before switching tabs, or discard them?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsTabModalOpen(false);
                  setPendingTab(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Keep Editing
              </button>

              <button
                type="button"
                onClick={handleDiscardAndSwitchTab}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition border border-rose-200 dark:border-rose-900/50"
              >
                Discard Changes
              </button>

              <button
                type="button"
                onClick={handleSaveAndSwitchTab}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded font-medium text-xs hover:opacity-90 transition shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save &amp; Switch</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EXPORT SCOPE MODAL ================= */}
      <ExportScopeModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={handleExportConfirm}
        currentMonthLabel={monthLabel}
        currentMonthKey={selectedMonth}
        currentYear={year}
        departments={departments}
        employmentTypeRules={activeEmploymentRules}
      />

    </div>
  );
};
