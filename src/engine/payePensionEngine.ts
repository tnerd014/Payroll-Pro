import { 
  Employee, 
  PayrollVariables, 
  PayeTaxVariables, 
  CalculatedPayrollItem, 
  EmploymentTypeRule 
} from '../types';
import { getMidMonthProrationRatio } from './dateUtils';
import { getPrivacyMaskPreference } from '../services/supabaseClient';

export const DEFAULT_EMPLOYMENT_TYPE_RULES: EmploymentTypeRule[] = [
  {
    id: 'et-1',
    name: 'Full-Time',
    hasPayeDefault: true,
    hasPensionDefault: true,
    description: 'Permanent & confirmed staff subject to standard statutory PAYE tax and 8% employee / 10% employer pension.'
  },
  {
    id: 'et-2',
    name: 'Part-Time',
    hasPayeDefault: false,
    hasPensionDefault: false,
    description: 'Hourly/part-time workers exempt from statutory pension and standard payroll PAYE.'
  },
  {
    id: 'et-3',
    name: 'Contract',
    hasPayeDefault: false,
    hasPensionDefault: false,
    description: 'Fixed-term independent contractors without statutory pension deductions (exempt from standard payroll PAYE).'
  },
  {
    id: 'et-4',
    name: 'Intern / NYSC',
    hasPayeDefault: false,
    hasPensionDefault: false,
    description: 'Student interns and national service corps members exempt from pension and standard payroll tax.'
  }
];

export const DEFAULT_PAYROLL_VARIABLES: PayrollVariables = {
  basic: 40,
  housing: 15,
  transport: 15,
  otherAllowances: 30,
  employeePensionRate: 8,
  employerPensionRate: 10,
  salaryCalculationMode: 'gross-to-net',
  employmentTypeRules: DEFAULT_EMPLOYMENT_TYPE_RULES,
  prorateMidMonth: false,
};

export const DEFAULT_PAYE_VARIABLES: PayeTaxVariables = {
  craBase: 800000,
  rentReliefRate: 0.20,
  rentReliefCap: 500000,
  taxBrackets: [
    { id: 'tb-1', label: 'First ₦2.2m', upTo: 2200000, rate: 0.15 },
    { id: 'tb-2', label: 'Next ₦9m', upTo: 11200000, rate: 0.18 },
    { id: 'tb-3', label: 'Next ₦13m', upTo: 24200000, rate: 0.21 },
    { id: 'tb-4', label: 'Next ₦25m', upTo: 49200000, rate: 0.23 },
    { id: 'tb-5', label: 'Above ₦49.2m', upTo: null, rate: 0.25 },
  ],
  extraConditions: [
    { id: 'ec-1', label: 'Life Assurance Premium', amount: 0, enabled: false },
    { id: 'ec-2', label: 'National Housing Fund (NHF)', amount: 0, enabled: false },
  ],
};

export function getEmployeeGrossForPeriod(emp: Employee, monthKey?: string, year?: number): number {
  if (year && monthKey && emp.monthlySalaries?.[`${year}-${monthKey}`] !== undefined) {
    const val = Number(emp.monthlySalaries[`${year}-${monthKey}`]);
    if (!isNaN(val) && val >= 0) return val;
  }
  if (monthKey && emp.monthlySalaries?.[monthKey] !== undefined) {
    const val = Number(emp.monthlySalaries[monthKey]);
    if (!isNaN(val) && val >= 0) return val;
  }
  return Number(emp.monthlyGross) || 0;
}

export function getEmployeeRentForYear(emp?: Employee | null, year?: number): number {
  if (year && emp?.annualRents) {
    if (emp.annualRents[year] !== undefined && !isNaN(Number(emp.annualRents[year]))) {
      return Math.max(0, Number(emp.annualRents[year]));
    }
    if (emp.annualRents[String(year)] !== undefined && !isNaN(Number(emp.annualRents[String(year)]))) {
      return Math.max(0, Number(emp.annualRents[String(year)]));
    }
  }
  return Math.max(0, Number(emp?.annualRent) || 0);
}

/**
 * Computes statutory emoluments, pension, CRA, PAYE tax, and net pay given a Gross salary.
 */
