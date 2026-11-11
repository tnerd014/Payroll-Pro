export const DEFAULT_SECURITY_QUESTIONS: string[] = [
  "What is your company's CAC/RC registration number?",
  "In what year was this company established?",
  "In what city was this business first registered?",
  "What was the name of your first client, branch, or founder?",
  "Write your own custom question..."
];

export interface CompanyAccount {
  id: string;
  name: string;
  subtitle?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  hasPassword?: boolean;
  password?: string;
  passwordHint?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  createdAt?: string;
  lastActiveAt?: string;
}

export interface CompanyProfile {
  id?: string;
  name: string;
  subtitle: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string; // base64 or image url
  hasPassword?: boolean;
  password?: string;
  passwordHint?: string;
  securityQuestion?: string;
  securityAnswer?: string;
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
  annualRents?: Record<string | number, number>; // key: year e.g. "2026" or 2026
  bankName: string;
  accountNumber: string;
  hasPension: boolean;
  hasPaye: boolean;
  payeNumber?: string; // State IRS Taxpayer ID / PAYE No
  pensionNumber?: string; // RSA PIN
  pfaName?: string; // Pension Fund Administrator
  status: 'Active' | 'Inactive';
  employmentType?: string; // 'Full-Time' | 'Part-Time' | 'Contract' | 'Intern / NYSC'
  stateOfResidence?: string; // Nigerian State for PAYE Remittance (e.g. Lagos, Ogun, FCT Abuja)
  startDate?: string; // ISO date YYYY-MM-DD
  endDate?: string; // ISO date YYYY-MM-DD (exit/termination date)
  originalHireDate?: string; // ISO date YYYY-MM-DD (first ever hire date)
  stints?: EmploymentStint[]; // Historical and active employment stints
  workSchedule?: WorkSchedule; // '5-day' (Mon-Fri) | '6-day' (Mon-Sat)
  updatedAt?: string; // ISO timestamp for conflict resolution
}

export type WorkSchedule = '5-day' | '6-day';

export interface EmploymentStint {
  stintId: string;
  startDate: string; // ISO date YYYY-MM-DD
  endDate?: string; // ISO date YYYY-MM-DD (empty if ongoing)
  exitReason?: string; // e.g. 'Resignation' | 'Contract Ended' | 'Termination' | 'Retirement' | 'Other'
  notes?: string;
}

export type SalaryCalculationMode = 'gross-to-net' | 'net-to-gross';

export interface EmploymentTypeRule {
  id: string;
  name: string; // e.g. 'Full-Time', 'Part-Time', 'Contract', 'Intern / NYSC'
  hasPayeDefault: boolean;
  hasPensionDefault: boolean;
  description?: string;
}

export type WorkdayDivisorRule = 'actual_weekdays' | 'fixed_standard' | 'calendar_days';
export type Section5CapEnforcement = 'strict_block' | 'advisory_warning';

export interface PayrollVariables {
  basic: number;
  housing: number;
  transport: number;
  otherAllowances: number;
  employeePensionRate: number;
  employerPensionRate: number;
  salaryCalculationMode?: SalaryCalculationMode;
  employmentTypeRules?: EmploymentTypeRule[];
  prorateMidMonth?: boolean;
  workdayDivisorRule?: WorkdayDivisorRule;
  section5CapEnforcement?: Section5CapEnforcement;
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
  loanDeduction?: number;
  workSchedule?: WorkSchedule;
  contractualGross?: number;
  unpaidAbsenceDays?: number;
  unpaidAbsenceDeduction?: number;
  effectiveGross?: number;
  contributionDeduction?: number;
  contributionDetails?: Array<{ schemeName: string; amount: number }>;
  isSection5CapExceeded?: boolean;
  section5MaxAllowedDeductions?: number;
}

export type LoanType = 'Staff Loan' | 'Salary Advance';
export type LoanStatus = 'Active' | 'Paid' | 'Paused';

export interface LoanRepaymentRecord {
  id: string;
  periodKey: string; // e.g. "2026-jan"
  amount: number;
  paidAt: string;
  notes?: string;
}

