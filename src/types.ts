export interface CompanyProfile {
  name: string;
  subtitle: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string; // base64 or image url
}

export interface Employee {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  monthlyGross: number;
  monthlySalaries?: Record<string, number>; // key: `${year}-${monthKey}` e.g. "2026-jan" or `${monthKey}`
  annualRent: number;
  bankName: string;
  accountNumber: string;
  hasPension: boolean;
  hasPaye: boolean;
  payeNumber?: string; // State IRS Taxpayer ID / PAYE No
  pensionNumber?: string; // RSA PIN
  pfaName?: string; // Pension Fund Administrator
  status: 'Active' | 'Inactive';
  employmentType?: string; // 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern / NYSC'
}

export type SalaryCalculationMode = 'gross-to-net' | 'net-to-gross';

export interface EmploymentTypeRule {
  id: string;
  name: string; // e.g. 'Full-Time', 'Part-Time', 'Contract', 'Intern / NYSC'
  hasPayeDefault: boolean;
  hasPensionDefault: boolean;
  description?: string;
}

export interface PayrollVariables {
  basic: number;
  housing: number;
  transport: number;
  otherAllowances: number;
  employeePensionRate: number;
  employerPensionRate: number;
  salaryCalculationMode?: SalaryCalculationMode;
  employmentTypeRules?: EmploymentTypeRule[];
}

export interface TaxBracket {
  id: string;
  label: string;
  upTo: number | null;
  rate: number;
}

export interface ExtraReliefCondition {
  id: string;
  label: string;
  amount: number;
  enabled: boolean;
}

export interface PayeTaxVariables {
  craBase: number;
  rentReliefRate: number;
  rentReliefCap: number;
  taxBrackets: TaxBracket[];
  extraConditions: ExtraReliefCondition[];
}

export interface CalculatedPayrollItem {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
  position: string;
  bankName: string;
  accountNumber: string;
  payeNumber?: string;
  pensionNumber?: string;
  pfaName?: string;
  monthlyGross: number;
  basic: number;
  housing: number;
  transport: number;
  otherAllowances: number;
  pensionableBHT: number;
  employeePension: number;
  employerPension: number;
  annualGross: number;
  rentRelief: number;
  pensionRelief: number;
  extraReliefs: number;
  totalCra: number;
  taxableIncome: number;
  annualTax: number;
  monthlyPaye: number;
  totalDeductions: number;
  netTakeHome: number;
  employerTotalCost: number;
  hasPension: boolean;
  hasPaye: boolean;
  employmentType?: string;
  targetNetPay?: number;
  calculationMode?: SalaryCalculationMode;
}

export interface PayrollSnapshotTotals {
  totalGross: number;
  totalNet: number;
  totalPaye: number;
  totalEmpPension: number;
  totalCompPension: number;
  totalEmployerCost: number;
  staffCount: number;
}

export interface PayrollSnapshot {
  id: string;
  monthKey: string;
  monthLabel: string;
  year: number;
  version: number;
  isLocked: boolean;
  finalizedAt: string;
  finalizedBy: string;
  notes: string;
  items: CalculatedPayrollItem[];
  totals: PayrollSnapshotTotals;
}

export type AppView = 
  | 'dashboard' 
  | 'employees' 
  | 'payroll' 
  | 'analytics' 
  | 'settings' 
  | 'variables' 
  | 'excel';

export interface ResetOptions {
  resetEmployees: boolean;
  resetSnapshots: boolean;
  resetVariables: boolean;
  resetCompany: boolean;
  resetDepartments: boolean;
}