export function computeDeductionsFromGross(
  gross: number,
  emp: Employee,
  payrollVars: PayrollVariables = DEFAULT_PAYROLL_VARIABLES,
  payeVars: PayeTaxVariables = DEFAULT_PAYE_VARIABLES,
  year?: number
) {
  const safeGross = Math.max(0, Number(gross) || 0);
  const safePayrollVars = payrollVars || DEFAULT_PAYROLL_VARIABLES;
  const safePayeVars = payeVars || DEFAULT_PAYE_VARIABLES;

  const basic = safeGross * ((safePayrollVars.basic ?? 40) / 100);
  const housing = safeGross * ((safePayrollVars.housing ?? 15) / 100);
  const transport = safeGross * ((safePayrollVars.transport ?? 15) / 100);
  const otherAllowances = safeGross * ((safePayrollVars.otherAllowances ?? 30) / 100);
  const pensionableBHT = basic + housing + transport;

  const hasPension = Boolean(emp?.hasPension);
  const employeePension = hasPension 
    ? pensionableBHT * ((safePayrollVars.employeePensionRate ?? 8) / 100) 
    : 0;
  const employerPension = hasPension 
    ? pensionableBHT * ((safePayrollVars.employerPensionRate ?? 10) / 100) 
    : 0;
  const annualEmpPension = employeePension * 12;

  const annualGross = safeGross * 12;
  let rentRelief = 0;
  let pensionRelief = 0;
  let extraReliefs = 0;
  let totalCra = 0;
  let taxableIncome = 0;
  let annualTax = 0;
  let monthlyPaye = 0;

  if (emp?.hasPaye) {
    const craBase = safePayeVars.craBase ?? DEFAULT_PAYE_VARIABLES.craBase;
    const effectiveRent = getEmployeeRentForYear(emp, year);
    rentRelief = Math.min((effectiveRent || 0) * (safePayeVars.rentReliefRate ?? 0.20), safePayeVars.rentReliefCap ?? 500000);
    pensionRelief = annualEmpPension;
    extraReliefs = (safePayeVars.extraConditions || [])
      .filter(c => c && c.enabled)
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    totalCra = craBase + rentRelief + pensionRelief + extraReliefs;
    taxableIncome = Math.max(annualGross - totalCra, 0);

    if (taxableIncome > 0) {
      const rawBrackets = (safePayeVars.taxBrackets && Array.isArray(safePayeVars.taxBrackets) && safePayeVars.taxBrackets.length > 0)
        ? safePayeVars.taxBrackets
        : DEFAULT_PAYE_VARIABLES.taxBrackets;

      const sortedBrackets = [...rawBrackets].sort((a, b) => {
        if (a.upTo === null) return 1;
        if (b.upTo === null) return -1;
        return (a.upTo || 0) - (b.upTo || 0);
      });

      let remainingTaxable = taxableIncome;
      let previousLimit = 0;

      for (const bracket of sortedBrackets) {
        if (remainingTaxable <= 0) break;

        let taxableInBucket = 0;
        if (bracket.upTo === null) {
          taxableInBucket = remainingTaxable;
        } else {
          const bracketSize = Math.max(0, (bracket.upTo || 0) - previousLimit);
          taxableInBucket = Math.min(remainingTaxable, bracketSize);
          previousLimit = bracket.upTo || 0;
        }

        annualTax += taxableInBucket * (bracket.rate || 0);
        remainingTaxable -= taxableInBucket;
      }
    }

    monthlyPaye = annualTax / 12;
  }

  const totalDeductions = monthlyPaye + employeePension;
  const netTakeHome = safeGross - totalDeductions;
  const employerTotalCost = safeGross + employerPension;

  return {
    basic,
    housing,
    transport,
    otherAllowances,
    pensionableBHT,
    employeePension,
    employerPension,
    annualGross,
    rentRelief,
    pensionRelief,
    extraReliefs,
    totalCra,
    taxableIncome,
    annualTax,
    monthlyPaye,
    totalDeductions,
    netTakeHome,
    employerTotalCost,
  };
}

/**
 * Backtracks from target Net Take-Home Pay to find the exact required Gross Salary.
 * Uses high-precision binary search (accurate to 0.00001 Naira).
 */
