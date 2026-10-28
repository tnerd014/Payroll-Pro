import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserPlus, 
  User, 
  Banknote, 
  Landmark, 
  ShieldCheck, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Layers, 
  Sparkles, 
  Clipboard,
  Phone,
  Mail,
  Building2,
  Briefcase,
  Calendar
} from 'lucide-react';
import { Employee, EmploymentTypeRule } from '../../types';
import { formatNaira, DEFAULT_EMPLOYMENT_TYPE_RULES } from '../../engine/payePensionEngine';
import { NIGERIAN_BANKS, NIGERIAN_PFAS, NIGERIAN_STATES } from '../../constants/banks';
import { DEFAULT_DEPARTMENTS } from '../../store/usePayrollStore';
import { MobileBottomSheet } from './MobileBottomSheet';
import { parseFullName, parseSalaryNumber, generateNextEmployeeCodes } from '../employees/QuickAddForm';

interface MobileEmployeeFormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emp: Omit<Employee, 'id'>) => void;
  onSaveMultiple?: (emps: Omit<Employee, 'id'>[]) => void;
  editingEmployee?: Employee | null;
  existingEmployees?: Employee[];
  availableDepartments?: string[];
  employmentTypeRules?: EmploymentTypeRule[];
  currentYear?: number;
}

interface BatchRow {
  id: string;
  fullName: string;
  monthlySalary: string;
  department: string;
  employmentType: string;
}

