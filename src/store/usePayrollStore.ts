import { useState, useEffect, useRef } from 'react';
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
  LoanType,
  EmailSettings,
  DEFAULT_EMAIL_SETTINGS,
  EmailedPayslipRecord
} from '../types';
import { 
  DEFAULT_PAYROLL_VARIABLES, 
  DEFAULT_PAYE_VARIABLES, 
  DEFAULT_EMPLOYMENT_TYPE_RULES,
  calculatePayrollItem,
  isEmployeeActiveForPeriod
} from '../engine/payePensionEngine';
import { 
  getSupabaseClient, 
  downloadCompanyDataFromSupabase,
  uploadCompanyDataToSupabase,
  checkRealConnectivity,
  getSavedCloudConfig,
  fetchCompaniesFromSupabase,
  syncCompanyToSupabase,
  deleteCompanyFromSupabase,
  deleteEmployeeFromCloud,
  saveSingleEmployeeToCloud,
  logAuditEvent,
  getActiveTeamMember,
  saveEmailSettingsToCloud,
  saveEmailedPayslipsToCloud,
  saveSnapshotToCloud,
  deleteSnapshotFromCloud
} from '../services/supabaseClient';
import { saveCompanyDataToDb, migrateFromLocalStorageIfNeeded } from './payrollDb';
import { verifyCredential } from '../utils/cryptoAuth';

export const STORAGE_KEY = 'PAYROLL_PRO_LOCAL_STORAGE_V5';
export const COMPANIES_REGISTRY_KEY = 'PAYROLL_PRO_COMPANIES_REGISTRY_V1';
export const COMPANY_DATA_PREFIX = 'PAYROLL_PRO_DATA_COMPANY_';
export const PENDING_OFFLINE_SYNC_PREFIX = 'PAYROLL_PRO_PENDING_SYNC_';
export const DIRTY_EMPLOYEES_PREFIX = 'PAYROLL_PRO_DIRTY_EMPS_';
export const DELETED_EMPLOYEES_PREFIX = 'PAYROLL_PRO_DELETED_EMPS_';
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

export const normalizeMonthKey = (m?: string): string => {
  if (!m) return '';
  const clean = m.trim().toLowerCase();
  const found = MONTHS.find(month => month.key === clean || month.label.toLowerCase() === clean || clean.startsWith(month.key));
  return found ? found.key : clean;
};

export const getPeriodIndex = (periodKey?: string): number => {
  if (!periodKey) return 0;
  const parts = periodKey.split('-');
  const y = parseInt(parts[0], 10) || 0;
  const m = MONTH_KEY_INDEX[normalizeMonthKey(parts[1])] ?? 0;
  return y * 12 + m;
};

export function parseDateToYearMonth(dateStr?: string): { year: number; monthIdx: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();

  // Check period key format: "2026-jan"
  if (/^\d{4}-[a-zA-Z]{3}$/i.test(trimmed)) {
    const [y, mStr] = trimmed.split('-');
    const mIdx = MONTH_KEY_INDEX[mStr.toLowerCase()];
    if (mIdx !== undefined) return { year: parseInt(y, 10), monthIdx: mIdx };
  }

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{1,2}/.test(trimmed)) {
    const parts = trimmed.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(y) && m >= 1 && m <= 12) return { year: y, monthIdx: m - 1 };
  }

  // Check DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(trimmed)) {
    const parts = trimmed.split(/[\/\-]/);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (!isNaN(y) && m >= 1 && m <= 12) return { year: y, monthIdx: m - 1 };
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), monthIdx: d.getMonth() };
  }

  return null;
}

/**
 * Automatically synchronizes loan amortizations and deductions from the repayment
 * start date up to the active target payroll period (e.g. from January 2026 to October 2026).
 * Ensures past elapsed months are seamlessly recorded in the loan history, total repaid,
 * and remaining balance.
 */
export function autoSyncLoansForPeriod(
  loans: EmployeeLoan[] = [],
  targetYear: number = new Date().getFullYear(),
  targetMonthKey: string = (MONTHS[new Date().getMonth()]?.key || 'oct')
): EmployeeLoan[] {
  if (!Array.isArray(loans) || loans.length === 0) return [];
  const targetM = (targetMonthKey || 'oct').toLowerCase();
  const targetMonthIdx = MONTH_KEY_INDEX[targetM] ?? 9;

  return loans.map(loan => {
    if (!loan || loan.status === 'Paused' || (loan.principalAmount || 0) <= 0) {
      return loan;
    }

    let startYear = targetYear;
    let startMonthIdx = 0; // default to Jan

    const parsedStart = parseDateToYearMonth(loan.startPeriodKey) ||
      parseDateToYearMonth(loan.repaymentStartDate) ||
      parseDateToYearMonth(loan.disbursementDate) ||
      parseDateToYearMonth(loan.repaymentDate) ||
      parseDateToYearMonth(loan.createdAt);

    if (parsedStart) {
      startYear = parsedStart.year;
      startMonthIdx = parsedStart.monthIdx;
    }

    const elapsedPeriods: { key: string; year: number; monthIdx: number }[] = [];
    let curY = startYear;
    let curM = startMonthIdx;
    let safety = 0;

    while ((curY < targetYear || (curY === targetYear && curM <= targetMonthIdx)) && safety < 120) {
      const mKey = MONTHS[curM]?.key || 'jan';
      elapsedPeriods.push({
        key: `${curY}-${mKey}`,
        year: curY,
        monthIdx: curM,
      });
      curM++;
      if (curM > 11) {
        curM = 0;
        curY++;
      }
      safety++;
    }

    if (elapsedPeriods.length === 0) return loan;

    const history = [...(loan.history || [])];
    const monthlyDeduction = loan.type === 'Salary Advance'
      ? (loan.principalAmount || 0)
      : (Number(loan.monthlyDeduction) || loan.principalAmount || 0);

    for (const period of elapsedPeriods) {
      const alreadyHas = history.some(h => h.periodKey === period.key);
      if (!alreadyHas) {
        const currentRepaid = history.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
        const rem = Math.max(0, (loan.principalAmount || 0) - currentRepaid);
        if (rem <= 0) break;

        const deduction = Math.min(monthlyDeduction, rem);
        if (deduction > 0) {
          const mLabel = MONTHS[period.monthIdx]?.label || period.key;
          history.push({
            id: `repay-auto-${period.key}-${loan.id}`,
            periodKey: period.key,
            amount: deduction,
            paidAt: `${period.year}-${String(period.monthIdx + 1).padStart(2, '0')}-28T12:00:00.000Z`,
            notes: `Automated deduction (${mLabel} ${period.year})`,
          });
        }
      }
    }

    const totalRepaid = history.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    const remainingBalance = Math.max(0, (loan.principalAmount || 0) - totalRepaid);
    const status: LoanStatus = remainingBalance <= 0 ? 'Paid' : loan.status;

    return {
      ...loan,
      history,
      totalRepaid,
      remainingBalance,
      status,
    };
  });
}

const DEFAULT_COMPANY: CompanyProfile = {
  name: '',
  subtitle: '',
  address: '',
  phone: '',
  email: '',
  logoUrl: '',
};

const INITIAL_EMPLOYEES: Employee[] = [];

export const DEFAULT_DEPARTMENTS: string[] = [
  'ADMIN',
  'OPERATIONS',
  'FINANCE & ACCOUNTS',
  'ENGINEERING',
  'LOGISTICS',
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
  emailSettings?: EmailSettings;
  emailedPayslips?: Record<string, EmailedPayslipRecord>; // Key: `${periodKey}_${employeeId}`
}

/**
 * Cleanly purges all workspace and cached company records upon cloud disconnect
 */
export function purgeAllLocalDataOnDisconnect(): void {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(COMPANY_DATA_PREFIX) ||
          key.startsWith(PENDING_OFFLINE_SYNC_PREFIX) ||
          key.startsWith(DIRTY_EMPLOYEES_PREFIX) ||
          key.startsWith(DELETED_EMPLOYEES_PREFIX) ||
          key === COMPANIES_REGISTRY_KEY ||
          key === STORAGE_KEY)
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.error('Failed to purge local data on disconnect:', e);
  }
}

