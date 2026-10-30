import Dexie, { Table } from 'dexie';
import { CompanyAccount } from '../types';
import type { AppState } from './usePayrollStore';

export interface CompanyDataRecord {
  companyId: string;
  state: AppState;
  updatedAt: string;
}

export interface OfflineQueueRecord {
  id: string; // e.g. `${entity}-${action}-${entityId}-${Date.now()}`
  companyId?: string;
  entity: 'employees' | 'departments' | 'employee_loans' | 'payroll_snapshots' | 'payroll_variables' | 'paye_tax_variables' | 'payslip_designs';
  action: 'upsert' | 'delete';
  payload?: any;
  createdAt: string;
}

export class PayrollProDatabase extends Dexie {
  companies!: Table<CompanyAccount, string>;
  companyData!: Table<CompanyDataRecord, string>;
  offlineQueue!: Table<OfflineQueueRecord, string>;

  constructor() {
    super('PayrollProLocalDatabase_V1');
    this.version(1).stores({
      companies: 'id, name, lastActiveAt',
      companyData: 'companyId, updatedAt',
      offlineQueue: 'id, companyId, entity, action, createdAt',
    });
  }
}

export const localDb = new PayrollProDatabase();

/**
 * Migrates data seamlessly from localStorage into IndexedDB on first run
 */
export async function migrateFromLocalStorageIfNeeded(): Promise<void> {
  try {
    const COMPANY_DATA_PREFIX = 'PAYROLL_PRO_DATA_COMPANY_';
    const COMPANIES_REGISTRY_KEY = 'PAYROLL_PRO_COMPANIES_REGISTRY_V1';

    // 1. Migrate companies registry
    const rawRegistry = localStorage.getItem(COMPANIES_REGISTRY_KEY);
    if (rawRegistry) {
      const companies: CompanyAccount[] = JSON.parse(rawRegistry);
      if (Array.isArray(companies) && companies.length > 0) {
        await localDb.companies.bulkPut(companies);
      }
    }

    // 2. Migrate company data records
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(COMPANY_DATA_PREFIX)) {
        const companyId = key.slice(COMPANY_DATA_PREFIX.length);
        const rawData = localStorage.getItem(key);
        if (rawData) {
          try {
            const state = JSON.parse(rawData);
            await localDb.companyData.put({
              companyId,
              state,
              updatedAt: new Date().toISOString(),
            });
          } catch {
            // Ignore parse errors on single corrupted key
          }
        }
      }
    }
  } catch (err) {
    console.warn('LocalStorage to IndexedDB migration check encountered an error:', err);
  }
}

/**
 * Loads company state from IndexedDB with transparent fallback to localStorage
 */
export async function getCompanyDataFromDb(companyId: string): Promise<AppState | null> {
  try {
    const record = await localDb.companyData.get(companyId);
    if (record?.state) return record.state;
  } catch (err) {
    console.warn('Failed to load company data from IndexedDB, trying localStorage:', err);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(`PAYROLL_PRO_DATA_COMPANY_${companyId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }
  return null;
}

/**
 * Saves company state to IndexedDB and mirror-saves to localStorage (for instant synchronous fallbacks)
 */
export async function saveCompanyDataToDb(companyId: string, state: AppState): Promise<void> {
  // Always mirror-save to IndexedDB (asynchronous, no 5MB limit)
  try {
    await localDb.companyData.put({
      companyId,
      state,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB:', err);
  }

  // Best-effort mirror save to localStorage
  try {
    localStorage.setItem(`PAYROLL_PRO_DATA_COMPANY_${companyId}`, JSON.stringify(state));
  } catch (err) {
    // If localStorage quota is exceeded, IndexedDB still safely has it!
    console.warn('LocalStorage quota limit reached, data preserved in IndexedDB:', err);
  }
}