export const MobileEmployeeFormSheet: React.FC<MobileEmployeeFormSheetProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveMultiple,
  editingEmployee,
  existingEmployees = [],
  availableDepartments = DEFAULT_DEPARTMENTS,
  employmentTypeRules = DEFAULT_EMPLOYMENT_TYPE_RULES,
  currentYear = 2026,
}) => {
  const isEditing = Boolean(editingEmployee);

  // Mode: Single Add (Standard) vs Quick Batch
  const [activeMode, setActiveMode] = useState<'single' | 'batch'>('single');

  // Active statutory rules
  const activeRules = employmentTypeRules && employmentTypeRules.length > 0
    ? employmentTypeRules
    : DEFAULT_EMPLOYMENT_TYPE_RULES;

  // Clean department options
  const deptOptions = useMemo(() => {
    const base = availableDepartments && availableDepartments.length > 0
      ? availableDepartments
      : DEFAULT_DEPARTMENTS;
    const fromEmployees = existingEmployees.map(e => e.department).filter(Boolean);
    const set = new Set([...base, ...fromEmployees].filter(Boolean));
    return Array.from(set);
  }, [availableDepartments, existingEmployees]);

  const defaultDept = deptOptions[0] || 'OPERATIONS';

  // ── Single Employee State ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');
  const [department, setDepartment] = useState(defaultDept);
  const [position, setPosition] = useState('Staff Specialist');
  const [employmentType, setEmploymentType] = useState('Full-Time');
  const [monthlyGross, setMonthlyGross] = useState<number | ''>(350000);
  const [annualRent, setAnnualRent] = useState<number | ''>('');
  const [showHousingField, setShowHousingField] = useState(false);

  // Statutory state
  const [hasPaye, setHasPaye] = useState(true);
  const [payeNumber, setPayeNumber] = useState('');
  const [stateOfResidence, setStateOfResidence] = useState('Lagos');
  const [hasPension, setHasPension] = useState(true);
  const [pensionNumber, setPensionNumber] = useState('');
  const [pfaName, setPfaName] = useState('');

  // Bank & Contact state
  const [bankName, setBankName] = useState('Access Bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Employment Tenure Dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Quick accordion toggle for secondary sections
  const [showAdvancedStatutory, setShowAdvancedStatutory] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);

  // Feedback indicator for "Save & Add Another"
  const [addAnotherToast, setAddAnotherToast] = useState<string | null>(null);

  // ── Batch Multi-Add State ──
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');

  // Helper to generate a new unique code
  const getNextCode = () => {
    const generated = generateNextEmployeeCodes(existingEmployees, 1);
    return generated[0] || `EMP-${Math.floor(100 + Math.random() * 900)}`;
  };

  // Reset form or populate from editingEmployee
  useEffect(() => {
    if (editingEmployee) {
      setActiveMode('single');
      setFirstName(editingEmployee.firstName || '');
      setLastName(editingEmployee.lastName || '');
      setCode(editingEmployee.code || '');
      setDepartment(editingEmployee.department || defaultDept);
      setPosition(editingEmployee.position || 'Staff Specialist');
      setEmploymentType(editingEmployee.employmentType || 'Full-Time');
      setMonthlyGross(editingEmployee.monthlyGross ?? 350000);
      setAnnualRent(editingEmployee.annualRent ? editingEmployee.annualRent : '');
      setShowHousingField(Boolean(editingEmployee.annualRent));
      setHasPaye(editingEmployee.hasPaye ?? true);
      setPayeNumber(editingEmployee.payeNumber || '');
      setStateOfResidence(editingEmployee.stateOfResidence || 'Lagos');
      setHasPension(editingEmployee.hasPension ?? true);
      setPensionNumber(editingEmployee.pensionNumber || '');
      setPfaName(editingEmployee.pfaName || '');
      setBankName(editingEmployee.bankName || 'Access Bank');
      setAccountNumber(editingEmployee.accountNumber || '');
      setPhone(editingEmployee.phone || '');
      setEmail(editingEmployee.email || '');
      setStatus(editingEmployee.status || 'Active');
      setStartDate(editingEmployee.startDate || '');
      setEndDate(editingEmployee.endDate || '');
      setShowAdvancedStatutory(Boolean(editingEmployee.payeNumber || editingEmployee.pensionNumber));
      setShowBankDetails(Boolean(editingEmployee.accountNumber || editingEmployee.phone || editingEmployee.email));
    } else {
      const defaultRule = activeRules.find(r => r.name === 'Full-Time') || activeRules[0];
      setFirstName('');
      setLastName('');
      setCode(getNextCode());
      setDepartment(defaultDept);
      setPosition('Staff Specialist');
      setEmploymentType(defaultRule?.name || 'Full-Time');
      setMonthlyGross(350000);
      setAnnualRent('');
      setShowHousingField(false);
      setHasPaye(defaultRule ? defaultRule.hasPayeDefault : true);
      setPayeNumber('');
      setStateOfResidence('Lagos');
      setHasPension(defaultRule ? defaultRule.hasPensionDefault : true);
      setPensionNumber('');
      setPfaName('');
      setBankName('Access Bank');
      setAccountNumber('');
      setPhone('');
      setEmail('');
      setStatus('Active');
      setStartDate('');
      setEndDate('');
      setShowAdvancedStatutory(false);
      setShowBankDetails(false);

      // Initialize batch rows
      setBatchRows([
        { id: '1', fullName: '', monthlySalary: '350000', department: defaultDept, employmentType: 'Full-Time' },
        { id: '2', fullName: '', monthlySalary: '350000', department: defaultDept, employmentType: 'Full-Time' },
      ]);
    }
    setAddAnotherToast(null);
  }, [editingEmployee, isOpen]);

  // Handle employment type change with default statutory rules
  const handleEmploymentTypeChange = (type: string) => {
    setEmploymentType(type);
    const rule = activeRules.find(r => r.name.toLowerCase() === type.toLowerCase());
    if (rule) {
      setHasPaye(rule.hasPayeDefault);
      setHasPension(rule.hasPensionDefault);
    }
  };

  // Regenerate employee code
  const handleRegenerateCode = () => {
    setCode(getNextCode());
  };

  // Build Single Employee Payload
  const buildSinglePayload = (): Omit<Employee, 'id'> => {
    return {
      code: code.trim() || getNextCode(),
      firstName: firstName.trim() || 'Staff',
      lastName: lastName.trim() || '',
      department: department.trim() || defaultDept,
      position: position.trim() || 'Staff Specialist',
      employmentType,
      monthlyGross: Number(monthlyGross) || 0,
      annualRent: Number(annualRent) || 0,
      hasPaye,
      payeNumber: payeNumber.trim(),
      stateOfResidence,
      hasPension,
      pensionNumber: pensionNumber.trim(),
      pfaName: pfaName.trim(),
      bankName,
      accountNumber: accountNumber.trim(),
      phone: phone.trim(),
      email: email.trim(),
      status,
      monthlySalaries: editingEmployee?.monthlySalaries || {},
      stints: editingEmployee?.stints || [],
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      originalHireDate: editingEmployee?.originalHireDate || startDate.trim(),
    };
  };

  // Save Single Staff & Close
  const handleSaveSingle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firstName.trim() && !lastName.trim()) {
      alert('Please enter at least a First Name or Last Name.');
      return;
    }
    const payload = buildSinglePayload();
    onSave(payload);
    onClose();
  };

  // Save Single Staff & Reset for Next (Rapid Multi-Add)
  const handleSaveAndAddAnother = () => {
    if (!firstName.trim() && !lastName.trim()) {
      alert('Please enter at least a First Name or Last Name.');
      return;
    }
    const payload = buildSinglePayload();
    onSave(payload);

    const savedName = `${firstName.trim()} ${lastName.trim()}`.trim();
    setAddAnotherToast(`Enrolled "${savedName}"! Ready for next staff.`);
    setTimeout(() => setAddAnotherToast(null), 3000);

    // Reset for next staff member
    setFirstName('');
    setLastName('');
    setCode(getNextCode());
    setAccountNumber('');
    setPhone('');
    setEmail('');
    setPayeNumber('');
    setPensionNumber('');
  };

  // ── Batch Mode Handlers ──
  const handleAddBatchRow = () => {
    setBatchRows(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        fullName: '',
        monthlySalary: '350000',
        department: defaultDept,
        employmentType: 'Full-Time',
      }
    ]);
  };

  const handleUpdateBatchRow = (id: string, field: keyof BatchRow, value: string) => {
    setBatchRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleRemoveBatchRow = (id: string) => {
    if (batchRows.length <= 1) return;
    setBatchRows(prev => prev.filter(r => r.id !== id));
  };

  const validBatchRows = useMemo(() => {
    return batchRows.filter(r => r.fullName.trim().length > 0);
  }, [batchRows]);

  const batchTotalGross = useMemo(() => {
    return validBatchRows.reduce((sum, r) => sum + parseSalaryNumber(r.monthlySalary), 0);
  }, [validBatchRows]);

  const handleSaveBatch = () => {
    if (validBatchRows.length === 0) {
      alert('Please enter at least one personnel full name.');
      return;
    }

    const generatedCodes = generateNextEmployeeCodes(existingEmployees, validBatchRows.length);
    const newEmployees: Omit<Employee, 'id'>[] = validBatchRows.map((row, idx) => {
      const { firstName: fName, lastName: lName } = parseFullName(row.fullName);
      const rule = activeRules.find(r => r.name.toLowerCase() === row.employmentType.toLowerCase());

      return {
        code: generatedCodes[idx],
        firstName: fName,
        lastName: lName,
        department: row.department || defaultDept,
        position: 'Staff Specialist',
        employmentType: row.employmentType || 'Full-Time',
        monthlyGross: parseSalaryNumber(row.monthlySalary),
        annualRent: 0,
        hasPaye: rule ? rule.hasPayeDefault : true,
        hasPension: rule ? rule.hasPensionDefault : true,
        bankName: 'Access Bank',
        accountNumber: '',
        phone: '',
        email: '',
        status: 'Active',
        stateOfResidence: 'Lagos',
      };
    });

    if (onSaveMultiple) {
      onSaveMultiple(newEmployees);
    } else {
      newEmployees.forEach(emp => onSave(emp));
    }
    onClose();
  };

  const handleParsePastedBatch = () => {
    if (!pasteRawText.trim()) {
      setShowPasteModal(false);
      return;
    }

    const lines = pasteRawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const newRows: BatchRow[] = [];

    lines.forEach((line, index) => {
      // Split by comma, tab, or double space
      let parts = line.split(/[,\t]+/).map(p => p.trim());
      if (parts.length === 1 && line.includes('  ')) {
        parts = line.split(/\s{2,}/).map(p => p.trim());
      }

      const name = parts[0] || `Staff ${index + 1}`;
      const salary = parts[1] ? String(parseSalaryNumber(parts[1])) : '350000';
      const dept = parts[2] || defaultDept;

      newRows.push({
        id: `pasted-${Date.now()}-${index}`,
        fullName: name,
        monthlySalary: salary,
        department: dept,
        employmentType: 'Full-Time',
      });
    });

    if (newRows.length > 0) {
      setBatchRows(newRows);
    }
    setPasteRawText('');
    setShowPasteModal(false);
  };

  const salaryPresets = [150000, 250000, 350000, 500000, 750000, 1000000];

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      maxHeight="max-h-[92vh]"
      bodyClassName="px-4 py-3 overflow-y-auto flex-1 space-y-4"
      footer={
        <div className="w-full space-y-2 select-none">
          {activeMode === 'single' ? (
            <div className="flex items-center gap-2.5 w-full">
              {!isEditing && (
                <button
                  type="button"
                  onClick={handleSaveAndAddAnother}
                  className="h-12 px-3.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  title="Save this staff member and immediately add another"
                >
                  <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Save &amp; Add Next</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSaveSingle()}
                className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Update Profile' : 'Save Staff Member'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 w-full">
              <button
                type="button"
                onClick={handleAddBatchRow}
                className="h-12 px-4 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Add Row</span>
              </button>

              <button
                type="button"
                onClick={handleSaveBatch}
                disabled={validBatchRows.length === 0}
                className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-98 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {validBatchRows.length === 0
                    ? 'Fill Names to Save'
                    : `Save All (${validBatchRows.length} Personnel)`}
                </span>
              </button>
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4 select-none pb-2">

        {/* ── Top Header & Mode Toggle ── */}
        <div className="flex items-center justify-between gap-3 pt-0.5">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
              <span>{isEditing ? 'Edit Staff Profile' : 'Add Personnel'}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                {code}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">
              {isEditing ? 'Modify payroll, compensation & role details' : 'Enroll staff into company payroll'}
            </p>
          </div>

          {/* Mode Switcher (Single Staff vs Quick Batch) */}
          {!isEditing && (
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 shrink-0">
              <button
                type="button"
                onClick={() => setActiveMode('single')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeMode === 'single'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('batch')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeMode === 'batch'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
                }`}
              >
                Multi-Add
              </button>
            </div>
          )}
        </div>

        {/* ── Toast notification for "Save & Add Next" ── */}
        {addAnotherToast && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-medium">{addAnotherToast}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            MODE 1: SINGLE STAFF FORM (MOBILE INSET CARDS)
        ══════════════════════════════════════════════════════ */}
        {activeMode === 'single' ? (
          <form onSubmit={handleSaveSingle} className="space-y-3.5">
            
            {/* ── CARD 1: Identity & Role ── */}
            <div className="bg-white dark:bg-[#151518] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Identity &amp; Role
                  </span>
                </div>
                
                {/* Staff Code Pill with Regenerate */}
                <button
                  type="button"
                  onClick={handleRegenerateCode}
                  className="flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Generate New Staff ID"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{code}</span>
                </button>
              </div>

              {/* First & Last Name (Stacked or 2-col clean rows) */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Babatunde"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adeleke"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Department Selector */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">
                  Department
                </label>
                <div className="relative">
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 pr-8 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                  >
                    {deptOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Job Title / Role */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">
                  Job Title / Position
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Accountant / Logistics Lead"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Employment Type Pills */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1.5">
                  Employment Type
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {activeRules.map((rule) => {
                    const isSelected = employmentType.toLowerCase() === rule.name.toLowerCase();
                    return (
                      <button
                        key={rule.id || rule.name}
                        type="button"
                        onClick={() => handleEmploymentTypeChange(rule.name)}
                        className={`h-9 px-2.5 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 font-semibold'
                            : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <span className="truncate">{rule.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Radio (Active vs Inactive) */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Status</span>
                <div className="flex items-center gap-1.5">
                  {(['Active', 'Inactive'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        status === s
                          ? s === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-transparent'
                          : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border-transparent'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Employment Tenure & Dates */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Tenure Dates</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">Controls payroll inclusion</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                      Start Date (Hire Date)
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                      End Date (Exit Date)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEndDate(val);
                        if (val) {
                          setStatus('Inactive');
                        }
                      }}
                      className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {endDate ? (
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg leading-relaxed">
                    💡 <strong>Payroll Rule:</strong> Staff is paid in their exit month and automatically excluded from all subsequent pay runs.
                  </p>
                ) : null}

                {editingEmployee?.stints && editingEmployee.stints.length > 0 && (
                  <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 rounded-xl p-2.5 text-[10px] space-y-1">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400 block">
                      Previous Tenures ({editingEmployee.stints.length})
                    </span>
                    {editingEmployee.stints.map((st, idx) => (
                      <div key={st.stintId || idx} className="flex justify-between text-zinc-500">
                        <span>Stint #{idx + 1}: {st.startDate || '—'} → {st.endDate || 'Active'}</span>
                        {st.exitReason && <span className="text-zinc-400">({st.exitReason})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* ── CARD 2: Compensation ── */}
            <div className="bg-white dark:bg-[#151518] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Banknote className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Compensation
                  </span>
                </div>

                {/* Formatted Live Currency Preview */}
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ₦{formatNaira(Number(monthlyGross) || 0)} / mo
                </span>
              </div>

              {/* Monthly Gross Salary Input */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">
                  Monthly Gross Salary (₦) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold font-mono text-sm">
                    ₦
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    placeholder="350000"
                    value={monthlyGross}
                    onChange={(e) => setMonthlyGross(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full h-12 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-8 pr-3 text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Salary Preset Chips */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400 block">Quick Presets:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {salaryPresets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setMonthlyGross(amt)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-colors shrink-0 cursor-pointer ${
                        Number(monthlyGross) === amt
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      ₦{amt >= 1000000 ? `${amt / 1000000}M` : `${amt / 1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Annual Housing / Rent Relief */}
              <div className="pt-1">
                {!showHousingField ? (
                  <button
                    type="button"
                    onClick={() => setShowHousingField(true)}
                    className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Annual Housing / Rent Relief (Tax Deductible)</span>
                  </button>
                ) : (
                  <div className="space-y-1 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                        Annual Rent Paid by Employee (₦)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAnnualRent('');
                          setShowHousingField(false);
                        }}
                        className="text-[10px] text-zinc-400 hover:text-rose-500"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="e.g. 1200000"
                      value={annualRent}
                      onChange={(e) => setAnnualRent(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

            </div>

            {/* ── CARD 3: Statutory Rules & Tax Registration ── */}
            <div className="bg-white dark:bg-[#151518] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Statutory Rules &amp; Tax IDs
                  </span>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold border border-zinc-200/60 dark:border-zinc-700/60">
                  {employmentType} Rule
                </span>
              </div>

              {/* PAYE Income Tax Block */}
              <div className="space-y-2 bg-zinc-50/70 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                      PAYE Income Tax
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      CRA Reliefs &amp; Statutory PITA Tax Brackets
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasPaye(!hasPaye)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      hasPaye ? 'bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform absolute top-0.75 ${
                        hasPaye ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* State of Residence & Tax ID Inputs */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                      State of Residence (IRS)
                    </label>
                    <select
                      value={stateOfResidence}
                      onChange={(e) => setStateOfResidence(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                    >
                      {NIGERIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                      Taxpayer ID / PAYE No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. N-1849204"
                      value={payeNumber}
                      onChange={(e) => setPayeNumber(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Pension Scheme Block */}
              <div className="space-y-2 bg-zinc-50/70 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                      Pension Scheme (8% RSA)
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Statutory 8% Employee + 10% Employer
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasPension(!hasPension)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      hasPension ? 'bg-emerald-600' : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform absolute top-0.75 ${
                        hasPension ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* PFA & RSA PIN Inputs */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                      Pension Fund (PFA)
                    </label>
                    <select
                      value={pfaName}
                      onChange={(e) => setPfaName(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Select PFA...</option>
                      {NIGERIAN_PFAS.map((pfa) => (
                        <option key={pfa} value={pfa}>
                          {pfa}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                      Pension RSA PIN
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PEN100829104"
                      value={pensionNumber}
                      onChange={(e) => setPensionNumber(e.target.value)}
                      className="w-full h-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* ── CARD 4: Bank Details & Contact (Collapsible / Expandable) ── */}
            <div className="bg-white dark:bg-[#151518] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 space-y-3 shadow-xs">
              <button
                type="button"
                onClick={() => setShowBankDetails(!showBankDetails)}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Landmark className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Bank &amp; Contact Information
                    </span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      {accountNumber ? `${bankName} • ${accountNumber}` : 'Direct disbursement & payslip dispatch'}
                    </span>
                  </div>
                </div>
                {showBankDetails ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {showBankDetails && (
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-3 animate-in fade-in duration-150">
                  {/* Bank Name */}
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">
                      Bank Name
                    </label>
                    <div className="relative">
                      <select
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 pr-8 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                      >
                        {NIGERIAN_BANKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* 10-Digit NUBAN Account Number */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                        NUBAN Account Number (10 Digits)
                      </label>
                      <span className={`text-[10px] font-mono ${
                        accountNumber.length === 10 ? 'text-emerald-600 font-bold' : 'text-zinc-400'
                      }`}>
                        {accountNumber.length}/10
                      </span>
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="e.g. 0123456789"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Phone & Email */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="0803 000 0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="staff@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </form>
        ) : (
          /* ══════════════════════════════════════════════════════
              MODE 2: MULTI-ADD BATCH CARDS (MOBILE CARD LIST)
          ══════════════════════════════════════════════════════ */
          <div className="space-y-3">
            {/* Batch Helper Bar */}
            <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-800 dark:text-emerald-300">
              <div>
                <span className="font-bold block">Mobile Quick Add</span>
                <span className="text-[11px] opacity-80">
                  {validBatchRows.length} ready • Total: ₦{formatNaira(batchTotalGross)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste List</span>
              </button>
            </div>

            {/* Mobile Cards Stack (Replacing desktop table!) */}
            <div className="space-y-2.5">
              {batchRows.map((row, index) => (
                <div
                  key={row.id}
                  className="bg-white dark:bg-[#151518] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-3.5 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 font-mono">
                      #{index + 1} PERSONNEL
                    </span>
                    {batchRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBatchRow(row.id)}
                        className="text-zinc-400 hover:text-rose-500 p-1 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Full Name */}
                  <div>
                    <input
                      type="text"
                      placeholder="Full Name (e.g. Babatunde Adeleke)"
                      value={row.fullName}
                      onChange={(e) => handleUpdateBatchRow(row.id, 'fullName', e.target.value)}
                      className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Salary & Department 2-column */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold font-mono text-xs">
                          ₦
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Salary"
                          value={row.monthlySalary}
                          onChange={(e) => handleUpdateBatchRow(row.id, 'monthlySalary', e.target.value)}
                          className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-6 pr-2 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <select
                        value={row.department}
                        onChange={(e) => handleUpdateBatchRow(row.id, 'department', e.target.value)}
                        className="w-full h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      >
                        {deptOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Another Row Button */}
            <button
              type="button"
              onClick={handleAddBatchRow}
              className="w-full py-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Personnel Row</span>
            </button>
          </div>
        )}

      </div>

      {/* ── Paste Raw Batch Text Modal ── */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center">
          <div className="bg-white dark:bg-[#151518] border-t border-zinc-200 dark:border-zinc-800 rounded-t-3xl p-5 w-full max-h-[85vh] flex flex-col space-y-3 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Paste Staff List
                </h3>
                <p className="text-[11px] text-zinc-400">
                  One per line: "Full Name, Salary, Department"
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              rows={6}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder="Babatunde Adeleke, 350000, Operations&#10;Ngozi Okonjo, 450000, Finance&#10;Chidi Anozie, 280000, Admin"
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="h-11 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParsePastedBatch}
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Import to Cards
              </button>
            </div>
          </div>
        </div>
      )}

    </MobileBottomSheet>
  );
};