// ─────────────────────────────────────────────────────────────
// OFFLINE PENDING-SYNC & DIRTY EMPLOYEE HELPERS
// ─────────────────────────────────────────────────────────────

export function getDirtyEmployeeIds(companyId: string): Set<string> {
  try {
    const raw = localStorage.getItem(DIRTY_EMPLOYEES_PREFIX + companyId);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter(Boolean)) : new Set();
  } catch {
    return new Set();
  }
}

export function markEmployeesDirty(companyId: string, employeeIds: string[]): void {
  if (!companyId || employeeIds.length === 0) return;
  try {
    const current = getDirtyEmployeeIds(companyId);
    employeeIds.forEach(id => {
      if (id) current.add(id);
    });
    localStorage.setItem(DIRTY_EMPLOYEES_PREFIX + companyId, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn('Failed to mark employees dirty:', e);
  }
}

export function unmarkEmployeeDirty(companyId: string, employeeId: string): void {
  if (!companyId || !employeeId) return;
  try {
    const current = getDirtyEmployeeIds(companyId);
    if (current.delete(employeeId)) {
      if (current.size === 0) {
        localStorage.removeItem(DIRTY_EMPLOYEES_PREFIX + companyId);
      } else {
        localStorage.setItem(DIRTY_EMPLOYEES_PREFIX + companyId, JSON.stringify(Array.from(current)));
      }
    }
  } catch {}
}

export function clearDirtyEmployees(companyId: string): void {
  if (!companyId) return;
  try {
    localStorage.removeItem(DIRTY_EMPLOYEES_PREFIX + companyId);
  } catch {}
}

export function getPendingDeletedEmployeeIds(companyId: string): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_EMPLOYEES_PREFIX + companyId);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter(Boolean)) : new Set();
  } catch {
    return new Set();
  }
}

export function markEmployeePendingDelete(companyId: string, employeeId: string): void {
  if (!companyId || !employeeId) return;
  try {
    const current = getPendingDeletedEmployeeIds(companyId);
    current.add(employeeId);
    localStorage.setItem(DELETED_EMPLOYEES_PREFIX + companyId, JSON.stringify(Array.from(current)));
    unmarkEmployeeDirty(companyId, employeeId);
  } catch {}
}

export function unmarkEmployeePendingDelete(companyId: string, employeeId: string): void {
  if (!companyId || !employeeId) return;
  try {
    const current = getPendingDeletedEmployeeIds(companyId);
    if (current.delete(employeeId)) {
      if (current.size === 0) {
        localStorage.removeItem(DELETED_EMPLOYEES_PREFIX + companyId);
      } else {
        localStorage.setItem(DELETED_EMPLOYEES_PREFIX + companyId, JSON.stringify(Array.from(current)));
      }
    }
  } catch {}
}

export function hasPendingOfflineSync(companyId: string): boolean {
  try {
    return localStorage.getItem(PENDING_OFFLINE_SYNC_PREFIX + companyId) === 'true';
  } catch {
    return false;
  }
}

/** Returns IDs of every company that has local changes not yet uploaded to the cloud. */
export function getCompaniesWithPendingSync(): string[] {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PENDING_OFFLINE_SYNC_PREFIX) && localStorage.getItem(key) === 'true') {
        ids.push(key.slice(PENDING_OFFLINE_SYNC_PREFIX.length));
      }
    }
  } catch (e) {
    console.warn('Failed to read pending sync flags:', e);
  }
  return ids;
}

/**
 * Asks the user to confirm before a disconnect that would purge unsynced offline work.
 * Returns true if it is safe (or the user explicitly accepted the data loss).
 */
export function confirmDisconnectWithPendingSync(): boolean {
  const pendingIds = getCompaniesWithPendingSync();
  if (pendingIds.length === 0) return true;
  const registry = loadCompaniesRegistry();
  const names = pendingIds.map(id => registry.find(c => c.id === id)?.name || id);
  return window.confirm(
    `WARNING: The following companies have offline changes that have NOT been synced to the cloud yet:\n\n` +
    names.map(n => `  • ${n}`).join('\n') +
    `\n\nDisconnecting will permanently delete these unsynced changes from this device.\n\n` +
    `Reconnect to the internet and wait for sync to finish first (recommended).\n\n` +
    `Click OK only if you want to discard these changes and disconnect anyway.`
  );
}

let isSyncingAllPending = false;

/**
 * Uploads the locally stored data of EVERY company flagged as pending (not just the
 * active one). Clears each flag only after a successful upload.
 * Only uploads employees that were explicitly modified on this device (and passes timestamp check).
 */
export async function syncAllPendingCompanies(): Promise<{ synced: string[]; failed: string[] }> {
  const result = { synced: [] as string[], failed: [] as string[] };
  if (isSyncingAllPending) return result;
  if (!getSavedCloudConfig().isEnabled) return result;

  const pendingIds = getCompaniesWithPendingSync();
  if (pendingIds.length === 0) return result;

  isSyncingAllPending = true;
  try {
    const registry = loadCompaniesRegistry();
    for (const companyId of pendingIds) {
      // Only upload companies that actually have local data saved
      if (!localStorage.getItem(COMPANY_DATA_PREFIX + companyId)) {
        localStorage.removeItem(PENDING_OFFLINE_SYNC_PREFIX + companyId);
        clearDirtyEmployees(companyId);
        continue;
      }
      const account = registry.find(c => c.id === companyId);
      const data = loadCompanyData(companyId, account);
      const company = { ...data.company, id: companyId };
      const dirtyEmpIds = getDirtyEmployeeIds(companyId);
      const deletedEmpIds = getPendingDeletedEmployeeIds(companyId);

      try {
        // 1. Replay any offline employee deletions first
        for (const delId of Array.from(deletedEmpIds)) {
          const delRes = await deleteEmployeeFromCloud(delId, companyId);
          if (delRes.success) {
            unmarkEmployeePendingDelete(companyId, delId);
          }
        }

        // 2. Upload company data, restricting employee upserts ONLY to dirty employees
        const res = await uploadCompanyDataToSupabase(
          company,
          data.employees,
          data.departments,
          data.payrollVariables,
          data.payeTaxVariables,
          data.loans || [],
          data.snapshots,
          data.payslipDesign,
          data.savedPayslipPresets || [],
          data.emailSettings,
          data.emailedPayslips,
          { dirtyEmployeeIds: dirtyEmpIds }
        );
        if (res.success) {
          localStorage.removeItem(PENDING_OFFLINE_SYNC_PREFIX + companyId);
          clearDirtyEmployees(companyId);
          result.synced.push(companyId);
          logAuditEvent(
            companyId,
            company.name,
            'Offline Sync Completed',
            'Offline changes automatically synchronized to cloud upon reconnect'
          );
        } else {
          result.failed.push(companyId);
        }
      } catch (err) {
        console.warn(`Pending sync failed for company ${companyId}:`, err);
        result.failed.push(companyId);
      }
    }
  } finally {
    isSyncingAllPending = false;
    window.dispatchEvent(new Event('payroll-sync-status-changed'));
  }
  return result;
}

