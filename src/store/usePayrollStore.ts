import { useState, useEffect } from 'react';
import { 
  Employee, 
  PayrollVariables, 
  PayeTaxVariables, 
  CalculatedPayrollItem, 
  PayrollSnapshot, 
  AppView,
  CompanyProfile,
  CompanyAccount,
  ResetOptions,
  PayslipDesignConfig,
  PayslipCustomPreset,
  DEFAULT_PAYSLIP_DESIGN,
  EmployeeLoan,
  LoanRepaymentRecord,
  LoanStatus,
  LoanType
} from '../types';
import { 
  DEFAULT_PAYROLL_VARIABLES, 
  DEFAULT_PAYE_VARIABLES, 
  DEFAULT_EMPLOYMENT_TYPE_RULES,
  calculatePayrollItem 
} from '../engine/payePensionEngine';

export const STORAGE_KEY = 'PAYROLL_PRO_LOCAL_STORAGE_V5';
export const COMPANIES_REGISTRY_KEY = 'PAYROLL_PRO_COMPANIES_REGISTRY_V1';
export const COMPANY_DATA_PREFIX = 'PAYROLL_PRO_DATA_COMPANY_';
export const THEME_PREFERENCE_KEY = 'PAYROLL_PRO_THEME_PREF';

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

export const MONTH_KEY_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

export const getPeriodIndex = (periodKey?: string): number => {
  if (!periodKey) return 0;
  const parts = periodKey.split('-');
  const y = parseInt(parts[0], 10) || 0;
  const m = MONTH_KEY_INDEX[parts[1]?.toLowerCase()] ?? 0;
  return y * 12 + m;
};

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
  payslipDesign?: PayslipDesignConfig;
  savedPayslipPresets?: PayslipCustomPreset[];
  loans?: EmployeeLoan[];
}