export interface EmployeeLoan {
  id: string;
  employeeId: string;
  type: LoanType;
  principalAmount: number;
  monthlyDeduction: number;
  totalRepaid: number;
  remainingBalance: number;
  startPeriodKey: string; // e.g. "2026-jan"
  status: LoanStatus;
  createdAt: string;
  disbursementDate?: string;
  repaymentDate?: string;
  repaymentStartDate?: string;
  notes?: string;
  description?: string;
  history?: LoanRepaymentRecord[];
}

export interface PayrollSnapshotTotals {
  totalGross: number;
  totalNet: number;
  totalPaye: number;
  totalEmpPension: number;
  totalCompPension: number;
  totalEmployerCost: number;
  staffCount: number;
  totalLoansDeducted?: number;
  totalContributionsDeducted?: number;
  totalAbsenceDeducted?: number;
}

export interface ContributionScheme {
  id: string;
  name: string; // e.g. 'Staff Welfare Fund', 'Cooperative Society', 'Thrift / Ajo'
  description?: string;
  defaultAmount?: number;
  defaultMode?: 'fixed' | 'percentage_basic' | 'percentage_gross';
  isDefault?: boolean;
}

export interface EmployeeContribution {
  id: string;
  employeeId: string;
  periodKey: string; // e.g. "2026-nov"
  schemeName: string; // e.g. "Staff Welfare Fund"
  amount: number;
  isPercentage?: boolean;
  rate?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ContributionPayout {
  id: string;
  employeeId: string;
  schemeName: string;
  amount: number;
  payoutDate: string; // ISO date YYYY-MM-DD
  reason: 'annual_payout' | 'partial_withdrawal' | 'exit_settlement' | 'other';
  paymentMethod: 'bank_transfer' | 'cheque' | 'cash';
  referenceNo?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmployeeContributionSummary {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
  schemeName: string;
  totalContributed: number;
  totalDisbursed: number;
  currentBalance: number;
  lastContributionDate?: string;
  lastPayoutDate?: string;
}

export type AbsenceType = 
  | 'unauthorized_absence' 
  | 'unpaid_leave' 
  | 'suspension_half_pay' 
  | 'suspension_unpaid';

export interface EmployeeAbsenceRecord {
  id: string;
  employeeId: string;
  periodKey: string; // e.g. "2026-nov"
  daysAbsent: number; // e.g. 2, 0.5
  absenceType: AbsenceType;
  deductionAmount: number;
  customOverride?: boolean;
  notes?: string;
  dates?: string[];
  createdAt: string;
  updatedAt?: string;
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
  | 'loans'
  | 'contributions'
  | 'absences'
  | 'payslip-designer'
  | 'payslips'
  | 'analytics' 
  | 'settings' 
  | 'variables' 
  | 'excel'
  | 'profile';

export type PayslipSectionId = 
  | 'company_header'
  | 'pay_period_banner'
  | 'employee_meta'
  | 'earnings'
  | 'deductions'
  | 'net_pay'
  | 'employer_contributions'
  | 'bank_details'
  | 'signatures'
  | 'footer_notes';

export interface PayslipSectionConfig {
  id: PayslipSectionId;
  label: string;
  enabled: boolean;
}

export type PayslipThemeColor = 
  | 'slate' 
  | 'indigo' 
  | 'emerald' 
  | 'blue' 
  | 'rose' 
  | 'amber' 
  | 'zinc' 
  | 'black';

export type PayslipHeaderLayout = 'modern' | 'centered' | 'banner' | 'clean' | 'split';
export type PayslipFontFamily = 'sans' | 'serif' | 'mono';
export type PayslipFontSize = 'compact' | 'standard' | 'large' | 'xl';
export type NetPayFontSize = 'small' | 'standard' | 'large' | 'xl';
export type BreakdownFontSize = 'small' | 'standard' | 'large' | 'xl';
export type PayslipDensity = 'compact' | 'standard' | 'spacious';
export type PayslipWatermark = 'none' | 'confidential' | 'official' | 'copy' | 'paid' | 'custom';

export const PRESET_HEX_MAP: Record<string, string> = {
  slate: '#18181b',
  indigo: '#4f46e5',
  emerald: '#059669',
  blue: '#2563eb',
  rose: '#e11d48',
  amber: '#d97706',
  zinc: '#52525b',
  black: '#000000',
};

export interface PayslipCustomPreset {
  id: string;
  name: string;
  createdAt: string;
  design: PayslipDesignConfig;
}

export interface PayslipDesignConfig {
  themeColor: PayslipThemeColor | string;
  customColor?: string; // Custom hex code from color picker, e.g. "#0A3871"
  accentTintStyle?: 'soft' | 'solid' | 'minimal'; // Soft tint, bold solid, or minimal outline
  headerLayout: PayslipHeaderLayout;
  fontFamily: PayslipFontFamily;
  fontSize?: PayslipFontSize; // 'compact' | 'standard' | 'large' | 'xl'
  fontScale?: number;         // percentage, e.g. 88, 100, 114, 128
  density: PayslipDensity;
  showLogo: boolean;
  logoPosition: 'left' | 'center' | 'right';
  showCompanyAddress: boolean;
  showCompanyPhoneEmail: boolean;
  watermark: PayslipWatermark | string;
  customWatermarkText?: string;
  watermarkOpacity?: number;
  
  // Table & visual polish
  tableStyle?: 'minimal' | 'striped' | 'bordered';
  cornerRadius?: 'none' | 'sm' | 'md' | 'lg';
  
  // Custom text headers & section labels
  payslipTitle: string;
  payslipSubtitle: string;
  earningsTitle: string;
  deductionsTitle: string;
  netPayTitle: string;
  netPaySubtitle?: string;     // e.g. "Confirmed electronic bank transfer remittance"
  netPayFontSize?: NetPayFontSize; // 'small' | 'standard' | 'large' | 'xl'
  breakdownFontSize?: BreakdownFontSize; // 'small' | 'standard' | 'large' | 'xl' (Earnings & Deductions numbers and text scale)
  grossPayLabel: string;        // e.g. "Total Emolument" or "Total Gross Remuneration"
  totalDeductionsLabel: string; // e.g. "Total Deductions"
  welfareFundLabel?: string;    // Custom label for Staff Welfare / Cooperative Savings / Welfare Fund on payslip
  employerCostLabel: string;    // e.g. "Total Employer Cost"
  footerNote: string;
  
  // Columns & layout style
  breakdownLayout: 'two-column' | 'single-column';
  showBorders: boolean;
  showDividers: boolean;
  roundedCorners: boolean;
  
  // Reorderable sections
  sectionOrder: PayslipSectionConfig[];

  // Visible individual columns/fields
  visibleColumns?: string[];
}

export interface PayslipColumnDef {
  id: string;
  label: string;
  sectionId: PayslipSectionId;
  defaultChecked: boolean;
}

export const ALL_PAYSLIP_COLUMNS: PayslipColumnDef[] = [
  // Company Header & Logo
  { id: 'hdr_logo', label: 'Company Logo', sectionId: 'company_header', defaultChecked: true },
  { id: 'hdr_company_name', label: 'Company Name', sectionId: 'company_header', defaultChecked: true },
  { id: 'hdr_subtitle', label: 'Company Subtitle / Tagline', sectionId: 'company_header', defaultChecked: true },
  { id: 'company_address', label: 'Company Address', sectionId: 'company_header', defaultChecked: true },
  { id: 'hdr_contact', label: 'Phone & Email', sectionId: 'company_header', defaultChecked: true },
  { id: 'hdr_payslip_title', label: 'Payslip Title', sectionId: 'company_header', defaultChecked: true },
  { id: 'hdr_period', label: 'Month & Year', sectionId: 'company_header', defaultChecked: true },
  { id: 'hdr_payslip_subtitle', label: 'Statement Subtitle (e.g. Confidential)', sectionId: 'company_header', defaultChecked: true },

  // Pay Period & Status Banner
  { id: 'pay_period', label: 'Pay Cycle (Month & Year)', sectionId: 'pay_period_banner', defaultChecked: true },
  { id: 'banner_status', label: 'Disbursed & Verified Badge', sectionId: 'pay_period_banner', defaultChecked: true },
  { id: 'banner_currency', label: 'Currency (NGN ₦)', sectionId: 'pay_period_banner', defaultChecked: true },

  // Employee Information
  { id: 'employee_name', label: 'Employee Full Name', sectionId: 'employee_meta', defaultChecked: true },
  { id: 'staff_code', label: 'Staff Code / ID', sectionId: 'employee_meta', defaultChecked: true },
  { id: 'department', label: 'Department', sectionId: 'employee_meta', defaultChecked: true },
  { id: 'position', label: 'Designation / Job Role', sectionId: 'employee_meta', defaultChecked: true },
  { id: 'bank_name', label: 'Bank Name', sectionId: 'employee_meta', defaultChecked: true },
  { id: 'account_number', label: 'Account Number', sectionId: 'employee_meta', defaultChecked: true },
  { id: 'tax_id', label: 'PAYE / Tax ID No', sectionId: 'employee_meta', defaultChecked: true },
  { id: 'pension_rsa', label: 'Pension RSA PIN & PFA', sectionId: 'employee_meta', defaultChecked: true },

  // Earnings Components
  { id: 'basic_salary', label: 'Basic Salary', sectionId: 'earnings', defaultChecked: true },
  { id: 'housing', label: 'Housing Allowance', sectionId: 'earnings', defaultChecked: true },
  { id: 'transport', label: 'Transport Allowance', sectionId: 'earnings', defaultChecked: true },
  { id: 'other_allowances', label: 'Other Allowances', sectionId: 'earnings', defaultChecked: true },
  { id: 'unpaid_absence', label: 'Unpaid Absence / Days Not Worked', sectionId: 'earnings', defaultChecked: true },
  { id: 'gross_pay', label: 'Total Gross Remuneration', sectionId: 'earnings', defaultChecked: true },

  // Statutory Deductions & Taxes
  { id: 'paye_tax', label: 'PAYE Income Tax', sectionId: 'deductions', defaultChecked: true },
  { id: 'employee_pension', label: 'Employee Pension (8%)', sectionId: 'deductions', defaultChecked: true },
  { id: 'loan_deduction', label: 'Loan / Advance Repayment', sectionId: 'deductions', defaultChecked: true },
  { id: 'contribution_deduction', label: 'Staff Welfare / Cooperative Savings', sectionId: 'deductions', defaultChecked: true },
  { id: 'total_deductions', label: 'Total Deductions', sectionId: 'deductions', defaultChecked: true },

  // Net Pay & Summary
  { id: 'net_pay', label: 'Net Take-Home Highlight Card', sectionId: 'net_pay', defaultChecked: true },

  // Employer Contributions
  { id: 'employer_pension', label: 'Employer Statutory Pension (10%)', sectionId: 'employer_contributions', defaultChecked: true },
  { id: 'employer_cost', label: 'Total Employer Monthly Cost', sectionId: 'employer_contributions', defaultChecked: true },

  // Bank Disbursement
  { id: 'bank_details', label: 'Disbursement Details Card', sectionId: 'bank_details', defaultChecked: true },

  // Signatures & Footer
  { id: 'signatures', label: 'Signatures / Approval Block', sectionId: 'signatures', defaultChecked: false },
  { id: 'footer_notes', label: 'Footer Disclaimer & Security ID', sectionId: 'footer_notes', defaultChecked: true },
];

export const DEFAULT_COLUMNS = ALL_PAYSLIP_COLUMNS.filter(c => c.defaultChecked).map(c => c.id);

/**
 * Migrates column selections saved before the header/banner fields were split.
 * Older saves only knew `company_address` (header) and `pay_period` (banner),
 * so the newly added fields are switched on to preserve the previous look.
 */
const HEADER_FIELD_IDS = ['hdr_logo', 'hdr_company_name', 'hdr_subtitle', 'hdr_contact', 'hdr_payslip_title', 'hdr_period', 'hdr_payslip_subtitle'];
const BANNER_FIELD_IDS = ['banner_status', 'banner_currency'];

export function normalizeVisibleColumns(cols: string[]): string[] {
  const result = [...cols];
  const hasNewHeader = HEADER_FIELD_IDS.some(id => result.includes(id));
  if (!hasNewHeader) {
    HEADER_FIELD_IDS.filter(id => id !== 'hdr_contact').forEach(id => result.push(id));
    if (cols.includes('company_address')) result.push('hdr_contact');
  }
  const hasNewBanner = BANNER_FIELD_IDS.some(id => result.includes(id));
  if (!hasNewBanner && result.includes('pay_period')) {
    BANNER_FIELD_IDS.forEach(id => result.push(id));
  }
  return Array.from(new Set(result));
}

export const DEFAULT_PAYSLIP_DESIGN: PayslipDesignConfig = {
  themeColor: 'slate',
  customColor: '#18181b',
  accentTintStyle: 'soft',
  headerLayout: 'modern',
  fontFamily: 'sans',
  fontSize: 'standard',
  fontScale: 100,
  density: 'standard',
  showLogo: true,
  logoPosition: 'left',
  showCompanyAddress: true,
  showCompanyPhoneEmail: true,
  watermark: 'none',
  customWatermarkText: '',
  watermarkOpacity: 0.06,
  tableStyle: 'minimal',
  cornerRadius: 'md',
  
  payslipTitle: 'OFFICIAL SALARY PAYSLIP',
  payslipSubtitle: 'Strictly Private & Confidential',
  earningsTitle: 'Earnings Breakdown',
  deductionsTitle: 'Statutory Deductions',
  netPayTitle: 'Net Take-Home Pay',
  netPaySubtitle: '',
  netPayFontSize: 'standard',
  breakdownFontSize: 'standard',
  grossPayLabel: 'Total Gross Remuneration',
  totalDeductionsLabel: 'Total Deductions',
  welfareFundLabel: 'Staff Welfare Fund',
  employerCostLabel: 'Total Employer Cost',
  footerNote: 'This is a computer-generated payslip. Contact HR or Accounts for any payroll queries.',
  
  breakdownLayout: 'two-column',
  showBorders: true,
  showDividers: true,
  roundedCorners: true,
  
  sectionOrder: [
    { id: 'company_header', label: 'Company Header & Logo', enabled: true },
    { id: 'pay_period_banner', label: 'Pay Period & Status Banner', enabled: true },
    { id: 'employee_meta', label: 'Employee Information Grid', enabled: true },
    { id: 'earnings', label: 'Earnings Breakdown', enabled: true },
    { id: 'deductions', label: 'Deductions Breakdown', enabled: true },
    { id: 'net_pay', label: 'Net Take-Home Highlight Card', enabled: true },
    { id: 'employer_contributions', label: 'Employer Contributions & Total Cost', enabled: true },
    { id: 'bank_details', label: 'Bank Disbursement Details', enabled: true },
    { id: 'signatures', label: 'Signatures & Authorization Block', enabled: false },
    { id: 'footer_notes', label: 'Footer Disclaimer & Notes', enabled: true },
  ],
  visibleColumns: DEFAULT_COLUMNS,
};

export interface ResetOptions {
  resetEmployees: boolean;
  resetSnapshots: boolean;
  resetVariables: boolean;
  resetCompany: boolean;
  resetDepartments: boolean;
}

export type TeamMemberRole = 'Admin' | 'Payroll Officer' | 'Auditor';

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  username?: string;
  phone?: string;
  avatarColor?: string;
  role: TeamMemberRole;
  pin?: string;
  password?: string;
  passwordHint?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  recoveryEmail?: string;
  tempPassword?: string;
  mustChangePassword?: boolean;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string[];
  biometricEnabled?: boolean;
  biometricDeviceName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  companyId?: string;
  companyName?: string;
  actorId?: string;
  actorName: string;
  action: string;
  details: string;
  ipOrDevice?: string;
  createdAt: string;
}

export type EmailProviderType = 'smtp' | 'resend';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export type WhatsAppProviderType = 'direct' | 'cloud_api' | 'ultramsg' | 'termii';

export interface WhatsAppCloudApiConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
  apiVersion?: string; // default "v20.0"
}

export interface WhatsAppUltraMsgConfig {
  instanceId: string;
  token: string;
}

export interface WhatsAppTermiiConfig {
  apiKey: string;
  deviceId: string;
  templateId?: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  provider: WhatsAppProviderType; // 'direct' (wa.me instant links) | 'cloud_api' | 'ultramsg' | 'termii'
  cloudApi: WhatsAppCloudApiConfig;
  ultramsg: WhatsAppUltraMsgConfig;
  ultraMsg?: WhatsAppUltraMsgConfig;
  termii: WhatsAppTermiiConfig;
  defaultMessageTemplate: string;
  includeNetPay: boolean;
  includeBreakdown: boolean;
  includePortalLink: boolean;
  portalUrl?: string;
  downloadPdfOnDirect?: boolean;
}

export const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  enabled: true,
  provider: 'direct',
  cloudApi: {
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
    apiVersion: 'v20.0',
  },
  ultramsg: {
    instanceId: '',
    token: '',
  },
  termii: {
    apiKey: '',
    deviceId: '',
    templateId: '',
  },
  defaultMessageTemplate: `Hello {{employeeName}},

Your official salary payslip for {{month}} {{year}} from {{companyName}} is ready.

• Staff ID: {{employeeCode}}
• Department: {{department}}
• Net Take-Home: {{netPay}}

Please find your official payslip attached. Contact Accounts / HR for any remuneration questions.

Best regards,
{{companyName}}`,
  includeNetPay: true,
  includeBreakdown: false,
  includePortalLink: false,
  portalUrl: '',
};

