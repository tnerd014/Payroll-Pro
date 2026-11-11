import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, 
  Sliders, 
  ShieldCheck, 
  Save, 
  Check, 
  Upload, 
  Trash2, 
  Download, 
  CheckCircle2,
  ChevronRight,
  Briefcase,
  Users,
  MapPin,
  Phone,
  Mail,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  Search,
  RefreshCw,
  AlertTriangle,
  X,
  History,
  AlertOctagon,
  Info,
  Plus,
  Eye,
  EyeOff,
  Edit2,
  Send,
  Paperclip,
  MessageCircle
} from 'lucide-react';
import { 
  CompanyProfile, 
  PayrollVariables, 
  PayeTaxVariables, 
  AppView, 
  Employee, 
  CalculatedPayrollItem, 
  EmploymentTypeRule,
  PayrollSnapshot,
  EmployeeLoan,
  TeamMember,
  AuditLogEntry,
  ResetOptions,
  TaxBracket,
  ExtraReliefCondition,
  SalaryCalculationMode,
  EmailSettings,
  DEFAULT_EMAIL_SETTINGS,
  WhatsAppSettings,
  WhatsAppProviderType,
  DEFAULT_WHATSAPP_SETTINGS
} from '../../../types';
import { DEFAULT_EMPLOYMENT_TYPE_RULES, DEFAULT_PAYROLL_VARIABLES, DEFAULT_PAYE_VARIABLES } from '../../../engine/payePensionEngine';
import { 
  exportPayrollProToExcel, 
  parseEmployeesFromExcel, 
  downloadExcelImportTemplate, 
  ExportOptions 
} from '../../../engine/excelEngine';
import { ExportScopeModal } from '../../excel/ExportScopeModal';
import { fetchAuditLogs } from '../../../services/supabaseClient';
import { MONTHS } from '../../../store/usePayrollStore';
import { SMTP_PRESETS, testEmailServiceConnection } from '../../../services/emailService';
import { testWhatsAppConnection } from '../../../services/whatsappService';

export type MobileSettingsTab = 'profile' | 'payroll' | 'excel' | 'email' | 'whatsapp' | 'audit' | 'backup';

interface MobileSettingsViewProps {
  initialTab?: MobileSettingsTab;
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
  employees?: Employee[];
  payrollItems?: CalculatedPayrollItem[];
  monthLabel: string;
  selectedMonth?: string;
  year: number;
  activeSnapshot?: PayrollSnapshot;
  snapshots?: PayrollSnapshot[];
  loans?: EmployeeLoan[];
  currentUser?: TeamMember | null;
  onImportEmployees?: (employees: Partial<Employee>[], mode: 'merge' | 'overwrite', scope?: 'all' | 'salary-only' | 'bank-only') => void;
  onResetAllData?: (options: ResetOptions) => void;
  onNavigate: (view: AppView) => void;
  emailSettings?: EmailSettings;
  onUpdateEmailSettings?: (settings: Partial<EmailSettings>) => void;
  whatsappSettings?: WhatsAppSettings;
  onUpdateWhatsAppSettings?: (settings: Partial<WhatsAppSettings>) => void;
  isReadOnly?: boolean;
}

