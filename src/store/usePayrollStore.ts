import { useState, useEffect } from 'react';
import { 
  Employee, 
  PayrollVariables, 
  PayeTaxVariables, 
  CalculatedPayrollItem, 
  PayrollSnapshot, 
  AppView,
  CompanyProfile,
  ResetOptions 
} from '../types';
import { 
  DEFAULT_PAYROLL_VARIABLES, 
  DEFAULT_PAYE_VARIABLES, 
  DEFAULT_EMPLOYMENT_TYPE_RULES,
  calculatePayrollItem 
} from '../engine/payePensionEngine';

const STORAGE_KEY = 'PAYROLL_PRO_LOCAL_STORAGE_V5';

export const MONTHS = [
  { key: 'jan', label: 'January' },
  { key: 'feb', label: 'February' },
  { key: 'mar', label: 'March' },
  { key: 'apr', label: 'April' },
  { key: 'may', label: 'May' },
  { key: 'jun', label: 'June' },
  { key: 'jul', label: 'July' },
  { key: 'aug', label: 'August' },
  { key: 'sep', label: 'September' },
  { key: 'oct', label: 'October' },
  { key: 'nov', label: 'November' },
  { key: 'dec', label: 'December' },
];

const DEFAULT_COMPANY: CompanyProfile = {
  name: 'DEWATERING CONSTRUCTION ETC LIMITED',
  subtitle: 'Ground Water Control & Engineering Specialist',
  address: 'Plot 12, Commercial Avenue, Victoria Island, Lagos, Nigeria',
  phone: '+234 800 339 2837',
  email: 'info@dewateringconstruction.com',
  logoUrl: '',
};

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    code: 'EMP-001',
    firstName: 'HUBERT',
    lastName: 'DAVIES',
    department: 'ADMIN',
    position: 'CEO',
    email: 'hubert.davies@company.com',
    phone: '+234 802 334 9901',
    monthlyGross: 1000000,
    annualRent: 2000000,
    bankName: 'STANBIC',
    accountNumber: '9200384717',
    hasPension: true,
    hasPaye: true,
    payeNumber: 'PAYE-LAS-0091823',
    pensionNumber: 'PEN10082736451',
    pfaName: 'Stanbic IBTC Pension Managers',
    status: 'Active',
  },
  {
    id: 'emp-2',
    code: 'EMP-002',
    firstName: 'ALICIA',
    lastName: 'OBOKIA',
    department: 'ADMIN',
    position: 'Head of Admin',
    email: 'alicia.obokia@company.com',
    phone: '+234 803 555 1122',
    monthlyGross: 400000,
    annualRent: 1200000,
    bankName: 'FIRST BANK',
    accountNumber: '3059739035',
    hasPension: true,
    hasPaye: true,
    payeNumber: 'PAYE-LAS-0044192',
    pensionNumber: 'PEN10093847291',
    pfaName: 'ARM Pension Managers',
    status: 'Active',
  },
  {
    id: 'emp-3',
    code: 'EMP-003',
    firstName: 'ELIJAH',
    lastName: 'IDIAFEHI',
    department: 'DEWATERING',
    position: 'Head of Operations',
    email: 'elijah.idiafehi@company.com',
    phone: '+234 809 111 8844',
    monthlyGross: 400000,
    annualRent: 1000000,
    bankName: 'STANBIC',
    accountNumber: '0026639919',
    hasPension: true,
    hasPaye: true,
    payeNumber: 'PAYE-LAS-0082711',
    pensionNumber: 'PEN10037461928',
    pfaName: 'Stanbic IBTC Pension Managers',
    status: 'Active',
  },
  {
    id: 'emp-4',
    code: 'EMP-004',
    firstName: 'OLATUNDE GBENGA',
    lastName: 'ALONGE',
    department: 'GEN OFFICE',
    position: 'Projects Supervisor',
    email: 'olatunde.alonge@company.com',
    phone: '+234 814 777 2200',
    monthlyGross: 300000,
    annualRent: 800000,
    bankName: 'ACCESS',
    accountNumber: '1445714675',
    hasPension: true,
    hasPaye: true,
    payeNumber: 'PAYE-LAS-0073619',
    pensionNumber: 'PEN10058291047',
    pfaName: 'Access Pensions',
    status: 'Active',
  },
  {
    id: 'emp-5',
    code: 'EMP-005',
    firstName: 'OLAJUMOKE',
    lastName: 'BANIRE',
    department: 'ADMIN',
    position: 'Admin/Accounts Officer',
    email: 'olajumoke.banire@company.com',
    phone: '+234 701 865 0532',
    monthlyGross: 160000,
    annualRent: 500000,
    bankName: 'Palm pay',
    accountNumber: '7018650532',
    hasPension: true,
    hasPaye: true,
    payeNumber: 'PAYE-LAS-0055201',
    pensionNumber: 'PEN10069382019',
    pfaName: 'Premium Pension Limited',
    status: 'Active',
  },
  {
    id: 'emp-6',
    code: 'EMP-006',
    firstName: 'KAYODE',
    lastName: 'ASHABI',
    department: 'LOGISTICS',
    position: 'Logistics Lead',
    email: 'kayode.ashabi@company.com',
    phone: '+234 805 123 4567',
    monthlyGross: 250000,
    annualRent: 600000,
    bankName: 'GTBANK',
    accountNumber: '0123456789',
    hasPension: true,
    hasPaye: true,
    payeNumber: 'PAYE-LAS-0061849',
    pensionNumber: 'PEN10072948102',
    pfaName: 'Stanbic IBTC Pension Managers',
    status: 'Active',
  }
];