export interface EmailSettings {
  provider: EmailProviderType;
  smtp: SmtpConfig;
  resend: ResendConfig;
  defaultSubjectTemplate: string;
  defaultBodyTemplate: string;
  attachPdf: boolean;
  replyTo?: string;
  whatsapp?: WhatsAppSettings;
}

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  provider: 'smtp',
  smtp: {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: '',
    pass: '',
    fromName: 'Payroll Pro Accounts',
    fromEmail: '',
  },
  resend: {
    apiKey: '',
    fromEmail: 'onboarding@resend.dev',
    fromName: 'Payroll Pro Accounts',
  },
  defaultSubjectTemplate: 'Payslip for {{month}} {{year}} - {{companyName}}',
  defaultBodyTemplate: `Dear {{employeeName}},

Please find attached your official payslip for {{month}} {{year}}.

Employee ID: {{employeeCode}}
Department: {{department}}
Net Take-Home: {{netPay}}

If you have any questions regarding your remuneration or deductions, please contact the Accounts / Human Resources department.

Best regards,
{{companyName}}`,
  attachPdf: true,
};

export interface EmailRecipientStatus {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  department: string;
  email: string;
  netPayFormatted: string;
  selected: boolean;
  status: 'idle' | 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';
  error?: string;
}

export interface EmailSendHistoryItem {
  sentAt: string; // ISO timestamp
  recipientEmail: string;
  messageId?: string;
  version?: number; // Snapshot/revision version
  netPay?: number; // Net pay snapshot at time of send
  sentBy?: string; // Admin user who triggered send
  status: 'sent' | 'failed';
  error?: string;
}

export interface EmailedPayslipRecord {
  employeeId: string;
  periodKey: string; // e.g. "2026-oct"
  sentAt: string; // ISO timestamp of most recent dispatch
  recipientEmail: string;
  messageId?: string;
  version?: number; // Payroll version at latest dispatch
  sendCount?: number; // Total number of times sent for this period
  netPayAtSend?: number; // Last sent net pay (to detect revisions)
  history?: EmailSendHistoryItem[]; // Full audit trail of all previous dispatches
}

export interface EmailPayslipContext {
  selectedEmployeeIds?: string[];
  selectedMonthKeys?: string[];
  year?: number;
}

export type { AppState } from './store/usePayrollStore';
