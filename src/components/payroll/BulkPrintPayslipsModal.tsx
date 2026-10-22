import React, { useState, useMemo } from 'react';
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
  ChevronDown
} from 'lucide-react';
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
  PayslipColumnDef
} from '../../types';
import { formatNaira, DEFAULT_PAYROLL_VARIABLES, DEFAULT_PAYE_VARIABLES } from '../../engine/payePensionEngine';
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

  // Initialize selection when opened
  React.useEffect(() => {
    if (isOpen && safeItems.length > 0) {
      const allIds = safeItems.map(i => i.employeeId);
      setSelectedEmployees(allIds);
      if (!previewEmployeeId || !allIds.includes(previewEmployeeId)) {
        setPreviewEmployeeId(allIds[0] || '');
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

  if (!isOpen) return null;

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
    if (selectedItems.length <= 1) return;
    const nextIdx = (previewIndex + 1) % selectedItems.length;
    scrollToVoucher(selectedItems[nextIdx].employeeId);
  };

  const goToPrevPreview = () => {
    if (selectedItems.length <= 1) return;
    const prevIdx = (previewIndex - 1 + selectedItems.length) % selectedItems.length;
    scrollToVoucher(selectedItems[prevIdx].employeeId);
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
    <div className="fixed top-9 inset-x-0 bottom-0 z-50 bg-zinc-100 dark:bg-[#09090b] flex flex-col select-none print:top-0 print:inset-0">
      
      {/* Top Application Header Bar */}
      <div className="no-print h-12 bg-white dark:bg-[#121215] border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-between text-zinc-900 dark:text-zinc-100 shrink-0">
        
        {/* Left: Back Button, Title & Count */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            title="Back to Payroll (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-500" />
            <h2 className="text-xs font-semibold tracking-tight">
              Print Payslips &bull; <span className="text-zinc-500 font-normal">{monthLabel} {year}</span>
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono">
            {selectedEmployees.length} of {safeItems.length} selected
          </span>
        </div>

        {/* Center: Live Preview Paging Controls */}
        {selectedItems.length > 0 && currentPreviewItem && (
          <div className="hidden md:flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 rounded-md text-xs">
            <button
              onClick={goToPrevPreview}
              disabled={selectedItems.length <= 1}
              className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Previous Voucher"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
              Voucher {previewIndex >= 0 ? previewIndex + 1 : 1} of {selectedItems.length}:
              <strong className="ml-1 text-zinc-900 dark:text-zinc-100">{currentPreviewItem.fullName}</strong>
            </span>
            <button
              onClick={goToNextPreview}
              disabled={selectedItems.length <= 1}
              className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Next Voucher"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Theme Selector Dropdown */}
          <PayslipThemeSelector
            currentConfig={config}
            savedPresets={savedPresets}
            onSelectTheme={onUpdatePayslipDesign || (() => {})}
          />

          {/* Design Layout Sub-page Trigger */}
          <button
            type="button"
            onClick={() => setIsDesignerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-md text-xs font-medium transition shadow-xs cursor-pointer"
            title="Design and customize payslip layout, theme & headers"
          >
            <Palette className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Design Layout</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={selectedEmployees.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-xs font-medium transition shadow-xs"
            title="Send all selected vouchers to printer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print {selectedEmployees.length} Voucher{selectedEmployees.length === 1 ? '' : 's'}</span>
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
          {selectedItems.length === 0 ? (
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
            <div className="w-full max-w-3xl flex flex-col items-center gap-8 print:gap-0 print:max-w-none">
              {selectedItems.map((item, index) => (
                <div 
                  key={item.employeeId} 
                  id={`voucher-${item.employeeId}`}
                  className="w-full flex flex-col items-center print-page scroll-mt-6"
                >
                  {/* On-screen employee indicator when multiple are selected */}
                  {selectedItems.length > 1 && (
                    <div className="no-print w-full flex items-center justify-between px-3 py-1.5 mb-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-200/60 dark:bg-zinc-800/60 rounded border border-zinc-300/40 dark:border-zinc-700/50">
                      <span>Payslip {index + 1} of {selectedItems.length} &bull; <strong className="text-zinc-800 dark:text-zinc-200 font-sans">{item.fullName}</strong></span>
                      <span className="text-[10px] uppercase tracking-wider">{item.employeeCode} &bull; {item.department}</span>
                    </div>
                  )}

                  <div className="w-full shadow-xs print:shadow-none bg-white rounded-lg">
                    <CustomizablePayslipView
                      item={item}
                      company={company}
                      monthLabel={monthLabel}
                      year={year}
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

      </div>

    </div>,
    document.body
  );
};