export const DEFAULT_DEPARTMENTS: string[] = [
  'ADMIN',
  'OPERATIONS',
  'FINANCE & ACCOUNTS',
  'ENGINEERING',
  'DEWATERING',
  'LOGISTICS',
  'GENERAL OFFICE',
  'HUMAN RESOURCES',
];

export interface AppState {
  company: CompanyProfile;
  employees: Employee[];
  departments: string[];
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  selectedMonth: string;
  selectedYear: number;
  snapshots: PayrollSnapshot[];
  activeView: AppView;
  isDarkTheme: boolean;
}

export function loadPersistedState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        return {
          company: {
            ...DEFAULT_COMPANY,
            ...(parsed.company || {})
          },
          departments: (parsed.departments && Array.isArray(parsed.departments) && parsed.departments.length > 0)
            ? parsed.departments
            : DEFAULT_DEPARTMENTS,
          payrollVariables: {
            ...DEFAULT_PAYROLL_VARIABLES,
            ...(parsed.payrollVariables || {}),
            employmentTypeRules: (parsed.payrollVariables?.employmentTypeRules && Array.isArray(parsed.payrollVariables.employmentTypeRules) && parsed.payrollVariables.employmentTypeRules.length > 0)
              ? parsed.payrollVariables.employmentTypeRules
              : DEFAULT_EMPLOYMENT_TYPE_RULES,
          },
          payeTaxVariables: {
            ...DEFAULT_PAYE_VARIABLES,
            ...(parsed.payeTaxVariables || {}),
            taxBrackets: (parsed.payeTaxVariables?.taxBrackets && Array.isArray(parsed.payeTaxVariables.taxBrackets) && parsed.payeTaxVariables.taxBrackets.length > 0)
              ? parsed.payeTaxVariables.taxBrackets
              : DEFAULT_PAYE_VARIABLES.taxBrackets,
          },
          selectedMonth: parsed.selectedMonth || 'jan',
          selectedYear: Number(parsed.selectedYear) || 2026,
          snapshots: (parsed.snapshots && Array.isArray(parsed.snapshots))
            ? parsed.snapshots.filter(Boolean)
            : [],
          activeView: parsed.activeView || 'dashboard',
          isDarkTheme: Boolean(parsed.isDarkTheme),
          employees: (parsed.employees && Array.isArray(parsed.employees))
            ? parsed.employees.filter(Boolean).map((e: any, idx: number) => ({
                ...e,
                id: e.id || `emp-${idx}`,
                employmentType: e.employmentType || 'Full-Time'
              }))
            : INITIAL_EMPLOYEES,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to read Payroll Pro local storage:', e);
  }

  return {
    company: DEFAULT_COMPANY,
    employees: INITIAL_EMPLOYEES,
    departments: DEFAULT_DEPARTMENTS,
    payrollVariables: DEFAULT_PAYROLL_VARIABLES,
    payeTaxVariables: DEFAULT_PAYE_VARIABLES,
    selectedMonth: 'jan',
    selectedYear: 2026,
    snapshots: [],
    activeView: 'dashboard',
    isDarkTheme: false,
  };
}

