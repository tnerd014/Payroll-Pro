import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Calendar, Copy, Check, ChevronDown, Zap, UserPlus, Trash2, User, Wallet, Landmark, ShieldCheck, Info } from 'lucide-react';
import { Employee, SalaryCalculationMode, EmploymentTypeRule } from '../../types';
import { formatNaira, DEFAULT_EMPLOYMENT_TYPE_RULES } from '../../engine/payePensionEngine';
import { NIGERIAN_BANKS, NIGERIAN_PFAS, NIGERIAN_STATES } from '../../constants/banks';
import { DEFAULT_DEPARTMENTS } from '../../store/usePayrollStore';
import { QuickAddForm } from './QuickAddForm';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emp: Omit<Employee, 'id'>) => void;
  onSaveMultiple?: (emps: Omit<Employee, 'id'>[]) => void;
  onDelete?: (id: string) => void;
  editingEmployee?: Employee | null;
  existingEmployees?: Employee[];
  currentYear?: number;
  currentMonth?: string;
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
  onDelete,
  editingEmployee,
  existingEmployees = [],
  currentYear = 2026,
  currentMonth,
  availableDepartments = DEFAULT_DEPARTMENTS,
  salaryCalculationMode = 'gross-to-net',
  employmentTypeRules = DEFAULT_EMPLOYMENT_TYPE_RULES,
  initialTab = 'quick',
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'standard'>(
    editingEmployee ? 'standard' : (initialTab || 'quick')
  );
  const [activeSection, setActiveSection] = useState<'all' | 'identity' | 'compensation' | 'statutory' | 'banking'>('all');

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

  const getNextEmployeeCode = (existing: Employee[] = []) => {
    const existingCodes = new Set(existing.map(e => (e.code || '').trim().toUpperCase()));
    let num = existing.length + 1;
    while (existingCodes.has(`EMP-${String(num).padStart(3, '0')}`)) {
      num++;
    }
    return `EMP-${String(num).padStart(3, '0')}`;
  };

  type EmployeeFormData = Omit<Employee, 'id' | 'monthlyGross' | 'annualRent'> & {
    monthlyGross: number | '';
    annualRent: number | '';
  };

  const [formData, setFormData] = useState<EmployeeFormData>({
    code: editingEmployee?.code || getNextEmployeeCode(existingEmployees),
    firstName: editingEmployee?.firstName || '',
    lastName: editingEmployee?.lastName || '',
    department: editingEmployee?.department || (availableDepartments && availableDepartments.length > 0 ? availableDepartments[0] : DEFAULT_DEPARTMENTS[0] || 'OPERATIONS'),
    position: editingEmployee?.position || 'Staff Specialist',
    employmentType: editingEmployee?.employmentType || 'Full-Time',
    email: editingEmployee?.email || '',
    phone: editingEmployee?.phone || '',
    monthlyGross: editingEmployee?.monthlyGross ?? 350000,
    annualRent: editingEmployee?.annualRent ? editingEmployee.annualRent : '',
    bankName: editingEmployee?.bankName || 'Access Bank',
    accountNumber: editingEmployee?.accountNumber || '',
    hasPension: true,
    hasPaye: true,
    payeNumber: editingEmployee?.payeNumber || '',
    pensionNumber: editingEmployee?.pensionNumber || '',
    pfaName: editingEmployee?.pfaName || '',
    stateOfResidence: editingEmployee?.stateOfResidence || 'Lagos',
    status: editingEmployee?.status || 'Active',
    startDate: editingEmployee?.startDate || '',
    endDate: editingEmployee?.endDate || '',
    originalHireDate: editingEmployee?.originalHireDate || '',
    stints: editingEmployee?.stints || [],
  });

  const [activeYear, setActiveYear] = useState<number>(currentYear || 2026);
  const [monthlySalaries, setMonthlySalaries] = useState<Record<string, number | ''>>(
    editingEmployee?.monthlySalaries || {}
  );
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState<boolean>(false);
  const [showSalaryInfo, setShowSalaryInfo] = useState<boolean>(false);
  const [showRentInfo, setShowRentInfo] = useState<boolean>(false);
  const [annualRents, setAnnualRents] = useState<Record<string | number, number | ''>>(
    editingEmployee?.annualRents || {}
  );

  const setYearRent = (year: number, val: string | number) => {
    setAnnualRents(prev => ({
      ...prev,
      [year]: val === '' ? '' : Number(val),
    }));
  };

  const handleEmploymentTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      employmentType: type,
      hasPaye: true,
      hasPension: true,
    }));
  };

  const deptOptions = useMemo(() => {
    const base = (availableDepartments && availableDepartments.length > 0)
      ? availableDepartments
      : DEFAULT_DEPARTMENTS;
    const fromEmployees = (existingEmployees || []).map(e => e.department).filter(Boolean) as string[];
    const current = formData.department ? [formData.department] : [];
    
    const map = new Map<string, string>();
    [...base, ...fromEmployees, ...current].forEach(d => {
      const trimmed = d?.trim();
      if (trimmed && !map.has(trimmed.toUpperCase())) {
        map.set(trimmed.toUpperCase(), trimmed);
      }
    });
    return Array.from(map.values());
  }, [availableDepartments, existingEmployees, formData.department]);

  const selectedDepartment = useMemo(() => {
    return deptOptions.find(
      d => d.toLowerCase() === (formData.department || '').toLowerCase()
    ) || formData.department || deptOptions[0] || 'OPERATIONS';
  }, [deptOptions, formData.department]);

  // Track the employee ID and open-state that were last used to initialise the form.
  // We intentionally do NOT track the full editingEmployee object because cloud-sync
  // re-renders create a new object reference on every store update, which would
  // reset any in-progress edits (e.g. a typed email) back to the stored value.
  const lastInitIdRef = useRef<string | null>(null);
  const lastInitOpenRef = useRef<boolean>(false);

  useEffect(() => {
    const currentId = editingEmployee?.id ?? null;
    const openChanged = isOpen !== lastInitOpenRef.current;
    const idChanged = currentId !== lastInitIdRef.current;

    // Only re-initialise when:
    //  a) The modal just opened (closed → open transition), OR
    //  b) A different employee was selected (ID changed)
    // Never re-initialise just because the store re-rendered a new object reference
    // for the same employee while the form is already open — that's what was
    // silently reverting the email field.
    const shouldInit = (openChanged && isOpen) || (isOpen && idChanged);
    if (!shouldInit) return;

    lastInitIdRef.current = currentId;
    lastInitOpenRef.current = isOpen;

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
        monthlyGross: editingEmployee.monthlyGross ?? '',
        annualRent: editingEmployee.annualRent ? editingEmployee.annualRent : '',
        bankName: editingEmployee.bankName,
        accountNumber: editingEmployee.accountNumber,
        hasPension: true,
        hasPaye: true,
        payeNumber: editingEmployee.payeNumber || '',
        pensionNumber: editingEmployee.pensionNumber || '',
        pfaName: editingEmployee.pfaName || '',
        stateOfResidence: editingEmployee.stateOfResidence || 'Lagos',
        status: editingEmployee.status || 'Active',
        startDate: editingEmployee.startDate || '',
        endDate: editingEmployee.endDate || '',
        originalHireDate: editingEmployee.originalHireDate || '',
        stints: editingEmployee.stints || [],
      });
      setMonthlySalaries(editingEmployee.monthlySalaries || {});
      setAnnualRents(editingEmployee.annualRents || {});
      const hasCustom = !!(
        (editingEmployee.monthlySalaries && Object.keys(editingEmployee.monthlySalaries).length > 0) ||
        (editingEmployee.annualRents && Object.keys(editingEmployee.annualRents).length > 0)
      );
      setShowMonthlyBreakdown(hasCustom);
    } else {
      const defaultRule = activeRules.find(r => r.name === 'Full-Time') || activeRules[0];
      setFormData({
        code: getNextEmployeeCode(existingEmployees),
        firstName: '',
        lastName: '',
        department: (availableDepartments && availableDepartments.length > 0 ? availableDepartments[0] : DEFAULT_DEPARTMENTS[0] || 'OPERATIONS'),
        position: 'Staff Specialist',
        employmentType: defaultRule?.name || 'Full-Time',
        email: '',
        phone: '',
        monthlyGross: 350000,
        annualRent: '',
        bankName: 'Access Bank',
        accountNumber: '',
        hasPension: true,
        hasPaye: true,
        payeNumber: '',
        pensionNumber: '',
        pfaName: '',
        stateOfResidence: 'Lagos',
        status: 'Active',
        startDate: '',
        endDate: '',
        originalHireDate: '',
        stints: [],
      });
      setMonthlySalaries({});
      setAnnualRents({});
      setShowMonthlyBreakdown(false);
    }
    setActiveYear(currentYear || 2026);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingEmployee?.id, isOpen, currentYear]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Retrieve gross salary for a specific month in activeYear
  const getMonthGross = (mKey: string): number => {
    const key = `${activeYear}-${mKey}`;
    if (monthlySalaries[key] !== undefined && monthlySalaries[key] !== '') {
      return Number(monthlySalaries[key]) || 0;
    }
    if (monthlySalaries[mKey] !== undefined && monthlySalaries[mKey] !== '') {
      return Number(monthlySalaries[mKey]) || 0;
    }
    return Number(formData.monthlyGross) || 0;
  };

  // Update gross salary for a specific month in activeYear
  const setMonthGross = (mKey: string, val: string | number) => {
    const key = `${activeYear}-${mKey}`;
    setMonthlySalaries(prev => ({
      ...prev,
      [key]: val === '' ? '' : Number(val),
    }));
  };

  // Copy base contractual gross to all 12 months of activeYear
  const handleCopyBaseToAllMonths = () => {
    const updated = { ...monthlySalaries };
    const baseVal = Number(formData.monthlyGross) || 0;
    MONTHS_LIST.forEach(m => {
      updated[`${activeYear}-${m.key}`] = baseVal;
    });
    setMonthlySalaries(updated);
    setCopyFeedback(`Copied ₦${formatNaira(baseVal)} to all 12 months (${activeYear})`);
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

  // Copy base contractual gross from current month through December
  const handleCopyBaseFromCurrentMonth = () => {
    if (!currentMonth) return;
    const currentMonthIdx = MONTHS_LIST.findIndex(m => m.key.toLowerCase() === currentMonth.toLowerCase());
    if (currentMonthIdx === -1) return;

    const updated = { ...monthlySalaries };
    const baseVal = Number(formData.monthlyGross) || 0;
    MONTHS_LIST.forEach((m, idx) => {
      if (idx >= currentMonthIdx) {
        updated[`${activeYear}-${m.key}`] = baseVal;
      }
    });
    setMonthlySalaries(updated);
    const startLabel = MONTHS_LIST[currentMonthIdx].label;
    setCopyFeedback(`Applied ₦${formatNaira(baseVal)} from ${startLabel} to Dec (${activeYear})`);
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
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setActiveSection('identity');
      return;
    }

    const cleanMonthlySalaries: Record<string, number> = {};
    Object.entries(monthlySalaries).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && !isNaN(Number(v))) {
        cleanMonthlySalaries[k] = Number(v);
      }
    });

    const cleanAnnualRents: Record<string, number> = {};
    Object.entries(annualRents).forEach(([k, v]) => {
      if (v !== '' && v !== undefined && !isNaN(Number(v))) {
        cleanAnnualRents[String(k)] = Number(v);
      }
    });

    // Synchronize stints so payroll engine isEmployeeActiveForPeriod stays in sync
    let updatedStints = formData.stints && Array.isArray(formData.stints) ? [...formData.stints] : [];
    if (updatedStints.length > 0) {
      const openIdx = updatedStints.findIndex(s => !s.endDate);
      const targetIdx = openIdx >= 0 ? openIdx : updatedStints.length - 1;
      if (targetIdx >= 0) {
        updatedStints[targetIdx] = {
          ...updatedStints[targetIdx],
          startDate: formData.startDate || updatedStints[targetIdx].startDate || '',
          endDate: formData.endDate || undefined,
        };
      }
    } else if (formData.startDate || formData.endDate) {
      updatedStints = [{
        stintId: `stint-${Date.now()}`,
        startDate: formData.startDate || '',
        endDate: formData.endDate || undefined,
      }];
    }

    onSave({
      ...formData,
      hasPension: true,
      hasPaye: true,
      status: formData.status || (formData.endDate ? 'Inactive' : 'Active'),
      stints: updatedStints,
      monthlyGross: Math.max(0, Number(formData.monthlyGross) || 0),
      annualRent: Math.max(0, Number(formData.annualRent) || 0),
      annualRents: cleanAnnualRents,
      monthlySalaries: cleanMonthlySalaries,
    });
    onClose();
  };

  const baseYear = Math.max(new Date().getFullYear(), currentYear || 0, activeYear || 0);
  const yearsOptions = [baseYear - 2, baseYear - 1, baseYear, baseYear + 1, baseYear + 2];

  return (
    <div className="fixed top-9 inset-x-0 bottom-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden select-none">
      <div className={`bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full ${
        activeTab === 'quick' && !editingEmployee ? 'max-w-4xl' : 'max-w-2xl'
      } overflow-hidden shadow-2xl flex flex-col max-h-[calc(100vh-4.5rem)] transition-all duration-150`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {editingEmployee ? 'Edit Staff Profile' : 'Add Employee'}
              </span>
              {editingEmployee && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
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

        {/* Section Segmented Navigation for Detailed Form */}
        {(activeTab === 'standard' || editingEmployee) && (
          <div className="flex items-center gap-1.5 px-5 py-2 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 shrink-0 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1 shrink-0">
              Section:
            </span>
            {[
              { id: 'all', label: 'All Sections' },
              { id: 'identity', label: 'Identity & Role', icon: User },
              { id: 'compensation', label: 'Compensation', icon: Wallet },
              { id: 'statutory', label: 'Statutory & Tax', icon: ShieldCheck },
              { id: 'banking', label: 'Banking', icon: Landmark },
            ].map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id as any)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs border border-zinc-200/80 dark:border-zinc-700/80 font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3 text-zinc-400" />}
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </div>
        )}

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
            <div className={activeSection === 'all' || activeSection === 'identity' ? 'bg-zinc-50/40 dark:bg-zinc-900/30 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-4 space-y-3' : 'hidden'}>
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <User className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Employee Information
                </h3>
              </div>
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
                  <select 
                    value={selectedDepartment} 
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-medium cursor-pointer"
                    required
                  >
                    {deptOptions.map(dept => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
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
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Employment Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e => {
                      const newStatus = e.target.value as 'Active' | 'Inactive';
                      setFormData(prev => ({
                        ...prev,
                        status: newStatus,
                        endDate: newStatus === 'Active' ? '' : prev.endDate,
                      }));
                    }}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-medium cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="sm:col-span-2 grid grid-cols-2 gap-2">
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

                <div className="sm:col-span-2 grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/40">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Start Date (Hire Date)
                    </label>
                    <input 
                      type="date" 
                      value={formData.startDate || ''} 
                      onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      End Date (Exit Date)
                    </label>
                    <input 
                      type="date" 
                      value={formData.endDate || ''} 
                      onChange={e => {
                        const newEnd = e.target.value;
                        setFormData(prev => ({ 
                          ...prev, 
                          endDate: newEnd,
                          status: newEnd ? 'Inactive' : 'Active'
                        }));
                      }}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    />
                  </div>
                </div>

                {formData.endDate ? (
                  <p className="sm:col-span-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-md leading-relaxed">
                    💡 <strong>Payroll Rule:</strong> Staff is paid in their exit month and automatically excluded from all subsequent pay runs.
                  </p>
                ) : null}

                {formData.stints && formData.stints.length > 0 && (
                  <div className="sm:col-span-2 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 rounded-lg p-2.5 text-[11px]">
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Employment Tenure History ({formData.stints.length} {formData.stints.length === 1 ? 'stint' : 'stints'})
                    </div>
                    <div className="space-y-1">
                      {formData.stints.map((st, idx) => (
                        <div key={st.stintId || idx} className="text-zinc-500 dark:text-zinc-400 flex items-center justify-between text-[11px]">
                          <span>Stint #{idx + 1}: {st.startDate || '—'} → {st.endDate || 'Active'}</span>
                          {st.exitReason && <span className="text-zinc-400">({st.exitReason})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Compensation & Rent Relief */}
            <div className={activeSection === 'all' || activeSection === 'compensation' ? 'bg-zinc-50/40 dark:bg-zinc-900/30 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-4 space-y-3' : 'hidden'}>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Compensation &amp; Rent Relief
                  </h3>
                </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                {/* Backdrop for Tooltips */}
                {(showSalaryInfo || showRentInfo) && (
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => {
                      setShowSalaryInfo(false);
                      setShowRentInfo(false);
                    }} 
                  />
                )}

                {/* Field 1: Monthly Gross Salary */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        {salaryCalculationMode === 'net-to-gross' 
                          ? 'Target Monthly Net Pay (Take-Home ₦)' 
                          : 'Base Monthly Gross Salary (₦)'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSalaryInfo(prev => !prev);
                          setShowRentInfo(false);
                        }}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Click for information on monthly pay & schedule"
                        aria-label="Monthly pay information"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input 
                    type="number" 
                    value={formData.monthlyGross} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        monthlyGross: val === '' ? '' : Number(val),
                      }));
                    }}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    step="any"
                    min="0"
                    placeholder="e.g. 350000"
                    required
                  />

                  {/* Tooltip Popover for Base Monthly Gross Salary */}
                  {showSalaryInfo && (
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-80 max-w-[90vw] p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          <Info className="w-3.5 h-3.5 text-blue-500" />
                          <span>Monthly Pay &amp; Schedule Guide</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setShowSalaryInfo(false)}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-2 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        <p>
                          <strong className="text-zinc-800 dark:text-zinc-200">Base Contractual Pay:</strong> This is the default gross salary. In <em>Bulk Add</em>, this figure automatically copies across all months and years.
                        </p>
                        <p>
                          <strong className="text-zinc-800 dark:text-zinc-200">Editing in Current Month:</strong> When editing an existing employee during the year (such as {currentMonth ? currentMonth.toUpperCase() : 'Sep'} {activeYear}):
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-[10.5px]">
                          <li>
                            Use <strong className="text-zinc-800 dark:text-zinc-200">Copy Base to All</strong> to apply this salary to all 12 months.
                          </li>
                          <li>
                            Or use the <strong className="text-zinc-800 dark:text-zinc-200">12-Month Schedule</strong> below to edit specific months (e.g. from current month through Dec), preserving previous months' historical figures.
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Field 2: Annual Rent Paid by Staff */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        Annual Rent Paid by Staff (₦)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRentInfo(prev => !prev);
                          setShowSalaryInfo(false);
                        }}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Click for information on Annual Rent & CRA Relief"
                        aria-label="Annual rent information"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input 
                    type="number" 
                    value={formData.annualRent} 
                    onChange={e => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        annualRent: val === '' ? '' : Number(val),
                      }));
                    }}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    step="any"
                    min="0"
                    placeholder="0"
                  />

                  {/* Tooltip Popover for Annual Rent */}
                  {showRentInfo && (
                    <div className="absolute right-0 top-full mt-1.5 z-50 w-80 max-w-[90vw] p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          <Info className="w-3.5 h-3.5 text-blue-500" />
                          <span>Annual Rent &amp; Tax Relief Guide</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setShowRentInfo(false)}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="space-y-2 text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        <p>
                          <strong className="text-zinc-800 dark:text-zinc-200">20% Statutory Rent Relief:</strong> Under Nigerian tax laws, staff qualify for 20% tax-free relief on actual annual rent paid (capped at ₦500,000 / year) within their Consolidated Relief Allowance (CRA).
                        </p>
                        <p>
                          <strong className="text-zinc-800 dark:text-zinc-200">Yearly Rent per Tax Year:</strong> Rent paid can differ each year. You can set the default annual rent here, or expand the <strong className="text-zinc-700 dark:text-zinc-300">12-Month Schedule</strong> below to set specific rents for different years (e.g. 2025 vs 2026).
                        </p>
                        <p className="text-[10.5px] text-zinc-500 italic">
                          If staff pays no rent or does not provide a rent receipt, enter 0.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable 12-Month Schedule */}
              {showMonthlyBreakdown && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3 animate-in fade-in duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
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

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleCopyBaseToAllMonths}
                        className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium transition cursor-pointer"
                      >
                        Copy Base to All
                      </button>
                      {currentMonth && activeYear === (currentYear || 2026) && (
                        <button
                          type="button"
                          onClick={handleCopyBaseFromCurrentMonth}
                          className="text-[11px] px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium transition cursor-pointer"
                          title={`Apply base salary starting from ${currentMonth.toUpperCase()} through Dec ${activeYear}`}
                        >
                          Copy Base {currentMonth.toUpperCase()}–Dec
                        </button>
                      )}
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
                      const isCurrentPayPeriod = Boolean(
                        currentMonth &&
                        m.key.toLowerCase() === currentMonth.toLowerCase() &&
                        activeYear === (currentYear || 2026)
                      );

                      return (
                        <div 
                          key={m.key} 
                          className={`p-1.5 rounded-lg border transition ${
                            isCurrentPayPeriod
                              ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400/50'
                              : isCustom 
                              ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' 
                              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-0.5">
                            <span className={`text-[11px] font-medium ${isCurrentPayPeriod ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                              {m.label}
                            </span>
                            {isCurrentPayPeriod ? (
                              <span className="text-[9px] font-bold uppercase tracking-tight text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-1 py-0.2 rounded">
                                Current
                              </span>
                            ) : isCustom ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Custom" />
                            ) : null}
                          </div>
                          <input
                            type="number"
                            value={
                              monthlySalaries[`${activeYear}-${m.key}`] !== undefined
                                ? monthlySalaries[`${activeYear}-${m.key}`]
                                : formData.monthlyGross
                            }
                            onChange={e => setMonthGross(m.key, e.target.value)}
                            className="w-full bg-transparent font-mono text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                            step="any"
                            min="0"
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Key Metrics Strip (Consistently styled matching app cards) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="bg-white dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-3 shadow-xs">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-0.5">
                        {activeYear} Annual Gross
                      </span>
                      <span className="text-xs sm:text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 truncate block">
                        {formatNaira(yearAnnualTotal)}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-3 shadow-xs">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-0.5">
                        {activeYear} Annual Rent
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs font-semibold text-zinc-400 shrink-0">₦</span>
                        <input
                          type="number"
                          value={
                            annualRents[activeYear] !== undefined
                              ? annualRents[activeYear]
                              : (formData.annualRent !== '' ? formData.annualRent : '')
                          }
                          onChange={e => setYearRent(activeYear, e.target.value)}
                          placeholder={String(formData.annualRent || '0')}
                          className="w-full min-w-0 bg-transparent font-mono text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                          step="any"
                          min="0"
                          title={`Annual Rent for ${activeYear}`}
                        />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-950/80 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-3 shadow-xs">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block mb-0.5">
                        Monthly Average
                      </span>
                      <span className="text-xs sm:text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 truncate block">
                        {formatNaira(yearAnnualTotal / 12)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Statutory Deductions & Registration Numbers */}
            <div className={activeSection === 'all' || activeSection === 'statutory' ? 'bg-zinc-50/40 dark:bg-zinc-900/30 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-4 space-y-3' : 'hidden'}>
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Statutory Deductions &amp; Credentials
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-zinc-400">
                  {formData.employmentType || 'Full-Time'}
                </span>
              </div>

              {/* No Toggles - Statutory Mandate */}
              <div className="flex flex-wrap items-center gap-2.5 py-1 text-xs">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium select-none">
                  <Check className="w-3.5 h-3.5" />
                  <span>Pension (8% Staff / 10% Employer)</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 font-medium select-none">
                  <Check className="w-3.5 h-3.5" />
                  <span>PAYE Income Tax</span>
                </div>
              </div>

              {/* Registration Identification Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                <div>
                  <label 
                    className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1 h-4 leading-4 truncate"
                    title="State of Residence for State PAYE Tax remittance"
                  >
                    State of Residence
                  </label>
                  <select
                    value={formData.stateOfResidence || 'Lagos'}
                    onChange={e => setFormData({ ...formData, stateOfResidence: e.target.value })}
                    className="w-full h-[34px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-medium cursor-pointer"
                  >
                    {NIGERIAN_STATES.map(st => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label 
                    className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1 h-4 leading-4 truncate"
                    title="Tax Identification Number / State PAYE No"
                  >
                    Tax ID / State PAYE
                  </label>
                  <input 
                    type="text" 
                    value={formData.payeNumber} 
                    onChange={e => setFormData({ ...formData, payeNumber: e.target.value })}
                    className="w-full h-[34px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="e.g. PAYE-LAS-..."
                  />
                </div>

                <div>
                  <label 
                    className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1 h-4 leading-4 truncate"
                    title="Pension Retirement Savings Account PIN"
                  >
                    Pension RSA PIN
                  </label>
                  <input 
                    type="text" 
                    value={formData.pensionNumber} 
                    onChange={e => setFormData({ ...formData, pensionNumber: e.target.value })}
                    className="w-full h-[34px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 font-mono text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                    placeholder="e.g. PEN100..."
                  />
                </div>

                <div>
                  <label 
                    className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1 h-4 leading-4 truncate"
                    title="Pension Fund Administrator (PFA)"
                  >
                    Pension PFA Name
                  </label>
                  <input 
                    type="text" 
                    list="nigerian-pfas-datalist"
                    value={formData.pfaName} 
                    onChange={e => setFormData({ ...formData, pfaName: e.target.value })}
                    className="w-full h-[34px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
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
            <div className={activeSection === 'all' || activeSection === 'banking' ? 'bg-zinc-50/40 dark:bg-zinc-900/30 border border-zinc-200/70 dark:border-zinc-800/70 rounded-xl p-4 space-y-3' : 'hidden'}>
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
                <Landmark className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Bank &amp; Remittance Details
                </h3>
              </div>
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
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Fixed Bottom Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 shrink-0">
            <div className="flex items-center gap-2">
              {editingEmployee && onDelete ? (
                <button 
                  type="button" 
                  onClick={() => {
                    if (confirm(`Are you sure you want to permanently delete employee ${editingEmployee.firstName} ${editingEmployee.lastName} (${editingEmployee.code})?`)) {
                      onDelete(editingEmployee.id);
                      onClose();
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Delete this employee record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Staff</span>
                </button>
              ) : (
                <div className="text-[11px] text-zinc-400">
                  <span className="font-mono text-zinc-500 dark:text-zinc-400">[{formData.code}]</span> &bull; New employee entry
                </div>
              )}
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
