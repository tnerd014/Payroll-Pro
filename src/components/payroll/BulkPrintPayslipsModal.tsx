import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Sliders, 
  Users, 
  RotateCcw 
} from 'lucide-react';
import { CalculatedPayrollItem, CompanyProfile } from '../../types';
import { formatNaira } from '../../engine/payePensionEngine';

interface BulkPrintPayslipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CalculatedPayrollItem[];
  monthLabel: string;
  year: number;
  company: CompanyProfile;
}

interface ColumnDef {
  id: string;
  label: string;
  category: 'info' | 'earnings' | 'deductions' | 'summary';
  description?: string;
  defaultChecked: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  // Employee Information
  { id: 'employee_name', label: 'Employee Name', category: 'info', defaultChecked: true },
  { id: 'staff_code', label: 'Staff Code / ID', category: 'info', defaultChecked: true },
  { id: 'department', label: 'Department', category: 'info', defaultChecked: true },
  { id: 'position', label: 'Job Role / Designation', category: 'info', defaultChecked: true },
  { id: 'bank_name', label: 'Bank Name', category: 'info', defaultChecked: true },
  { id: 'account_number', label: 'Account Number', category: 'info', defaultChecked: true },
  { id: 'tax_id', label: 'PAYE / Tax ID No', category: 'info', defaultChecked: true },
  { id: 'pension_rsa', label: 'Pension RSA PIN & PFA', category: 'info', defaultChecked: true },
  { id: 'pay_period', label: 'Pay Period Header', category: 'info', defaultChecked: true },

  // Earnings
  { id: 'basic_salary', label: 'Basic Salary', category: 'earnings', defaultChecked: true },
  { id: 'housing', label: 'Housing Allowance', category: 'earnings', defaultChecked: true },
  { id: 'transport', label: 'Transport Allowance', category: 'earnings', defaultChecked: true },
  { id: 'other_allowances', label: 'Other Allowances', category: 'earnings', defaultChecked: true },
  { id: 'gross_pay', label: 'Total Gross Earnings', category: 'earnings', defaultChecked: true },

  // Deductions
  { id: 'paye_tax', label: 'PAYE Income Tax', category: 'deductions', defaultChecked: true },
  { id: 'employee_pension', label: 'Employee Pension (8%)', category: 'deductions', defaultChecked: true },
  { id: 'total_deductions', label: 'Total Deductions', category: 'deductions', defaultChecked: true },

  // Summary & Contributions
  { id: 'net_pay', label: 'Net Take-Home Pay', category: 'summary', defaultChecked: true },
  { id: 'employer_pension', label: 'Employer Pension & Total Emolument', category: 'summary', defaultChecked: true },
  { id: 'company_address', label: 'Company Address & Contact', category: 'summary', defaultChecked: true },
  { id: 'signatures', label: 'Signatures / Approval Block', category: 'summary', defaultChecked: false },
];

const DEFAULT_COLUMNS = ALL_COLUMNS.filter(c => c.defaultChecked).map(c => c.id);

// Standalone Printable Payslip Voucher
interface VoucherProps {
  item: CalculatedPayrollItem;
  monthLabel: string;
  year: number;
  company: CompanyProfile;
  isCol: (id: string) => boolean;
}