export function usePayrollStore() {
  const [state, setState] = useState<AppState>(() => loadPersistedState());

  const reloadFromStorage = () => {
    setState(loadPersistedState());
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
    }
  }, [state]);

  const activeEmployees = (state.employees || []).filter(e => e && e.status === 'Active');
  const liveCalculatedItems: CalculatedPayrollItem[] = activeEmployees.map(emp => {
    try {
      return calculatePayrollItem(emp, state.payrollVariables, state.payeTaxVariables, state.selectedMonth, state.selectedYear);
    } catch (err) {
      console.error(`Failed to calculate payroll item for employee ${emp?.id}:`, err);
      return {
        employeeId: emp?.id || 'err-id',
        employeeCode: emp?.code || 'ERR',
        fullName: `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim() || 'Employee',
        department: emp?.department || 'General',
        position: emp?.position || 'Staff',
        employmentType: emp?.employmentType || 'Full-Time',
        monthlyGross: Number(emp?.monthlyGross) || 0,
        annualRent: Number(emp?.annualRent) || 0,
        basic: 0,
        housing: 0,
        transport: 0,
        otherAllowances: 0,
        pensionableBHT: 0,
        employeePension: 0,
        employerPension: 0,
        annualGross: 0,
        rentRelief: 0,
        pensionRelief: 0,
        extraReliefs: 0,
        totalCra: 0,
        taxableIncome: 0,
        annualTax: 0,
        monthlyPaye: 0,
        totalDeductions: 0,
        netTakeHome: Number(emp?.monthlyGross) || 0,
        employerTotalCost: Number(emp?.monthlyGross) || 0,
        bankName: emp?.bankName || '',
        accountNumber: emp?.accountNumber || '',
        payeNumber: emp?.payeNumber || '',
        pensionNumber: emp?.pensionNumber || '',
        pfaName: emp?.pfaName || '',
        hasPension: Boolean(emp?.hasPension),
        hasPaye: Boolean(emp?.hasPaye),
      };
    }
  });

  const activeSnapshot = (state.snapshots || []).find(
    s => s && s.monthKey === state.selectedMonth && s.year === state.selectedYear && s.isLocked
  );

  const currentPayrollItems = (activeSnapshot?.items && Array.isArray(activeSnapshot.items)) 
    ? activeSnapshot.items 
    : (Array.isArray(liveCalculatedItems) ? liveCalculatedItems : []);

  const monthLabel = MONTHS.find(m => m.key === state.selectedMonth)?.label || 'October';

  const toggleTheme = () => {
    setState(s => ({ ...s, isDarkTheme: !s.isDarkTheme }));
  };

  const updateCompanyProfile = (profile: Partial<CompanyProfile>) => {
    setState(s => ({ ...s, company: { ...s.company, ...profile } }));
  };

  const setActiveView = (view: AppView) => {
    setState(s => ({ ...s, activeView: view }));
  };

  const setSelectedPeriod = (monthKey: string, year: number) => {
    setState(s => ({ ...s, selectedMonth: monthKey, selectedYear: year }));
  };

  const addEmployee = (emp: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...emp,
      id: 'emp-' + Date.now(),
      employmentType: emp.employmentType || 'Full-Time',
    };
    setState(s => ({ ...s, employees: [newEmp, ...s.employees] }));
  };

  const addEmployees = (emps: Omit<Employee, 'id'>[]) => {
    if (!emps || emps.length === 0) return;
    const baseTime = Date.now();
    const newEmps: Employee[] = emps.map((emp, idx) => ({
      ...emp,
      id: `emp-${baseTime}-${idx}`,
      employmentType: emp.employmentType || 'Full-Time',
    }));
    setState(s => ({ ...s, employees: [...newEmps, ...s.employees] }));
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setState(s => ({
      ...s,
      employees: s.employees.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  };

  const deleteEmployee = (id: string) => {
    setState(s => ({
      ...s,
      employees: s.employees.filter(e => e.id !== id)
    }));
  };

  const importEmployees = (
    incoming: Partial<Employee>[], 
    mode: 'merge' | 'overwrite',
    importScope: 'all' | 'salary-only' | 'bank-only' = 'all'
  ) => {
    if (mode === 'overwrite' && importScope === 'all') {
      const formatted: Employee[] = incoming.map((item, idx) => ({
        id: item.id || `emp-${Date.now()}-${idx}`,
        code: item.code || `EMP-${100 + idx}`,
        firstName: item.firstName || 'Staff',
        lastName: item.lastName || '',
        department: item.department || 'General',
        position: item.position || 'Employee',
        employmentType: item.employmentType || 'Full-Time',
        email: item.email || '',
        phone: item.phone || '',
        monthlyGross: Number(item.monthlyGross) || 150000,
        annualRent: Number(item.annualRent) || 0,
        bankName: item.bankName || 'Access Bank',
        accountNumber: item.accountNumber || '0000000000',
        hasPension: item.hasPension ?? true,
        hasPaye: item.hasPaye ?? true,
        payeNumber: item.payeNumber || '',
        pensionNumber: item.pensionNumber || '',
        pfaName: item.pfaName || '',
        status: item.status || 'Active',
      }));

      setState(s => ({ ...s, employees: formatted }));
      return;
    }

    setState(s => {
      const existingMap = new Map(s.employees.map(e => [e.code.toLowerCase(), e]));

      incoming.forEach((item, idx) => {
        const codeKey = (item.code || '').toLowerCase();
        if (existingMap.has(codeKey)) {
          const current = existingMap.get(codeKey)!;
          
          if (importScope === 'salary-only') {
            // Update salary / gross / rent only without modifying personal or bank details
            existingMap.set(codeKey, {
              ...current,
              monthlyGross: Number(item.monthlyGross) > 0 ? Number(item.monthlyGross) : current.monthlyGross,
              annualRent: Number(item.annualRent) ?? current.annualRent,
            });
          } else if (importScope === 'bank-only') {
            // Update bank details, account number, PAYE ID, Pension PIN only
            existingMap.set(codeKey, {
              ...current,
              bankName: item.bankName || current.bankName,
              accountNumber: item.accountNumber || current.accountNumber,
              payeNumber: item.payeNumber !== undefined ? item.payeNumber : current.payeNumber,
              pensionNumber: item.pensionNumber !== undefined ? item.pensionNumber : current.pensionNumber,
              pfaName: item.pfaName !== undefined ? item.pfaName : current.pfaName,
            });
          } else {
            // Full merge
            existingMap.set(codeKey, {
              ...current,
              ...item,
              employmentType: item.employmentType || current.employmentType || 'Full-Time',
              monthlyGross: Number(item.monthlyGross) || current.monthlyGross,
              annualRent: Number(item.annualRent) ?? current.annualRent,
            });
          }
        } else {
          // If staff does not exist in directory, add them
          const newEmp: Employee = {
            id: `emp-${Date.now()}-${idx}`,
            code: item.code || `EMP-${Date.now().toString().slice(-4)}`,
            firstName: item.firstName || 'Staff',
            lastName: item.lastName || '',
            department: item.department || 'General',
            position: item.position || 'Employee',
            employmentType: item.employmentType || 'Full-Time',
            email: item.email || '',
            phone: item.phone || '',
            monthlyGross: Number(item.monthlyGross) || 150000,
            annualRent: Number(item.annualRent) || 0,
            bankName: item.bankName || 'Access Bank',
            accountNumber: item.accountNumber || '0000000000',
            hasPension: item.hasPension ?? true,
            hasPaye: item.hasPaye ?? true,
            payeNumber: item.payeNumber || '',
            pensionNumber: item.pensionNumber || '',
            pfaName: item.pfaName || '',
            status: item.status || 'Active',
          };
          existingMap.set(newEmp.code.toLowerCase(), newEmp);
        }
      });

      return {
        ...s,
        employees: Array.from(existingMap.values())
      };
    });
  };

  const finalizeAndLockPayroll = (notes: string = '') => {
    const existingSnapshotsForMonth = state.snapshots.filter(
      s => s.monthKey === state.selectedMonth && s.year === state.selectedYear
    );
    const nextVersion = existingSnapshotsForMonth.length + 1;

    const totals = {
      totalGross: liveCalculatedItems.reduce((acc, i) => acc + i.monthlyGross, 0),
      totalNet: liveCalculatedItems.reduce((acc, i) => acc + i.netTakeHome, 0),
      totalPaye: liveCalculatedItems.reduce((acc, i) => acc + i.monthlyPaye, 0),
      totalEmpPension: liveCalculatedItems.reduce((acc, i) => acc + i.employeePension, 0),
      totalCompPension: liveCalculatedItems.reduce((acc, i) => acc + i.employerPension, 0),
      totalEmployerCost: liveCalculatedItems.reduce((acc, i) => acc + i.employerTotalCost, 0),
      staffCount: liveCalculatedItems.length,
    };

    const newSnapshot: PayrollSnapshot = {
      id: `snap-${state.selectedMonth}-${state.selectedYear}-v${nextVersion}`,
      monthKey: state.selectedMonth,
      monthLabel,
      year: state.selectedYear,
      version: nextVersion,
      isLocked: true,
      finalizedAt: new Date().toISOString(),
      finalizedBy: 'Payroll Administrator',
      notes: notes || `Finalized ${monthLabel} ${state.selectedYear} payroll run (v${nextVersion})`,
      items: liveCalculatedItems,
      totals,
    };

    setState(s => ({
      ...s,
      snapshots: [
        ...s.snapshots.map(snap => 
          (snap.monthKey === s.selectedMonth && snap.year === s.selectedYear)
            ? { ...snap, isLocked: false }
            : snap
        ),
        newSnapshot
      ]
    }));
  };

  const unlockPayroll = (reason: string = '') => {
    setState(s => ({
      ...s,
      snapshots: s.snapshots.map(snap => 
        (snap.monthKey === s.selectedMonth && snap.year === s.selectedYear)
          ? { ...snap, isLocked: false, notes: snap.notes + ` | Unlocked: ${reason}` }
          : snap
      )
    }));
  };

  const deleteSnapshot = (snapshotId: string) => {
    setState(s => ({
      ...s,
      snapshots: s.snapshots.filter(snap => snap.id !== snapshotId),
    }));
  };

  const updatePayrollVariables = (vars: Partial<PayrollVariables>) => {
    setState(s => ({
      ...s,
      payrollVariables: { ...s.payrollVariables, ...vars }
    }));
  };

  const updatePayeTaxVariables = (vars: Partial<PayeTaxVariables>) => {
    setState(s => ({
      ...s,
      payeTaxVariables: { ...s.payeTaxVariables, ...vars }
    }));
  };

  const addDepartment = (deptName: string) => {
    const trimmed = deptName.trim().toUpperCase();
    if (!trimmed) return;
    setState(s => {
      const current = s.departments || DEFAULT_DEPARTMENTS;
      if (current.includes(trimmed)) return s;
      return {
        ...s,
        departments: [...current, trimmed]
      };
    });
  };

  const updateDepartment = (oldName: string, newName: string) => {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim().toUpperCase();
    if (!trimmedNew || trimmedOld === trimmedNew) return;
    setState(s => {
      const current = s.departments || DEFAULT_DEPARTMENTS;
      return {
        ...s,
        departments: current.map(d => d === trimmedOld ? trimmedNew : d),
        employees: s.employees.map(emp => emp.department === trimmedOld ? { ...emp, department: trimmedNew } : emp)
      };
    });
  };

  const deleteDepartment = (deptName: string) => {
    setState(s => ({
      ...s,
      departments: (s.departments || DEFAULT_DEPARTMENTS).filter(d => d !== deptName)
    }));
  };

  const resetAllData = (options?: ResetOptions) => {
    setState(s => {
      const opts: ResetOptions = options || {
        resetEmployees: true,
        resetSnapshots: true,
        resetVariables: true,
        resetCompany: true,
        resetDepartments: true,
      };

      const freshCompany: CompanyProfile = opts.resetCompany
        ? {
            name: 'Company Name',
            subtitle: 'Payroll System',
            address: '',
            phone: '',
            email: '',
            logoUrl: '',
          }
        : s.company;

      const freshEmployees: Employee[] = opts.resetEmployees ? [] : s.employees;
      const freshDepartments: string[] = opts.resetDepartments ? DEFAULT_DEPARTMENTS : s.departments;
      const freshPayrollVars: PayrollVariables = opts.resetVariables ? DEFAULT_PAYROLL_VARIABLES : s.payrollVariables;
      const freshPayeVars: PayeTaxVariables = opts.resetVariables ? DEFAULT_PAYE_VARIABLES : s.payeTaxVariables;
      const freshSnapshots: PayrollSnapshot[] = opts.resetSnapshots ? [] : s.snapshots;

      return {
        ...s,
        company: freshCompany,
        employees: freshEmployees,
        departments: freshDepartments,
        payrollVariables: freshPayrollVars,
        payeTaxVariables: freshPayeVars,
        snapshots: freshSnapshots,
        activeView: opts.resetEmployees ? 'employees' : s.activeView,
      };
    });
  };

  return {
    state,
    monthLabel,
    activeEmployees,
    currentPayrollItems,
    activeSnapshot,
    toggleTheme,
    updateCompanyProfile,
    setActiveView,
    setSelectedPeriod,
    addEmployee,
    addEmployees,
    updateEmployee,
    deleteEmployee,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    importEmployees,
    finalizeAndLockPayroll,
    unlockPayroll,
    deleteSnapshot,
    updatePayrollVariables,
    updatePayeTaxVariables,
    resetAllData,
    reloadFromStorage,
  };
}
