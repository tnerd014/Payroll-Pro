import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar, Copy, Check, ChevronDown, Zap, UserPlus } from 'lucide-react';
import { Employee, SalaryCalculationMode, EmploymentTypeRule } from '../../types';
import { formatNaira, DEFAULT_EMPLOYMENT_TYPE_RULES } from '../../engine/payePensionEngine';
import { NIGERIAN_BANKS, NIGERIAN_PFAS } from '../../constants/banks';
import { DEFAULT_DEPARTMENTS } from '../../store/usePayrollStore';
import { QuickAddForm } from './QuickAddForm';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emp: Omit<Employee, 'id'>) => void;
  onSaveMultiple?: (emps: Omit<Employee, 'id'>[]) => void;
  editingEmployee?: Employee | null;
  existingEmployees?: Employee[];
  currentYear?: number;
  availableDepartments?: string[];
  salaryCalculationMode?: SalaryCalculationMode;
  employmentTypeRules?: EmploymentTypeRule[];
  initialTab?: 'quick' | 'standard';
}

const MONTHS_LIST = [
  { key: 'jan', label: 'Jan', fullLabel: 'January' },
  { key: 'feb', label: 'Feb', fullLabel: 'February' },
  { key: 'mar', label: 'Mar', fullLabel: 'March' },
  { key: 'apr', label: 'Apr', fullLabel: 'April' },
  { key: 'may', label: 'May', fullLabel: 'May' },
  { key: 'jun', label: 'Jun', fullLabel: 'June' },
  { key: 'jul', label: 'Jul', fullLabel: 'July' },
  { key: 'aug', label: 'Aug', fullLabel: 'August' },
  { key: 'sep', label: 'Sep', fullLabel: 'September' },
  { key: 'oct', label: 'Oct', fullLabel: 'October' },
  { key: 'nov', label: 'Nov', fullLabel: 'November' },
  { key: 'dec', label: 'Dec', fullLabel: 'December' },
];

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveMultiple,
  editingEmployee,
  existingEmployees = [],
  currentYear = 2026,
  availableDepartments = DEFAULT_DEPARTMENTS,
  salaryCalculationMode = 'gross-to-net',
  employmentTypeRules = DEFAULT_EMPLOYMENT_TYPE_RULES,
  initialTab = 'quick',
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'standard'>(
    editingEmployee ? 'standard' : (initialTab || 'quick')
  );

  useEffect(() => {
    if (editingEmployee) {
      setActiveTab('standard');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [editingEmployee, initialTab, isOpen]);

  const handleSaveMultiple = (emps: Omit<Employee, 'id'>[]) => {
    if (onSaveMultiple) {
      onSaveMultiple(emps);
    } else {
      emps.forEach(emp => onSave(emp));
    }
    onClose();
  };

  const activeRules = employmentTypeRules && employmentTypeRules.length > 0
    ? employmentTypeRules
    : DEFAULT_EMPLOYMENT_TYPE_RULES;

  const [formData, setFormData] = useState<Omit<Employee, 'id'>>({
    code: editingEmployee?.code || `EMP-${Math.floor(100 + Math.random() * 900)}`,
    firstName: editingEmployee?.firstName || '',
    lastName: editingEmployee?.lastName || '',
    department: editingEmployee?.department || 'Operations',
    position: editingEmployee?.position || 'Staff Specialist',
    employmentType: editingEmployee?.employmentType || 'Full-Time',
    email: editingEmployee?.email || '',
    phone: editingEmployee?.phone || '',
    monthlyGross: editingEmployee?.monthlyGross || 350000,
    annualRent: editingEmployee?.annualRent || 0,
    bankName: editingEmployee?.bankName || 'Access Bank',
    accountNumber: editingEmployee?.accountNumber || '',
    hasPension: editingEmployee?.hasPension ?? true,
    hasPaye: editingEmployee?.hasPaye ?? true,
    payeNumber: editingEmployee?.payeNumber || '',
    pensionNumber: editingEmployee?.pensionNumber || '',
    pfaName: editingEmployee?.pfaName || '',
    status: editingEmployee?.status || 'Active',
  });

  const [activeYear, setActiveYear] = useState<number>(currentYear || 2026);
  const [monthlySalaries, setMonthlySalaries] = useState<Record<string, number>>(
    editingEmployee?.monthlySalaries || {}
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState<boolean>(false);

  const handleEmploymentTypeChange = (type: string) => {
    const matched = activeRules.find(r => r.name.toLowerCase() === type.toLowerCase());
    setFormData(prev => ({
      ...prev,
      employmentType: type,
      hasPaye: matched ? matched.hasPayeDefault : prev.hasPaye,
      hasPension: matched ? matched.hasPensionDefault : prev.hasPension,
    }));
  };

  // Sync state whenever editingEmployee or isOpen changes
  useEffect(() => {
    if (editingEmployee) {
      setFormData({
        code: editingEmployee.code,
        firstName: editingEmployee.firstName,
        lastName: editingEmployee.lastName,
        department: editingEmployee.department,
        position: editingEmployee.position,
        employmentType: editingEmployee.employmentType || 'Full-Time',
        email: editingEmployee.email,
        phone: editingEmployee.phone,
        monthlyGross: editingEmployee.monthlyGross,
        annualRent: editingEmployee.annualRent,
        bankName: editingEmployee.bankName,
        accountNumber: editingEmployee.accountNumber,
        hasPension: editingEmployee.hasPension,
        hasPaye: editingEmployee.hasPaye,
        payeNumber: editingEmployee.payeNumber || '',
        pensionNumber: editingEmployee.pensionNumber || '',
        pfaName: editingEmployee.pfaName || '',
        status: editingEmployee.status,
      });
      setMonthlySalaries(editingEmployee.monthlySalaries || {});
      const hasCustom = !!(editingEmployee.monthlySalaries && Object.keys(editingEmployee.monthlySalaries).length > 0);
      setShowMonthlyBreakdown(hasCustom);
    } else {
      const defaultRule = activeRules.find(r => r.name === 'Full-Time') || activeRules[0];
      setFormData({
        code: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        firstName: '',
        lastName: '',
        department: 'Operations',
        position: 'Staff Specialist',
        employmentType: defaultRule?.name || 'Full-Time',
        email: '',
        phone: '',
        monthlyGross: 350000,
        annualRent: 0,
        bankName: 'Access Bank',
        accountNumber: '',
        hasPension: defaultRule ? defaultRule.hasPensionDefault : true,
        hasPaye: defaultRule ? defaultRule.hasPayeDefault : true,
        payeNumber: '',
        pensionNumber: '',
        pfaName: '',
        status: 'Active',
      });
      setMonthlySalaries({});
      setShowMonthlyBreakdown(false);
    }
    setActiveYear(currentYear || 2026);
  }, [editingEmployee, isOpen, currentYear, activeRules]);

  // Retrieve gross salary for a specific month in activeYear
  const getMonthGross = (mKey: string): number => {
    const key = `${activeYear}-${mKey}`;
    if (monthlySalaries[key] !== undefined) {
      return monthlySalaries[key];
    }
    if (monthlySalaries[mKey] !== undefined) {
      return monthlySalaries[mKey];
    }
    return formData.monthlyGross;
  };

  // Update gross salary for a specific month in activeYear
  const setMonthGross = (mKey: string, val: number) => {
    const key = `${activeYear}-${mKey}`;
    setMonthlySalaries(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  // Copy base contractual gross to all 12 months of activeYear
  const handleCopyBaseToAllMonths = () => {
    const updated = { ...monthlySalaries };
    MONTHS_LIST.forEach(m => {
      updated[`${activeYear}-${m.key}`] = formData.monthlyGross;
    });
    setMonthlySalaries(updated);
    setCopyFeedback(`Copied ₦${formatNaira(formData.monthlyGross)} to all 12 months (${activeYear})`);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Copy January salary to all remaining months of activeYear
  const handleCopyJanToAllMonths = () => {
    const janVal = getMonthGross('jan');
    const updated = { ...monthlySalaries };
    MONTHS_LIST.forEach(m => {
      updated[`${activeYear}-${m.key}`] = janVal;
    });
    setMonthlySalaries(updated);
    setFormData(prev => ({ ...prev, monthlyGross: janVal }));
    setCopyFeedback(`Applied Jan value (₦${formatNaira(janVal)}) to Jan–Dec ${activeYear}`);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Calculate annual sum for activeYear (hook called unconditionally)
  const yearAnnualTotal = useMemo(() => {
    return MONTHS_LIST.reduce((sum, m) => sum + getMonthGross(m.key), 0);
  }, [activeYear, monthlySalaries, formData.monthlyGross]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      monthlySalaries,
    });
    onClose();
  };

  const yearsOptions = [2024, 2025, 2026, 2027, 2028];

  return (
    <div className="fixed top-9 inset-x-0 bottom-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className={`bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full ${
        activeTab === 'quick' && !editingEmployee ? 'max-w-4xl' : 'max-w-2xl'
      } overflow-hidden shadow-2xl my-6 flex flex-col max-h-[90vh] transition-all duration-150`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {editingEmployee ? 'Edit Staff Profile' : 'Add Employee'}
              </span>
              {editingEmployee && (
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                  {formData.code}
                </span>
              )}
            </div>

            {!editingEmployee && (
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('quick')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'quick'
                      ? 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Quick Add (Multiple)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('standard')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === 'standard'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Detailed Form</span>
                </button>
              </div>
            )}
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeTab === 'quick' && !editingEmployee ? (
          <QuickAddForm
            existingEmployees={existingEmployees}
            availableDepartments={availableDepartments}
            employmentTypeRules={employmentTypeRules}
            onSaveMultiple={handleSaveMultiple}
            onCancel={onClose}
            onSwitchToStandard={() => setActiveTab('standard')}
          />
        ) : (
          /* Form Container */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          
          {/* Scrollable Form Body */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
          
            {/* Section 1: Employee Details */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Employee Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    First Name
                  </label>
                  <input 
                    type="text" 
                    value={formData.firstName} 
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Last Name
                  </label>
                  <input 
                    type="text" 
                    value={formData.lastName} 
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="Last name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Department
                  </label>
                  <input 
                    type="text" 
                    list="employee-departments-datalist"
                    value={formData.department} 
                    onChange={e => setFormData({ ...formData, department: e.target.value.toUpperCase() })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="Select or type department..."
                    required
                  />
                  <datalist id="employee-departments-datalist">
                    {availableDepartments.map(dept => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Job Title
                  </label>
                  <input 
                    type="text" 
                    value={formData.position} 
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="e.g. Senior Specialist"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={formData.employmentType || 'Full-Time'}
                    onChange={e => handleEmploymentTypeChange(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-medium cursor-pointer"
                  >
                    {activeRules.map(rule => (
                      <option key={rule.id} value={rule.name}>
                        {rule.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Email
                    </label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                      placeholder="name@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Phone
                    </label>
                    <input 
                      type="tel" 
                      value={formData.phone} 
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                      placeholder="080..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Compensation & Rent Relief */}
            <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Compensation &amp; Rent Relief
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{showMonthlyBreakdown ? 'Hide 12-Month Schedule' : '12-Month Breakdown'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showMonthlyBreakdown ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    {salaryCalculationMode === 'net-to-gross' 
                      ? 'Target Monthly Net Pay (Take-Home ₦)' 
                      : 'Base Monthly Gross Salary (₦)'}
                  </label>
                  <input 
                    type="number" 
                    value={formData.monthlyGross} 
                    onChange={e => setFormData({ ...formData, monthlyGross: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    min="0"
                    step="1000"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      Annual Rent Paid by Staff (₦)
                    </label>
                    <span className="text-[10px] text-zinc-400">20% CRA relief</span>
                  </div>
                  <input 
                    type="number" 
                    value={formData.annualRent} 
                    onChange={e => setFormData({ ...formData, annualRent: Number(e.target.value) })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    min="0"
                    step="5000"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Expandable 12-Month Schedule */}
              {showMonthlyBreakdown && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Year {activeYear} Schedule
                      </span>
                      <select
                        value={activeYear}
                        onChange={e => setActiveYear(Number(e.target.value))}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-[11px] font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                      >
                        {yearsOptions.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyBaseToAllMonths}
                        className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium transition cursor-pointer"
                      >
                        Copy Base to All
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyJanToAllMonths}
                        className="text-[11px] px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                      >
                        Copy Jan to All
                      </button>
                    </div>
                  </div>

                  {copyFeedback && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
                      <Check className="w-3 h-3" />
                      <span>{copyFeedback}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {MONTHS_LIST.map((m) => {
                      const currentVal = getMonthGross(m.key);
                      const isCustom = monthlySalaries[`${activeYear}-${m.key}`] !== undefined && 
                                       monthlySalaries[`${activeYear}-${m.key}`] !== formData.monthlyGross;

                      return (
                        <div 
                          key={m.key} 
                          className={`p-1.5 rounded-lg border transition ${
                            isCustom 
                              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' 
                              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                              {m.label}
                            </span>
                            {isCustom && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Custom" />
                            )}
                          </div>
                          <input
                            type="number"
                            value={currentVal}
                            onChange={e => setMonthGross(m.key, Number(e.target.value))}
                            className="w-full bg-transparent font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                            min="0"
                            step="1000"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[11px] text-zinc-500 flex justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                    <span>Annual Total: <strong className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{formatNaira(yearAnnualTotal)}</strong></span>
                    <span>Monthly Avg: <strong className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{formatNaira(yearAnnualTotal / 12)}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Statutory Deductions & Registration Numbers */}
            <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Statutory Deductions &amp; Credentials
                </h3>
                <span className="text-[10px] font-mono text-zinc-400">
                  {formData.employmentType || 'Full-Time'}
                </span>
              </div>

              {/* Minimalist Checkbox Toggles */}
              <div className="flex items-center gap-5 py-0.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={formData.hasPension}
                    onChange={e => setFormData({ ...formData, hasPension: e.target.checked })}
                    className="w-4 h-4 rounded text-zinc-900 dark:text-zinc-100 focus:ring-0 cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                  <span className="text-zinc-800 dark:text-zinc-200 font-medium">Pension (8% / 10%)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={formData.hasPaye}
                    onChange={e => setFormData({ ...formData, hasPaye: e.target.checked })}
                    className="w-4 h-4 rounded text-zinc-900 dark:text-zinc-100 focus:ring-0 cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                  />
                  <span className="text-zinc-800 dark:text-zinc-200 font-medium">PAYE Income Tax</span>
                </label>
              </div>

              {/* Registration Identification Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Tax ID / State PAYE
                  </label>
                  <input 
                    type="text" 
                    value={formData.payeNumber} 
                    onChange={e => setFormData({ ...formData, payeNumber: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="e.g. PAYE-LAS-..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Pension RSA PIN
                  </label>
                  <input 
                    type="text" 
                    value={formData.pensionNumber} 
                    onChange={e => setFormData({ ...formData, pensionNumber: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="e.g. PEN100..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Pension Administrator (PFA)
                  </label>
                  <input 
                    type="text" 
                    list="nigerian-pfas-datalist"
                    value={formData.pfaName} 
                    onChange={e => setFormData({ ...formData, pfaName: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="Select PFA..."
                  />
                  <datalist id="nigerian-pfas-datalist">
                    {NIGERIAN_PFAS.map(pfa => (
                      <option key={pfa} value={pfa} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Section 4: Bank Details */}
            <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/60">
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Bank &amp; Remittance Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Bank Name
                  </label>
                  <input 
                    type="text" 
                    list="nigerian-banks-datalist"
                    value={formData.bankName} 
                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="Select or type bank..."
                    required
                  />
                  <datalist id="nigerian-banks-datalist">
                    {NIGERIAN_BANKS.map(bank => (
                      <option key={bank} value={bank} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Account Number (NUBAN)
                  </label>
                  <input 
                    type="text" 
                    value={formData.accountNumber} 
                    onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="10-digit NUBAN"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Fixed Bottom Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 shrink-0">
            <div className="text-[11px] text-zinc-400">
              <span className="font-mono text-zinc-500 dark:text-zinc-400">[{formData.code}]</span> &bull; {editingEmployee ? 'Updating staff profile' : 'New employee entry'}
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-xs cursor-pointer"
              >
                {editingEmployee ? 'Save Changes' : 'Create Employee'}
              </button>
            </div>
          </div>

        </form>
        )}
      </div>
    </div>
  );
};