export function mergeEmployeesWithCloud(
  localEmployees: Employee[],
  cloudEmployees: Employee[],
  dirtyIds: Set<string>,
  deletedIds: Set<string>,
  pendingMap?: Map<string, { employee: Employee; timestamp: number }>
): Employee[] {
  const localMap = new Map(localEmployees.map(e => [e.id, e]));
  const seenIds = new Set<string>();
  const result: Employee[] = [];

  for (const cloudEmp of cloudEmployees) {
    if (!cloudEmp || !cloudEmp.id) continue;
    if (deletedIds.has(cloudEmp.id)) continue; // Deleted locally while offline
    seenIds.add(cloudEmp.id);

    const inFlight = pendingMap?.get(cloudEmp.id);
    if (inFlight) {
      result.push(inFlight.employee);
      continue;
    }

    if (dirtyIds.has(cloudEmp.id)) {
      const localEmp = localMap.get(cloudEmp.id);
      if (localEmp) {
        const localTime = localEmp.updatedAt ? new Date(localEmp.updatedAt).getTime() : 0;
        const cloudTime = cloudEmp.updatedAt ? new Date(cloudEmp.updatedAt).getTime() : 0;
        if (!cloudTime || (localTime && localTime >= cloudTime)) {
          result.push(localEmp);
          continue;
        }
      }
    }

    result.push(cloudEmp);
  }

  // Include locally created employees not yet present in cloud
  for (const localEmp of localEmployees) {
    if (!localEmp || !localEmp.id) continue;
    if (seenIds.has(localEmp.id) || deletedIds.has(localEmp.id)) continue;
    if (dirtyIds.has(localEmp.id) || pendingMap?.has(localEmp.id)) {
      result.push(localEmp);
    }
  }

  return result;
}

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
          selectedMonth: MONTHS[new Date().getMonth()]?.key || 'oct',
          selectedYear: new Date().getFullYear(),
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
            : [],
          payslipDesign: parsed.payslipDesign ? { ...DEFAULT_PAYSLIP_DESIGN, ...parsed.payslipDesign } : DEFAULT_PAYSLIP_DESIGN,
          savedPayslipPresets: (parsed.savedPayslipPresets && Array.isArray(parsed.savedPayslipPresets)) ? parsed.savedPayslipPresets : [],
          // NOTE: loans are NOT auto-synced here intentionally — autoSyncLoansForPeriod
          // is called explicitly on period changes to avoid mutating data during reads.
          loans: (parsed.loans && Array.isArray(parsed.loans)) ? parsed.loans : [],
          emailSettings: parsed.emailSettings ? { ...DEFAULT_EMAIL_SETTINGS, ...parsed.emailSettings } : DEFAULT_EMAIL_SETTINGS,
          emailedPayslips: (parsed.emailedPayslips && typeof parsed.emailedPayslips === 'object') ? parsed.emailedPayslips : {},
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
    employees: [],
    departments: DEFAULT_DEPARTMENTS,
    payrollVariables: DEFAULT_PAYROLL_VARIABLES,
    payeTaxVariables: DEFAULT_PAYE_VARIABLES,
    selectedMonth: MONTHS[new Date().getMonth()]?.key || 'oct',
    selectedYear: new Date().getFullYear(),
    snapshots: [],
    activeView: 'dashboard',
    isDarkTheme: localStorage.getItem(THEME_PREFERENCE_KEY) === 'dark',
    payslipDesign: DEFAULT_PAYSLIP_DESIGN,
    savedPayslipPresets: [],
    loans: [],
    emailSettings: DEFAULT_EMAIL_SETTINGS,
    emailedPayslips: {},
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
  const [isOnline, setIsOnline] = useState<boolean>(true);

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
      skipNextAutoSyncRef.current = true;
      setState(loadCompanyData(activeCompanyId, activeAcc));
    }
  };

  const setCompaniesList = (newList: CompanyAccount[]) => {
    setCompanies(newList);
    saveCompaniesRegistry(newList);
  };

  // Continuous Live Sync for Companies: Realtime Postgres changes, WebSocket broadcast, polling & window focus
  useEffect(() => {
    let isMounted = true;

    // Seamless migration from localStorage into IndexedDB on first load
    migrateFromLocalStorageIfNeeded().catch(err => {
      console.warn('LocalStorage to IndexedDB migration check error:', err);
    });

    const refreshCompaniesList = () => {
      const cfg = getSavedCloudConfig();
      if (!cfg.isEnabled) return;

      fetchCompaniesFromSupabase().then(res => {
        if (!isMounted) return;
        if (res.success && Array.isArray(res.companies)) {
          const freshList = res.companies;
          setCompanies(prev => {
            const prevStr = JSON.stringify(prev);
            const nextStr = JSON.stringify(freshList);
            if (prevStr !== nextStr) {
              saveCompaniesRegistry(freshList);
              return freshList;
            }
            return prev;
          });
        }
      }).catch(() => {});
    };

    // 1. Initial fetch on mount
    refreshCompaniesList();

    // 2. High-frequency polling (every 4 seconds) so other teams see new companies even without WebSockets
    // Poll every 30 seconds at most — the Realtime WebSocket above handles instant updates.
    // Previously 4s which hammered the DB on every render.
    const pollTimer = setInterval(refreshCompaniesList, 30000);

    // 3. Window focus & visibility trigger — whenever an operator clicks into the app window
    const handleFocus = () => { refreshCompaniesList(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('company-list-updated', handleFocus);

    // 4. Supabase Realtime WebSocket listener for the companies table
    const client = getSupabaseClient();
    let channel: any = null;
    if (client) {
      channel = client
        .channel(`companies-global-sync-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
          refreshCompaniesList();
        })
        .on('broadcast', { event: 'company-list-updated' }, () => {
          refreshCompaniesList();
        })
        .subscribe();
    }

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('company-list-updated', handleFocus);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, []);

  // Global Real Connectivity Tracker
  useEffect(() => {
    let cancelled = false;
    const updateOnlineStatus = async () => {
      const real = await checkRealConnectivity();
      if (!cancelled) setIsOnline(real);
    };
    updateOnlineStatus();
    const interval = setInterval(updateOnlineStatus, 12000);
    const handleOnline = () => { updateOnlineStatus(); };
    const handleOffline = () => { setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cloudCfg = getSavedCloudConfig();
  const isCloudOffline = Boolean(cloudCfg.isEnabled && !isOnline);

  // On startup: Ensure all loans are synchronized up to the active period
  useEffect(() => {
    setState(s => {
      const synced = autoSyncLoansForPeriod(s.loans || [], s.selectedYear, s.selectedMonth);
      const isChanged = JSON.stringify(synced) !== JSON.stringify(s.loans);
      if (isChanged) {
        return { ...s, loans: synced };
      }
      return s;
    });
  }, []);

  const activeCompanyIdRef = useRef<string | null>(activeCompanyId);
  useEffect(() => { activeCompanyIdRef.current = activeCompanyId; }, [activeCompanyId]);

  useEffect(() => {
    if (!activeCompanyId) return;

    // ISOLATION GUARD: Never save state if it belongs to another company during switch
    if (state.company?.id && state.company.id !== activeCompanyId) {
      return;
    }

    try {
      localStorage.setItem(COMPANY_DATA_PREFIX + activeCompanyId, JSON.stringify(state));
      // Also sync to legacy storage for backwards compatibility
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
    }
    // Asynchronous mirror-save to IndexedDB (eliminates 5-10MB localStorage limit)
    saveCompanyDataToDb(activeCompanyId, state).catch(e => {
      console.warn('Could not mirror save to IndexedDB:', e);
    });
  }, [state, activeCompanyId]);

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const isLocalUploadInProgressRef = useRef(false);
  const lastLocalUploadTimeRef = useRef(0);
  // Tracks locally updated employee records to prevent realtime echo overwrite before cloud persists
  const pendingLocalEmployeesRef = useRef<Map<string, { employee: Employee; timestamp: number }>>(new Map());
  // True once the active company's cloud copy has been loaded (or there is nothing to load).
  // Until then we must NEVER upload, otherwise an empty/stale local copy overwrites the cloud.
  const cloudReadyRef = useRef(false);
  // Set right before programmatic state loads (company open / cloud download) so they
  // are not mistaken for user edits and uploaded back.
  const skipNextAutoSyncRef = useRef(false);
  // Snapshot of the last synced/loaded business data fingerprint per company so pure UI changes
  // (activeView, isDarkTheme, selectedMonth, selectedYear) never trigger cloud uploads or offline flags.
  const lastSyncedSignatureRef = useRef<string>('');

  const getSyncableSignature = (s: AppState, compId: string | null): string => {
    try {
      return JSON.stringify({
        cid: compId,
        company: s.company,
        employees: s.employees,
        departments: s.departments,
        payrollVariables: s.payrollVariables,
        payeTaxVariables: s.payeTaxVariables,
        loans: s.loans || [],
        snapshots: s.snapshots,
        payslipDesign: s.payslipDesign,
        savedPayslipPresets: s.savedPayslipPresets || [],
        emailSettings: s.emailSettings,
        emailedPayslips: s.emailedPayslips,
      });
    } catch {
      return '';
    }
  };

  // Auto-sync state changes: immediate local save, debounced upload when online, or queue if offline
  useEffect(() => {
    if (!activeCompanyId) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastSyncedSignatureRef.current = getSyncableSignature(state, activeCompanyId);
      return;
    }

    const cfg = getSavedCloudConfig();
    if (!cfg.isEnabled) return;

    // ISOLATION GUARD: Never upload data if state belongs to a different company than activeCompanyId
    if (state.company?.id && state.company.id !== activeCompanyId) {
      return;
    }

    const currentSignature = getSyncableSignature(state, activeCompanyId);

    // LOAD GUARD: this state change came from opening a company / applying a cloud download
    if (skipNextAutoSyncRef.current) {
      skipNextAutoSyncRef.current = false;
      lastSyncedSignatureRef.current = currentSignature;
      return;
    }

    // UI-ONLY GUARD: Ignore changes that only affect UI state (activeView, theme, period selector)
    if (currentSignature === lastSyncedSignatureRef.current) {
      return;
    }
    lastSyncedSignatureRef.current = currentSignature;

    // HYDRATION GUARD: cloud copy not loaded yet — queue the edit instead of uploading
    if (!cloudReadyRef.current) {
      localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId, 'true');
      window.dispatchEvent(new Event('payroll-sync-status-changed'));
      return;
    }

    let cleanedUp = false;

    // Use a real server ping instead of navigator.onLine, which is unreliable in Electron
    (async () => {
      const isReallyOnline = await checkRealConnectivity();
      if (cleanedUp) return;

      if (!isReallyOnline) {
        localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId, 'true');
        window.dispatchEvent(new Event('payroll-sync-status-changed'));
        return;
      }

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(() => {
        isLocalUploadInProgressRef.current = true;
        const dirtyEmpIds = getDirtyEmployeeIds(activeCompanyId);
        uploadCompanyDataToSupabase(
          state.company,
          state.employees,
          state.departments,
          state.payrollVariables,
          state.payeTaxVariables,
          state.loans || [],
          state.snapshots,
          state.payslipDesign,
          state.savedPayslipPresets || [],
          state.emailSettings,
          state.emailedPayslips,
          { dirtyEmployeeIds: dirtyEmpIds }
        ).then(res => {
          if (res.success) {
            localStorage.removeItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId);
            clearDirtyEmployees(activeCompanyId);
          } else {
            // Upload failed without throwing (e.g. connection dropped mid-sync) — keep it queued
            console.warn('Auto-sync upload failed:', res.error);
            localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId, 'true');
          }
          window.dispatchEvent(new Event('payroll-sync-status-changed'));
        }).catch(err => {
          console.warn('Auto-sync upload error:', err);
          localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId, 'true');
          window.dispatchEvent(new Event('payroll-sync-status-changed'));
        }).finally(() => {
          lastLocalUploadTimeRef.current = Date.now();
          isLocalUploadInProgressRef.current = false;
        });
      }, 2000);
    })();

    return () => {
      cleanedUp = true;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [state, activeCompanyId]);

  // Reconnection sync: upload pending offline changes for ALL companies (not only the active one).
  // Triggered by the browser 'online' event AND a 20s connectivity poll, because in Electron the
  // 'online' event is unreliable (it only tracks LAN, not real internet reachability).
  useEffect(() => {
    let cancelled = false;

    const trySyncPending = async () => {
      if (!getSavedCloudConfig().isEnabled) return;
      if (getCompaniesWithPendingSync().length === 0) return;

      const online = await checkRealConnectivity();
      if (!online || cancelled) return;

      isLocalUploadInProgressRef.current = true;
      try {
        await syncAllPendingCompanies();
      } finally {
        lastLocalUploadTimeRef.current = Date.now();
        isLocalUploadInProgressRef.current = false;
      }
    };

    trySyncPending();
    const pollTimer = setInterval(trySyncPending, 20_000);
    window.addEventListener('online', trySyncPending);
    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      window.removeEventListener('online', trySyncPending);
    };
  }, []);

  // Live Supabase Cloud Realtime Channel
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client || !activeCompanyId) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const debouncedSyncFromCloud = () => {
      // 1. Do not process incoming realtime echoes while our own upload is active or within 5s of completion
      if (isLocalUploadInProgressRef.current || (Date.now() - lastLocalUploadTimeRef.current < 5000)) {
        return;
      }

      // 1b. Do not block all realtime updates just because pending flag exists — mergeEmployeesWithCloud
      // protects any locally dirty or in-flight employees while allowing other colleagues' updates through.
      if (pendingLocalEmployeesRef.current.size > 0) {
        return;
      }

      // 2. Debounce by 600ms so batch changes settle together rather than triggering multiple concurrent downloads
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        downloadCompanyDataFromSupabase(activeCompanyId).then(res => {
          if (!res.success) return;
          cloudReadyRef.current = true;
          skipNextAutoSyncRef.current = true;
          setState(prev => {
            // Isolation guard: Never apply cloud updates if the user switched companies in the interim
            if (prev.company?.id && prev.company.id !== activeCompanyId) {
              return prev;
            }
            // Guard: Never wipe out populated local employee list if incoming payload is empty
            if (prev.employees.length > 0 && (!res.employees || res.employees.length === 0)) {
              return prev;
            }

            // SMART MERGE: Never overwrite locally edited employees with older cloud versions
            const dirtyIds = getDirtyEmployeeIds(activeCompanyId);
            const deletedIds = getPendingDeletedEmployeeIds(activeCompanyId);
            const mergedEmployees = res.employees
              ? mergeEmployeesWithCloud(
                  prev.employees,
                  res.employees,
                  dirtyIds,
                  deletedIds,
                  pendingLocalEmployeesRef.current
                )
              : prev.employees;

            return {
              ...prev,
              // Company profile synced (logoUrl, name, subtitle, address, phone, email)
              ...(res.company ? { company: { ...prev.company, ...res.company } } : {}),
              // Departments list
              ...(res.departments && res.departments.length > 0 ? { departments: res.departments } : {}),
              // Employees (merged safely)
              employees: mergedEmployees,
              // Loans
              ...(res.loans ? { loans: res.loans } : {}),
              // Snapshots
              ...(res.snapshots ? { snapshots: res.snapshots } : {}),
              // Payroll variables
              ...(res.payrollVariables ? { payrollVariables: res.payrollVariables } : {}),
              // PAYE tax variables
              ...(res.payeTaxVariables ? { payeTaxVariables: res.payeTaxVariables } : {}),
              // Payslip design
              ...(res.payslipDesign ? { payslipDesign: res.payslipDesign } : {}),
              // Payslip presets (named design templates)
              ...(res.savedPayslipPresets && res.savedPayslipPresets.length > 0 ? { savedPayslipPresets: res.savedPayslipPresets } : {}),
              // Email settings & dispatched history per company
              ...(res.emailSettings ? { emailSettings: res.emailSettings } : {}),
              ...(res.emailedPayslips ? { emailedPayslips: res.emailedPayslips } : {}),
            };
          });
        });
      }, 600);
    };

    const channel = client
      .channel(`payroll-pro-realtime-${activeCompanyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees', filter: `company_id=eq.${activeCompanyId}` }, debouncedSyncFromCloud)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_loans', filter: `company_id=eq.${activeCompanyId}` }, debouncedSyncFromCloud)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_snapshots', filter: `company_id=eq.${activeCompanyId}` }, debouncedSyncFromCloud)
      // Company profile changes (logo, name, subtitle, address, etc.) — syncs across all team members instantly
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies', filter: `id=eq.${activeCompanyId}` }, debouncedSyncFromCloud)
      // Department list changes — syncs add/rename/delete across team members
      .on('postgres_changes', { event: '*', schema: 'public', table: 'departments', filter: `company_id=eq.${activeCompanyId}` }, debouncedSyncFromCloud)
      // Payroll variable changes (salary splits, pension rates) — syncs immediately
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_variables', filter: `company_id=eq.${activeCompanyId}` }, debouncedSyncFromCloud)
      // PAYE tax variable changes (brackets, reliefs) — syncs immediately
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paye_tax_variables', filter: `company_id=eq.${activeCompanyId}` }, debouncedSyncFromCloud)
      // Payslip design changes — syncs immediately
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payslip_designs', filter: `company_id=eq.${activeCompanyId}` }, debouncedSyncFromCloud)
      // Payslip preset changes — syncs saved named presets immediately
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payslip_presets', filter: `company_id=eq.${activeCompanyId}` }, debouncedSyncFromCloud)
      // Audit log entries — syncs new entries from other team members in real-time
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: `company_id=eq.${activeCompanyId}` }, debouncedSyncFromCloud)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      client.removeChannel(channel);
    };
  }, [activeCompanyId]);

  // Live Email Settings Realtime Sync across connected devices & sessions
  useEffect(() => {
    const handleEmailSettingsUpdated = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.companyId === activeCompanyId && custom.detail?.settings) {
        setState(prev => ({
          ...prev,
          emailSettings: custom.detail.settings,
        }));
      }
    };
    window.addEventListener('email-settings-updated', handleEmailSettingsUpdated);
    return () => window.removeEventListener('email-settings-updated', handleEmailSettingsUpdated);
  }, [activeCompanyId]);



  const activeEmployees = (state.employees || []).filter(e => isEmployeeActiveForPeriod(e, state.selectedYear, state.selectedMonth));
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
    s => s && normalizeMonthKey(s.monthKey) === normalizeMonthKey(state.selectedMonth) && s.year === state.selectedYear && s.isLocked
  );

  const currentPayrollItems = (activeSnapshot?.items && Array.isArray(activeSnapshot.items)) 
    ? activeSnapshot.items 
    : (Array.isArray(liveCalculatedItems) ? liveCalculatedItems : []);

  const monthLabel = MONTHS.find(m => m.key === state.selectedMonth)?.label || (MONTHS[new Date().getMonth()]?.label || 'October');

  const toggleTheme = () => {
    setIsDarkTheme(prev => {
      const next = !prev;
      localStorage.setItem(THEME_PREFERENCE_KEY, next ? 'dark' : 'light');
      setState(s => ({ ...s, isDarkTheme: next }));
      return next;
    });
  };

  const selectCompany = async (companyId: string, passwordAttempt?: string): Promise<{ success: boolean; error?: string }> => {
    const targetComp = companies.find(c => c.id === companyId);
    if (!targetComp) {
      return { success: false, error: 'Company account not found.' };
    }

    if (targetComp.hasPassword && targetComp.password) {
      if (!passwordAttempt || !verifyCredential(passwordAttempt, targetComp.password)) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
    }

    // Cancel any pending sync timeouts from the previous company immediately
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }

    cloudReadyRef.current = false;

    const loadedData = loadCompanyData(companyId, targetComp);
    const hasCachedRecords = Boolean(
      (loadedData.employees && loadedData.employees.length > 0) || 
      (loadedData.snapshots && loadedData.snapshots.length > 0)
    );

    let finalData: AppState = {
      ...loadedData,
      company: { ...loadedData.company, id: companyId, name: targetComp.name },
      activeView: 'dashboard',
      isDarkTheme,
    };

    const cfg = getSavedCloudConfig();
    if (cfg.isEnabled) {
      const dirtyIds = getDirtyEmployeeIds(companyId);
      const deletedIds = getPendingDeletedEmployeeIds(companyId);

      if (!hasCachedRecords) {
        // Option 1: First-time opening or empty cache - pre-load cloud data directly before switching views
        try {
          const res = await Promise.race([
            downloadCompanyDataFromSupabase(companyId),
            new Promise<{ success: false; error: string }>((resolve) =>
              setTimeout(() => resolve({ success: false, error: 'timeout' }), 4000)
            )
          ]);
          if (res.success) {
            cloudReadyRef.current = true;
            finalData = {
              ...finalData,
              company: res.company ? { ...finalData.company, ...res.company, id: companyId } : finalData.company,
              employees: res.employees
                ? mergeEmployeesWithCloud(finalData.employees, res.employees, dirtyIds, deletedIds, pendingLocalEmployeesRef.current)
                : [],
              departments: (res.departments && res.departments.length > 0) ? res.departments : finalData.departments,
              payrollVariables: res.payrollVariables || finalData.payrollVariables,
              payeTaxVariables: res.payeTaxVariables || finalData.payeTaxVariables,
              loans: res.loans || finalData.loans,
              snapshots: res.snapshots || finalData.snapshots,
              payslipDesign: res.payslipDesign || finalData.payslipDesign,
              savedPayslipPresets: res.savedPayslipPresets || finalData.savedPayslipPresets,
              emailSettings: res.emailSettings || finalData.emailSettings || DEFAULT_EMAIL_SETTINGS,
              emailedPayslips: res.emailedPayslips || finalData.emailedPayslips || {},
            };
          }
        } catch {
          // Fall back to local data if network stalls
        }
      } else {
        // Local records already exist: switch instantly and always merge fresh cloud records in background
        downloadCompanyDataFromSupabase(companyId).then(res => {
          if (!res.success) return;
          cloudReadyRef.current = true;
          skipNextAutoSyncRef.current = true;
          setState(prev => {
            if (activeCompanyIdRef.current !== companyId) return prev;
            const currentDirtyIds = getDirtyEmployeeIds(companyId);
            const currentDeletedIds = getPendingDeletedEmployeeIds(companyId);
            return {
              ...prev,
              company: res.company ? { ...prev.company, ...res.company, id: companyId } : prev.company,
              employees: res.employees
                ? mergeEmployeesWithCloud(prev.employees, res.employees, currentDirtyIds, currentDeletedIds, pendingLocalEmployeesRef.current)
                : prev.employees,
              departments: (res.departments && res.departments.length > 0) ? res.departments : prev.departments,
              payrollVariables: res.payrollVariables || prev.payrollVariables,
              payeTaxVariables: res.payeTaxVariables || prev.payeTaxVariables,
              loans: res.loans || prev.loans,
              snapshots: res.snapshots || prev.snapshots,
              payslipDesign: res.payslipDesign || prev.payslipDesign,
              savedPayslipPresets: res.savedPayslipPresets || prev.savedPayslipPresets,
              emailSettings: res.emailSettings || prev.emailSettings || DEFAULT_EMAIL_SETTINGS,
              emailedPayslips: res.emailedPayslips || prev.emailedPayslips || {},
            };
          });
        }).catch(() => {});
      }

      if (hasPendingOfflineSync(companyId)) {
        // Offline edits exist: push dirty changes up in background if online
        checkRealConnectivity().then(online => {
          if (online) syncAllPendingCompanies().catch(() => {});
        });
      }
    } else {
      cloudReadyRef.current = true;
    }

    // Set state and activeCompanyId with complete hydrated data
    skipNextAutoSyncRef.current = true;
    setState(finalData);
    setActiveCompanyId(companyId);

    setCompanies(prev => {
      const updated = prev.map(c => c.id === companyId ? { ...c, lastActiveAt: new Date().toISOString() } : c);
      saveCompaniesRegistry(updated);
      return updated;
    });

    return { success: true };
  };

  const lockOrSwitchCompany = () => {
    // Clear any pending sync timeout so previous company doesn't upload during switch
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    setActiveCompanyId(null);
  };

  const createCompany = (
    accountData: Omit<CompanyAccount, 'id'>, 
    initialTemplate: 'default' | 'blank' = 'default'
  ): { success: boolean; companyId?: string; error?: string } => {
    if (!accountData.name || !accountData.name.trim()) {
      return { success: false, error: 'Company name is required.' };
    }

    const newId = 'comp-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());
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
      selectedMonth: MONTHS[new Date().getMonth()]?.key || 'oct',
      selectedYear: new Date().getFullYear(),
      snapshots: [],
      activeView: 'dashboard',
      isDarkTheme,
      emailSettings: DEFAULT_EMAIL_SETTINGS,
    };

    try {
      localStorage.setItem(COMPANY_DATA_PREFIX + newId, JSON.stringify(newAppState));
      const nextCompanies = [...companies, newAccount];
      setCompanies(nextCompanies);
      saveCompaniesRegistry(nextCompanies);

      if (getSavedCloudConfig().isEnabled) {
        syncCompanyToSupabase(newAccount);
        uploadCompanyDataToSupabase(
          newCompanyProfile,
          [],
          DEFAULT_DEPARTMENTS,
          DEFAULT_PAYROLL_VARIABLES,
          DEFAULT_PAYE_VARIABLES,
          [],
          [],
          DEFAULT_PAYSLIP_DESIGN,
          [],
          DEFAULT_EMAIL_SETTINGS,
          {}
        );
      }

      cloudReadyRef.current = true;
      skipNextAutoSyncRef.current = true;
      setState(newAppState);
      setActiveCompanyId(newId);

      logAuditEvent(
        newId,
        newAccount.name,
        'COMPANY_CREATED',
        `Created company workspace "${newAccount.name}" (${newAccount.hasPassword ? 'Protected with PIN' : 'Open access'})`
      );

      return { success: true, companyId: newId };
    } catch (e) {
      console.error('Failed to create company:', e);
      return { success: false, error: 'Failed to save new company workspace.' };
    }
  };

  const updateCompanyAccount = (companyId: string, updates: Partial<CompanyAccount>) => {
    const existingComp = companies.find(c => c.id === companyId);
    const compName = updates.name || existingComp?.name || 'Workspace';

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
          if (getSavedCloudConfig().isEnabled) {
            syncCompanyToSupabase(updated);
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

    // Record audit event for company changes
    if (updates.hasPassword !== undefined || updates.password !== undefined) {
      const statusText = updates.hasPassword ? 'Configured PIN protection' : 'Removed PIN protection';
      logAuditEvent(
        companyId,
        compName,
        'COMPANY_SECURITY_UPDATED',
        `${statusText} for workspace "${compName}"`
      );
    } else {
      const changedKeys = Object.keys(updates).filter(k => k !== 'lastActiveAt');
      if (changedKeys.length > 0) {
        logAuditEvent(
          companyId,
          compName,
          'COMPANY_INFO_UPDATED',
          `Updated company information (${changedKeys.join(', ')}) for workspace "${compName}"`
        );
      }
    }
  };

  const deleteCompany = (companyId: string): { success: boolean; error?: string } => {
    if (companies.length <= 1) {
      return { success: false, error: 'Cannot delete the only company account in the system.' };
    }

    const targetComp = companies.find(c => c.id === companyId);
    const targetName = targetComp?.name || 'Workspace';

    try {
      localStorage.removeItem(COMPANY_DATA_PREFIX + companyId);
      const nextCompanies = companies.filter(c => c.id !== companyId);
      setCompanies(nextCompanies);
      saveCompaniesRegistry(nextCompanies);

      if (getSavedCloudConfig().isEnabled) {
        deleteCompanyFromSupabase(companyId);
      }

      logAuditEvent(
        companyId,
        targetName,
        'COMPANY_DELETED',
        `Deleted company workspace "${targetName}" and associated local records`
      );

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
    setState(s => {
      const synced = autoSyncLoansForPeriod(s.loans || [], year, monthKey);
      const loansChanged = JSON.stringify(synced) !== JSON.stringify(s.loans || []);
      if (!loansChanged) {
        return { ...s, selectedMonth: monthKey, selectedYear: year };
      }
      return { ...s, selectedMonth: monthKey, selectedYear: year, loans: synced };
    });
  };

  const addEmployee = (emp: Omit<Employee, 'id'>) => {
    const sanitizedGross = Math.max(0, Number(emp.monthlyGross) || 0);
    const sanitizedRent = Math.max(0, Number(emp.annualRent) || 0);
    const nowIso = new Date().toISOString();
    const newEmp: Employee = {
      ...emp,
      monthlyGross: sanitizedGross,
      annualRent: sanitizedRent,
      annualRents: emp.annualRents || {},
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? 'emp-' + crypto.randomUUID() : 'emp-' + Date.now(),
      employmentType: emp.employmentType || 'Full-Time',
      updatedAt: nowIso,
    };

    // Shield from realtime echo overwrites & mark dirty until cloud confirms
    lastLocalUploadTimeRef.current = Date.now();
    pendingLocalEmployeesRef.current.set(newEmp.id, { employee: newEmp, timestamp: Date.now() });
    if (activeCompanyId) {
      markEmployeesDirty(activeCompanyId, [newEmp.id]);
    }

    setState(s => ({ ...s, employees: [newEmp, ...s.employees] }));

    // Immediate single-employee direct cloud save
    if (activeCompanyId && getSavedCloudConfig().isEnabled) {
      const compId = activeCompanyId;
      saveSingleEmployeeToCloud(newEmp, compId).then(res => {
        if (res.success) {
          unmarkEmployeeDirty(compId, newEmp.id);
          setTimeout(() => {
            pendingLocalEmployeesRef.current.delete(newEmp.id);
          }, 4000);
        } else {
          localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + compId, 'true');
          window.dispatchEvent(new Event('payroll-sync-status-changed'));
        }
      }).catch(err => {
        console.warn('Direct cloud save for new employee error:', err);
        localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + compId, 'true');
        window.dispatchEvent(new Event('payroll-sync-status-changed'));
      });
    }

    logAuditEvent(
      activeCompanyId || '',
      activeCompany?.name || '',
      'CREATED_EMPLOYEE',
      `Added employee ${emp.firstName} ${emp.lastName} (${emp.code || 'Auto-Code'}) with Gross ₦${sanitizedGross.toLocaleString()}`
    );
  };

  const addEmployees = (emps: Omit<Employee, 'id'>[]) => {
    if (!emps || emps.length === 0) return;
    const nowIso = new Date().toISOString();
    const newEmps: Employee[] = emps.map((emp) => ({
      ...emp,
      monthlyGross: Math.max(0, Number(emp.monthlyGross) || 0),
      annualRent: Math.max(0, Number(emp.annualRent) || 0),
      annualRents: emp.annualRents || {},
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? 'emp-' + crypto.randomUUID() : 'emp-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      employmentType: emp.employmentType || 'Full-Time',
      updatedAt: nowIso,
    }));

    // Shield from realtime echo overwrites & mark dirty for upload
    lastLocalUploadTimeRef.current = Date.now();
    newEmps.forEach(ne => pendingLocalEmployeesRef.current.set(ne.id, { employee: ne, timestamp: Date.now() }));
    if (activeCompanyId) {
      markEmployeesDirty(activeCompanyId, newEmps.map(ne => ne.id));
    }

    setState(s => ({ ...s, employees: [...newEmps, ...s.employees] }));
    logAuditEvent(
      activeCompanyId || '',
      activeCompany?.name || '',
      'BATCH_CREATED_EMPLOYEES',
      `Added ${emps.length} new employees in batch`
    );
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    const existing = state.employees.find(e => e.id === id);
    const sanitizedUpdates: Partial<Employee> = { ...updates };
    if (sanitizedUpdates.monthlyGross !== undefined) {
      sanitizedUpdates.monthlyGross = Math.max(0, Number(sanitizedUpdates.monthlyGross) || 0);
    }
    if (sanitizedUpdates.annualRent !== undefined) {
      sanitizedUpdates.annualRent = Math.max(0, Number(sanitizedUpdates.annualRent) || 0);
    }

    const nowIso = new Date().toISOString();
    const updatedEmployee: Employee = existing
      ? { ...existing, ...sanitizedUpdates, updatedAt: nowIso }
      : { id, ...(sanitizedUpdates as any), updatedAt: nowIso };

    // 1. Immediately shield local state from incoming realtime echo overwrites & mark dirty
    lastLocalUploadTimeRef.current = Date.now();
    pendingLocalEmployeesRef.current.set(id, { employee: updatedEmployee, timestamp: Date.now() });
    if (activeCompanyId) {
      markEmployeesDirty(activeCompanyId, [id]);
    }

    setState(s => ({
      ...s,
      employees: s.employees.map(e => e.id === id ? updatedEmployee : e)
    }));

    // 2. Direct single-employee cloud save: writes directly to cloud without waiting for debounced bulk sync
    if (activeCompanyId && getSavedCloudConfig().isEnabled) {
      const compId = activeCompanyId;
      saveSingleEmployeeToCloud(updatedEmployee, compId).then(res => {
        if (res.success) {
          unmarkEmployeeDirty(compId, id);
          setTimeout(() => {
            pendingLocalEmployeesRef.current.delete(id);
          }, 4000);
        } else {
          console.warn('Single employee cloud save failed:', res.error);
          localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + compId, 'true');
          window.dispatchEvent(new Event('payroll-sync-status-changed'));
        }
      }).catch(err => {
        console.warn('Single employee cloud save error:', err);
        localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + compId, 'true');
        window.dispatchEvent(new Event('payroll-sync-status-changed'));
      });
    }

    let changeSummary = 'Updated employee details';
    if (existing && updates.monthlyGross !== undefined && updates.monthlyGross !== existing.monthlyGross) {
      changeSummary = `Updated salary for ${existing.firstName} ${existing.lastName} from ₦${existing.monthlyGross.toLocaleString()} to ₦${Number(updates.monthlyGross).toLocaleString()}`;
    } else if (existing) {
      changeSummary = `Updated record for ${existing.firstName} ${existing.lastName}`;
    }

    logAuditEvent(
      activeCompanyId || '',
      activeCompany?.name || '',
      'UPDATED_EMPLOYEE',
      changeSummary
    );
  };

  const deleteEmployee = (id: string) => {
    const existing = state.employees.find(e => e.id === id);
    if (activeCompanyId) {
      markEmployeePendingDelete(activeCompanyId, id);
    }
    pendingLocalEmployeesRef.current.delete(id);

    setState(s => ({
      ...s,
      employees: s.employees.filter(e => e.id !== id),
      loans: (s.loans || []).filter(l => l.employeeId !== id)
    }));
    if (existing) {
      logAuditEvent(
        activeCompanyId || '',
        activeCompany?.name || '',
        'DELETED_EMPLOYEE',
        `Deleted employee ${existing.firstName} ${existing.lastName} (${existing.code})`
      );
    }
    const compId = activeCompanyId;
    deleteEmployeeFromCloud(id, compId || undefined).then(res => {
      if (res.success && compId) {
        unmarkEmployeePendingDelete(compId, id);
      } else if (compId) {
        localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + compId, 'true');
        window.dispatchEvent(new Event('payroll-sync-status-changed'));
      }
    }).catch(err => {
      console.warn('Could not immediately delete employee from cloud:', err);
      if (compId) {
        localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + compId, 'true');
        window.dispatchEvent(new Event('payroll-sync-status-changed'));
      }
    });
  };

  const importEmployees = (
    incoming: Partial<Employee>[], 
    mode: 'merge' | 'overwrite',
    importScope: 'all' | 'salary-only' | 'bank-only' = 'all'
  ) => {
    const nowIso = new Date().toISOString();
    if (mode === 'overwrite' && importScope === 'all') {
      const formatted: Employee[] = incoming.map((item, idx) => ({
        id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? 'emp-' + crypto.randomUUID() : `emp-${Date.now()}-${idx}`),
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
        // Do NOT silently fill bank details — leave empty if missing to prevent wrong payments
        bankName: item.bankName || '',
        accountNumber: item.accountNumber || '',
        hasPension: item.hasPension ?? true,
        hasPaye: item.hasPaye ?? true,
        payeNumber: item.payeNumber || '',
        pensionNumber: item.pensionNumber || '',
        pfaName: item.pfaName || '',
        status: item.status || 'Active',
        updatedAt: nowIso,
      }));

      if (activeCompanyId) {
        markEmployeesDirty(activeCompanyId, formatted.map(e => e.id));
      }
      setState(s => ({ ...s, employees: formatted }));
      return;
    }

    const touchedIds: string[] = [];
    setState(s => {
      const existingMap = new Map(s.employees.map(e => [e.code.toLowerCase(), e]));

      incoming.forEach((item, idx) => {
        const codeKey = (item.code || '').toLowerCase();
        if (existingMap.has(codeKey)) {
          const current = existingMap.get(codeKey)!;
          touchedIds.push(current.id);
          
          if (importScope === 'salary-only') {
            // Update salary / gross / rent only without modifying personal or bank details
            existingMap.set(codeKey, {
              ...current,
              monthlyGross: Number(item.monthlyGross) > 0 ? Number(item.monthlyGross) : current.monthlyGross,
              annualRent: Number(item.annualRent) ?? current.annualRent,
              updatedAt: nowIso,
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
              updatedAt: nowIso,
            });
          } else {
            // Full merge
            existingMap.set(codeKey, {
              ...current,
              ...item,
              employmentType: item.employmentType || current.employmentType || 'Full-Time',
              monthlyGross: Number(item.monthlyGross) || current.monthlyGross,
              annualRent: Number(item.annualRent) ?? current.annualRent,
              updatedAt: nowIso,
            });
          }
        } else {
          // If staff does not exist in directory, add them
          const newEmp: Employee = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? 'emp-' + crypto.randomUUID() : `emp-${Date.now()}-${idx}`,
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
            // Do NOT silently fill bank details — leave empty if missing to prevent wrong payments
            bankName: item.bankName || '',
            accountNumber: item.accountNumber || '',
            hasPension: item.hasPension ?? true,
            hasPaye: item.hasPaye ?? true,
            payeNumber: item.payeNumber || '',
            pensionNumber: item.pensionNumber || '',
            pfaName: item.pfaName || '',
            status: item.status || 'Active',
            updatedAt: nowIso,
          };
          touchedIds.push(newEmp.id);
          existingMap.set(newEmp.code.toLowerCase(), newEmp);
        }
      });

      if (activeCompanyId && touchedIds.length > 0) {
        markEmployeesDirty(activeCompanyId, touchedIds);
      }

      return {
        ...s,
        employees: Array.from(existingMap.values())
      };
    });
  };

  const finalizeAndLockPayroll = (notes: string = '') => {
    const normCurMonth = normalizeMonthKey(state.selectedMonth);
    const existingSnapshotsForMonth = state.snapshots.filter(
      s => normalizeMonthKey(s.monthKey) === normCurMonth && s.year === state.selectedYear
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

    // Capture the active team member name for the audit trail
    const _activeMember = getActiveTeamMember();
    const finalizedByName = _activeMember ? `${_activeMember.name} (${_activeMember.role})` : 'Payroll Administrator';

    const newSnapshot: PayrollSnapshot = {
      id: `snap-${normCurMonth}-${state.selectedYear}-v${nextVersion}`,
      monthKey: normCurMonth,
      monthLabel,
      year: state.selectedYear,
      version: nextVersion,
      isLocked: true,
      finalizedAt: new Date().toISOString(),
      finalizedBy: finalizedByName,
      notes: notes || `Finalized ${monthLabel} ${state.selectedYear} payroll run (v${nextVersion})`,
      items: liveCalculatedItems,
      totals,
    };

    // Amortize active loans when payroll is finalized.
    // IMPORTANT: Check for both auto-sync records (id starts with 'repay-auto-') AND
    // manual records to prevent any double-deduction for the same period.
    const currentPeriodKey = `${state.selectedYear}-${normCurMonth}`;
    const updatedLoans = (state.loans || []).map(loan => {
      if (loan.status !== 'Active' || (loan.remainingBalance || 0) <= 0) {
        return loan;
      }
      // Avoid double deduction: skip if ANY history entry (auto or manual) exists for this period
      const alreadyDeducted = (loan.history || []).some(h => h.periodKey === currentPeriodKey);
      if (alreadyDeducted) return loan;

      const pItem = liveCalculatedItems.find(i => i.employeeId === loan.employeeId);
      if (!pItem || (pItem.loanDeduction || 0) <= 0) return loan;

      const deductionForThis = Math.min(Number(loan.monthlyDeduction) || 0, Number(loan.remainingBalance) || 0);
      if (deductionForThis <= 0) return loan;

      const newRemaining = Math.max(0, (loan.remainingBalance || 0) - deductionForThis);
      const newTotalRepaid = (loan.totalRepaid || 0) + deductionForThis;
      const newStatus: LoanStatus = newRemaining <= 0 ? 'Paid' : 'Active';

      const repaymentRecord: LoanRepaymentRecord = {
        id: `repay-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2, 6)}`,
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
          (normalizeMonthKey(snap.monthKey) === normCurMonth && snap.year === s.selectedYear)
            ? { ...snap, isLocked: false }
            : snap
        ),
        newSnapshot
      ]
    }));

    // Instantly sync lock to Supabase Cloud so all devices (mobile, desktop) lock immediately
    if (activeCompanyId) {
      saveSnapshotToCloud(newSnapshot, activeCompanyId).catch(err => {
        console.warn('Direct cloud lock upload failed, auto-sync will retry:', err);
      });

      // Update any previous versions of this period that became unlocked
      const previousVersions = state.snapshots.filter(
        snap => normalizeMonthKey(snap.monthKey) === normCurMonth && snap.year === state.selectedYear && snap.isLocked
      );
      previousVersions.forEach(prevSnap => {
        saveSnapshotToCloud({ ...prevSnap, isLocked: false }, activeCompanyId).catch(() => {});
      });
    }

    logAuditEvent(
      activeCompanyId || '',
      activeCompany?.name || '',
      'FINALIZED_PAYROLL',
      `Locked & finalized ${monthLabel} ${state.selectedYear} payroll (v${nextVersion}) for ${totals.staffCount} staff. Total Net Pay: ₦${totals.totalNet.toLocaleString()}`
    );
  };

  const unlockPayroll = (reason: string = '') => {
    const normCurMonth = normalizeMonthKey(state.selectedMonth);
    const updatedSnapshots = state.snapshots.map(snap => 
      (normalizeMonthKey(snap.monthKey) === normCurMonth && snap.year === state.selectedYear)
        ? { ...snap, isLocked: false, notes: snap.notes + ` | Unlocked: ${reason}` }
        : snap
    );

    setState(s => ({
      ...s,
      snapshots: updatedSnapshots
    }));

    // Instantly sync unlock to Supabase Cloud so all devices (mobile, desktop) unlock immediately
    if (activeCompanyId) {
      const unlockedSnapshots = updatedSnapshots.filter(
        snap => normalizeMonthKey(snap.monthKey) === normCurMonth && snap.year === state.selectedYear
      );
      unlockedSnapshots.forEach(snap => {
        saveSnapshotToCloud(snap, activeCompanyId).catch(err => {
          console.warn('Direct cloud unlock upload failed, auto-sync will retry:', err);
        });
      });
    }

    logAuditEvent(
      activeCompanyId || '',
      activeCompany?.name || '',
      'UNLOCKED_PAYROLL',
      `Unlocked ${monthLabel} ${state.selectedYear} payroll. Reason: ${reason || 'Not specified'}`
    );
  };

  const deleteSnapshot = (snapshotId: string) => {
    setState(s => ({
      ...s,
      snapshots: s.snapshots.filter(snap => snap.id !== snapshotId),
    }));

    if (activeCompanyId) {
      deleteSnapshotFromCloud(snapshotId, activeCompanyId).catch(err => {
        console.warn('Direct cloud snapshot deletion failed:', err);
      });
    }
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

  const updateEmailSettings = (settings: Partial<EmailSettings>) => {
    const current = state.emailSettings || DEFAULT_EMAIL_SETTINGS;
    const nextSettings = {
      ...current,
      ...settings,
    };
    setState(s => ({
      ...s,
      emailSettings: nextSettings
    }));

    if (activeCompanyId) {
      // 1. Immediately persist locally to localStorage and IndexedDB
      const nextFullState = { ...state, emailSettings: nextSettings };
      try {
        localStorage.setItem(COMPANY_DATA_PREFIX + activeCompanyId, JSON.stringify(nextFullState));
      } catch (e) {
        console.warn('Failed to save email settings to localStorage:', e);
      }
      saveCompanyDataToDb(activeCompanyId, nextFullState).catch(() => {});

      // 2. If cloud is connected, push to Supabase and broadcast to all devices
      const isCloudEnabled = getSavedCloudConfig().isEnabled;
      if (isCloudEnabled) {
        saveEmailSettingsToCloud(nextSettings, activeCompanyId).then(res => {
          if (!res.success) {
            localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId, 'true');
            window.dispatchEvent(new Event('payroll-sync-status-changed'));
          }
        }).catch(() => {
          localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId, 'true');
          window.dispatchEvent(new Event('payroll-sync-status-changed'));
        });
      } else {
        // Database not connected: Flag as pending offline sync so it automatically uploads once reconnected!
        localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId, 'true');
        window.dispatchEvent(new Event('payroll-sync-status-changed'));
      }
    }
  };

  const recordEmailedPayslips = (records: EmailedPayslipRecord[]) => {
    const current = state.emailedPayslips || {};
    const next = { ...current };
    records.forEach(r => {
      const key = `${r.periodKey}_${r.employeeId}`;
      next[key] = r;
    });

    setState(s => ({
      ...s,
      emailedPayslips: next
    }));

    if (activeCompanyId) {
      const nextFullState = { ...state, emailedPayslips: next };
      try {
        localStorage.setItem(COMPANY_DATA_PREFIX + activeCompanyId, JSON.stringify(nextFullState));
      } catch (e) {
        console.warn('Failed to save emailed payslips to localStorage:', e);
      }
      saveCompanyDataToDb(activeCompanyId, nextFullState).catch(() => {});

      const isCloudEnabled = getSavedCloudConfig().isEnabled;
      if (isCloudEnabled) {
        saveEmailedPayslipsToCloud(next, activeCompanyId).then(res => {
          if (!res.success) {
            localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId, 'true');
            window.dispatchEvent(new Event('payroll-sync-status-changed'));
          }
        }).catch(() => {
          localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId, 'true');
          window.dispatchEvent(new Event('payroll-sync-status-changed'));
        });
      } else {
        localStorage.setItem(PENDING_OFFLINE_SYNC_PREFIX + activeCompanyId, 'true');
        window.dispatchEvent(new Event('payroll-sync-status-changed'));
      }
    }
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
    const nowIso = new Date().toISOString();
    setState(s => {
      const current = s.departments || DEFAULT_DEPARTMENTS;
      const affectedIds: string[] = [];
      const updatedEmployees = s.employees.map(emp => {
        if (emp.department === trimmedOld) {
          affectedIds.push(emp.id);
          return { ...emp, department: trimmedNew, updatedAt: nowIso };
        }
        return emp;
      });
      if (activeCompanyId && affectedIds.length > 0) {
        markEmployeesDirty(activeCompanyId, affectedIds);
      }
      return {
        ...s,
        departments: current.map(d => d === trimmedOld ? trimmedNew : d),
        employees: updatedEmployees
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
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? 'loan-' + crypto.randomUUID() : `loan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      principalAmount: principal,
      monthlyDeduction: monthly > 0 ? monthly : principal,
      totalRepaid: 0,
      remainingBalance: principal,
      status: 'Active',
      createdAt: new Date().toISOString(),
      history: [],
    };
    setState(s => {
      const synced = autoSyncLoansForPeriod([newLoan, ...(s.loans || [])], s.selectedYear, s.selectedMonth);
      return {
        ...s,
        loans: synced,
      };
    });
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
    setCompaniesList,
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
    isOnline,
    isCloudOffline,
    emailSettings: state.emailSettings || DEFAULT_EMAIL_SETTINGS,
    updateEmailSettings,
    emailedPayslips: state.emailedPayslips || {},
    recordEmailedPayslips,
  };
}