export const MobileSettingsView: React.FC<MobileSettingsViewProps> = ({
  initialTab,
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
  employees = [],
  payrollItems = [],
  monthLabel,
  selectedMonth = 'oct',
  year,
  activeSnapshot,
  snapshots = [],
  loans = [],
  currentUser,
  onImportEmployees,
  onResetAllData,
  onNavigate,
  emailSettings,
  onUpdateEmailSettings,
  whatsappSettings,
  onUpdateWhatsAppSettings,
  isReadOnly = false,
}) => {
  const isAdmin = !currentUser || currentUser.role === 'Admin';
  const isAuditor = currentUser?.role === 'Auditor';
  const isWriteDisabled = isAuditor || isReadOnly;
  const [activeTab, setActiveTab] = useState<MobileSettingsTab>(initialTab || 'profile');

  // Sync external initialTab if requested
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Local form state
  const [companyForm, setCompanyForm] = useState<CompanyProfile>(company);
  const [pvForm, setPvForm] = useState<PayrollVariables>(payrollVariables);
  const [tvForm, setTvForm] = useState<PayeTaxVariables>(payeTaxVariables);
  const [emailForm, setEmailForm] = useState<EmailSettings>(emailSettings || DEFAULT_EMAIL_SETTINGS);
  const [whatsAppForm, setWhatsAppForm] = useState<WhatsAppSettings>(whatsappSettings || DEFAULT_WHATSAPP_SETTINGS);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showResendApiKey, setShowResendApiKey] = useState(false);
  const [showWhatsAppSecret, setShowWhatsAppSecret] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [whatsAppTestResult, setWhatsAppTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Department management state
  const [newDeptInput, setNewDeptInput] = useState('');
  const [editingDeptName, setEditingDeptName] = useState<string | null>(null);
  const [editingDeptVal, setEditingDeptVal] = useState('');

  // --- EXCEL SYNC STATE ---
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
        pvForm,
        tvForm,
        targetMonthLabel,
        targetYear,
        activeSnapshot,
        companyForm,
        { ...options, loans },
        loans
      );
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3500);
    } catch (err: any) {
      alert('Error exporting Excel workbook: ' + (err?.message || 'Export failed'));
    }
  };

  const handleQuickExportMonth = () => {
    handleExportConfirm({ scope: 'current-month', includeFormulas: true, loans });
  };

  const handleQuickExportYear = () => {
    handleExportConfirm({ scope: 'full-year', selectedYear: year, includeFormulas: true, loans });
  };

  const handleDownloadTemplate = () => {
    try {
      downloadExcelImportTemplate();
      setTemplateSuccess(true);
      setTimeout(() => setTemplateSuccess(false), 3000);
    } catch (err: any) {
      alert('Error downloading import template: ' + (err?.message || 'Download failed'));
    }
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseEmployeesFromExcel(file);
      if (result.employees.length === 0) {
        alert('No valid employee records found in this spreadsheet.');
        return;
      }
      setParsedData(result.employees);
      setImportErrors(result.errors);
      setIsImportModalOpen(true);
    } catch (err: any) {
      alert('Failed to parse Excel file: ' + (err?.message || 'File error'));
    } finally {
      if (excelFileInputRef.current) {
        excelFileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData || parsedData.length === 0) return;
    if (onImportEmployees) {
      onImportEmployees(parsedData, importMode, importScope);
    }
    setIsImportModalOpen(false);
    setParsedData(null);
    setImportErrors([]);
    onNavigate('employees');
  };

  // --- AUDIT TRAIL STATE ---
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetchAuditLogs(company.id || company.name);
      if (res.success && res.logs) {
        setLogs(res.logs);
      }
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, company.id, company.name]);

  const filteredLogs = useMemo(() => {
    if (!logSearchQuery.trim()) return logs;
    const q = logSearchQuery.toLowerCase();
    return logs.filter(log =>
      (log.action || '').toLowerCase().includes(q) ||
      (log.actorName || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q) ||
      (log.ipOrDevice || '').toLowerCase().includes(q)
    );
  }, [logs, logSearchQuery]);

  const exportLogsAsCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Actor', 'Action', 'Details', 'Device', 'Company'];
    const rows = filteredLogs.map(l => [
      `"${new Date(l.createdAt).toLocaleString()}"`,
      `"${l.actorName || ''}"`,
      `"${l.action || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ipOrDevice || ''}"`,
      `"${l.companyName || company.name || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit-trail-${(company.name || 'company').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- SELECTIVE RESET STATE ---
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [resetOptions, setResetOptions] = useState<ResetOptions>({
    resetEmployees: true,
    resetSnapshots: true,
    resetVariables: false,
    resetCompany: false,
    resetDepartments: false,
  });

  const handleTriggerReset = () => {
    if (!isAdmin) return;
    if (resetConfirmationText.trim() !== 'RESET') return;
    if (onResetAllData) {
      onResetAllData(resetOptions);
    }
    setIsResetModalOpen(false);
    setResetConfirmationText('');
    alert('System Reset Complete. Selected records have been cleared.');
    if (resetOptions.resetEmployees) {
      onNavigate('employees');
    }
  };

  // Dirty state tracking
  const isProfileDirty = useMemo(() => {
    return (
      (companyForm.name || '').trim() !== (company.name || '').trim() ||
      (companyForm.subtitle || '').trim() !== (company.subtitle || '').trim() ||
      (companyForm.address || '').trim() !== (company.address || '').trim() ||
      (companyForm.phone || '').trim() !== (company.phone || '').trim() ||
      (companyForm.email || '').trim() !== (company.email || '').trim() ||
      (companyForm.logoUrl || '') !== (company.logoUrl || '')
    );
  }, [companyForm, company]);

  const isPayrollDirty = useMemo(() => {
    const pvChanged = 
      pvForm.basic !== payrollVariables.basic ||
      pvForm.housing !== payrollVariables.housing ||
      pvForm.transport !== payrollVariables.transport ||
      pvForm.otherAllowances !== payrollVariables.otherAllowances ||
      pvForm.employeePensionRate !== payrollVariables.employeePensionRate ||
      pvForm.employerPensionRate !== payrollVariables.employerPensionRate ||
      (pvForm.salaryCalculationMode || 'gross-to-net') !== (payrollVariables.salaryCalculationMode || 'gross-to-net') ||
      Boolean(pvForm.prorateMidMonth) !== Boolean(payrollVariables.prorateMidMonth) ||
      JSON.stringify(pvForm.employmentTypeRules || []) !== JSON.stringify(payrollVariables.employmentTypeRules || []);

    const tvChanged = 
      tvForm.craBase !== payeTaxVariables.craBase ||
      tvForm.rentReliefRate !== payeTaxVariables.rentReliefRate ||
      tvForm.rentReliefCap !== payeTaxVariables.rentReliefCap ||
      JSON.stringify(tvForm.taxBrackets || []) !== JSON.stringify(payeTaxVariables.taxBrackets || []) ||
      JSON.stringify(tvForm.extraConditions || []) !== JSON.stringify(payeTaxVariables.extraConditions || []);

    return pvChanged || tvChanged;
  }, [pvForm, tvForm, payrollVariables, payeTaxVariables]);

  // Sync external props when unmodified
  useEffect(() => {
    if (!isProfileDirty) {
      setCompanyForm(company);
    }
  }, [company, isProfileDirty]);

  useEffect(() => {
    if (!isPayrollDirty) {
      setPvForm(payrollVariables);
      setTvForm(payeTaxVariables);
    }
  }, [payrollVariables, payeTaxVariables, isPayrollDirty]);

  const isEmailDirty = useMemo(() => {
    if (!emailSettings) return false;
    return JSON.stringify(emailForm) !== JSON.stringify(emailSettings);
  }, [emailForm, emailSettings]);

  useEffect(() => {
    if (emailSettings && !isEmailDirty) {
      setEmailForm(emailSettings);
    }
  }, [emailSettings, isEmailDirty]);

  const isWhatsAppDirty = useMemo(() => {
    if (!whatsappSettings) return false;
    return JSON.stringify(whatsAppForm) !== JSON.stringify(whatsappSettings);
  }, [whatsAppForm, whatsappSettings]);

  useEffect(() => {
    if (whatsappSettings && !isWhatsAppDirty) {
      setWhatsAppForm(whatsappSettings);
    }
  }, [whatsappSettings, isWhatsAppDirty]);

  const isAnyDirty = isProfileDirty || isPayrollDirty || isEmailDirty || isWhatsAppDirty;

  // Percentage sum of allowances
  const allowanceSum = pvForm.basic + pvForm.housing + pvForm.transport + pvForm.otherAllowances;
  const isAllowanceValid = allowanceSum === 100;

  // Active employment demarcation rules
  const activeRules: EmploymentTypeRule[] = pvForm.employmentTypeRules && pvForm.employmentTypeRules.length > 0
    ? pvForm.employmentTypeRules
    : DEFAULT_EMPLOYMENT_TYPE_RULES;

  // Handle Testing Email Connection
  const handleTestEmailConnection = async () => {
    setIsTestingEmail(true);
    setTestResult(null);
    try {
      const res = await testEmailServiceConnection(emailForm);
      if (res.success) {
        setTestResult({
          success: true,
          message: emailForm.provider === 'smtp'
            ? `Connected to SMTP host ${emailForm.smtp.host}:${emailForm.smtp.port} successfully!`
            : 'Resend API key verified successfully!'
        });
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Connection handshake failed. Please verify credentials.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Error occurred during connection handshake.'
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Handle Testing WhatsApp Connection
  const handleTestWhatsAppConnection = async () => {
    setIsTestingWhatsApp(true);
    setWhatsAppTestResult(null);
    try {
      const res = await testWhatsAppConnection(whatsAppForm);
      setWhatsAppTestResult(res);
    } catch (err: any) {
      setWhatsAppTestResult({
        success: false,
        message: err?.message || 'Error occurred during WhatsApp connection handshake.'
      });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  // Save all modifications
  const handleSaveAll = () => {
    if (isWriteDisabled) return;
    if (!isAllowanceValid) {
      alert(`Allowance allocation sum must equal exactly 100%. Current sum: ${allowanceSum}%`);
      setActiveTab('payroll');
      return;
    }

    if (isProfileDirty) {
      onUpdateCompany(companyForm);
    }
    if (isPayrollDirty) {
      onUpdatePayrollVariables(pvForm);
      onUpdatePayeTaxVariables(tvForm);
    }
    if (isEmailDirty && onUpdateEmailSettings) {
      onUpdateEmailSettings(emailForm);
    }
    if (isWhatsAppDirty && onUpdateWhatsAppSettings) {
      onUpdateWhatsAppSettings(whatsAppForm);
    }

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2200);
  };

  const handleDiscardAll = () => {
    setCompanyForm(company);
    setPvForm(payrollVariables);
    setTvForm(payeTaxVariables);
    if (emailSettings) {
      setEmailForm(emailSettings);
    }
    if (whatsappSettings) {
      setWhatsAppForm(whatsappSettings);
    }
    setTestResult(null);
    setWhatsAppTestResult(null);
  };

  // Department Management handlers
  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (isWriteDisabled) return;
    const trimmed = newDeptInput.trim();
    if (!trimmed) return;
    if (departments.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Department "${trimmed}" already exists.`);
      return;
    }
    if (onAddDepartment) {
      onAddDepartment(trimmed);
      setNewDeptInput('');
    }
  };

  const handleStartEditDept = (dept: string) => {
    setEditingDeptName(dept);
    setEditingDeptVal(dept);
  };

  const handleSaveEditDept = (oldName: string) => {
    const trimmed = editingDeptVal.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingDeptName(null);
      return;
    }
    if (departments.some(d => d.toLowerCase() === trimmed.toLowerCase() && d.toLowerCase() !== oldName.toLowerCase())) {
      alert(`Department "${trimmed}" already exists.`);
      return;
    }
    if (onUpdateDepartment) {
      onUpdateDepartment(oldName, trimmed);
    }
    setEditingDeptName(null);
  };

  const handleDeleteDept = (dept: string) => {
    const assignedCount = employees.filter(e => (e.department || '').toLowerCase() === dept.toLowerCase()).length;
    const msg = assignedCount > 0
      ? `"${dept}" is currently assigned to ${assignedCount} employee(s). Are you sure you want to remove it?`
      : `Remove department "${dept}"?`;
    if (confirm(msg)) {
      if (onDeleteDepartment) {
        onDeleteDepartment(dept);
      }
    }
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

  const handleRemoveLogo = () => {
    if (confirm('Remove company logo?')) {
      setCompanyForm(prev => ({ ...prev, logoUrl: '' }));
    }
  };

  const handleToggleRule = (ruleId: string, field: 'hasPayeDefault' | 'hasPensionDefault') => {
    const updated = activeRules.map(r => 
      r.id === ruleId ? { ...r, [field]: !r[field] } : r
    );
    setPvForm(prev => ({ ...prev, employmentTypeRules: updated }));
  };

  // Tax bracket handlers
  const handleAddBracket = () => {
    const newId = `tier_${Date.now()}`;
    const newBracket: TaxBracket = {
      id: newId,
      rate: 0.25,
      upTo: null,
      label: 'Additional Tax Tier'
    };
    setTvForm(prev => ({
      ...prev,
      taxBrackets: [...(prev.taxBrackets || DEFAULT_PAYE_VARIABLES.taxBrackets), newBracket]
    }));
  };

  const handleRemoveBracket = (id: string) => {
    const currentBrackets = tvForm.taxBrackets || DEFAULT_PAYE_VARIABLES.taxBrackets;
    if (currentBrackets.length <= 1) {
      alert('You must have at least one tax bracket');
      return;
    }
    setTvForm(prev => ({
      ...prev,
      taxBrackets: currentBrackets.filter(b => b.id !== id)
    }));
  };

  const handleUpdateBracket = (index: number, updates: Partial<TaxBracket>) => {
    setTvForm(prev => {
      const updated = [...(prev.taxBrackets || DEFAULT_PAYE_VARIABLES.taxBrackets)];
      updated[index] = { ...updated[index], ...updates };
      return { ...prev, taxBrackets: updated };
    });
  };

  // Extra relief condition handlers
  const handleToggleExtraCondition = (condId: string) => {
    setTvForm(prev => {
      const base = prev.extraConditions && prev.extraConditions.length > 0 
        ? prev.extraConditions 
        : DEFAULT_PAYE_VARIABLES.extraConditions;
      const updated = base.map(c =>
        c.id === condId ? { ...c, enabled: !c.enabled } : c
      );
      return { ...prev, extraConditions: updated };
    });
  };

  const handleUpdateExtraConditionAmount = (condId: string, amount: number) => {
    setTvForm(prev => {
      const base = prev.extraConditions && prev.extraConditions.length > 0 
        ? prev.extraConditions 
        : DEFAULT_PAYE_VARIABLES.extraConditions;
      const updated = base.map(c =>
        c.id === condId ? { ...c, amount } : c
      );
      return { ...prev, extraConditions: updated };
    });
  };

  // Custom employment categories
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePaye, setNewTypePaye] = useState(true);
  const [newTypePension, setNewTypePension] = useState(true);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const handleAddEmploymentRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (isWriteDisabled) return;
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    if (activeRules.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) {
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
    const updated = [...activeRules, newRule];
    setPvForm(prev => ({ ...prev, employmentTypeRules: updated }));
    setNewTypeName('');
    setNewTypePaye(true);
    setNewTypePension(true);
    setIsAddingCategory(false);
  };

  const handleDeleteEmploymentRule = (ruleId: string) => {
    if (isWriteDisabled) return;
    const target = activeRules.find(r => r.id === ruleId);
    if (!target) return;
    if (confirm(`Remove the employment type "${target.name}"? Existing employees assigned to this type will retain their current settings.`)) {
      const updated = activeRules.filter(r => r.id !== ruleId);
      setPvForm(prev => ({ ...prev, employmentTypeRules: updated }));
    }
  };

  // Reset all tax and payroll variables to statutory defaults
  const handleResetTaxDefaults = () => {
    if (isWriteDisabled) return;
    if (confirm('Reset all allowance variables and PAYE tax brackets to Nigerian statutory defaults?')) {
      setPvForm(DEFAULT_PAYROLL_VARIABLES);
      setTvForm(DEFAULT_PAYE_VARIABLES);
    }
  };

  const handleExportBackup = () => {
    const payload = {
      exportDate: new Date().toISOString(),
      company: companyForm,
      payrollVariables: pvForm,
      payeTaxVariables: tvForm,
      departments,
      employeeCount: employees.length,
      employees,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PayrollPro_${(companyForm.name || 'Company').replace(/\s+/g, '_')}_Backup_${monthLabel}_${year}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3.5 pb-2 select-none">
      
      {/* ── Offline read-only banner ── */}
      {isReadOnly && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <span className="shrink-0">⚠️</span>
          <span>Offline Mode — Settings are view-only. Reconnect to make changes.</span>
        </div>
      )}
      {/* ── 1. Minimalist Compact Header ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {companyForm.logoUrl ? (
              <div className="w-11 h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center p-0.5">
                <img src={companyForm.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            
            {!isWriteDisabled && (
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs cursor-pointer active:scale-90 transition-transform"
                title="Upload Logo"
              >
                <Upload className="w-2.5 h-2.5" />
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
              {companyForm.name || 'Company Profile'}
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {companyForm.subtitle || 'Organization Settings'}
            </p>
          </div>
        </div>

        {!isWriteDisabled && companyForm.logoUrl && (
          <button
            type="button"
            onClick={handleRemoveLogo}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
            title="Remove Logo"
            aria-label="Remove Logo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── 2. Streamlined 5-Tab Segmented / Scroll Bar ── */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-bold shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span>Profile</span>
          {isProfileDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'payroll'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-bold shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span>Payroll &amp; Tax</span>
          {isPayrollDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />}
          {!isAllowanceValid && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('excel')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'excel'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-bold shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>Excel Sync</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'email'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-bold shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>Email</span>
            {isEmailDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />}
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-bold shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>WhatsApp</span>
            {isWhatsAppDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-bold shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <span>Audit Trail</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            activeTab === 'backup'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-bold shadow-xs'
              : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Backup</span>
        </button>
      </div>

      {/* ── 3. Tab Contents ── */}

      {/* ── TAB 1: Profile & Identity ── */}
      {activeTab === 'profile' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          
          {/* Card 1: Corporate Identity */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <div className="px-3.5 py-2 bg-zinc-50/60 dark:bg-zinc-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Corporate Identity
              </span>
            </div>

            <div className="p-3 flex items-center gap-3">
              <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Legal Entity Name
                </label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Acme Corporation Limited"
                  className="w-full text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="p-3 flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Industry / Subtitle
                </label>
                <input
                  type="text"
                  value={companyForm.subtitle}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="e.g. Education and Educational Services"
                  className="w-full text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="p-3 flex items-start gap-3">
              <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Official Business Address
                </label>
                <textarea
                  rows={2}
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="e.g. 71 Redemption Road, Lagos"
                  className="w-full text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 resize-none placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Contact Information */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <div className="px-3.5 py-2 bg-zinc-50/60 dark:bg-zinc-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Direct Contact
              </span>
            </div>

            <div className="p-3 flex items-center gap-3">
              <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="08012345678"
                  className="w-full text-xs font-medium font-mono text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="p-3 flex items-center gap-3">
              <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Official Email
                </label>
                <input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="hr@company.com"
                  className="w-full text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Departments & Organizational Divisions */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs space-y-3 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Departments &amp; Divisions
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {departments.length} Registered {departments.length === 1 ? 'Department' : 'Departments'}
                </span>
              </div>
            </div>

            {/* Add Department Input */}
            <form onSubmit={handleAddDept} className="flex items-center gap-2">
              <input
                type="text"
                value={newDeptInput}
                onChange={(e) => setNewDeptInput(e.target.value)}
                placeholder="New department name..."
                className="flex-1 h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!newDeptInput.trim()}
                className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-bold text-xs flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* List of Departments */}
            <div className="space-y-1.5 pt-1">
              {departments.length === 0 ? (
                <p className="text-[11px] text-zinc-400 text-center py-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl">
                  No departments created yet. Add one above.
                </p>
              ) : (
                departments.map((dept) => {
                  const assignedCount = employees.filter(
                    e => (e.department || '').toLowerCase() === dept.toLowerCase()
                  ).length;
                  const isEditing = editingDeptName === dept;

                  return (
                    <div
                      key={dept}
                      className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-2"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editingDeptVal}
                            autoFocus
                            onChange={(e) => setEditingDeptVal(e.target.value)}
                            className="flex-1 h-7 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-emerald-500 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditDept(dept)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg cursor-pointer"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDeptName(null)}
                            className="p-1.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {dept}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-zinc-200/60 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 shrink-0">
                              {assignedCount} {assignedCount === 1 ? 'staff' : 'staff'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditDept(dept)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-700 transition cursor-pointer"
                              title="Edit department name"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDept(dept)}
                              className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                              title="Delete department"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ── TAB 2: Payroll & Tax Rules ── */}
      {activeTab === 'payroll' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          
          {/* Section 0: Salary Calculation Mode */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-2.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Salary Calculation Mode
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Choose how employee salaries are interpreted</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPvForm(prev => ({ ...prev, salaryCalculationMode: 'gross-to-net' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  (pvForm.salaryCalculationMode || 'gross-to-net') === 'gross-to-net'
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500/70 text-blue-900 dark:text-blue-100 shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold">Gross to Net</span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    (pvForm.salaryCalculationMode || 'gross-to-net') === 'gross-to-net'
                      ? 'border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-400'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {(pvForm.salaryCalculationMode || 'gross-to-net') === 'gross-to-net' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                </div>
                <p className="text-[9px] text-zinc-400 leading-tight">Standard: deductions subtracted from gross</p>
              </button>

              <button
                type="button"
                onClick={() => setPvForm(prev => ({ ...prev, salaryCalculationMode: 'net-to-gross' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  (pvForm.salaryCalculationMode || 'gross-to-net') === 'net-to-gross'
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-500/70 text-amber-900 dark:text-amber-100 shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold">Net to Gross</span>
                  <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    (pvForm.salaryCalculationMode || 'gross-to-net') === 'net-to-gross'
                      ? 'border-amber-600 bg-amber-600 dark:border-amber-400 dark:bg-amber-400'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {(pvForm.salaryCalculationMode || 'gross-to-net') === 'net-to-gross' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                </div>
                <p className="text-[9px] text-zinc-400 leading-tight">Take-home: gross is back-calculated</p>
              </button>
            </div>
          </div>

          {/* Mid-Month Proration */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Mid-Month Proration
                  </h3>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                    pvForm.prorateMidMonth
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                  }`}>
                    {pvForm.prorateMidMonth ? 'Active' : 'Off'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-tight">
                  Prorate salary for mid-month joiners/leavers based on calendar days worked.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={Boolean(pvForm.prorateMidMonth)}
                  onChange={(e) => setPvForm(prev => ({ ...prev, prorateMidMonth: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          
          {/* Section 1: Salary Allocation Matrix */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Salary Split Matrix
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Sum must equal exactly 100%</p>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                isAllowanceValid
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/70'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/70 animate-pulse'
              }`}>
                {allowanceSum}% / 100%
              </span>
            </div>

            {/* Proportional Color Segment Bar */}
            <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: `${Math.min(100, pvForm.basic)}%` }} className="bg-emerald-500 h-full transition-all" title="Basic" />
              <div style={{ width: `${Math.min(100, pvForm.housing)}%` }} className="bg-indigo-500 h-full transition-all" title="Housing" />
              <div style={{ width: `${Math.min(100, pvForm.transport)}%` }} className="bg-amber-500 h-full transition-all" title="Transport" />
              <div style={{ width: `${Math.min(100, pvForm.otherAllowances)}%` }} className="bg-purple-500 h-full transition-all" title="Other" />
            </div>

            {/* 4 Compact Inputs Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Basic</span>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pvForm.basic}
                    onChange={(e) => setPvForm(prev => ({ ...prev, basic: Number(e.target.value) || 0 }))}
                    className="w-full h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs font-bold text-zinc-400">%</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <span>Housing</span>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pvForm.housing}
                    onChange={(e) => setPvForm(prev => ({ ...prev, housing: Number(e.target.value) || 0 }))}
                    className="w-full h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs font-bold text-zinc-400">%</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span>Transport</span>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pvForm.transport}
                    onChange={(e) => setPvForm(prev => ({ ...prev, transport: Number(e.target.value) || 0 }))}
                    className="w-full h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs font-bold text-zinc-400">%</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <span>Other</span>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pvForm.otherAllowances}
                    onChange={(e) => setPvForm(prev => ({ ...prev, otherAllowances: Number(e.target.value) || 0 }))}
                    className="w-full h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs font-bold text-zinc-400">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Statutory Pension Rates (PRA 2014) */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Pension Reform Act (PRA)
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Statutory monthly remittances</p>
              </div>

              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70">
                {(pvForm.employeePensionRate || 0) + (pvForm.employerPensionRate || 0)}% Total
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block">
                  Employee (Deduction)
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={pvForm.employeePensionRate}
                    onChange={(e) => setPvForm(prev => ({ ...prev, employeePensionRate: Number(e.target.value) || 0 }))}
                    className="w-full h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs font-bold text-zinc-400">%</span>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block">
                  Employer (Company)
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={pvForm.employerPensionRate}
                    onChange={(e) => setPvForm(prev => ({ ...prev, employerPensionRate: Number(e.target.value) || 0 }))}
                    className="w-full h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs font-bold text-zinc-400">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: PITA Tax Relief Parameters & Caps */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                PITA Tax Relief Parameters
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Nigeria Personal Income Tax Act (PITA) statutory reliefs &amp; caps</p>
            </div>

            {/* CRA Base */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                  CRA Base Statutory (₦)
                </span>
                <span className="text-[9px] font-mono text-zinc-400 font-semibold">+20% Gross</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-zinc-400">₦</span>
                <input
                  type="number"
                  value={tvForm.craBase}
                  onChange={(e) => setTvForm(prev => ({ ...prev, craBase: Number(e.target.value) || 0 }))}
                  className="w-full h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <p className="text-[9px] text-zinc-400 leading-tight">
                Higher of ₦{(tvForm.craBase || 200000).toLocaleString()} or 1% of Gross + 20% of Gross.
              </p>
            </div>

            {/* Rent Relief Rate & Cap Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block truncate">
                  Rent Relief Rate
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={Math.round((tvForm.rentReliefRate ?? 0.20) * 100)}
                    onChange={(e) => setTvForm(prev => ({ ...prev, rentReliefRate: (Number(e.target.value) || 0) / 100 }))}
                    className="w-full h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-xs font-bold text-zinc-400">%</span>
                </div>
                <span className="text-[9px] text-zinc-400 mt-0.5 block">Standard 20%</span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block truncate">
                  Rent Max Cap (₦)
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-mono font-bold text-zinc-400">₦</span>
                  <input
                    type="number"
                    value={tvForm.rentReliefCap ?? 500000}
                    onChange={(e) => setTvForm(prev => ({ ...prev, rentReliefCap: Number(e.target.value) || 0 }))}
                    className="w-full h-8 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <span className="text-[9px] text-zinc-400 mt-0.5 block truncate">Max annual relief</span>
              </div>
            </div>

            {/* Extra Statutory Reliefs (Life Assurance, NHF) */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Additional Statutory Tax Reliefs
              </span>

              {(tvForm.extraConditions && tvForm.extraConditions.length > 0 
                ? tvForm.extraConditions 
                : DEFAULT_PAYE_VARIABLES.extraConditions
              ).map((cond) => (
                <div 
                  key={cond.id}
                  className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {cond.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleExtraCondition(cond.id)}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-colors cursor-pointer ${
                        cond.enabled
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/70'
                          : 'bg-zinc-200/60 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      {cond.enabled ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>

                  {cond.enabled && (
                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-200/40 dark:border-zinc-700/40">
                      <span className="text-[10px] text-zinc-400 font-medium shrink-0">Annual Amount (₦):</span>
                      <input
                        type="number"
                        value={cond.amount || ''}
                        placeholder="0"
                        onChange={(e) => handleUpdateExtraConditionAmount(cond.id, Number(e.target.value) || 0)}
                        className="flex-1 h-7 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Progressive PAYE Tax Brackets (Sixth Schedule) */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  PAYE Tax Brackets
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Sixth Schedule sequential tax tiers</p>
              </div>

              <button
                type="button"
                onClick={handleAddBracket}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>Add Tier</span>
              </button>
            </div>

            <div className="space-y-2">
              {(tvForm.taxBrackets || DEFAULT_PAYE_VARIABLES.taxBrackets).map((bracket, index) => (
                <div 
                  key={bracket.id}
                  className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={bracket.label}
                      onChange={(e) => handleUpdateBracket(index, { label: e.target.value })}
                      placeholder="Tier Description (e.g. Next ₦9m)"
                      className="flex-1 bg-transparent text-xs font-bold text-zinc-900 dark:text-zinc-100 border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-emerald-500 focus:outline-none"
                    />

                    {(tvForm.taxBrackets || DEFAULT_PAYE_VARIABLES.taxBrackets).length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBracket(bracket.id)}
                        className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
                        title="Remove bracket tier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200/40 dark:border-zinc-700/40">
                    <div>
                      <span className="text-[9px] font-semibold text-zinc-400 block mb-1">
                        Band Chunk (₦)
                      </span>
                      <input
                        type="number"
                        placeholder="No limit (balance)"
                        value={bracket.upTo === null ? '' : bracket.upTo}
                        onChange={(e) => handleUpdateBracket(index, { upTo: e.target.value === '' ? null : Number(e.target.value) })}
                        className="w-full h-7 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 placeholder:font-normal"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] font-semibold text-zinc-400 block mb-1">
                        Tax Rate (%)
                      </span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={Math.round((bracket.rate || 0) * 100 * 10) / 10}
                          onChange={(e) => handleUpdateBracket(index, { rate: (Number(e.target.value) || 0) / 100 })}
                          className="w-full h-7 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100"
                        />
                        <span className="text-xs font-bold text-zinc-400">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Employment Demarcation Category Rules */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Employment Demarcations
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Statutory PAYE &amp; pension rules per category</p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingCategory ? 'Close' : 'Add'}</span>
              </button>
            </div>

            {/* Add Category Form (Collapsible) */}
            {isAddingCategory && (
              <form onSubmit={handleAddEmploymentRule} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 space-y-2.5">
                <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 block">
                  New Custom Category
                </span>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Category name (e.g. Expatriate, Consultant)..."
                  className="w-full h-8 px-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTypePaye}
                        onChange={(e) => setNewTypePaye(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>PAYE</span>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTypePension}
                        onChange={(e) => setNewTypePension(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Pension</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={!newTypeName.trim()}
                    className="px-3 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-1.5">
              {activeRules.map((rule) => {
                const isCoreType = ['Full-Time', 'Part-Time', 'Contract', 'Intern / NYSC'].includes(rule.name);
                return (
                  <div 
                    key={rule.id}
                    className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                          {rule.name}
                        </span>
                        {isCoreType && (
                          <span className="text-[8px] font-semibold uppercase px-1 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                            Core
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-zinc-400 block truncate">
                        {rule.description || 'Statutory category'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id, 'hasPayeDefault')}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-colors cursor-pointer ${
                          rule.hasPayeDefault
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200/70'
                            : 'bg-zinc-200/60 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border-zinc-300 dark:border-zinc-700'
                        }`}
                        title="Toggle PAYE Tax"
                      >
                        PAYE: {rule.hasPayeDefault ? 'YES' : 'NO'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id, 'hasPensionDefault')}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold border transition-colors cursor-pointer ${
                          rule.hasPensionDefault
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200/70'
                            : 'bg-zinc-200/60 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border-zinc-300 dark:border-zinc-700'
                        }`}
                        title="Toggle Pension"
                      >
                        PEN: {rule.hasPensionDefault ? 'YES' : 'NO'}
                      </button>

                      {!isCoreType && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEmploymentRule(rule.id)}
                          className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition cursor-pointer"
                          title={`Delete ${rule.name}`}
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

          {/* Section 6: Reset to Statutory Defaults Action */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleResetTaxDefaults}
              className="w-full h-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
              <span>Reset to Statutory Defaults</span>
            </button>
          </div>

        </div>
      )}

      {/* ── TAB 3: Excel Integration & Sync ── */}
      {activeTab === 'excel' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          
          {/* Card 1: Export to Excel */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Export to Excel
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Complete registers, statutory schedules, and matrices in .xlsx
                </p>
              </div>
            </div>

            {downloadSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>Workbook exported successfully!</span>
              </div>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleOpenExportModal}
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>Configure &amp; Export Workbook...</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleQuickExportMonth}
                  className="h-10 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{monthLabel} Register</span>
                </button>

                <button
                  type="button"
                  onClick={handleQuickExportYear}
                  className="h-10 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Annual {year} Matrix</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Import Staff Directory */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Import Staff Directory
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Synchronize staff, salaries, bank accounts &amp; designations
                </p>
              </div>
            </div>

            {templateSuccess && (
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-500" />
                <span>Template downloaded successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                type="file"
                ref={excelFileInputRef}
                accept=".xlsx, .xls"
                onChange={handleExcelFileChange}
                className="hidden"
                id="mobile-excel-import-file"
              />
              {!isWriteDisabled && (
                <label
                  htmlFor="mobile-excel-import-file"
                  className="h-10 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 text-center"
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span>Upload File</span>
                </label>
              )}

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="h-10 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 text-center"
              >
                <Download className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                <span>Template (.xlsx)</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 4: Workspace Audit Trail ── */}
      {activeTab === 'audit' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            {/* Header & Count Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Audit Trail
                  </h3>
                  <p className="text-[10px] text-zinc-400">Activity and change ledger</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {filteredLogs.length} Events
                </span>

                <button
                  type="button"
                  onClick={loadAuditLogs}
                  disabled={isLoadingLogs}
                  className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer active:scale-90 transition-transform"
                  title="Refresh Audit Logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin text-emerald-500' : ''}`} />
                </button>

                {filteredLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={exportLogsAsCSV}
                    className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer active:scale-90 transition-transform"
                    title="Export CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 40px Height Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search audit actions, operators..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-9 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition"
              />
              {logSearchQuery && (
                <button
                  type="button"
                  onClick={() => setLogSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Audit Log Entries List */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-950/40">
              {isLoadingLogs ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400 text-xs gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                  <span>Loading audit logs...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-10 px-4 text-center text-zinc-400 text-xs space-y-1">
                  <p className="font-semibold text-zinc-600 dark:text-zinc-300">
                    {logSearchQuery ? 'No matching audit records found.' : 'No audit entries recorded for this workspace yet.'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Salary modifications, payroll locks, and staff changes are logged automatically.
                  </p>
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredLogs.map(log => {
                    const isLockAction = log.action.toLowerCase().includes('lock') || log.action.toLowerCase().includes('approv');
                    const isStaffAction = log.action.toLowerCase().includes('staff') || log.action.toLowerCase().includes('employee');
                    const isSignAction = log.action.toLowerCase().includes('sign') || log.action.toLowerCase().includes('login');
                    
                    const badgeColor = isLockAction
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                      : isStaffAction
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                      : isSignAction
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';

                    return (
                      <div key={log.id} className="p-3 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeColor}`}>
                              {log.action}
                            </span>
                            <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                              {log.actorName || 'System Operator'}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono text-zinc-400 shrink-0 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}, {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {log.details && (
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
                            {log.details}
                          </p>
                        )}

                        {log.ipOrDevice && (
                          <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-400">
                            <span>Device:</span>
                            <span className="truncate">{log.ipOrDevice}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ── TAB 5: Data & Backup / Reset ── */}
      {activeTab === 'backup' && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Data Vault &amp; Backup
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Offline JSON backup &amp; cloud snapshot</p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Encrypted</span>
              </span>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 block font-medium">Enrolled Staff</span>
                <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                  {employees.length}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
                <span className="text-[10px] text-zinc-400 block font-medium">Departments</span>
                <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                  {departments.length}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup</span>
            </button>
          </div>

          {/* Danger Zone: Selective System Reset */}
          {isAdmin && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-rose-200/70 dark:border-rose-900/60 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-rose-100 dark:border-rose-950/60">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                      Selective System Reset
                    </h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Purge employee records or payroll history</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Clear employee directories or monthly payroll history without losing your company tax variables or formulas.
              </p>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="w-full h-10 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Configure System Reset...</span>
              </button>
            </div>
          )}

        </div>
      )}

      {/* ── TAB 4: Email Delivery Configuration ── */}
      {activeTab === 'email' && isAdmin && (
        <div className="space-y-3 animate-in fade-in duration-150">
          
          {/* Unconfigured Alert Banner */}
          {!((emailForm.provider === 'smtp' && Boolean(emailForm.smtp.host && emailForm.smtp.user && emailForm.smtp.pass)) ||
            (emailForm.provider === 'resend' && Boolean(emailForm.resend.apiKey))) && (
            <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <strong className="font-semibold text-amber-900 dark:text-amber-100">Mail Delivery Unconfigured</strong>
            </div>
          )}

          {/* Card 1: Dispatch Provider Architecture */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <div className="px-3.5 py-2 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Delivery Provider
              </span>
              <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                {emailForm.provider === 'smtp' ? 'SMTP Direct' : 'Resend API'}
              </span>
            </div>

            <div className="p-3 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setEmailForm(prev => ({ ...prev, provider: 'smtp' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  emailForm.provider === 'smtp'
                    ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100 shadow-2xs font-bold'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">SMTP Dispatch</span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    emailForm.provider === 'smtp' ? 'border-sky-600 bg-sky-600' : 'border-zinc-400'
                  }`}>
                    {emailForm.provider === 'smtp' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-normal leading-tight">
                  Gmail, Outlook 365, Zoho, or corporate host
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEmailForm(prev => ({ ...prev, provider: 'resend' }))}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  emailForm.provider === 'resend'
                    ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-100 shadow-2xs font-bold'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Resend API</span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    emailForm.provider === 'resend' ? 'border-purple-600 bg-purple-600' : 'border-zinc-400'
                  }`}>
                    {emailForm.provider === 'resend' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-normal leading-tight">
                  Cloud REST API with zero SMTP setup
                </p>
              </button>
            </div>
          </div>

          {/* Card 2: Server Credentials according to Provider */}
          {emailForm.provider === 'smtp' ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/80">
              <div className="px-3.5 py-2 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  SMTP Server Configuration
                </span>
              </div>

              {/* Presets Bar */}
              <div className="p-3 bg-zinc-50/30 dark:bg-zinc-850/30">
                <span className="text-[10px] font-semibold text-zinc-400 block mb-1.5 uppercase tracking-wider">
                  One-Tap Provider Presets
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  {SMTP_PRESETS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setEmailForm(prev => ({
                          ...prev,
                          smtp: {
                            ...prev.smtp,
                            host: p.host || prev.smtp.host,
                            port: p.port,
                            secure: p.secure,
                          }
                        }));
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60 shrink-0 transition active:scale-95 cursor-pointer"
                    >
                      {p.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Host & Port */}
              <div className="p-3 space-y-2">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={emailForm.smtp.host}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, smtp: { ...prev.smtp, host: e.target.value } }))}
                    placeholder="e.g. smtp.gmail.com"
                    className="w-full text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 placeholder:text-zinc-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Port
                    </label>
                    <input
                      type="number"
                      value={emailForm.smtp.port}
                      onChange={(e) => {
                        const newPort = Number(e.target.value);
                        setEmailForm(prev => ({ 
                          ...prev, 
                          smtp: { 
                            ...prev.smtp, 
                            port: newPort,
                            secure: newPort === 465 ? true : (newPort === 587 ? false : prev.smtp.secure)
                          } 
                        }));
                      }}
                      placeholder="465"
                      className="w-full text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Security
                    </label>
                    <label className="flex items-center gap-1.5 mt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={emailForm.smtp.secure}
                        onChange={(e) => {
                          const isSec = e.target.checked;
                          setEmailForm(prev => ({ 
                            ...prev, 
                            smtp: { 
                              ...prev.smtp, 
                              secure: isSec,
                              port: isSec && prev.smtp.port === 587 ? 465 : (!isSec && prev.smtp.port === 465 ? 587 : prev.smtp.port)
                            } 
                          }));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">SSL (Port 465)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Username & Password */}
              <div className="p-3 space-y-2">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Username / Account Email
                  </label>
                  <input
                    type="text"
                    value={emailForm.smtp.user}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, smtp: { ...prev.smtp, user: e.target.value } }))}
                    placeholder="e.g. payroll@yourcompany.com"
                    className="w-full text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 placeholder:text-zinc-400"
                  />
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Password / App Password
                  </label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type={showSmtpPassword ? 'text' : 'password'}
                      value={emailForm.smtp.pass}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, smtp: { ...prev.smtp, pass: e.target.value } }))}
                      placeholder="16-character app password"
                      className="w-full text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none placeholder:text-zinc-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer shrink-0"
                    >
                      {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sender Details */}
              <div className="p-3 space-y-2">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={emailForm.smtp.fromName}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, smtp: { ...prev.smtp, fromName: e.target.value } }))}
                    placeholder="e.g. Acme Payroll Department"
                    className="w-full text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 placeholder:text-zinc-400"
                  />
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Sender From Email
                  </label>
                  <input
                    type="email"
                    value={emailForm.smtp.fromEmail}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, smtp: { ...prev.smtp, fromEmail: e.target.value } }))}
                    placeholder="e.g. payroll@yourcompany.com"
                    className="w-full text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 placeholder:text-zinc-400"
                  />
                </div>
              </div>

              {/* Guidance tip */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 text-[11px] text-blue-900 dark:text-blue-200">
                <p>
                  <strong>Tip:</strong> For Gmail or Google Workspace accounts, generate a 16-character <em>App Password</em> in your Google Account Security settings instead of using your primary password.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/80">
              <div className="px-3.5 py-2 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Resend Cloud API Credentials
                </span>
              </div>

              <div className="p-3 space-y-2">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Resend API Key
                  </label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <input
                      type={showResendApiKey ? 'text' : 'password'}
                      value={emailForm.resend.apiKey}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, resend: { ...prev.resend, apiKey: e.target.value } }))}
                      placeholder="re_..."
                      className="w-full text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none placeholder:text-zinc-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResendApiKey(!showResendApiKey)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer shrink-0"
                    >
                      {showResendApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={emailForm.resend.fromName}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, resend: { ...prev.resend, fromName: e.target.value } }))}
                    placeholder="e.g. Acme Payroll"
                    className="w-full text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 placeholder:text-zinc-400"
                  />
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Sender From Email
                  </label>
                  <input
                    type="email"
                    value={emailForm.resend.fromEmail}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, resend: { ...prev.resend, fromEmail: e.target.value } }))}
                    placeholder="e.g. payroll@yourdomain.com"
                    className="w-full text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5 placeholder:text-zinc-400"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 text-[11px] text-purple-900 dark:text-purple-200">
                <p>
                  <strong>Tip:</strong> Get a free API key at <span className="font-mono underline">resend.com</span>. In sandbox mode, use <span className="font-mono">onboarding@resend.dev</span> as sender.
                </p>
              </div>
            </div>
          )}

          {/* Card 3: Template & Attachment Defaults */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <div className="px-3.5 py-2 bg-zinc-50/60 dark:bg-zinc-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Default Template &amp; PDF
              </span>
            </div>

            <div className="p-3 space-y-2">
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Subject Line Template
                </label>
                <input
                  type="text"
                  value={emailForm.defaultSubjectTemplate}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, defaultSubjectTemplate: e.target.value }))}
                  className="w-full text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-transparent outline-none mt-0.5"
                />
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Message Body Template
                  </label>
                  <div className="flex items-center gap-1 overflow-x-auto text-[9px]">
                    {['employeeName', 'netPay', 'month', 'year'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setEmailForm(prev => ({
                            ...prev,
                            defaultBodyTemplate: `${prev.defaultBodyTemplate} {{${t}}}`
                          }));
                        }}
                        className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono"
                      >
                        +{t}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={emailForm.defaultBodyTemplate}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, defaultBodyTemplate: e.target.value }))}
                  className="w-full text-xs font-mono text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-2 border border-zinc-200/60 dark:border-zinc-700/60 outline-none leading-relaxed resize-y"
                />
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={emailForm.attachPdf ?? true}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, attachPdf: e.target.checked }))}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>Attach Official A4 PDF Payslip</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Card 4: Connection Diagnostics & Handshake Test */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <div className="px-3.5 py-2 bg-zinc-50/60 dark:bg-zinc-800/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Connection Diagnostics
              </span>
            </div>

            <div className="p-3 space-y-2.5">
              <p className="text-xs text-zinc-500">
                Perform an instant handshake test to verify mail server reachability and credential authorization.
              </p>

              <button
                type="button"
                onClick={handleTestEmailConnection}
                disabled={isTestingEmail}
                className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-40"
              >
                {isTestingEmail ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Mail Server...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Test Mail Server Connection</span>
                  </>
                )}
              </button>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold block">
                      {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                    </span>
                    <span className="text-[11px] opacity-90 block mt-0.5 leading-relaxed break-words">
                      {testResult.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 5: Direct Save Email Settings Action */}
          <div className="pt-1 pb-4">
            <button
              type="button"
              disabled={isWriteDisabled || !isEmailDirty}
              onClick={() => {
                if (isWriteDisabled) return;
                if (onUpdateEmailSettings) {
                  onUpdateEmailSettings(emailForm);
                  setSavedToast(true);
                  setTimeout(() => setSavedToast(false), 2200);
                }
              }}
              className={`w-full h-11 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer ${
                isEmailDirty
                  ? 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 ring-2 ring-blue-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isEmailDirty ? 'Save Email Settings' : 'Email Settings Saved'}</span>
            </button>
          </div>

        </div>
      )}

      {/* ── TAB 4B: WhatsApp Dispatch Configuration ── */}
      {activeTab === 'whatsapp' && isAdmin && (
        <div className="space-y-3 animate-in fade-in duration-150">
          
          {/* Main Activation Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <div className="px-3.5 py-2.5 bg-zinc-50/60 dark:bg-zinc-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">WhatsApp Dispatch</span>
                  <span className="text-[10px] text-zinc-400">Direct or automated payslip messaging</span>
                </div>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={whatsAppForm.enabled}
                  onChange={(e) => setWhatsAppForm(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {whatsAppForm.enabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            {/* Provider Grid */}
            <div className="p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                Dispatch Method / Provider
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {([
                  { id: 'direct', label: 'Direct wa.me', desc: 'No API, opens app directly' },
                  { id: 'cloud_api', label: 'Meta Cloud API', desc: 'Official WhatsApp Graph API' },
                  { id: 'ultramsg', label: 'UltraMsg Gateway', desc: 'Instance & token gateway' },
                  { id: 'termii', label: 'Termii Nigeria', desc: 'Local SMS/WhatsApp router' },
                ] as const).map(p => {
                  const isSelected = whatsAppForm.provider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setWhatsAppForm(prev => ({ ...prev, provider: p.id }))}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold shadow-2xs'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold leading-tight">{p.label}</span>
                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-400'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-normal leading-tight">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Provider Credentials Card */}
          {whatsAppForm.provider === 'cloud_api' && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 space-y-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Meta Cloud API Credentials
              </span>
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Phone Number ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 104829104820194"
                  value={whatsAppForm.cloudApi?.phoneNumberId || ''}
                  onChange={(e) => setWhatsAppForm(prev => ({
                    ...prev,
                    cloudApi: { ...(prev.cloudApi || { phoneNumberId: '', accessToken: '' }), phoneNumberId: e.target.value }
                  }))}
                  className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Permanent Access Token
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppSecret(prev => !prev)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 flex items-center gap-1"
                  >
                    {showWhatsAppSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showWhatsAppSecret ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showWhatsAppSecret ? 'text' : 'password'}
                  placeholder="EAAG... (System User Bearer Token)"
                  value={whatsAppForm.cloudApi?.accessToken || ''}
                  onChange={(e) => setWhatsAppForm(prev => ({
                    ...prev,
                    cloudApi: { ...(prev.cloudApi || { phoneNumberId: '', accessToken: '' }), accessToken: e.target.value }
                  }))}
                  className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {whatsAppForm.provider === 'ultramsg' && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 space-y-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                UltraMsg Gateway Configuration
              </span>
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Instance ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. instance12345"
                  value={whatsAppForm.ultramsg?.instanceId || ''}
                  onChange={(e) => setWhatsAppForm(prev => ({
                    ...prev,
                    ultramsg: { ...(prev.ultramsg || { instanceId: '', token: '' }), instanceId: e.target.value }
                  }))}
                  className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Token
                </label>
                <input
                  type={showWhatsAppSecret ? 'text' : 'password'}
                  placeholder="UltraMsg Token"
                  value={whatsAppForm.ultramsg?.token || ''}
                  onChange={(e) => setWhatsAppForm(prev => ({
                    ...prev,
                    ultramsg: { ...(prev.ultramsg || { instanceId: '', token: '' }), token: e.target.value }
                  }))}
                  className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {whatsAppForm.provider === 'termii' && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 space-y-3 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Termii Nigeria API Configuration
              </span>
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  API Key
                </label>
                <input
                  type={showWhatsAppSecret ? 'text' : 'password'}
                  placeholder="Termii API Key"
                  value={whatsAppForm.termii?.apiKey || ''}
                  onChange={(e) => setWhatsAppForm(prev => ({
                    ...prev,
                    termii: { ...(prev.termii || { apiKey: '', deviceId: '' }), apiKey: e.target.value }
                  }))}
                  className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Device ID
                </label>
                <input
                  type="text"
                  placeholder="Termii WhatsApp Device ID"
                  value={whatsAppForm.termii?.deviceId || ''}
                  onChange={(e) => setWhatsAppForm(prev => ({
                    ...prev,
                    termii: { ...(prev.termii || { apiKey: '', deviceId: '' }), deviceId: e.target.value }
                  }))}
                  className="w-full h-9 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-mono font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {whatsAppForm.provider === 'direct' && (
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Zero Configuration Needed</span>
                <p className="text-[11px] opacity-85 mt-0.5 leading-relaxed">
                  Direct <code className="bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.5 rounded font-mono">wa.me</code> links open WhatsApp on your phone or desktop with pre-composed payslip text and auto-downloads the PDF voucher.
                </p>
              </div>
            </div>
          )}

          {/* Message Template Editor */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Message Template
              </label>
              <div className="flex items-center gap-1 overflow-x-auto text-[9px]">
                {['employeeName', 'netPay', 'month', 'year', 'companyName'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setWhatsAppForm(prev => ({
                        ...prev,
                        defaultMessageTemplate: `${prev.defaultMessageTemplate} {{${t}}}`
                      }));
                    }}
                    className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    +{t}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={4}
              value={whatsAppForm.defaultMessageTemplate}
              onChange={(e) => setWhatsAppForm(prev => ({ ...prev, defaultMessageTemplate: e.target.value }))}
              className="w-full text-xs font-mono text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-2.5 border border-zinc-200/60 dark:border-zinc-700/60 outline-none leading-relaxed resize-y focus:ring-1 focus:ring-emerald-500"
            />

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={whatsAppForm.includeNetPay}
                  onChange={(e) => setWhatsAppForm(prev => ({ ...prev, includeNetPay: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  Bold & Highlight Net Take-Home in message
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={whatsAppForm.downloadPdfOnDirect}
                  onChange={(e) => setWhatsAppForm(prev => ({ ...prev, downloadPdfOnDirect: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  Auto-download printable payslip file on dispatch
                </span>
              </label>
            </div>
          </div>

          {/* Connection Test */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-3.5 space-y-2.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Connection Diagnostics
            </span>
            <button
              type="button"
              onClick={handleTestWhatsAppConnection}
              disabled={isTestingWhatsApp}
              className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-40"
            >
              {isTestingWhatsApp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Testing WhatsApp Route...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                  <span>Test WhatsApp Connection</span>
                </>
              )}
            </button>

            {whatsAppTestResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                whatsAppTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}>
                {whatsAppTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="font-bold block">
                    {whatsAppTestResult.success ? 'Diagnostics Passed' : 'Configuration Notice'}
                  </span>
                  <span className="text-[11px] opacity-90 block mt-0.5 leading-relaxed break-words">
                    {whatsAppTestResult.message}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Direct Save WhatsApp Settings Action */}
          <div className="pt-1 pb-4">
            <button
              type="button"
              disabled={isWriteDisabled || !isWhatsAppDirty}
              onClick={() => {
                if (isWriteDisabled) return;
                if (onUpdateWhatsAppSettings) {
                  onUpdateWhatsAppSettings(whatsAppForm);
                  setSavedToast(true);
                  setTimeout(() => setSavedToast(false), 2200);
                }
              }}
              className={`w-full h-11 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer ${
                isWhatsAppDirty
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isWhatsAppDirty ? 'Save WhatsApp Settings' : 'WhatsApp Settings Saved'}</span>
            </button>
          </div>

        </div>
      )}

      {/* ── Export Scope Modal ── */}
      {isExportModalOpen && (
        <ExportScopeModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          onConfirm={handleExportConfirm}
          currentMonthLabel={monthLabel}
          currentMonthKey={selectedMonth || 'oct'}
          currentYear={year}
          departments={departments}
          employmentTypeRules={activeRules}
        />
      )}

      {/* ── Excel Staff Import Confirmation Modal ── */}
      {isImportModalOpen && parsedData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-4 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Confirm Staff Import
                  </h3>
                  <p className="text-[10px] text-zinc-400">{parsedData.length} Employee records detected</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importErrors.length > 0 && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Spreadsheet Notices ({importErrors.length}):</span>
                </div>
                <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-90">
                  {importErrors.slice(0, 3).map((err, idx) => (
                    <li key={idx} className="truncate">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Import Mode */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Import Behavior
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    importMode === 'merge'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 font-bold text-emerald-900 dark:text-emerald-200'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="block text-xs font-semibold">Merge &amp; Update</span>
                  <span className="block text-[9px] text-zinc-400 mt-0.5">Keep existing records</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('overwrite')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    importMode === 'overwrite'
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 font-bold text-rose-900 dark:text-rose-200'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <span className="block text-xs font-semibold">Replace All</span>
                  <span className="block text-[9px] text-zinc-400 mt-0.5">Overwrite directory</span>
                </button>
              </div>
            </div>

            {/* Scope */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Fields to Synchronize
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                {(['all', 'salary-only', 'bank-only'] as const).map(sc => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setImportScope(sc)}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      importScope === sc
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {sc === 'all' ? 'All Data' : sc === 'salary-only' ? 'Salary' : 'Bank'}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="flex-1 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Import Staff</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── System Reset Confirmation Modal ── */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#121215] border border-rose-300 dark:border-rose-900 rounded-3xl max-w-sm w-full p-4 space-y-3.5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-rose-100 dark:border-rose-950/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-rose-900 dark:text-rose-100">
                    System Reset Options
                  </h3>
                  <p className="text-[10px] text-zinc-400">Select which data to clear</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">Employee Directory ({employees.length})</span>
                <input
                  type="checkbox"
                  checked={resetOptions.resetEmployees}
                  onChange={(e) => setResetOptions(o => ({ ...o, resetEmployees: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">Payroll Run History ({snapshots.length})</span>
                <input
                  type="checkbox"
                  checked={resetOptions.resetSnapshots}
                  onChange={(e) => setResetOptions(o => ({ ...o, resetSnapshots: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">Reset Tax Variables</span>
                  <span className="text-[10px] text-zinc-400 block">Recommended to leave unchecked</span>
                </div>
                <input
                  type="checkbox"
                  checked={resetOptions.resetVariables}
                  onChange={(e) => setResetOptions(o => ({ ...o, resetVariables: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
              </label>
            </div>

            <div className="pt-1 space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                Type RESET to confirm:
              </label>
              <input
                type="text"
                value={resetConfirmationText}
                onChange={(e) => setResetConfirmationText(e.target.value)}
                placeholder="RESET"
                className="w-full h-10 px-3 bg-zinc-50 dark:bg-zinc-900 border border-rose-300 dark:border-rose-900 rounded-xl text-xs font-mono font-bold text-rose-600 placeholder-zinc-400 text-center tracking-widest focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={resetConfirmationText.trim() !== 'RESET'}
                onClick={handleTriggerReset}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Floating Thumb-Zone Save Bar (Floats Safely Above Bottom Nav) ── */}
      {isAnyDirty && !isWriteDisabled && (
        <div className="fixed bottom-[80px] left-4 right-4 z-50 max-w-md mx-auto p-2.5 px-3 rounded-2xl bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 shadow-2xl backdrop-blur-md border border-zinc-700/60 dark:border-zinc-300/60 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            <span className="text-xs font-medium truncate">Unsaved changes</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDiscardAll}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-800 dark:bg-zinc-200 text-xs font-medium text-zinc-300 dark:text-zinc-700 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 5. Toast Notification ── */}
      {savedToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 shadow-xl animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>Settings saved!</span>
        </div>
      )}

    </div>
  );
};