export function solveGrossFromNet(
  targetNet: number,
  emp: Employee,
  payrollVars: PayrollVariables,
  payeVars: PayeTaxVariables,
  year?: number
): number {
  if (targetNet <= 0) return 0;
  if (!emp.hasPension && !emp.hasPaye) return targetNet;

  let low = targetNet;
  let high = targetNet * 2;

  // Ensure high bracket produces net >= targetNet
  while (computeDeductionsFromGross(high, emp, payrollVars, payeVars, year).netTakeHome < targetNet) {
    high *= 1.5;
    if (high > targetNet * 15) break; // Guard against infinite loop
  }

  // 40 binary search iterations gives precision within 0.00001 Naira
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const computedNet = computeDeductionsFromGross(mid, emp, payrollVars, payeVars, year).netTakeHome;
    if (computedNet < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

export function calculatePayrollItem(
  emp: Employee,
  payrollVars: PayrollVariables = DEFAULT_PAYROLL_VARIABLES,
  payeVars: PayeTaxVariables = DEFAULT_PAYE_VARIABLES,
  monthKey?: string,
  year?: number
): CalculatedPayrollItem {
  const mode = payrollVars.salaryCalculationMode || 'gross-to-net';
  let recordedAmount = getEmployeeGrossForPeriod(emp, monthKey, year);

  // If mid-month proration is enabled and employee does not have an explicit monthly override for this period
  const hasExplicitOverride = Boolean(
    (year && monthKey && emp.monthlySalaries?.[`${year}-${monthKey}`] !== undefined) ||
    (monthKey && emp.monthlySalaries?.[monthKey] !== undefined)
  );

  if (payrollVars.prorateMidMonth && !hasExplicitOverride && monthKey && year) {
    const ratio = getMidMonthProrationRatio(emp, year, monthKey);
    if (ratio < 1 && ratio > 0) {
      recordedAmount = Math.round(recordedAmount * ratio * 100) / 100;
    }
  }

  // If in Net-to-Gross mode, backtrack to find required Gross; otherwise use recordedAmount directly as Gross
  let gross = recordedAmount;
  if (mode === 'net-to-gross' && recordedAmount > 0) {
    gross = solveGrossFromNet(recordedAmount, emp, payrollVars, payeVars, year);
  }

  const result = computeDeductionsFromGross(gross, emp, payrollVars, payeVars, year);

  // In Net-to-Gross mode, lock netTakeHome to the exact intended target recorded amount
  const finalNetTakeHome = (mode === 'net-to-gross' && recordedAmount > 0)
    ? recordedAmount
    : result.netTakeHome;

  return {
    employeeId: emp.id,
    employeeCode: emp.code,
    fullName: `${emp.firstName} ${emp.lastName}`.trim(),
    department: emp.department,
    position: emp.position,
    bankName: emp.bankName,
    accountNumber: emp.accountNumber,
    payeNumber: emp.payeNumber || '',
    pensionNumber: emp.pensionNumber || '',
    pfaName: emp.pfaName || '',
    monthlyGross: gross,
    basic: result.basic,
    housing: result.housing,
    transport: result.transport,
    otherAllowances: result.otherAllowances,
    pensionableBHT: result.pensionableBHT,
    employeePension: result.employeePension,
    employerPension: result.employerPension,
    annualGross: result.annualGross,
    rentRelief: result.rentRelief,
    pensionRelief: result.pensionRelief,
    extraReliefs: result.extraReliefs,
    totalCra: result.totalCra,
    taxableIncome: result.taxableIncome,
    annualTax: result.annualTax,
    monthlyPaye: result.monthlyPaye,
    totalDeductions: result.totalDeductions,
    netTakeHome: finalNetTakeHome,
    employerTotalCost: result.employerTotalCost,
    hasPension: Boolean(emp.hasPension),
    hasPaye: emp.hasPaye,
    employmentType: emp.employmentType || 'Full-Time',
    targetNetPay: mode === 'net-to-gross' ? recordedAmount : undefined,
    calculationMode: mode,
  };
}

export function formatNaira(amount: number): string {
  const value = Number(amount) || 0;
  if (typeof window !== 'undefined' && getPrivacyMaskPreference()) {
    return '₦••••••';
  }
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-₦${formatted}` : `₦${formatted}`;
}

export function formatCompactNaira(amount: number): string {
  const val = Number(amount) || 0;
  if (typeof window !== 'undefined' && getPrivacyMaskPreference()) {
    return '₦••••••';
  }
  const isNeg = val < 0;
  const abs = Math.abs(val);
  const sign = isNeg ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}₦${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}₦${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}₦${(abs / 1_000).toFixed(1)}k`;
  }
  return formatNaira(val);
}

export { formatDate, formatDateTime, isEmployeeActiveForPeriod, getMidMonthProrationRatio, getScheduleWorkdays } from './dateUtils';