export const INITIAL_SAMPLE_COMPANIES: CompanyAccount[] = [
  {
    id: 'comp-default',
    name: 'DEWATERING CONSTRUCTION ETC LIMITED',
    subtitle: 'Ground Water Control & Engineering Specialist',
    address: 'Plot 12, Commercial Avenue, Victoria Island, Lagos, Nigeria',
    phone: '+234 800 339 2837',
    email: 'info@dewateringconstruction.com',
    hasPassword: false,
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'comp-zenith-energy',
    name: 'ZENITH ENERGY & INFRASTRUCTURE LTD',
    subtitle: 'Offshore Drilling & Energy Logistics',
    address: 'Plot 87, Adeola Odeku Street, Victoria Island, Lagos',
    phone: '+234 1 270 3000',
    email: 'payroll@zenithenergy.ng',
    hasPassword: true,
    password: '1234',
    passwordHint: 'Default PIN is 1234',
    createdAt: '2026-01-20T09:30:00.000Z',
  },
  {
    id: 'comp-paystack',
    name: 'PAYSTACK PAYMENTS NIGERIA LTD',
    subtitle: 'Online & In-Person Merchant Gateways',
    address: '126 Joel Ogunnaike Street, GRA Ikeja, Lagos',
    phone: '+234 1 631 6160',
    email: 'hr@paystack.com',
    hasPassword: false,
    createdAt: '2026-02-01T10:15:00.000Z',
  },
  {
    id: 'comp-dangote',
    name: 'DANGOTE CEMENT PLC',
    subtitle: 'Industrial Manufacturing & Supply Chain',
    address: '1 Alfred Rewane Road, Falomo, Ikoyi, Lagos',
    phone: '+234 1 448 0815',
    email: 'careers@dangote-group.com',
    hasPassword: true,
    password: 'dangote',
    passwordHint: 'Founder name in lowercase',
    createdAt: '2026-02-05T11:00:00.000Z',
  },
  {
    id: 'comp-flutterwave',
    name: 'FLUTTERWAVE TECHNOLOGIES LTD',
    subtitle: 'Global Payments & Cross-Border Rails',
    address: '8 Providence Street, Lekki Phase 1, Lagos',
    phone: '+234 1 888 9595',
    email: 'finance@flutterwavego.com',
    hasPassword: false,
    createdAt: '2026-02-10T14:20:00.000Z',
  },
  {
    id: 'comp-access-holdings',
    name: 'ACCESS HOLDINGS PLC',
    subtitle: 'Banking, Pensions & Asset Management',
    address: 'Plot 999c, Danmole Street, Victoria Island, Lagos',
    phone: '+234 1 271 2005',
    email: 'payroll@accessholdings.com',
    hasPassword: true,
    password: 'access2026',
    passwordHint: 'access + current year',
    createdAt: '2026-02-15T08:45:00.000Z',
  },
  {
    id: 'comp-interswitch',
    name: 'INTERSWITCH GROUP',
    subtitle: 'Digital Commerce & Financial Switching',
    address: 'Oko Awo Street, Victoria Island, Lagos',
    phone: '+234 1 628 3888',
    email: 'accounts@interswitchgroup.com',
    hasPassword: false,
    createdAt: '2026-02-20T16:00:00.000Z',
  },
  {
    id: 'comp-julius-berger',
    name: 'JULIUS BERGER NIGERIA PLC',
    subtitle: 'Infrastructure, Civil Engineering & Roads',
    address: '10 Shettima A. Munguno Crescent, Utako, Abuja',
    phone: '+234 9 611 0000',
    email: 'info@julius-berger.com',
    hasPassword: false,
    createdAt: '2026-02-25T12:00:00.000Z',
  },
  {
    id: 'comp-mtn-nigeria',
    name: 'MTN NIGERIA COMMUNICATIONS PLC',
    subtitle: 'Telecommunications, 5G & Digital Services',
    address: 'Golden Plaza, Falomo, Ikoyi, Lagos',
    phone: '+234 803 100 0180',
    email: 'support@mtn.ng',
    hasPassword: true,
    password: 'mtn123',
    passwordHint: 'mtn + 123',
    createdAt: '2026-03-01T09:10:00.000Z',
  },
  {
    id: 'comp-air-peace',
    name: 'AIR PEACE AIRLINES LIMITED',
    subtitle: 'Commercial Aviation & Regional Cargo',
    address: '25 Sobo Arobiodu Street, GRA Ikeja, Lagos',
    phone: '+234 700 3592 4773',
    email: 'crew-payroll@flyairpeace.com',
    hasPassword: false,
    createdAt: '2026-03-05T13:40:00.000Z',
  },
  {
    id: 'comp-bua-foods',
    name: 'BUA FOODS PLC',
    subtitle: 'FMCG, Sugar Refining & Flour Mills',
    address: 'BUA Towers, Adetokunbo Ademola, VI, Lagos',
    phone: '+234 1 461 0669',
    email: 'buafoods@buagroup.com',
    hasPassword: false,
    createdAt: '2026-03-10T11:25:00.000Z',
  },
  {
    id: 'comp-totalenergies',
    name: 'TOTALENERGIES MARKETING NIGERIA',
    subtitle: 'Downstream Petroleum & Renewable Energy',
    address: '4 Churchgate Street, Victoria Island, Lagos',
    phone: '+234 1 262 1780',
    email: 'totalenergies.ng@totalenergies.com',
    hasPassword: true,
    password: 'energy',
    passwordHint: 'energy',
    createdAt: '2026-03-15T15:00:00.000Z',
  },
  {
    id: 'comp-fcmb',
    name: 'FIRST CITY MONUMENT BANK',
    subtitle: 'Retail & Commercial Banking Services',
    address: 'Primrose Tower, 17A Tinubu Street, Lagos Island',
    phone: '+234 1 279 8800',
    email: 'customerservice@fcmb.com',
    hasPassword: false,
    createdAt: '2026-03-20T10:05:00.000Z',
  },
  {
    id: 'comp-andela',
    name: 'ANDELA SOFTWARE AFRICA',
    subtitle: 'Global Engineering Talent & Distributed Teams',
    address: 'Ikorodu Road, Anthony, Lagos',
    phone: '+234 1 293 4900',
    email: 'talent@andela.com',
    hasPassword: false,
    createdAt: '2026-03-25T14:50:00.000Z',
  },
  {
    id: 'comp-seplat',
    name: 'SEPLAT ENERGY PLC',
    subtitle: 'Independent Oil & Natural Gas Exploration',
    address: '16A Temple Road, Ikoyi, Lagos',
    phone: '+234 1 277 0400',
    email: 'seplat@seplatenergy.com',
    hasPassword: true,
    password: 'seplat',
    passwordHint: 'Company name in lowercase',
    createdAt: '2026-04-01T08:30:00.000Z',
  },
  {
    id: 'comp-nb-plc',
    name: 'NIGERIAN BREWERIES PLC',
    subtitle: 'Brewing, Beverages & Consumer Goods',
    address: '1 Abebe Village Road, Iganmu, Lagos',
    phone: '+234 1 271 7400',
    email: 'corporate.affairs@nbplc.com',
    hasPassword: false,
    createdAt: '2026-04-05T17:15:00.000Z',
  },
  {
    id: 'comp-kuda',
    name: 'KUDA TECHNOLOGIES LTD',
    subtitle: 'Digital Banking & Mobile Microfinance',
    address: '1-11 Commercial Avenue, Yaba, Lagos',
    phone: '+234 1 633 5832',
    email: 'help@kuda.com',
    hasPassword: false,
    createdAt: '2026-04-10T12:00:00.000Z',
  },
  {
    id: 'comp-uac',
    name: 'UAC OF NIGERIA PLC',
    subtitle: 'Diversified Conglomerate & Real Estate',
    address: 'UAC House, 1-5 Odunlami Street, Marina, Lagos',
    phone: '+234 1 270 1879',
    email: 'info@uacnplc.com',
    hasPassword: true,
    password: 'uac2026',
    passwordHint: 'uac + year',
    createdAt: '2026-04-15T09:45:00.000Z',
  },
  {
    id: 'comp-moniepoint',
    name: 'MONIEPOINT FINANCIAL INC',
    subtitle: 'Agency Banking & Merchant Credit Terminals',
    address: 'Admiralty Way, Lekki Phase 1, Lagos',
    phone: '+234 1 888 8450',
    email: 'support@moniepoint.com',
    hasPassword: false,
    createdAt: '2026-04-20T16:30:00.000Z',
  },
  {
    id: 'comp-reddington',
    name: 'REDDINGTON HOSPITAL GROUP',
    subtitle: 'Tertiary Healthcare, Cardiology & Diagnostics',
    address: '12 Idowu Martins Street, Victoria Island, Lagos',
    phone: '+234 1 271 5340',
    email: 'records@reddingtonhospital.com',
    hasPassword: true,
    password: 'health',
    passwordHint: 'health',
    createdAt: '2026-04-25T11:15:00.000Z',
  },
  {
    id: 'comp-gtco',
    name: 'GUARANTY TRUST HOLDING COMPANY (GTCO)',
    subtitle: 'Commercial Banking & Wealth Management',
    address: '635 Akin Adesola Street, Victoria Island, Lagos',
    phone: '+234 1 448 0000',
    email: 'enquiries@gtcoplc.com',
    hasPassword: false,
    createdAt: '2026-05-01T08:00:00.000Z',
  },
  {
    id: 'comp-airtel',
    name: 'AIRTEL NETWORKS NIGERIA LTD',
    subtitle: 'Telecommunications & Broadband Infrastructure',
    address: 'Plot 2 & 6 Banana Island Road, Ikoyi, Lagos',
    phone: '+234 802 222 1111',
    email: 'customercare@ng.airtel.com',
    hasPassword: true,
    password: 'airtel',
    passwordHint: 'airtel',
    createdAt: '2026-05-03T09:20:00.000Z',
  },
  {
    id: 'comp-nestle',
    name: 'NESTLE NIGERIA PLC',
    subtitle: 'Food Processing, Nutrition & Consumer Brands',
    address: '22/24 Industrial Avenue, Ilupeju, Lagos',
    phone: '+234 1 271 5700',
    email: 'corporate.communications@ng.nestle.com',
    hasPassword: false,
    createdAt: '2026-05-05T10:15:00.000Z',
  },
  {
    id: 'comp-lafarge',
    name: 'LAFARGE AFRICA PLC',
    subtitle: 'Building Materials, Concrete & Cement Solutions',
    address: '27B Gerrard Road, Ikoyi, Lagos',
    phone: '+234 1 271 4900',
    email: 'lafarge.info@lafarge.com',
    hasPassword: false,
    createdAt: '2026-05-08T11:40:00.000Z',
  },
  {
    id: 'comp-fidelity',
    name: 'FIDELITY BANK PLC',
    subtitle: 'SME Lending, Commercial & Retail Banking',
    address: '2 Kofo Abayomi Street, Victoria Island, Lagos',
    phone: '+234 1 448 5252',
    email: 'true.serve@fidelitybank.ng',
    hasPassword: true,
    password: 'fidelity',
    passwordHint: 'fidelity',
    createdAt: '2026-05-10T14:10:00.000Z',
  },
  {
    id: 'comp-aradel',
    name: 'ARADEL HOLDINGS PLC',
    subtitle: 'Integrated Oil, Gas & Refining Operations',
    address: '11B Walter Carrington Crescent, Victoria Island, Lagos',
    phone: '+234 1 279 2800',
    email: 'info@aradel.com',
    hasPassword: false,
    createdAt: '2026-05-12T15:30:00.000Z',
  },
  {
    id: 'comp-transcorp',
    name: 'TRANSNATIONAL CORPORATION PLC',
    subtitle: 'Power Generation, Hospitality & Agribusiness',
    address: '38 Glover Road, Ikoyi, Lagos',
    phone: '+234 1 903 3940',
    email: 'info@transcorpgroup.com',
    hasPassword: false,
    createdAt: '2026-05-15T08:45:00.000Z',
  },
  {
    id: 'comp-guinness',
    name: 'GUINNESS NIGERIA PLC',
    subtitle: 'Brewing, Distilling & Beverage Distribution',
    address: '24 Oba Akran Avenue, Ikeja, Lagos',
    phone: '+234 1 270 9100',
    email: 'guinness.customercare@diageo.com',
    hasPassword: true,
    password: 'guinness',
    passwordHint: 'guinness',
    createdAt: '2026-05-18T12:00:00.000Z',
  },
  {
    id: 'comp-stanbic',
    name: 'STANBIC IBTC HOLDINGS PLC',
    subtitle: 'Corporate Financing, Capital Markets & Pensions',
    address: 'I.B.T.C. Place, Walter Carrington Crescent, VI, Lagos',
    phone: '+234 1 422 2222',
    email: 'customercare@stanbicibtc.com',
    hasPassword: false,
    createdAt: '2026-05-20T13:20:00.000Z',
  },
  {
    id: 'comp-gig-logistics',
    name: 'GIG LOGISTICS & COURIER LTD',
    subtitle: 'Last-Mile Delivery, Freight & Domestic Haulage',
    address: '1 Wole Ariyo Street, Lekki Phase 1, Lagos',
    phone: '+234 813 985 1120',
    email: 'support@giglogistics.ng',
    hasPassword: false,
    createdAt: '2026-05-22T09:10:00.000Z',
  },
  {
    id: 'comp-paga',
    name: 'PAGA FINANCIAL TECHNOLOGIES',
    subtitle: 'Mobile Money, Bill Pay & Agent Networks',
    address: '176 Herbert Macaulay Way, Yaba, Lagos',
    phone: '+234 700 000 7242',
    email: 'service@mypaga.com',
    hasPassword: false,
    createdAt: '2026-05-25T16:05:00.000Z',
  },
  {
    id: 'comp-oando',
    name: 'OANDO ENERGY SERVICES LIMITED',
    subtitle: 'Upstream Exploration & Energy Infrastructure',
    address: 'The Wings Office Complex, 17A Ozumba Mbadiwe, VI, Lagos',
    phone: '+234 1 270 4400',
    email: 'info@oandoplc.com',
    hasPassword: true,
    password: 'oando',
    passwordHint: 'oando',
    createdAt: '2026-05-28T10:30:00.000Z',
  },
  {
    id: 'comp-uba',
    name: 'UNITED BANK FOR AFRICA (UBA) PLC',
    subtitle: 'Pan-African Retail Banking & International Settlements',
    address: '57 Marina, Lagos Island, Lagos',
    phone: '+234 1 280 8822',
    email: 'cfc@ubagroup.com',
    hasPassword: false,
    createdAt: '2026-06-01T08:15:00.000Z',
  },
  {
    id: 'comp-piggyvest',
    name: 'PIGGYVEST SAVINGS & INVESTMENTS',
    subtitle: 'Consumer Wealthtech, Automated Micro-Savings',
    address: 'Teslim Elias Close, Victoria Island, Lagos',
    phone: '+234 700 933 9339',
    email: 'contact@piggyvest.com',
    hasPassword: false,
    createdAt: '2026-06-03T11:50:00.000Z',
  },
  {
    id: 'comp-flourmills',
    name: 'FLOUR MILLS OF NIGERIA PLC',
    subtitle: 'Agro-Allied Industries, Grains & Food Production',
    address: '1 Golden Penny Drive, Wharf Road, Apapa, Lagos',
    phone: '+234 1 280 1010',
    email: 'info@fmnplc.com',
    hasPassword: false,
    createdAt: '2026-06-05T14:40:00.000Z',
  },
  {
    id: 'comp-sterling',
    name: 'STERLING FINANCIAL HOLDINGS CO',
    subtitle: 'Specialized Banking, Health & Agriculture Lending',
    address: 'Sterling Towers, 20 Marina, Lagos',
    phone: '+234 1 448 4481',
    email: 'customercare@sterling.ng',
    hasPassword: true,
    password: 'sterling',
    passwordHint: 'sterling',
    createdAt: '2026-06-08T09:00:00.000Z',
  },
  {
    id: 'comp-conoil',
    name: 'CONOIL PRODUCING LIMITED',
    subtitle: 'Hydrocarbon Extraction & Petroleum Products',
    address: 'Bull Plaza, 38/39 Marina, Lagos Island, Lagos',
    phone: '+234 1 266 5440',
    email: 'info@conoilproducing.com',
    hasPassword: false,
    createdAt: '2026-06-10T15:20:00.000Z',
  },
  {
    id: 'comp-axamansard',
    name: 'AXA MANSARD INSURANCE PLC',
    subtitle: 'Underwriting, Life Assurance & Health HMO',
    address: 'Santa Clara Court, Plot 1412 Ahmadu Bello Way, VI, Lagos',
    phone: '+234 1 448 5440',
    email: 'ccare@axamansard.com',
    hasPassword: false,
    createdAt: '2026-06-12T10:10:00.000Z',
  },
  {
    id: 'comp-cadbury',
    name: 'CADBURY NIGERIA PLC',
    subtitle: 'Confectionery, Malted Drinks & Packaged Foods',
    address: 'Lateef Jakande Road, Agidingbi, Ikeja, Lagos',
    phone: '+234 1 271 7777',
    email: 'cadbury.nigeria@mdlz.com',
    hasPassword: false,
    createdAt: '2026-06-15T11:30:00.000Z',
  },
  {
    id: 'comp-mainone',
    name: 'MAINONE CABLE COMPANY LIMITED',
    subtitle: 'Subsea Fiber Optics, Datacenters & Cloud Interconnect',
    address: 'Fabac Center, 3B Ligali Ayorinde Street, VI, Lagos',
    phone: '+234 1 342 9000',
    email: 'info@mainone.net',
    hasPassword: true,
    password: 'mainone',
    passwordHint: 'mainone',
    createdAt: '2026-06-18T13:45:00.000Z',
  },
  {
    id: 'comp-coronation',
    name: 'CORONATION MERCHANT BANK',
    subtitle: 'Investment Banking, Securities & Capital Advisory',
    address: '10 Amodu Ojikutu Street, Victoria Island, Lagos',
    phone: '+234 1 236 6000',
    email: 'info@coronationmb.com',
    hasPassword: false,
    createdAt: '2026-06-20T08:50:00.000Z',
  },
  {
    id: 'comp-eko-supreme',
    name: 'EKO SUPREME RESOURCES LTD',
    subtitle: 'Home Care, Detergents & Chemical Manufacturing',
    address: 'Plot 2, Block G, Commercial Scheme, Agbara, Ogun',
    phone: '+234 1 774 4110',
    email: 'sales@ekosupreme.com',
    hasPassword: false,
    createdAt: '2026-06-22T16:15:00.000Z',
  },
  {
    id: 'comp-presco',
    name: 'PRESCO OIL PALM PLC',
    subtitle: 'Agro-Industrial Oil Palm Plantations & Processing',
    address: 'Obaretin Estate, Km 22 Benin-Sapele Road, Edo State',
    phone: '+234 52 254 020',
    email: 'presco@presco-plc.com',
    hasPassword: false,
    createdAt: '2026-06-25T09:40:00.000Z',
  },
  {
    id: 'comp-heirs',
    name: 'HEIRS HOLDINGS LIMITED',
    subtitle: 'Strategic Investment, Energy & Philanthropy',
    address: '1 MacGregor Road, Ikoyi, Lagos',
    phone: '+234 1 277 4641',
    email: 'info@heirsholdings.com',
    hasPassword: true,
    password: 'heirs',
    passwordHint: 'heirs',
    createdAt: '2026-06-28T14:00:00.000Z',
  },
  {
    id: 'comp-landmark',
    name: 'LANDMARK AFRICA REAL ESTATE',
    subtitle: 'Commercial Mixed-Use, Leisure & Hospitality',
    address: 'Landmark Centre, Water Corporation Drive, VI, Lagos',
    phone: '+234 1 454 4444',
    email: 'info@landmarkafrica.com',
    hasPassword: false,
    createdAt: '2026-07-01T10:00:00.000Z',
  },
  {
    id: 'comp-alat',
    name: 'ALAT BY WEMA BANK',
    subtitle: 'Branchless Digital Banking & FinTech Platform',
    address: '54 Marina, Lagos Island, Lagos',
    phone: '+234 700 2255 2528',
    email: 'help@alat.ng',
    hasPassword: false,
    createdAt: '2026-07-03T11:20:00.000Z',
  },
  {
    id: 'comp-jumia',
    name: 'JUMIA LOGISTICS SERVICES',
    subtitle: 'E-Commerce Fulfillment, Warehousing & Fleet',
    address: '109 Commercial Avenue, Sabo, Yaba, Lagos',
    phone: '+234 1 888 1106',
    email: 'logistics@jumia.com.ng',
    hasPassword: false,
    createdAt: '2026-07-05T12:30:00.000Z',
  },
  {
    id: 'comp-chi-pharma',
    name: 'CHI PHARMACEUTICALS LIMITED',
    subtitle: 'Essential Medicines, Formulations & Distribution',
    address: '14 Chivita Avenue, Ajao Estate, Isolo, Lagos',
    phone: '+234 1 280 2000',
    email: 'info@chipharm.com',
    hasPassword: true,
    password: 'health2026',
    passwordHint: 'health + year',
    createdAt: '2026-07-08T15:10:00.000Z',
  },
  {
    id: 'comp-bevco',
    name: 'BEVCO BOTTLING & BEVERAGES',
    subtitle: 'Natural Mineral Water, Juices & Carbonates',
    address: 'Plot 15, Iganmu Industrial Estate, Lagos',
    phone: '+234 1 773 8920',
    email: 'enquiries@bevcobottling.ng',
    hasPassword: false,
    createdAt: '2026-07-10T09:15:00.000Z',
  },
  {
    id: 'comp-chopchow',
    name: 'CHOPCHOW HOSPITALITY & CATERING',
    subtitle: 'Corporate Banqueting, Fine Dining & Events',
    address: '22 Admiralty Way, Lekki Phase 1, Lagos',
    phone: '+234 812 400 9090',
    email: 'events@chopchowgroup.com',
    hasPassword: false,
    createdAt: '2026-07-12T13:45:00.000Z',
  },
];