const PayslipVoucher: React.FC<VoucherProps> = ({ item, monthLabel, year, company, isCol }) => {
  const hasMetaFields = 
    isCol('employee_name') || 
    isCol('staff_code') || 
    isCol('department') || 
    isCol('position') || 
    isCol('bank_name') || 
    isCol('account_number') ||
    isCol('tax_id') ||
    isCol('pension_rsa');

  const hasEarnings = 
    isCol('basic_salary') || 
    isCol('housing') || 
    isCol('transport') || 
    isCol('other_allowances') || 
    isCol('gross_pay');

  const hasDeductions = 
    isCol('paye_tax') || 
    isCol('employee_pension') || 
    isCol('total_deductions');

  const hasEmployer = isCol('employer_pension');

  return (
    <div className="w-full max-w-2xl bg-white text-zinc-900 rounded-lg shadow-xs p-7 border border-zinc-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-xs">
      
      {/* Company Header */}
      <div className="text-center space-y-1 pb-4 border-b border-zinc-200 mb-5">
        {company.logoUrl ? (
          <img src={company.logoUrl} alt="Logo" className="h-10 w-auto object-contain mx-auto mb-1.5" />
        ) : (
          <div className="w-8 h-8 rounded border border-zinc-200 flex items-center justify-center font-bold text-xs mx-auto mb-1.5 text-zinc-800">
            ⚡
          </div>
        )}
        <h1 className="text-base font-bold tracking-tight text-zinc-900 uppercase">
          {company.name}
        </h1>
        {company.subtitle && (
          <p className="text-[11px] text-zinc-500">{company.subtitle}</p>
        )}
        {isCol('company_address') && (
          <p className="text-[10px] text-zinc-400">
            {[company.address, company.phone, company.email].filter(Boolean).join(' • ')}
          </p>
        )}
        {isCol('pay_period') && (
          <p className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider pt-1">
            Payslip Voucher &ndash; {monthLabel} {year}
          </p>
        )}
      </div>

      {/* Employee Metadata Info Grid */}
      {hasMetaFields && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 bg-zinc-50/70 p-3.5 rounded border border-zinc-200/80 mb-5">
          {isCol('employee_name') && (
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Employee</span>
              <span className="font-semibold text-zinc-900 block truncate">{item.fullName}</span>
            </div>
          )}
          {isCol('staff_code') && (
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Staff ID</span>
              <span className="font-mono text-zinc-800 block">{item.employeeCode}</span>
            </div>
          )}
          {isCol('department') && (
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Department</span>
              <span className="text-zinc-800 block truncate">{item.department}</span>
            </div>
          )}
          {isCol('position') && (
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Role</span>
              <span className="text-zinc-800 block truncate">{item.position}</span>
            </div>
          )}
          {isCol('bank_name') && (
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Bank</span>
              <span className="text-zinc-800 block truncate">{item.bankName || '-'}</span>
            </div>
          )}
          {isCol('account_number') && (
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Account No</span>
              <span className="font-mono text-zinc-800 block">{item.accountNumber || '-'}</span>
            </div>
          )}
          {isCol('tax_id') && (
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">PAYE / Tax ID</span>
              <span className="font-mono text-zinc-800 block truncate">{item.payeNumber || '-'}</span>
            </div>
          )}
          {isCol('pension_rsa') && (
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Pension RSA PIN</span>
              <span className="font-mono text-zinc-800 block truncate" title={item.pfaName || 'Standard RSA'}>
                {item.pensionNumber || '-'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Earnings & Deductions Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        
        {/* Earnings */}
        {hasEarnings && (
          <div className="border border-zinc-200 rounded p-3">
            <div className="flex justify-between items-center text-xs font-semibold text-zinc-900 border-b border-zinc-200 pb-1.5 mb-2">
              <span className="uppercase tracking-wider text-[11px]">Earnings</span>
              <span className="text-[11px]">Amount (₦)</span>
            </div>
            <div className="space-y-1.5">
              {isCol('basic_salary') && (
                <div className="flex justify-between text-zinc-600">
                  <span>Basic Salary</span>
                  <span className="font-mono text-zinc-900">{formatNaira(item.basic)}</span>
                </div>
              )}
              {isCol('housing') && (
                <div className="flex justify-between text-zinc-600">
                  <span>Housing Allowance</span>
                  <span className="font-mono text-zinc-900">{formatNaira(item.housing)}</span>
                </div>
              )}
              {isCol('transport') && (
                <div className="flex justify-between text-zinc-600">
                  <span>Transport Allowance</span>
                  <span className="font-mono text-zinc-900">{formatNaira(item.transport)}</span>
                </div>
              )}
              {isCol('other_allowances') && (
                <div className="flex justify-between text-zinc-600">
                  <span>Other Allowances</span>
                  <span className="font-mono text-zinc-900">{formatNaira(item.otherAllowances)}</span>
                </div>
              )}
              {isCol('gross_pay') && (
                <div className="flex justify-between font-semibold text-zinc-900 pt-1.5 border-t border-zinc-200">
                  <span>Total Gross Earnings</span>
                  <span className="font-mono">{formatNaira(item.monthlyGross)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Deductions */}
        {hasDeductions && (
          <div className="border border-zinc-200 rounded p-3">
            <div className="flex justify-between items-center text-xs font-semibold text-zinc-900 border-b border-zinc-200 pb-1.5 mb-2">
              <span className="uppercase tracking-wider text-[11px]">Statutory Deductions</span>
              <span className="text-[11px]">Amount (₦)</span>
            </div>
            <div className="space-y-1.5">
              {isCol('paye_tax') && (
                <div className="flex justify-between text-zinc-600">
                  <span>PAYE Income Tax</span>
                  <span className="font-mono text-zinc-900">
                    {item.monthlyPaye > 0 ? `-${formatNaira(item.monthlyPaye)}` : '₦0.00'}
                  </span>
                </div>
              )}
              {isCol('employee_pension') && (
                <div className="flex justify-between text-zinc-600">
                  <span>Employee Pension (8%)</span>
                  <span className="font-mono text-zinc-900">
                    {item.employeePension > 0 ? `-${formatNaira(item.employeePension)}` : '₦0.00'}
                  </span>
                </div>
              )}
              {isCol('total_deductions') && (
                <div className="flex justify-between font-semibold text-zinc-900 pt-1.5 border-t border-zinc-200">
                  <span>Total Deductions</span>
                  <span className="font-mono">-{formatNaira(item.totalDeductions)}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Net Take-Home Pay Box */}
      {isCol('net_pay') && (
        <div className="bg-zinc-50 border border-zinc-200 rounded p-3.5 flex justify-between items-center mb-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block">
              Net Take-Home Pay
            </span>
            <span className="text-[10px] text-zinc-400">Disbursement amount into bank account</span>
          </div>
          <span className="text-base sm:text-lg font-bold text-zinc-900 font-mono">
            {formatNaira(item.netTakeHome)}
          </span>
        </div>
      )}

      {/* Employer Contributions & Emolument Info */}
      {hasEmployer && (
        <div className="bg-zinc-50/50 rounded p-2.5 border border-zinc-200 text-[11px] text-zinc-500 flex justify-between items-center mb-5">
          <div>
            <span>Employer Statutory Pension (10%): </span>
            <strong className="font-mono text-zinc-800">{formatNaira(item.employerPension)}</strong>
          </div>
          <div>
            <span>Total Emolument: </span>
            <strong className="font-mono text-zinc-800">{formatNaira(item.employerTotalCost || (item.monthlyGross + item.employerPension))}</strong>
          </div>
        </div>
      )}

      {/* Signatures */}
      {isCol('signatures') && (
        <div className="grid grid-cols-2 gap-8 pt-6 border-t border-zinc-200 text-[10px] text-zinc-400">
          <div className="text-center">
            <div className="border-b border-zinc-300 pb-1 mb-1"></div>
            <span>Authorized Payroll Signatory</span>
          </div>
          <div className="text-center">
            <div className="border-b border-zinc-300 pb-1 mb-1"></div>
            <span>Employee Signature / Acknowledgement</span>
          </div>
        </div>
      )}

    </div>
  );
};

export const BulkPrintPayslipsModal: React.FC<BulkPrintPayslipsModalProps> = ({
  isOpen,
  onClose,
  items,
  monthLabel,
  year,
  company,
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'columns'>('employees');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [previewEmployeeId, setPreviewEmployeeId] = useState<string>('');
  
  // Filters for staff directory
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const safeItems = useMemo(() => (Array.isArray(items) ? items.filter(Boolean) : []), [items]);

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

  const isCol = (id: string) => selectedColumns.includes(id);

  const toggleColumn = (id: string) => {
    if (selectedColumns.includes(id)) {
      setSelectedColumns(selectedColumns.filter(c => c !== id));
    } else {
      setSelectedColumns([...selectedColumns, id]);
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

  return (
    <div className="fixed top-9 inset-x-0 bottom-0 z-40 bg-zinc-100 dark:bg-[#09090b] flex flex-col select-none print:top-0 print:inset-0">
      
      {/* Top Application Header Bar */}
      <div className="no-print h-12 bg-white dark:bg-[#121215] border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-between text-zinc-900 dark:text-zinc-100 shrink-0">
        
        {/* Left: Title & Count */}
        <div className="flex items-center gap-3">
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
          <button
            onClick={handlePrint}
            disabled={selectedEmployees.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-xs font-medium transition shadow-xs"
            title="Send all selected vouchers to printer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print {selectedEmployees.length} Voucher{selectedEmployees.length === 1 ? '' : 's'}</span>
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Main Split Window */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Control Sidebar */}
        <aside className="no-print w-80 bg-white dark:bg-[#121215] border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0 text-zinc-700 dark:text-zinc-300">
          
          {/* Tab Navigation: Staff Selection vs Columns */}
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
              onClick={() => setActiveTab('columns')}
              className={`py-2.5 flex items-center justify-center gap-2 border-b-2 transition ${
                activeTab === 'columns'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-zinc-50/50 dark:bg-zinc-800/40'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Columns ({selectedColumns.length})</span>
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
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
                  />
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

          {/* TAB 2: COLUMNS CUSTOMIZATION */}
          {activeTab === 'columns' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Column Quick Actions */}
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 uppercase tracking-wider font-semibold text-[10px]">
                  Payslip Fields
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedColumns(ALL_COLUMNS.map(c => c.id))}
                    className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                  >
                    All
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <button
                    onClick={() => setSelectedColumns(DEFAULT_COLUMNS)}
                    className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline flex items-center gap-1"
                    title="Reset to recommended defaults"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset</span>
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <button
                    onClick={() => setSelectedColumns([])}
                    className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Grouped Columns List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
                
                {/* Employee Info */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Employee Information
                  </h4>
                  <div className="space-y-1">
                    {ALL_COLUMNS.filter(c => c.category === 'info').map(col => (
                      <label 
                        key={col.id} 
                        className="flex items-center gap-2 py-1 px-1.5 rounded cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                      >
                        <input
                          type="checkbox"
                          checked={isCol(col.id)}
                          onChange={() => toggleColumn(col.id)}
                          className="w-3.5 h-3.5 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Earnings */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Earnings Components
                  </h4>
                  <div className="space-y-1">
                    {ALL_COLUMNS.filter(c => c.category === 'earnings').map(col => (
                      <label 
                        key={col.id} 
                        className="flex items-center gap-2 py-1 px-1.5 rounded cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                      >
                        <input
                          type="checkbox"
                          checked={isCol(col.id)}
                          onChange={() => toggleColumn(col.id)}
                          className="w-3.5 h-3.5 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Statutory Deductions & Taxes
                  </h4>
                  <div className="space-y-1">
                    {ALL_COLUMNS.filter(c => c.category === 'deductions').map(col => (
                      <label 
                        key={col.id} 
                        className="flex items-center gap-2 py-1 px-1.5 rounded cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                      >
                        <input
                          type="checkbox"
                          checked={isCol(col.id)}
                          onChange={() => toggleColumn(col.id)}
                          className="w-3.5 h-3.5 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Summary & Employer */}
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Summary &amp; Signatures
                  </h4>
                  <div className="space-y-1">
                    {ALL_COLUMNS.filter(c => c.category === 'summary').map(col => (
                      <label 
                        key={col.id} 
                        className="flex items-center gap-2 py-1 px-1.5 rounded cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
                      >
                        <input
                          type="checkbox"
                          checked={isCol(col.id)}
                          onChange={() => toggleColumn(col.id)}
                          className="w-3.5 h-3.5 rounded text-zinc-900 dark:text-zinc-100 accent-zinc-900 dark:accent-zinc-100 cursor-pointer"
                        />
                        <span>{col.label}</span>
                      </label>
                    ))}
                  </div>
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
            <div className="w-full max-w-2xl flex flex-col items-center gap-8 print:gap-0 print:max-w-none">
              {selectedItems.map((item, index) => (
                <div 
                  key={item.employeeId} 
                  id={`voucher-${item.employeeId}`}
                  className="w-full flex flex-col items-center print-page scroll-mt-6"
                >
                  {/* On-screen employee indicator when multiple are selected */}
                  {selectedItems.length > 1 && (
                    <div className="no-print w-full flex items-center justify-between px-2 py-1 mb-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-200/50 dark:bg-zinc-800/50 rounded">
                      <span>Payslip {index + 1} of {selectedItems.length} &bull; <strong className="text-zinc-800 dark:text-zinc-200 font-sans">{item.fullName}</strong></span>
                      <span className="text-[10px] uppercase tracking-wider">{item.employeeCode}</span>
                    </div>
                  )}

                  <PayslipVoucher
                    item={item}
                    monthLabel={monthLabel}
                    year={year}
                    company={company}
                    isCol={isCol}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