export function loadCompaniesRegistry(): CompanyAccount[] {
  let accounts: CompanyAccount[] = [];

  try {
    const stored = localStorage.getItem(COMPANIES_REGISTRY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        accounts = parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load companies registry:', e);
  }

  // Automatic Migration from legacy STORAGE_KEY
  if (accounts.length === 0) {
    try {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        const migratedCompany: CompanyAccount = {
          id: 'comp-default',
          name: parsedLegacy?.company?.name || DEFAULT_COMPANY.name,
          subtitle: parsedLegacy?.company?.subtitle || DEFAULT_COMPANY.subtitle,
          address: parsedLegacy?.company?.address || DEFAULT_COMPANY.address,
          phone: parsedLegacy?.company?.phone || DEFAULT_COMPANY.phone,
          email: parsedLegacy?.company?.email || DEFAULT_COMPANY.email,
          logoUrl: parsedLegacy?.company?.logoUrl || '',
          hasPassword: Boolean(parsedLegacy?.company?.hasPassword),
          password: parsedLegacy?.company?.password || '',
          passwordHint: parsedLegacy?.company?.passwordHint || '',
          createdAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
        };
        accounts = [migratedCompany];
        localStorage.setItem(COMPANY_DATA_PREFIX + 'comp-default', legacy);
      }
    } catch (e) {
      console.warn('Failed to migrate legacy data to multi-company registry:', e);
    }
  }

  // Ensure all 50 sample companies are present so the user can experience 50 companies immediately
  const existingIds = new Set(accounts.map(a => a.id));
  const existingNames = new Set(accounts.map(a => (a.name || '').trim().toLowerCase()));

  let hasNew = false;
  INITIAL_SAMPLE_COMPANIES.forEach(sample => {
    if (!existingIds.has(sample.id) && !existingNames.has(sample.name.trim().toLowerCase())) {
      accounts.push(sample);
      hasNew = true;
    }
  });

  if (accounts.length === 0) {
    accounts = [...INITIAL_SAMPLE_COMPANIES];
    hasNew = true;
  }

  // Save updated list if new sample companies were merged
  if (hasNew || !localStorage.getItem(COMPANIES_REGISTRY_KEY)) {
    try {
      localStorage.setItem(COMPANIES_REGISTRY_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Failed to persist sample companies:', e);
    }
  }

  return accounts;
}

export function saveCompaniesRegistry(accounts: CompanyAccount[]) {
  try {
    localStorage.setItem(COMPANIES_REGISTRY_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save companies registry:', e);
  }
}

export function loadCompanyData(companyId: string, initialAccount?: CompanyAccount): AppState {
  try {
    const raw = localStorage.getItem(COMPANY_DATA_PREFIX + companyId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          company: {
            ...DEFAULT_COMPANY,
            ...(initialAccount ? {
              name: initialAccount.name,
              subtitle: initialAccount.subtitle || '',
              address: initialAccount.address || '',
              phone: initialAccount.phone || '',
              email: initialAccount.email || '',
              logoUrl: initialAccount.logoUrl || '',
              hasPassword: Boolean(initialAccount.hasPassword),
              password: initialAccount.password || '',
              passwordHint: initialAccount.passwordHint || '',
              securityQuestion: initialAccount.securityQuestion || '',
              securityAnswer: initialAccount.securityAnswer || '',
            } : {}),
            ...(parsed.company || {}),
            id: companyId,
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
          isDarkTheme: parsed.isDarkTheme !== undefined 
            ? Boolean(parsed.isDarkTheme) 
            : (localStorage.getItem(THEME_PREFERENCE_KEY) === 'dark'),
          employees: (parsed.employees && Array.isArray(parsed.employees))
            ? parsed.employees.filter(Boolean).map((e: any, idx: number) => ({
                ...e,
                id: e.id || `emp-${idx}`,
                employmentType: e.employmentType || 'Full-Time'
              }))
            : (companyId === 'comp-default' ? INITIAL_EMPLOYEES : []),
          payslipDesign: parsed.payslipDesign ? { ...DEFAULT_PAYSLIP_DESIGN, ...parsed.payslipDesign } : DEFAULT_PAYSLIP_DESIGN,
          savedPayslipPresets: (parsed.savedPayslipPresets && Array.isArray(parsed.savedPayslipPresets)) ? parsed.savedPayslipPresets : [],
          loans: (parsed.loans && Array.isArray(parsed.loans)) ? parsed.loans : [],
        };
      }
    }
  } catch (e) {
    console.warn(`Failed to read company data for ${companyId}:`, e);
  }

  const fallbackCompany: CompanyProfile = {
    ...DEFAULT_COMPANY,
    ...(initialAccount ? {
      name: initialAccount.name,
      subtitle: initialAccount.subtitle || '',
      address: initialAccount.address || '',
      phone: initialAccount.phone || '',
      email: initialAccount.email || '',
      logoUrl: initialAccount.logoUrl || '',
      hasPassword: Boolean(initialAccount.hasPassword),
      password: initialAccount.password || '',
      passwordHint: initialAccount.passwordHint || '',
      securityQuestion: initialAccount.securityQuestion || '',
      securityAnswer: initialAccount.securityAnswer || '',
    } : {}),
    id: companyId,
  };

  return {
    company: fallbackCompany,
    employees: companyId === 'comp-default' ? INITIAL_EMPLOYEES : [],
    departments: DEFAULT_DEPARTMENTS,
    payrollVariables: DEFAULT_PAYROLL_VARIABLES,
    payeTaxVariables: DEFAULT_PAYE_VARIABLES,
    selectedMonth: 'jan',
    selectedYear: 2026,
    snapshots: [],
    activeView: 'dashboard',
    isDarkTheme: localStorage.getItem(THEME_PREFERENCE_KEY) === 'dark',
    payslipDesign: DEFAULT_PAYSLIP_DESIGN,
    savedPayslipPresets: [],
    loans: [],
  };
}

export function loadPersistedState(): AppState {
  const accounts = loadCompaniesRegistry();
  const first = accounts[0];
  return loadCompanyData(first?.id || 'comp-default', first);
}

export function usePayrollStore() {
  const [companies, setCompanies] = useState<CompanyAccount[]>(() => loadCompaniesRegistry());
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    return localStorage.getItem(THEME_PREFERENCE_KEY) === 'dark';
  });

  const [state, setState] = useState<AppState>(() => {
    const list = loadCompaniesRegistry();
    const firstComp = list[0] || null;
    return loadCompanyData(firstComp?.id || 'comp-default', firstComp || undefined);
  });

  const reloadFromStorage = () => {
    const currentList = loadCompaniesRegistry();
    setCompanies(currentList);
    if (activeCompanyId) {
      const activeAcc = currentList.find(c => c.id === activeCompanyId);
      setState(loadCompanyData(activeCompanyId, activeAcc));
    }
  };

  useEffect(() => {
    if (!activeCompanyId) return;
    try {
      localStorage.setItem(COMPANY_DATA_PREFIX + activeCompanyId, JSON.stringify(state));
      // Also sync to legacy storage for backwards compatibility
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
    }
  }, [state, activeCompanyId]);



  const activeEmployees = (state.employees || []).filter(e => e && e.status === 'Active');
  const liveCalculatedItems: CalculatedPayrollItem[] = activeEmployees.map(emp => {
    try {
      const base = calculatePayrollItem(emp, state.payrollVariables, state.payeTaxVariables, state.selectedMonth, state.selectedYear);

      // Calculate active loan / salary advance deductions for this period
      const currentPeriodKey = `${state.selectedYear}-${state.selectedMonth}`;
      let totalLoanDeduction = 0;
      (state.loans || []).forEach(loan => {
        if (!loan || loan.employeeId !== emp.id) return;
        const periodRecord = (loan.history || []).find(h => h.periodKey === currentPeriodKey);
        if (periodRecord) {
          totalLoanDeduction += Math.max(0, Number(periodRecord.amount) || 0);
        } else if (loan.status === 'Active' && (loan.remainingBalance || 0) > 0) {
          const monthly = loan.type === 'Salary Advance'
            ? (loan.remainingBalance || 0)
            : Math.min(Number(loan.monthlyDeduction) || 0, Number(loan.remainingBalance) || 0);
          totalLoanDeduction += Math.max(0, monthly);
        }
      });

      const netTakeHome = Math.max(0, base.netTakeHome - totalLoanDeduction);
      const totalDeductions = base.totalDeductions + totalLoanDeduction;

      return {
        ...base,
        loanDeduction: totalLoanDeduction,
        totalDeductions,
        netTakeHome,
      };
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
    setIsDarkTheme(prev => {
      const next = !prev;
      localStorage.setItem(THEME_PREFERENCE_KEY, next ? 'dark' : 'light');
      setState(s => ({ ...s, isDarkTheme: next }));
      return next;
    });
  };

  const selectCompany = (companyId: string, passwordAttempt?: string): { success: boolean; error?: string } => {
    const targetComp = companies.find(c => c.id === companyId);
    if (!targetComp) {
      return { success: false, error: 'Company account not found.' };
    }

    if (targetComp.hasPassword && targetComp.password) {
      if (!passwordAttempt || passwordAttempt !== targetComp.password) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
    }

    const loadedData = loadCompanyData(companyId, targetComp);
    setState({ ...loadedData, activeView: 'dashboard', isDarkTheme });
    setActiveCompanyId(companyId);

    setCompanies(prev => {
      const updated = prev.map(c => c.id === companyId ? { ...c, lastActiveAt: new Date().toISOString() } : c);
      saveCompaniesRegistry(updated);
      return updated;
    });

    return { success: true };
  };

  const lockOrSwitchCompany = () => {
    setActiveCompanyId(null);
  };

  const createCompany = (
    accountData: Omit<CompanyAccount, 'id'>, 
    initialTemplate: 'default' | 'blank' = 'default'
  ): { success: boolean; companyId?: string; error?: string } => {
    if (!accountData.name || !accountData.name.trim()) {
      return { success: false, error: 'Company name is required.' };
    }

    const newId = 'comp-' + Date.now();
    const newAccount: CompanyAccount = {
      ...accountData,
      id: newId,
      name: accountData.name.trim(),
      hasPassword: Boolean(accountData.hasPassword && accountData.password),
      password: accountData.hasPassword ? accountData.password : '',
      passwordHint: accountData.hasPassword ? (accountData.passwordHint || '') : '',
      securityQuestion: accountData.hasPassword ? (accountData.securityQuestion || '') : '',
      securityAnswer: accountData.hasPassword ? (accountData.securityAnswer || '') : '',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    const newCompanyProfile: CompanyProfile = {
      id: newId,
      name: newAccount.name,
      subtitle: newAccount.subtitle || '',
      address: newAccount.address || '',
      phone: newAccount.phone || '',
      email: newAccount.email || '',
      logoUrl: newAccount.logoUrl || '',
      hasPassword: newAccount.hasPassword,
      password: newAccount.password,
      passwordHint: newAccount.passwordHint,
      securityQuestion: newAccount.securityQuestion,
      securityAnswer: newAccount.securityAnswer,
    };

    const newAppState: AppState = {
      company: newCompanyProfile,
      employees: [],
      departments: DEFAULT_DEPARTMENTS,
      payrollVariables: DEFAULT_PAYROLL_VARIABLES,
      payeTaxVariables: DEFAULT_PAYE_VARIABLES,
      selectedMonth: 'jan',
      selectedYear: 2026,
      snapshots: [],
      activeView: 'dashboard',
      isDarkTheme,
    };

    try {
      localStorage.setItem(COMPANY_DATA_PREFIX + newId, JSON.stringify(newAppState));
      const nextCompanies = [...companies, newAccount];
      setCompanies(nextCompanies);
      saveCompaniesRegistry(nextCompanies);

      setState(newAppState);
      setActiveCompanyId(newId);
      return { success: true, companyId: newId };
    } catch (e) {
      console.error('Failed to create company:', e);
      return { success: false, error: 'Failed to save new company workspace.' };
    }
  };

  const updateCompanyAccount = (companyId: string, updates: Partial<CompanyAccount>) => {
    setCompanies(prev => {
      const next = prev.map(c => {
        if (c.id === companyId) {
          const updated = { ...c, ...updates };
          if (updates.hasPassword !== undefined && !updates.hasPassword) {
            updated.password = '';
            updated.passwordHint = '';
            updated.securityQuestion = '';
            updated.securityAnswer = '';
          }
          return updated;
        }
        return c;
      });
      saveCompaniesRegistry(next);
      return next;
    });

    if (activeCompanyId === companyId) {
      setState(s => ({
        ...s,
        company: {
          ...s.company,
          ...(updates.name ? { name: updates.name } : {}),
          ...(updates.subtitle !== undefined ? { subtitle: updates.subtitle } : {}),
          ...(updates.address !== undefined ? { address: updates.address } : {}),
          ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
          ...(updates.email !== undefined ? { email: updates.email } : {}),
          ...(updates.logoUrl !== undefined ? { logoUrl: updates.logoUrl } : {}),
          ...(updates.hasPassword !== undefined ? { hasPassword: updates.hasPassword } : {}),
          ...(updates.password !== undefined ? { password: updates.password } : {}),
          ...(updates.passwordHint !== undefined ? { passwordHint: updates.passwordHint } : {}),
          ...(updates.securityQuestion !== undefined ? { securityQuestion: updates.securityQuestion } : {}),
          ...(updates.securityAnswer !== undefined ? { securityAnswer: updates.securityAnswer } : {}),
        }
      }));
    }
  };

  const deleteCompany = (companyId: string): { success: boolean; error?: string } => {
    if (companies.length <= 1) {
      return { success: false, error: 'Cannot delete the only company account in the system.' };
    }

    try {
      localStorage.removeItem(COMPANY_DATA_PREFIX + companyId);
      const nextCompanies = companies.filter(c => c.id !== companyId);
      setCompanies(nextCompanies);
      saveCompaniesRegistry(nextCompanies);

      if (activeCompanyId === companyId) {
        setActiveCompanyId(null);
      }
      return { success: true };
    } catch (e) {
      console.error('Failed to delete company account:', e);
      return { success: false, error: 'Failed to delete company data.' };
    }
  };

  const updateCompanyProfile = (profile: Partial<CompanyProfile>) => {
    setState(s => {
      const updatedCompany = { ...s.company, ...profile };
      if (activeCompanyId) {
        setCompanies(prev => {
          const next = prev.map(c => {
            if (c.id === activeCompanyId) {
              return {
                ...c,
                name: updatedCompany.name,
                subtitle: updatedCompany.subtitle,
                address: updatedCompany.address,
                phone: updatedCompany.phone,
                email: updatedCompany.email,
                logoUrl: updatedCompany.logoUrl,
                hasPassword: updatedCompany.hasPassword,
                password: updatedCompany.password,
                passwordHint: updatedCompany.passwordHint,
                securityQuestion: updatedCompany.securityQuestion,
                securityAnswer: updatedCompany.securityAnswer,
              };
            }
            return c;
          });
          saveCompaniesRegistry(next);
          return next;
        });
      }
      return { ...s, company: updatedCompany };
    });
  };

  const activeCompany = companies.find(c => c.id === activeCompanyId) || null;

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
      totalLoansDeducted: liveCalculatedItems.reduce((acc, i) => acc + (i.loanDeduction || 0), 0),
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

    // Amortize active loans when payroll is finalized
    const currentPeriodKey = `${state.selectedYear}-${state.selectedMonth}`;
    const updatedLoans = (state.loans || []).map(loan => {
      if (loan.status !== 'Active' || (loan.remainingBalance || 0) <= 0) {
        return loan;
      }
      // Avoid double deduction if already deducted for this period
      const alreadyDeducted = (loan.history || []).some(h => h.periodKey === currentPeriodKey);
      if (alreadyDeducted) return loan;

      const pItem = liveCalculatedItems.find(i => i.employeeId === loan.employeeId);
      if (!pItem || !pItem.loanDeduction) return loan;

      const deductionForThis = Math.min(Number(loan.monthlyDeduction) || 0, Number(loan.remainingBalance) || 0);
      if (deductionForThis <= 0) return loan;

      const newRemaining = Math.max(0, (loan.remainingBalance || 0) - deductionForThis);
      const newTotalRepaid = (loan.totalRepaid || 0) + deductionForThis;
      const newStatus: LoanStatus = newRemaining <= 0 ? 'Paid' : 'Active';

      const repaymentRecord: LoanRepaymentRecord = {
        id: `repay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        periodKey: currentPeriodKey,
        amount: deductionForThis,
        paidAt: new Date().toISOString(),
        notes: `Automated deduction via ${monthLabel} ${state.selectedYear} payroll snapshot (v${nextVersion})`,
      };

      return {
        ...loan,
        remainingBalance: newRemaining,
        totalRepaid: newTotalRepaid,
        status: newStatus,
        history: [...(loan.history || []), repaymentRecord],
      };
    });

    setState(s => ({
      ...s,
      loans: updatedLoans,
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

  const updatePayslipDesign = (updates: Partial<PayslipDesignConfig>) => {
    setState(s => ({
      ...s,
      payslipDesign: {
        ...(s.payslipDesign || DEFAULT_PAYSLIP_DESIGN),
        ...updates,
      },
    }));
  };

  const resetPayslipDesign = () => {
    setState(s => ({
      ...s,
      payslipDesign: DEFAULT_PAYSLIP_DESIGN,
    }));
  };

  const savePayslipPreset = (name: string, config: PayslipDesignConfig, presetId?: string) => {
    if (!name.trim()) return;
    setState(s => {
      const presets = s.savedPayslipPresets || [];
      const matchIndex = presetId 
        ? presets.findIndex(p => p.id === presetId)
        : presets.findIndex(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());

      if (matchIndex >= 0) {
        const updated = [...presets];
        updated[matchIndex] = {
          ...updated[matchIndex],
          name: name.trim(),
          design: JSON.parse(JSON.stringify(config)),
        };
        return {
          ...s,
          savedPayslipPresets: updated,
        };
      }

      const newPreset: PayslipCustomPreset = {
        id: presetId || ('preset-' + Date.now()),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        design: JSON.parse(JSON.stringify(config)),
      };
      return {
        ...s,
        savedPayslipPresets: [...presets, newPreset],
      };
    });
  };

  const deletePayslipPreset = (presetId: string) => {
    setState(s => ({
      ...s,
      savedPayslipPresets: (s.savedPayslipPresets || []).filter(p => p.id !== presetId),
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

  const addLoan = (loanData: Omit<EmployeeLoan, 'id' | 'totalRepaid' | 'remainingBalance' | 'status' | 'createdAt' | 'history'>) => {
    const principal = Math.max(0, Number(loanData.principalAmount) || 0);
    const monthly = Math.max(0, Number(loanData.monthlyDeduction) || 0);
    const newLoan: EmployeeLoan = {
      ...loanData,
      id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      principalAmount: principal,
      monthlyDeduction: monthly > 0 ? monthly : principal,
      totalRepaid: 0,
      remainingBalance: principal,
      status: 'Active',
      createdAt: new Date().toISOString(),
      history: [],
    };
    setState(s => ({
      ...s,
      loans: [newLoan, ...(s.loans || [])],
    }));
  };

  const updateLoan = (id: string, updates: Partial<EmployeeLoan>) => {
    setState(s => ({
      ...s,
      loans: (s.loans || []).map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, ...updates };
        if (updated.remainingBalance !== undefined && updated.remainingBalance <= 0) {
          updated.status = 'Paid';
        }
        return updated;
      }),
    }));
  };

  const deleteLoan = (id: string) => {
    setState(s => ({
      ...s,
      loans: (s.loans || []).filter(l => l.id !== id),
    }));
  };

  const pauseResumeLoan = (id: string) => {
    setState(s => ({
      ...s,
      loans: (s.loans || []).map(l => {
        if (l.id !== id) return l;
        if (l.status === 'Paid') return l;
        return {
          ...l,
          status: l.status === 'Active' ? 'Paused' : 'Active',
        };
      }),
    }));
  };

  const recordManualLoanRepayment = (loanId: string, amount: number, notes: string = 'Manual repayment') => {
    const payAmount = Math.max(0, Number(amount) || 0);
    if (payAmount <= 0) return;

    setState(s => ({
      ...s,
      loans: (s.loans || []).map(loan => {
        if (loan.id !== loanId) return loan;
        const actualDeduction = Math.min(payAmount, loan.remainingBalance);
        const newRemaining = Math.max(0, loan.remainingBalance - actualDeduction);
        const newTotalRepaid = loan.totalRepaid + actualDeduction;
        const newStatus: LoanStatus = newRemaining <= 0 ? 'Paid' : loan.status;

        const record: LoanRepaymentRecord = {
          id: `repay-manual-${Date.now()}`,
          periodKey: `${s.selectedYear}-${s.selectedMonth}`,
          amount: actualDeduction,
          paidAt: new Date().toISOString(),
          notes,
        };

        return {
          ...loan,
          remainingBalance: newRemaining,
          totalRepaid: newTotalRepaid,
          status: newStatus,
          history: [...(loan.history || []), record],
        };
      }),
    }));
  };

  const applyPeriodLoanDeduction = (loanId: string, periodKey?: string) => {
    const targetPeriod = periodKey || `${state.selectedYear}-${state.selectedMonth}`;
    const mObj = MONTHS.find(m => m.key === state.selectedMonth);
    const mLabel = mObj ? mObj.label : state.selectedMonth;

    setState(s => ({
      ...s,
      loans: (s.loans || []).map(loan => {
        if (loan.id !== loanId) return loan;
        if (loan.status === 'Paid' || (loan.remainingBalance || 0) <= 0) return loan;

        const deduction = loan.type === 'Salary Advance'
          ? (loan.remainingBalance || 0)
          : Math.min(Number(loan.monthlyDeduction) || (loan.remainingBalance || 0), Number(loan.remainingBalance) || 0);
        if (deduction <= 0) return loan;

        const newRemaining = Math.max(0, (loan.remainingBalance || 0) - deduction);
        const newTotalRepaid = (loan.totalRepaid || 0) + deduction;
        const newStatus: LoanStatus = newRemaining <= 0 ? 'Paid' : loan.status;

        const record: LoanRepaymentRecord = {
          id: `repay-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          periodKey: targetPeriod,
          amount: deduction,
          paidAt: new Date().toISOString(),
          notes: `Payroll Auto-Deduction (${mLabel} ${s.selectedYear})`,
        };

        return {
          ...loan,
          remainingBalance: newRemaining,
          totalRepaid: newTotalRepaid,
          status: newStatus,
          history: [...(loan.history || []), record],
        };
      })
    }));
  };

  const applyAllPeriodLoanDeductions = (periodKey?: string) => {
    const targetPeriod = periodKey || `${state.selectedYear}-${state.selectedMonth}`;
    const mObj = MONTHS.find(m => m.key === state.selectedMonth);
    const mLabel = mObj ? mObj.label : state.selectedMonth;

    setState(s => ({
      ...s,
      loans: (s.loans || []).map(loan => {
        if (loan.status !== 'Active' || (loan.remainingBalance || 0) <= 0) return loan;
        if ((loan.history || []).some(h => h.periodKey === targetPeriod)) return loan;

        const deduction = Math.min(Number(loan.monthlyDeduction) || 0, Number(loan.remainingBalance) || 0);
        if (deduction <= 0) return loan;

        const newRemaining = Math.max(0, (loan.remainingBalance || 0) - deduction);
        const newTotalRepaid = (loan.totalRepaid || 0) + deduction;
        const newStatus: LoanStatus = newRemaining <= 0 ? 'Paid' : 'Active';

        const record: LoanRepaymentRecord = {
          id: `repay-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          periodKey: targetPeriod,
          amount: deduction,
          paidAt: new Date().toISOString(),
          notes: `Payroll Auto-Deduction (${mLabel} ${s.selectedYear})`,
        };

        return {
          ...loan,
          remainingBalance: newRemaining,
          totalRepaid: newTotalRepaid,
          status: newStatus,
          history: [...(loan.history || []), record],
        };
      })
    }));
  };

  return {
    state,
    companies,
    activeCompanyId,
    activeCompany,
    selectCompany,
    lockOrSwitchCompany,
    createCompany,
    updateCompanyAccount,
    deleteCompany,
    monthLabel,
    activeEmployees,
    currentPayrollItems,
    activeSnapshot,
    isDarkTheme,
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
    updatePayslipDesign,
    resetPayslipDesign,
    savedPayslipPresets: state.savedPayslipPresets || [],
    savePayslipPreset,
    deletePayslipPreset,
    loans: state.loans || [],
    addLoan,
    updateLoan,
    deleteLoan,
    pauseResumeLoan,
    recordManualLoanRepayment,
    applyPeriodLoanDeduction,
    applyAllPeriodLoanDeductions,
    resetAllData,
    reloadFromStorage,
  };
}
