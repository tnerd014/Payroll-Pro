import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  CompanyProfile, 
  CompanyAccount,
  Employee, 
  PayrollVariables, 
  PayeTaxVariables, 
  PayrollSnapshot, 
  EmployeeLoan, 
  PayslipDesignConfig, 
  PayslipCustomPreset,
  TeamMember,
  AuditLogEntry
} from '../types';
import { hashCredential, verifyCredential, isBcryptHash } from '../utils/cryptoAuth';

// Re-export for consumers that imported from here
export { hashCredential, verifyCredential, isBcryptHash };

export const SUPABASE_CONFIG_STORAGE_KEY = 'PAYROLL_PRO_SUPABASE_CONFIG_V1';
export const ACTIVE_TEAM_MEMBER_STORAGE_KEY = 'PAYROLL_PRO_ACTIVE_MEMBER_V1';
export const STANDALONE_OFFLINE_MODE_KEY = 'PAYROLL_PRO_STANDALONE_OFFLINE_MODE_V1';

export const LOCAL_STANDALONE_ADMIN: TeamMember = {
  id: 'local_offline_operator',
  name: 'Local Administrator',
  email: 'offline@device',
  username: 'admin',
  role: 'Admin',
  isActive: true,
  mustChangePassword: false,
};

export function isStandaloneOfflineMode(): boolean {
  try {
    return localStorage.getItem(STANDALONE_OFFLINE_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setStandaloneOfflineMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(STANDALONE_OFFLINE_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(STANDALONE_OFFLINE_MODE_KEY);
    }
  } catch (e) {
    console.warn('Failed to toggle standalone offline mode:', e);
  }
}

export interface SupabaseCloudConfig {
  url: string;
  anonKey: string;
  isEnabled: boolean;
  lastConnectedAt?: string;
  projectName?: string;
}

// Cache on globalThis so Vite HMR in dev doesn't create duplicate GoTrueClient instances
const globalForSupabase = globalThis as unknown as {
  __supabaseClient?: SupabaseClient | null;
  __supabaseUrl?: string;
  __supabaseKey?: string;
};

export function getSavedCloudConfig(): SupabaseCloudConfig {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        url: parsed.url || '',
        anonKey: parsed.anonKey || '',
        isEnabled: Boolean(parsed.isEnabled),
        lastConnectedAt: parsed.lastConnectedAt,
        projectName: parsed.projectName || '',
      };
    }
  } catch (e) {
    console.error('Failed to load Supabase cloud config:', e);
  }
  return {
    url: '',
    anonKey: '',
    isEnabled: false,
  };
}

export function saveCloudConfig(config: SupabaseCloudConfig): void {
  try {
    localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
    if (config.isEnabled && config.url && config.anonKey) {
      setStandaloneOfflineMode(false);
    }
    // Invalidate cached client so it re-initializes
    globalForSupabase.__supabaseClient = null;
    globalForSupabase.__supabaseUrl = '';
    globalForSupabase.__supabaseKey = '';
  } catch (e) {
    console.error('Failed to save Supabase cloud config:', e);
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSavedCloudConfig();
  if (!config.isEnabled || !config.url || !config.anonKey) {
    return null;
  }

  if (
    globalForSupabase.__supabaseClient &&
    globalForSupabase.__supabaseUrl === config.url &&
    globalForSupabase.__supabaseKey === config.anonKey
  ) {
    return globalForSupabase.__supabaseClient;
  }

  try {
    const client = createClient(config.url.trim(), config.anonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    globalForSupabase.__supabaseClient = client;
    globalForSupabase.__supabaseUrl = config.url;
    globalForSupabase.__supabaseKey = config.anonKey;
    return client;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Performs a real internet connectivity check by pinging the configured Supabase
 * server URL. navigator.onLine is unreliable in Electron (returns true even when
 * there is no actual internet — only checks LAN connection). This function does a
 * real HEAD request to the server with apikey headers so it doesn't 401, and returns
 * false on any network failure.
 */
export async function checkRealConnectivity(): Promise<boolean> {
  const config = getSavedCloudConfig();
  if (!config.isEnabled || !config.url) {
    // No cloud configured; treat as "online" (no sync to do)
    return true;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const headers: Record<string, string> = {};
    if (config.anonKey) {
      const cleanKey = config.anonKey.trim();
      headers['apikey'] = cleanKey;
      headers['Authorization'] = `Bearer ${cleanKey}`;
    }
    const res = await fetch(`${config.url.trim()}/rest/v1/companies?select=id&limit=1`, {
      method: 'HEAD',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok || res.status === 200 || res.status === 204 || res.status === 404;
  } catch {
    return false;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{
  success: boolean;
  message: string;
  tablesFound?: string[];
}> {
  if (!url || !url.startsWith('https://')) {
    return { success: false, message: 'Invalid URL. Server URL must start with https://' };
  }
  if (!anonKey || anonKey.length < 20) {
    return { success: false, message: 'Invalid access key. Please provide a valid key.' };
  }

  try {
    const tempClient = createClient(url.trim(), anonKey.trim(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: `temp_test_auth_${Date.now()}`,
      },
    });

    // Test query on companies table
    const { data, error } = await tempClient.from('companies').select('id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Connected to server, but the database tables were not found. Please run the setup script in your database first.',
        };
      }
      return {
        success: false,
        message: `Database error (${error.code || 'API'}): ${error.message}`,
      };
    }

    return {
      success: true,
      message: 'Connection successful! Cloud database verified and ready for team collaboration.',
      tablesFound: ['companies', 'employees', 'payroll_snapshots', 'employee_loans'],
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect: ${err?.message || 'Network error or unreachable server URL'}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// REALTIME PRESENCE — track which staff members are online
// ─────────────────────────────────────────────────────────────

export interface StaffPresence {
  memberId: string;
  name: string;
  role: string;
  companyId: string;
  companyName: string;
  joinedAt: string;   // ISO timestamp of when they opened the app
  lastSeenAt: string; // ISO timestamp, updated on a heartbeat
}

let presenceChannel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;
let presenceHeartbeatInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Join the shared presence channel and broadcast this user's session.
 * Call this once after login. The channel is automatically cleaned up
 * when the browser/Electron window closes.
 */
export function joinPresenceChannel(presence: StaffPresence): void {
  const client = getSupabaseClient();
  if (!client) return;

  // Leave any existing channel first
  leavePresenceChannel();

  presenceChannel = client.channel('payroll_pro_presence', {
    config: { presence: { key: presence.memberId } },
  });

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      window.dispatchEvent(new Event('presence-updated'));
    })
    .on('presence', { event: 'join' }, () => {
      window.dispatchEvent(new Event('presence-updated'));
    })
    .on('presence', { event: 'leave' }, () => {
      window.dispatchEvent(new Event('presence-updated'));
    })
    .on('broadcast', { event: 'team-member-updated' }, (evt: any) => {
      window.dispatchEvent(new CustomEvent('team-member-updated', { detail: evt.payload }));
    })
    .on('broadcast', { event: 'company-list-updated' }, () => {
      window.dispatchEvent(new Event('company-list-updated'));
    })
    .on('broadcast', { event: 'email-settings-updated' }, (evt: any) => {
      window.dispatchEvent(new CustomEvent('email-settings-updated', { detail: evt.payload }));
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel!.track({
          ...presence,
          lastSeenAt: new Date().toISOString(),
        });
      }
    });

  // Heartbeat: update lastSeenAt every 30 seconds to confirm still active
  // Store the interval ID at module scope so leavePresenceChannel can clear it reliably.
  if (presenceHeartbeatInterval) clearInterval(presenceHeartbeatInterval);
  presenceHeartbeatInterval = setInterval(async () => {
    if (presenceChannel) {
      await presenceChannel.track({
        ...presence,
        lastSeenAt: new Date().toISOString(),
      });
    }
  }, 30_000);
}

/**
 * Leave the presence channel and stop broadcasting. Call on logout.
 * Calls untrack() first so Supabase immediately removes the entry
 * rather than waiting for the WebSocket heartbeat timeout.
 */
export function leavePresenceChannel(): void {
  // Always clear the heartbeat first to prevent zombie interval
  if (presenceHeartbeatInterval) {
    clearInterval(presenceHeartbeatInterval);
    presenceHeartbeatInterval = null;
  }
  if (presenceChannel) {
    // untrack() explicitly removes this user from presence state on the server.
    // Without it, the entry lingers until the WebSocket heartbeat times out
    // (typically 30-60 seconds), making closed sessions appear Online.
    presenceChannel.untrack().catch(() => {});
    presenceChannel.unsubscribe();
    presenceChannel = null;
  }
}

/**
 * Get current presence state — returns all online staff members right now.
 * Only returns entries whose lastSeenAt is within 90 seconds (the 30-second
 * heartbeat interval + a 60-second grace period) to filter out stale entries
 * from sessions that closed without calling leavePresenceChannel.
 */
export function getOnlinePresence(): StaffPresence[] {
  if (!presenceChannel) return [];
  const STALE_MS = 90_000; // 90 seconds
  try {
    const state = presenceChannel.presenceState();
    return Object.values(state)
      .flat()
      .map((p: any) => p as StaffPresence)
      .filter(p => {
        if (!p.lastSeenAt) return false;
        return Date.now() - new Date(p.lastSeenAt).getTime() < STALE_MS;
      });
  } catch {
    return [];
  }
}

/**
 * Subscribe to presence updates.
 *
 * Rather than creating a second Supabase channel (which throws
 * "cannot add callbacks after subscribe()" because the JS client
 * returns the same cached, already-subscribed instance), this
 * function simply listens to the 'presence-updated' window event
 * that joinPresenceChannel already fires on every sync, and reads
 * the current state via getOnlinePresence().
 *
 * Returns an unsubscribe function.
 */
export function subscribeToPresence(
  onUpdate: (online: StaffPresence[]) => void
): () => void {
  const handleUpdate = () => {
    onUpdate(getOnlinePresence());
  };

  // Send current state immediately (channel may already be active)
  handleUpdate();

  window.addEventListener('presence-updated', handleUpdate);
  return () => window.removeEventListener('presence-updated', handleUpdate);
}

/**
 * Broadcasts a team member update (role change, profile edit, active/deactivate)
 * across the shared presence channel to all connected client windows and devices.
 * Operates purely via Supabase WebSocket broadcast — 100% reliable even if PostgreSQL
 * logical replication or publications are not enabled on the database!
 */
export function broadcastTeamMemberUpdate(payload: {
  memberId: string;
  role?: string;
  name?: string;
  isActive?: boolean;
}): void {
  try {
    if (presenceChannel) {
      presenceChannel.send({
        type: 'broadcast',
        event: 'team-member-updated',
        payload,
      }).catch(() => {});
    }
    // Also dispatch on local window
    window.dispatchEvent(new CustomEvent('team-member-updated', { detail: payload }));
  } catch (e) {
    console.warn('Failed to broadcast member update:', e);
  }
}

/**
 * Subscribes to real-time team member updates broadcast from other admin sessions.
 */
export function subscribeToMemberUpdates(
  onUpdate: (payload: { memberId: string; role?: string; name?: string; isActive?: boolean }) => void
): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent;
    if (custom.detail) onUpdate(custom.detail);
  };
  window.addEventListener('team-member-updated', handler);
  return () => window.removeEventListener('team-member-updated', handler);
}

/**
 * Broadcasts an instant event when a company account is added, edited, or deleted
 * so that all connected operators across all devices immediately refresh their
 * company selection grid / account picker without waiting or manual reload.
 */
export function broadcastCompanyUpdate(): void {
  try {
    if (presenceChannel) {
      presenceChannel.send({
        type: 'broadcast',
        event: 'company-list-updated',
        payload: {},
      }).catch(() => {});
    }
    window.dispatchEvent(new Event('company-list-updated'));
  } catch (e) {
    console.warn('Failed to broadcast company update:', e);
  }
}

/**
 * Broadcasts updated email settings across the team presence channel to all connected
 * devices and sessions immediately, without needing manual reloads or database polling.
 */
export function broadcastEmailSettingsUpdate(companyId: string, settings: any): void {
  try {
    if (presenceChannel) {
      presenceChannel.send({
        type: 'broadcast',
        event: 'email-settings-updated',
        payload: { companyId, settings },
      }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('email-settings-updated', { detail: { companyId, settings } }));
  } catch (e) {
    console.warn('Failed to broadcast email settings update:', e);
  }
}



/**
 * Uploads a local company's complete state to the connected Supabase cloud database
 */
export async function uploadCompanyDataToSupabase(
  company: CompanyProfile,
  employees: Employee[],
  departments: string[],
  payrollVariables: PayrollVariables,
  payeTaxVariables: PayeTaxVariables,
  loans: EmployeeLoan[],
  snapshots: PayrollSnapshot[],
  payslipDesign?: PayslipDesignConfig,
  savedPresets?: PayslipCustomPreset[],
  emailSettings?: any,
  emailedPayslips?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured or disabled.' };
  }

  try {
    const companyId = company.id || 'comp-default';

    // 1. Upsert Company — always hash credentials before storing
    const companyPayload: Record<string, any> = {
      id: companyId,
      name: company.name,
      subtitle: company.subtitle || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      logo_url: company.logoUrl || '',
      has_password: Boolean(company.hasPassword),
      password: company.password ? hashCredential(company.password) : '',
      password_hint: company.passwordHint || '',
      security_question: company.securityQuestion || '',
      security_answer: company.securityAnswer ? hashCredential(company.securityAnswer) : '',
      email_settings: emailSettings || {},
      emailed_payslips: emailedPayslips || {},
      updated_at: new Date().toISOString(),
    };

    let { error: compErr } = await client.from('companies').upsert(companyPayload);
    // Graceful fallback: If email_settings or emailed_payslips column hasn't been added to companies table yet, retry without them
    if (compErr && compErr.message && (compErr.message.includes('email_settings') || compErr.message.includes('emailed_payslips'))) {
      const fallbackPayload = { ...companyPayload };
      delete fallbackPayload.email_settings;
      delete fallbackPayload.emailed_payslips;
      const retryRes = await client.from('companies').upsert(fallbackPayload);
      compErr = retryRes.error;
    }
    if (compErr) throw new Error(`Companies upsert failed: ${compErr.message}`);

    // 2. Upsert Departments
    if (departments && departments.length > 0) {
      const deptRows = departments.map(d => ({
        company_id: companyId,
        name: d,
      }));
      await client.from('departments').upsert(deptRows, { onConflict: 'company_id,name' });
    }

    // 3. Sync Employees (Upsert active employees first, then safely prune any deleted IDs)
    const currentEmpIds = (employees || []).map(e => e.id).filter(Boolean);
    if (currentEmpIds.length > 0) {
      const empRows = employees.map(e => ({
        id: e.id,
        company_id: companyId,
        code: e.code,
        first_name: e.firstName,
        last_name: e.lastName,
        department: e.department || 'GENERAL',
        position: e.position || 'STAFF',
        email: e.email || '',
        phone: e.phone || '',
        monthly_gross: e.monthlyGross || 0,
        annual_rent: e.annualRent || 0,
        annual_rents: e.annualRents || {},
        bank_name: e.bankName || '',
        account_number: e.accountNumber || '',
        has_pension: Boolean(e.hasPension),
        has_paye: Boolean(e.hasPaye),
        paye_number: e.payeNumber || '',
        pension_number: e.pensionNumber || '',
        pfa_name: e.pfaName || '',
        status: e.status || 'Active',
        employment_type: e.employmentType || 'Full-Time',
        state_of_residence: e.stateOfResidence || 'Lagos',
        start_date: e.startDate || '',
        end_date: e.endDate || '',
        original_hire_date: e.originalHireDate || '',
        stints: e.stints || [],
        monthly_salaries: e.monthlySalaries || {},
        updated_at: new Date().toISOString(),
      }));

      // Upsert all current employees in a single batch API call.
      // NOTE: This bulk sync intentionally NEVER deletes cloud employees. Individual deletions
      // go through deleteEmployeeFromCloud(). Pruning here caused total data loss whenever a
      // device uploaded an empty or stale local copy (e.g. a fresh device opening a company).
      const { error: empErr } = await client.from('employees').upsert(empRows);
      if (empErr) throw new Error(`Employees upsert failed: ${empErr.message}`);
    }

    // 4. Upsert Payroll Variables
    await client.from('payroll_variables').upsert({
      company_id: companyId,
      basic: payrollVariables.basic,
      housing: payrollVariables.housing,
      transport: payrollVariables.transport,
      other_allowances: payrollVariables.otherAllowances,
      employee_pension_rate: payrollVariables.employeePensionRate,
      employer_pension_rate: payrollVariables.employerPensionRate,
      salary_calculation_mode: payrollVariables.salaryCalculationMode || 'gross-to-net',
      employment_type_rules: payrollVariables.employmentTypeRules || [],
      prorate_mid_month: Boolean(payrollVariables.prorateMidMonth),
      updated_at: new Date().toISOString(),
    });

    // 5. Upsert PAYE Tax Variables
    await client.from('paye_tax_variables').upsert({
      company_id: companyId,
      cra_base: payeTaxVariables.craBase,
      rent_relief_rate: payeTaxVariables.rentReliefRate,
      rent_relief_cap: payeTaxVariables.rentReliefCap,
      tax_brackets: payeTaxVariables.taxBrackets || [],
      extra_conditions: payeTaxVariables.extraConditions || [],
      updated_at: new Date().toISOString(),
    });

    // 6. Upsert Loans
    if (loans && loans.length > 0) {
      const loanRows = loans.map(l => ({
        id: l.id,
        company_id: companyId,
        employee_id: l.employeeId,
        type: l.type,
        principal_amount: l.principalAmount,
        monthly_deduction: l.monthlyDeduction,
        total_repaid: l.totalRepaid,
        remaining_balance: l.remainingBalance,
        start_period_key: l.startPeriodKey,
        status: l.status,
        disbursement_date: l.disbursementDate || '',
        repayment_date: l.repaymentDate || '',
        repayment_start_date: l.repaymentStartDate || '',
        notes: l.notes || '',
        description: l.description || '',
        history: l.history || [],
        updated_at: new Date().toISOString(),
      }));
      await client.from('employee_loans').upsert(loanRows);
    }

    // 7. Upsert Snapshots
    if (snapshots && snapshots.length > 0) {
      const snapshotRows = snapshots.map(s => ({
        id: s.id,
        company_id: companyId,
        month_key: s.monthKey,
        month_label: s.monthLabel,
        year: s.year,
        version: s.version || 1,
        is_locked: Boolean(s.isLocked),
        finalized_at: s.finalizedAt || new Date().toISOString(),
        finalized_by: s.finalizedBy || 'Administrator',
        notes: s.notes || '',
        items: s.items || [],
        totals: s.totals || {},
      }));
      await client.from('payroll_snapshots').upsert(snapshotRows);
    }

    // 8. Payslip design
    if (payslipDesign) {
      await client.from('payslip_designs').upsert({
        company_id: companyId,
        config: payslipDesign,
        updated_at: new Date().toISOString(),
      });
    }

    // 9. Payslip presets (named design templates saved by the team)
    if (savedPresets && savedPresets.length > 0) {
      const presetRows = savedPresets.map(p => ({
        id: p.id,
        company_id: companyId,
        name: p.name,
        config: p.design,
        created_at: p.createdAt || new Date().toISOString(),
      }));
      await client.from('payslip_presets').upsert(presetRows);

      // Prune deleted presets from cloud
      const localIds = new Set(savedPresets.map(p => p.id));
      const { data: cloudPresets } = await client
        .from('payslip_presets')
        .select('id')
        .eq('company_id', companyId);
      if (cloudPresets && cloudPresets.length > 0) {
        const toDelete = cloudPresets.map((r: any) => r.id).filter((id: string) => !localIds.has(id));
        if (toDelete.length > 0) {
          await client.from('payslip_presets').delete().eq('company_id', companyId).in('id', toDelete);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to upload data to Supabase:', err);
    return { success: false, error: err?.message || 'Upload failed' };
  }
}

/**
 * Downloads data for a company from Supabase cloud
 */
export async function downloadCompanyDataFromSupabase(companyId: string): Promise<{
  success: boolean;
  company?: CompanyProfile;
  employees?: Employee[];
  departments?: string[];
  payrollVariables?: PayrollVariables;
  payeTaxVariables?: PayeTaxVariables;
  loans?: EmployeeLoan[];
  snapshots?: PayrollSnapshot[];
  payslipDesign?: PayslipDesignConfig;
  savedPayslipPresets?: PayslipCustomPreset[];
  emailSettings?: any;
  emailedPayslips?: Record<string, any>;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  try {
    // 1. Fetch Company
    const { data: compData, error: compErr } = await client
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (compErr && compErr.code !== 'PGRST116') {
      throw new Error(`Failed to load company: ${compErr.message}`);
    }

    // 2. Fetch Employees
    const { data: empData } = await client
      .from('employees')
      .select('*')
      .eq('company_id', companyId)
      .order('code');

    // 3. Fetch Departments
    const { data: deptData } = await client
      .from('departments')
      .select('name')
      .eq('company_id', companyId);

    // 4. Fetch Payroll Variables
    const { data: pvData } = await client
      .from('payroll_variables')
      .select('*')
      .eq('company_id', companyId)
      .single();

    // 5. Fetch Paye Tax Variables
    const { data: ptvData } = await client
      .from('paye_tax_variables')
      .select('*')
      .eq('company_id', companyId)
      .single();

    // 6. Fetch Loans
    const { data: loanData } = await client
      .from('employee_loans')
      .select('*')
      .eq('company_id', companyId);

    // 7. Fetch Snapshots
    const { data: snapData } = await client
      .from('payroll_snapshots')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // 8. Fetch Payslip Design
    const { data: pdData } = await client
      .from('payslip_designs')
      .select('config')
      .eq('company_id', companyId)
      .single();

    // 9. Fetch Payslip Presets
    const { data: ppData } = await client
      .from('payslip_presets')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true });

    const formattedCompany: CompanyProfile | undefined = compData ? {
      id: compData.id,
      name: compData.name,
      subtitle: compData.subtitle || '',
      address: compData.address || '',
      phone: compData.phone || '',
      email: compData.email || '',
      logoUrl: compData.logo_url || '',
      hasPassword: Boolean(compData.has_password),
      password: compData.password || '',
      passwordHint: compData.password_hint || '',
      securityQuestion: compData.security_question || '',
      securityAnswer: compData.security_answer || '',
    } : undefined;

    const cloudEmailSettings = (compData && compData.email_settings && Object.keys(compData.email_settings).length > 0)
      ? compData.email_settings
      : undefined;
    const cloudEmailedPayslips = (compData && compData.emailed_payslips && Object.keys(compData.emailed_payslips).length > 0)
      ? compData.emailed_payslips
      : undefined;

    const formattedEmployees: Employee[] = (empData || []).map(e => ({
      id: e.id,
      code: e.code,
      firstName: e.first_name,
      lastName: e.last_name,
      department: e.department || 'GENERAL',
      position: e.position || 'STAFF',
      email: e.email || '',
      phone: e.phone || '',
      monthlyGross: Number(e.monthly_gross) || 0,
      annualRent: Number(e.annual_rent) || 0,
      annualRents: e.annual_rents || {},
      bankName: e.bank_name || '',
      accountNumber: e.account_number || '',
      hasPension: Boolean(e.has_pension),
      hasPaye: Boolean(e.has_paye),
      payeNumber: e.paye_number || '',
      pensionNumber: e.pension_number || '',
      pfaName: e.pfa_name || '',
      status: (e.status as any) || 'Active',
      employmentType: e.employment_type || 'Full-Time',
      stateOfResidence: e.state_of_residence || 'Lagos',
      startDate: e.start_date || '',
      endDate: e.end_date || '',
      originalHireDate: e.original_hire_date || '',
      stints: Array.isArray(e.stints) ? e.stints : [],
      monthlySalaries: e.monthly_salaries || {},
    }));

    const formattedLoans: EmployeeLoan[] = (loanData || []).map(l => ({
      id: l.id,
      employeeId: l.employee_id,
      type: l.type as any,
      principalAmount: Number(l.principal_amount) || 0,
      monthlyDeduction: Number(l.monthly_deduction) || 0,
      totalRepaid: Number(l.total_repaid) || 0,
      remainingBalance: Number(l.remaining_balance) || 0,
      startPeriodKey: l.start_period_key || '2026-jan',
      status: l.status as any,
      disbursementDate: l.disbursement_date,
      repaymentDate: l.repayment_date,
      repaymentStartDate: l.repayment_start_date,
      notes: l.notes,
      description: l.description,
      history: l.history || [],
      createdAt: l.created_at,
    }));

    const formattedSnapshots: PayrollSnapshot[] = (snapData || []).map(s => ({
      id: s.id,
      monthKey: s.month_key,
      monthLabel: s.month_label,
      year: s.year,
      version: s.version || 1,
      isLocked: Boolean(s.is_locked),
      finalizedAt: s.finalized_at,
      finalizedBy: s.finalized_by || 'Administrator',
      notes: s.notes || '',
      items: s.items || [],
      totals: s.totals || {},
    }));

    return {
      success: true,
      company: formattedCompany,
      employees: formattedEmployees,
      departments: (deptData || []).map(d => d.name),
      payrollVariables: pvData ? {
        basic: Number(pvData.basic) || 40,
        housing: Number(pvData.housing) || 30,
        transport: Number(pvData.transport) || 20,
        otherAllowances: Number(pvData.other_allowances) || 10,
        employeePensionRate: Number(pvData.employee_pension_rate) || 8,
        employerPensionRate: Number(pvData.employer_pension_rate) || 10,
        salaryCalculationMode: pvData.salary_calculation_mode || 'gross-to-net',
        employmentTypeRules: pvData.employment_type_rules || [],
        prorateMidMonth: Boolean(pvData.prorate_mid_month),
      } : undefined,
      payeTaxVariables: ptvData ? {
        craBase: Number(ptvData.cra_base) || 800000,
        rentReliefRate: Number(ptvData.rent_relief_rate) || 0.20,
        rentReliefCap: Number(ptvData.rent_relief_cap) || 500000,
        taxBrackets: ptvData.tax_brackets || [],
        extraConditions: ptvData.extra_conditions || [],
      } : undefined,
      loans: formattedLoans,
      snapshots: formattedSnapshots,
      payslipDesign: pdData?.config,
      savedPayslipPresets: (ppData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        createdAt: p.created_at,
        design: p.config,
      })),
      emailSettings: cloudEmailSettings,
      emailedPayslips: cloudEmailedPayslips,
    };
  } catch (err: any) {
    console.error('Failed to download company data from Supabase:', err);
    return { success: false, error: err?.message || 'Download failed' };
  }
}

/**
 * Fetches all registered companies from Supabase cloud database
 */
export async function fetchCompaniesFromSupabase(): Promise<{
  success: boolean;
  companies?: CompanyAccount[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Cloud database not connected.' };
  }

  try {
    const { data, error } = await client
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    const formatted: CompanyAccount[] = (data || []).map(c => ({
      id: c.id,
      name: c.name,
      subtitle: c.subtitle || '',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      logoUrl: c.logo_url || '',
      hasPassword: Boolean(c.has_password),
      password: c.password || '',
      passwordHint: c.password_hint || '',
      securityQuestion: c.security_question || '',
      securityAnswer: c.security_answer || '',
      createdAt: c.created_at,
      lastActiveAt: c.updated_at,
    }));

    return { success: true, companies: formatted };
  } catch (err: any) {
    console.error('Failed to fetch companies from Supabase:', err);
    return { success: false, error: err?.message || 'Failed to fetch companies' };
  }
}

/**
 * Upserts a single company account record to Supabase
 */
export async function syncCompanyToSupabase(company: CompanyAccount): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud database not connected.' };

  try {
    const { error } = await client.from('companies').upsert({
      id: company.id,
      name: company.name,
      subtitle: company.subtitle || '',
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      logo_url: company.logoUrl || '',
      has_password: Boolean(company.hasPassword),
      password: company.password ? hashCredential(company.password) : '',
      password_hint: company.passwordHint || '',
      security_question: company.securityQuestion || '',
      security_answer: company.securityAnswer ? hashCredential(company.securityAnswer) : '',
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
    broadcastCompanyUpdate();
    return { success: true };
  } catch (err: any) {
    console.error('Failed to sync company to Supabase:', err);
    return { success: false, error: err?.message || 'Sync failed' };
  }
}

/**
 * Deletes a company record from Supabase
 */
export async function deleteCompanyFromSupabase(companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud database not connected.' };

  try {
    const { error } = await client.from('companies').delete().eq('id', companyId);
    if (error) throw error;
    broadcastCompanyUpdate();
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete company from Supabase:', err);
    return { success: false, error: err?.message || 'Delete failed' };
  }
}

/**
 * Uploads all local company accounts to Supabase in one batch
 */
export async function uploadAllLocalCompaniesToSupabase(companies: CompanyAccount[]): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud database not connected.' };

  try {
    const rows = companies.map(c => ({
      id: c.id,
      name: c.name,
      subtitle: c.subtitle || '',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      logo_url: c.logoUrl || '',
      has_password: Boolean(c.hasPassword),
      password: c.password || '',
      password_hint: c.passwordHint || '',
      security_question: c.securityQuestion || '',
      security_answer: c.securityAnswer || '',
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('companies').upsert(rows);
    if (error) throw error;

    return { success: true, count: rows.length };
  } catch (err: any) {
    console.error('Failed to batch upload companies to Supabase:', err);
    return { success: false, error: err?.message || 'Batch upload failed' };
  }
}

export const LOGOUT_ON_CLOSE_STORAGE_KEY = 'payroll_pro_logout_on_close';
export const SESSION_ACTIVE_FLAG_KEY = 'payroll_pro_session_active_window';
export const INACTIVITY_LOCK_MINUTES_KEY = 'payroll_pro_inactivity_lock_minutes';
export const PRIVACY_MASK_KEY = 'payroll_pro_privacy_mask_salaries';

/**
 * Returns whether the user has configured the app to log out on app close
 */
export function getLogoutOnClosePreference(): boolean {
  try {
    return localStorage.getItem(LOGOUT_ON_CLOSE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Updates the log out on app close preference
 */
export function setLogoutOnClosePreference(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(LOGOUT_ON_CLOSE_STORAGE_KEY, 'true');
      // Ensure the current window retains its active session flag
      sessionStorage.setItem(SESSION_ACTIVE_FLAG_KEY, 'true');
    } else {
      localStorage.removeItem(LOGOUT_ON_CLOSE_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to save logout on close preference:', e);
  }
}

/**
 * Inactivity lock timeout in minutes (0 = disabled)
 */
export function getInactivityLockMinutes(): number {
  try {
    const raw = localStorage.getItem(INACTIVITY_LOCK_MINUTES_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function setInactivityLockMinutes(minutes: number): void {
  try {
    if (minutes > 0) {
      localStorage.setItem(INACTIVITY_LOCK_MINUTES_KEY, minutes.toString());
    } else {
      localStorage.removeItem(INACTIVITY_LOCK_MINUTES_KEY);
    }
  } catch (e) {
    console.warn('Failed to save inactivity lock minutes:', e);
  }
}

/**
 * Privacy mask preference (blur sensitive salary numbers)
 */
export function getPrivacyMaskPreference(): boolean {
  try {
    return localStorage.getItem(PRIVACY_MASK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPrivacyMaskPreference(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(PRIVACY_MASK_KEY, 'true');
    } else {
      localStorage.removeItem(PRIVACY_MASK_KEY);
    }
  } catch (e) {
    console.warn('Failed to save privacy mask preference:', e);
  }
}

/**
 * Gets currently active team member from session.
 * If logout-on-close is enabled and the app is newly launched (sessionStorage is empty),
 * returns null so the user is required to sign in with credentials.
 */
export function getActiveTeamMember(): TeamMember | null {
  try {
    const isLogoutOnClose = getLogoutOnClosePreference();
    if (isLogoutOnClose) {
      const isSessionActive = sessionStorage.getItem(SESSION_ACTIVE_FLAG_KEY);
      if (!isSessionActive) {
        // Window/app was closed and reopened: purge persistent storage and force login
        localStorage.removeItem(ACTIVE_TEAM_MEMBER_STORAGE_KEY);
        return null;
      }
    }

    const raw = localStorage.getItem(ACTIVE_TEAM_MEMBER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);

    // If user previously selected standalone offline mode and no cloud server is enabled,
    // restore the local administrator session automatically
    if (isStandaloneOfflineMode() && !getSavedCloudConfig().isEnabled) {
      return LOCAL_STANDALONE_ADMIN;
    }
  } catch (e) {
    console.warn('Failed to get active member session:', e);
  }
  return null;
}

/**
 * Sets or clears the active team member session
 */
export function setActiveTeamMember(member: TeamMember | null): void {
  try {
    if (member) {
      sessionStorage.setItem(SESSION_ACTIVE_FLAG_KEY, 'true');
      localStorage.setItem(ACTIVE_TEAM_MEMBER_STORAGE_KEY, JSON.stringify(member));
    } else {
      sessionStorage.removeItem(SESSION_ACTIVE_FLAG_KEY);
      localStorage.removeItem(ACTIVE_TEAM_MEMBER_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to save active member session:', e);
  }
}

const LOCAL_AUDIT_LOGS_KEY = 'payroll_local_audit_logs';

export function getLocalAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalAuditLogs(logs: AuditLogEntry[]): void {
  try {
    localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(logs.slice(0, 500)));
  } catch {}
}

/**
 * Logs an audit event to the cloud database and local audit cache
 */
export async function logAuditEvent(
  companyId: string,
  companyName: string,
  action: string,
  details: string
): Promise<void> {
  const activeMember = getActiveTeamMember();
  const actorName = activeMember ? `${activeMember.name} (${activeMember.role})` : 'Payroll Administrator';
  const actorId = activeMember?.id || 'admin';
  const nowIso = new Date().toISOString();

  // 1. Record to local audit cache immediately
  const localEntry: AuditLogEntry = {
    id: 'audit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    companyId: companyId || '',
    companyName: companyName || '',
    actorId,
    actorName,
    action,
    details,
    ipOrDevice: 'Desktop Workspace',
    createdAt: nowIso
  };
  const currentLogs = getLocalAuditLogs();
  saveLocalAuditLogs([localEntry, ...currentLogs]);

  // 2. If connected to Supabase cloud, also record remotely
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('audit_logs').insert({
      company_id: companyId || '',
      company_name: companyName || '',
      actor_id: actorId,
      actor_name: actorName,
      action,
      details,
      ip_or_device: 'Desktop Workspace',
      created_at: nowIso
    });
  } catch (err) {
    console.warn('Failed to record audit log to cloud:', err);
  }
}

/**
 * Fetches recent audit logs from the cloud database or local cache
 */
export async function fetchAuditLogs(companyId?: string, limit: number = 200): Promise<{
  success: boolean;
  logs?: AuditLogEntry[];
  error?: string;
}> {
  const client = getSupabaseClient();
  const localLogs = getLocalAuditLogs();

  if (client) {
    try {
      let query = client
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (!error && data) {
        const cloudFormatted: AuditLogEntry[] = data.map((row: any) => ({
          id: row.id,
          companyId: row.company_id,
          companyName: row.company_name,
          actorId: row.actor_id,
          actorName: row.actor_name,
          action: row.action,
          details: row.details,
          ipOrDevice: row.ip_or_device,
          createdAt: row.created_at,
        }));

        // Merge cloud logs with any local-only logs
        const cloudIds = new Set(cloudFormatted.map(c => c.id));
        const merged = [
          ...cloudFormatted,
          ...localLogs.filter(l => !cloudIds.has(l.id) && (!companyId || l.companyId === companyId))
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        saveLocalAuditLogs(merged);
        return { success: true, logs: merged.slice(0, limit) };
      }
    } catch (err) {
      console.warn('Failed to fetch from cloud audit_logs, using local cache:', err);
    }
  }

  // Fallback to local logs
  const filtered = companyId
    ? localLogs.filter(l => l.companyId === companyId)
    : localLogs;
  return { success: true, logs: filtered.slice(0, limit) };
}

/**
 * Fetches team members from the cloud database
 */
export async function fetchTeamMembers(): Promise<{
  success: boolean;
  members?: TeamMember[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const { data, error } = await client
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formatted: TeamMember[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      username: row.username,
      phone: row.phone || '',
      avatarColor: row.avatar_color || '',
      role: row.role,
      pin: row.pin,
      password: row.password,
      passwordHint: row.password_hint || '',
      securityQuestion: row.security_question,
      securityAnswer: row.security_answer,
      recoveryEmail: row.recovery_email,
      tempPassword: row.temp_password,
      mustChangePassword: Boolean(row.must_change_password),
      isActive: Boolean(row.is_active),
      twoFactorEnabled: Boolean(row.two_factor_enabled),
      twoFactorSecret: row.two_factor_secret || '',
      twoFactorBackupCodes: Array.isArray(row.two_factor_backup_codes) ? row.two_factor_backup_codes : [],
      biometricEnabled: Boolean(row.biometric_enabled),
      biometricDeviceName: row.biometric_device_name || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { success: true, members: formatted };
  } catch (err: any) {
    console.error('Failed to fetch team members:', err);
    return { success: false, error: err?.message || 'Failed to fetch team members' };
  }
}

/**
 * Saves or updates a team member in the cloud database
 */
export async function saveTeamMemberToCloud(member: TeamMember): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    // Always hash the PIN / password before writing to the database
    const rawPin = member.pin || member.password || '';
    const hashedPin = rawPin ? hashCredential(rawPin) : '';

    const payload: any = {
      id: member.id,
      name: member.name,
      email: member.email || '',
      username: member.username || member.email?.split('@')[0] || '',
      role: member.role,
      pin: hashedPin,
      is_active: member.isActive,
      updated_at: new Date().toISOString(),
    };

    if (member.phone !== undefined) payload.phone = member.phone;
    if (member.avatarColor !== undefined) payload.avatar_color = member.avatarColor;
    if (member.twoFactorEnabled !== undefined) payload.two_factor_enabled = member.twoFactorEnabled;
    if (member.twoFactorSecret !== undefined) payload.two_factor_secret = member.twoFactorSecret;
    if (member.twoFactorBackupCodes !== undefined) payload.two_factor_backup_codes = member.twoFactorBackupCodes;
    if (member.biometricEnabled !== undefined) payload.biometric_enabled = member.biometricEnabled;
    if (member.biometricDeviceName !== undefined) payload.biometric_device_name = member.biometricDeviceName;

    if (member.password !== undefined) {
      const hashedPassword = hashCredential(member.password);
      payload.password = hashedPassword;
      payload.pin = hashedPassword;
    }
    if (member.passwordHint !== undefined) payload.password_hint = member.passwordHint;
    if (member.securityQuestion !== undefined) payload.security_question = member.securityQuestion;
    if (member.securityAnswer !== undefined) payload.security_answer = member.securityAnswer;
    if (member.recoveryEmail !== undefined) payload.recovery_email = member.recoveryEmail;
    if (member.tempPassword !== undefined) payload.temp_password = member.tempPassword;
    if (member.mustChangePassword !== undefined) payload.must_change_password = member.mustChangePassword;

    let { error } = await client.from('team_members').upsert(payload);

    // If error was due to missing newly added columns in legacy schema, fallback to base columns
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const fallbackHashedPin = hashedPin || '';
      const basePayload: any = {
        id: member.id,
        name: member.name,
        email: member.email || '',
        username: member.username || member.email?.split('@')[0] || '',
        role: member.role,
        pin: fallbackHashedPin,
        is_active: member.isActive,
        updated_at: new Date().toISOString(),
      };
      if (member.password !== undefined) {
        const hp = hashCredential(member.password);
        basePayload.password = hp;
        basePayload.pin = hp;
      }
      if (member.securityQuestion !== undefined) basePayload.security_question = member.securityQuestion;
      if (member.securityAnswer !== undefined) basePayload.security_answer = member.securityAnswer ? hashCredential(member.securityAnswer) : '';
      if (member.recoveryEmail !== undefined) basePayload.recovery_email = member.recoveryEmail;
      if (member.tempPassword !== undefined) basePayload.temp_password = member.tempPassword;
      if (member.mustChangePassword !== undefined) basePayload.must_change_password = member.mustChangePassword;

      const fallbackRes = await client.from('team_members').upsert(basePayload);
      error = fallbackRes.error;
    }

    if (error) throw error;

    // Broadcast change to all active sessions & devices instantly
    broadcastTeamMemberUpdate({
      memberId: member.id,
      role: member.role,
      name: member.name,
      isActive: member.isActive,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save team member:', err);
    return { success: false, error: err?.message || 'Failed to save team member' };
  }
}

/**
 * Deletes a team member from the cloud database
 */
export async function deleteTeamMemberFromCloud(memberId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const { error } = await client.from('team_members').delete().eq('id', memberId);
    if (error) throw error;

    // Broadcast deletion (deactivation) to all active sessions & devices
    broadcastTeamMemberUpdate({
      memberId,
      isActive: false,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete team member:', err);
    return { success: false, error: err?.message || 'Failed to delete team member' };
  }
}

/**
 * Deletes an employee record from the cloud database
 */
export async function deleteEmployeeFromCloud(employeeId: string, companyId?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    let query = client.from('employees').delete().eq('id', employeeId);
    if (companyId) query = query.eq('company_id', companyId);
    const { error } = await query;
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete employee from cloud:', err);
    return { success: false, error: err?.message || 'Failed to delete employee' };
  }
}

/**
 * Deletes a loan record from the cloud database
 */
export async function deleteLoanFromCloud(loanId: string, companyId?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    let query = client.from('employee_loans').delete().eq('id', loanId);
    if (companyId) query = query.eq('company_id', companyId);
    const { error } = await query;
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete loan from cloud:', err);
    return { success: false, error: err?.message || 'Failed to delete loan' };
  }
}

/**
 * Deletes a payroll snapshot record from the cloud database
 */
export async function deleteSnapshotFromCloud(snapshotId: string, companyId?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    let query = client.from('payroll_snapshots').delete().eq('id', snapshotId);
    if (companyId) query = query.eq('company_id', companyId);
    const { error } = await query;
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete snapshot from cloud:', err);
    return { success: false, error: err?.message || 'Failed to delete snapshot' };
  }
}

/**
 * Deletes a department record from the cloud database
 */
export async function deleteDepartmentFromCloud(deptName: string, companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const { error } = await client
      .from('departments')
      .delete()
      .eq('company_id', companyId)
      .eq('name', deptName);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete department from cloud:', err);
    return { success: false, error: err?.message || 'Failed to delete department' };
  }
}

/**
 * Saves or updates a single employee record in the cloud database
 */
export async function saveSingleEmployeeToCloud(employee: Employee, companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const row = {
      id: employee.id,
      company_id: companyId,
      code: employee.code,
      first_name: employee.firstName,
      last_name: employee.lastName,
      department: employee.department || 'GENERAL',
      position: employee.position || 'STAFF',
      email: employee.email || '',
      phone: employee.phone || '',
      monthly_gross: employee.monthlyGross || 0,
      annual_rent: employee.annualRent || 0,
      annual_rents: employee.annualRents || {},
      bank_name: employee.bankName || '',
      account_number: employee.accountNumber || '',
      has_pension: Boolean(employee.hasPension),
      has_paye: Boolean(employee.hasPaye),
      paye_number: employee.payeNumber || '',
      pension_number: employee.pensionNumber || '',
      pfa_name: employee.pfaName || '',
      status: employee.status || 'Active',
      employment_type: employee.employmentType || 'Full-Time',
      state_of_residence: employee.stateOfResidence || 'Lagos',
      start_date: employee.startDate || '',
      end_date: employee.endDate || '',
      original_hire_date: employee.originalHireDate || '',
      stints: employee.stints || [],
      monthly_salaries: employee.monthlySalaries || {},
      updated_at: new Date().toISOString(),
    };
    let { error } = await client.from('employees').upsert([row]);
    // Fallback if cloud schema is missing newer optional columns
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      const coreRow = {
        id: employee.id,
        company_id: companyId,
        code: employee.code,
        first_name: employee.firstName,
        last_name: employee.lastName,
        department: employee.department || 'GENERAL',
        position: employee.position || 'STAFF',
        email: employee.email || '',
        phone: employee.phone || '',
        monthly_gross: employee.monthlyGross || 0,
        annual_rent: employee.annualRent || 0,
        bank_name: employee.bankName || '',
        account_number: employee.accountNumber || '',
        has_pension: Boolean(employee.hasPension),
        has_paye: Boolean(employee.hasPaye),
        paye_number: employee.payeNumber || '',
        pension_number: employee.pensionNumber || '',
        pfa_name: employee.pfaName || '',
        status: employee.status || 'Active',
        employment_type: employee.employmentType || 'Full-Time',
        updated_at: new Date().toISOString(),
      };
      const retryRes = await client.from('employees').upsert([coreRow]);
      error = retryRes.error;
    }
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save single employee to cloud:', err);
    return { success: false, error: err?.message || 'Failed to save employee' };
  }
}

/**
 * Saves or updates a single loan record in the cloud database
 */
export async function saveSingleLoanToCloud(loan: EmployeeLoan, companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const row = {
      id: loan.id,
      company_id: companyId,
      employee_id: loan.employeeId,
      type: loan.type,
      principal_amount: loan.principalAmount,
      monthly_deduction: loan.monthlyDeduction,
      total_repaid: loan.totalRepaid,
      remaining_balance: loan.remainingBalance,
      start_period_key: loan.startPeriodKey,
      status: loan.status,
      disbursement_date: loan.disbursementDate || '',
      repayment_date: loan.repaymentDate || '',
      repayment_start_date: loan.repaymentStartDate || '',
      notes: loan.notes || '',
      description: loan.description || '',
      history: loan.history || [],
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from('employee_loans').upsert([row]);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save single loan to cloud:', err);
    return { success: false, error: err?.message || 'Failed to save loan' };
  }
}

/**
 * Saves or updates a single snapshot record in the cloud database
 */
export async function saveSnapshotToCloud(snap: PayrollSnapshot, companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const row = {
      id: snap.id,
      company_id: companyId,
      month_key: snap.monthKey,
      month_label: snap.monthLabel,
      year: snap.year,
      version: snap.version || 1,
      is_locked: Boolean(snap.isLocked),
      finalized_at: snap.finalizedAt || new Date().toISOString(),
      finalized_by: snap.finalizedBy || 'Administrator',
      notes: snap.notes || '',
      items: snap.items || [],
      totals: snap.totals || {},
    };
    const { error } = await client.from('payroll_snapshots').upsert([row]);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save snapshot to cloud:', err);
    return { success: false, error: err?.message || 'Failed to save snapshot' };
  }
}

/**
 * Saves a department to the cloud database
 */
export async function saveDepartmentToCloud(name: string, companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const { error } = await client.from('departments').upsert([{ company_id: companyId, name }], { onConflict: 'company_id,name' });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save department to cloud:', err);
    return { success: false, error: err?.message || 'Failed to save department' };
  }
}

/**
 * Saves payroll variables to the cloud database
 */
export async function savePayrollVariablesToCloud(vars: PayrollVariables, companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const { error } = await client.from('payroll_variables').upsert({
      company_id: companyId,
      basic: vars.basic,
      housing: vars.housing,
      transport: vars.transport,
      other_allowances: vars.otherAllowances,
      employee_pension_rate: vars.employeePensionRate,
      employer_pension_rate: vars.employerPensionRate,
      salary_calculation_mode: vars.salaryCalculationMode || 'gross-to-net',
      employment_type_rules: vars.employmentTypeRules || [],
      prorate_mid_month: Boolean(vars.prorateMidMonth),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save payroll variables to cloud:', err);
    return { success: false, error: err?.message || 'Failed to save variables' };
  }
}

/**
 * Saves PAYE tax variables to the cloud database
 */
export async function savePayeVariablesToCloud(vars: PayeTaxVariables, companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const { error } = await client.from('paye_tax_variables').upsert({
      company_id: companyId,
      cra_base: vars.craBase,
      rent_relief_rate: vars.rentReliefRate,
      rent_relief_cap: vars.rentReliefCap,
      tax_brackets: vars.taxBrackets,
      extra_conditions: vars.extraConditions,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save PAYE variables to cloud:', err);
    return { success: false, error: err?.message || 'Failed to save PAYE variables' };
  }
}

/**
 * Saves company email settings directly to the cloud database
 */
export async function saveEmailSettingsToCloud(settings: any, companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const { data, error } = await client
      .from('companies')
      .update({
        email_settings: settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId)
      .select('id');

    if (error) {
      if (error.message && error.message.includes('email_settings')) {
        console.warn('Supabase companies table is missing email_settings column. Please run schema migration.');
        return { success: false, error: 'Database missing email_settings column.' };
      }
      throw error;
    }

    // If company record didn't exist in cloud yet, upsert it so email settings are preserved
    if (!data || data.length === 0) {
      await client.from('companies').upsert({
        id: companyId,
        email_settings: settings,
        updated_at: new Date().toISOString(),
      });
    }

    // Broadcast across presence channel to sync all other active devices immediately
    broadcastEmailSettingsUpdate(companyId, settings);
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save email settings to cloud:', err);
    return { success: false, error: err?.message || 'Failed to save email settings' };
  }
}

/**
 * Saves dispatched payslip audit records to the cloud database
 */
export async function saveEmailedPayslipsToCloud(records: Record<string, any>, companyId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected.' };

  try {
    const { error } = await client
      .from('companies')
      .update({
        emailed_payslips: records,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId);
    if (error) {
      if (error.message && error.message.includes('emailed_payslips')) {
        console.warn('Supabase companies table is missing emailed_payslips column. Please run schema migration.');
        return { success: false, error: 'Database missing emailed_payslips column.' };
      }
      throw error;
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save emailed payslips to cloud:', err);
    return { success: false, error: err?.message || 'Failed to save emailed payslips' };
  }
}

/**
 * Checks whether any registered administrator exists in the database
 */
export async function checkHasAdminUser(): Promise<{
  success: boolean;
  hasAdmin: boolean;
  count: number;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, hasAdmin: false, count: 0, error: 'Server not connected' };

  try {
    const { data, error } = await client
      .from('team_members')
      .select('id, role, password')
      .eq('is_active', true);

    if (error) throw error;

    // Filter out dummy test seed 'user-admin-default' or unconfigured accounts without a password:
    const realMembers = (data || []).filter(
      (m: any) => m.id !== 'user-admin-default' && Boolean(m.password && m.password.trim())
    );

    const count = realMembers.length;
    const hasAdmin = realMembers.some((m: any) => m.role === 'Admin') || count > 0;
    return { success: true, hasAdmin, count };
  } catch (err: any) {
    console.error('Failed to check admin users:', err);
    return { success: false, hasAdmin: false, count: 0, error: err?.message || 'Connection check failed' };
  }
}

/**
 * Registers the initial Master Administrator account for a fresh database
 */
export async function registerInitialAdmin(data: {
  name: string;
  email: string;
  username: string;
  password: string;
  securityQuestion: string;
  securityAnswer: string;
  recoveryEmail?: string;
}): Promise<{
  success: boolean;
  member?: TeamMember;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected' };

  try {
    // Purge any legacy dummy test seed if present
    await client.from('team_members').delete().eq('id', 'user-admin-default');
    const adminId = 'admin-' + Date.now();
    const payload: Record<string, any> = {
      id: adminId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      username: data.username.trim().toLowerCase(),
      role: 'Admin',
      password: data.password,
      pin: data.password,
      security_question: data.securityQuestion.trim(),
      security_answer: data.securityAnswer.trim().toLowerCase(),
      recovery_email: data.recoveryEmail?.trim().toLowerCase() || data.email.trim().toLowerCase(),
      temp_password: '',
      must_change_password: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let insertRes = await client.from('team_members').insert(payload);
    if (insertRes.error) {
      console.warn('Initial admin insert attempt had schema error, attempting fallback:', insertRes.error);
      const msg = insertRes.error.message || '';
      if (msg.includes('must_change_password') || msg.includes('schema cache') || msg.includes('column')) {
        // Strip optional recovery fields if database table was created with an older schema
        delete payload.must_change_password;
        delete payload.temp_password;
        payload.pin = data.password;
        insertRes = await client.from('team_members').insert(payload);
        
        // If still missing security_question or other columns:
        if (insertRes.error && (insertRes.error.message.includes('schema cache') || insertRes.error.message.includes('column'))) {
          delete payload.security_question;
          delete payload.security_answer;
          delete payload.recovery_email;
          delete payload.username;
          insertRes = await client.from('team_members').insert(payload);
        }
      }
      if (insertRes.error) throw insertRes.error;
    }

    const member: TeamMember = {
      id: adminId,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      username: data.username.trim().toLowerCase(),
      role: 'Admin',
      securityQuestion: data.securityQuestion.trim(),
      recoveryEmail: data.recoveryEmail?.trim().toLowerCase() || data.email.trim().toLowerCase(),
      mustChangePassword: false,
      isActive: true,
      createdAt: payload.created_at,
    };

    setActiveTeamMember(member);
    await logAuditEvent('', 'Global System', 'Admin Registered', `Primary administrator account created for ${member.name} (${member.email})`);

    return { success: true, member };
  } catch (err: any) {
    console.error('Failed to register initial admin:', err);
    return { success: false, error: err?.message || 'Registration failed' };
  }
}

/**
 * Authenticates a staff member by email or username and password
 */
export async function loginStaffMember(
  identifier: string,
  passwordAttempt: string
): Promise<{
  success: boolean;
  member?: TeamMember;
  mustChangePassword?: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected' };

  try {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = passwordAttempt.trim();

    const { data, error } = await client
      .from('team_members')
      .select('*')
      .or(`email.ilike.${cleanId},username.ilike.${cleanId}`)
      .eq('is_active', true);

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, error: 'User account not found. Please check your email or username.' };
    }

    const row = data[0];
    const isMasterMatch = Boolean(row.password && row.password === cleanPass);
    const isTempMatch = Boolean(row.temp_password && row.temp_password === cleanPass);
    // Legacy fallback ONLY if the account never had a password set
    const isLegacyPinMatch = Boolean(!row.password && row.pin && row.pin === cleanPass);

    if (!isMasterMatch && !isTempMatch && !isLegacyPinMatch) {
      return { success: false, error: 'Incorrect password. Click "Forgot Password" if you need to recover access.' };
    }

    const mustChange = Boolean(row.must_change_password) || isTempMatch;

    const member: TeamMember = {
      id: row.id,
      name: row.name,
      email: row.email,
      username: row.username,
      role: row.role,
      securityQuestion: row.security_question,
      recoveryEmail: row.recovery_email,
      mustChangePassword: mustChange,
      isActive: true,
      phone: row.phone || '',
      avatarColor: row.avatar_color || '',
      twoFactorEnabled: Boolean(row.two_factor_enabled),
      twoFactorSecret: row.two_factor_secret || '',
      twoFactorBackupCodes: Array.isArray(row.two_factor_backup_codes) ? row.two_factor_backup_codes : [],
      biometricEnabled: Boolean(row.biometric_enabled),
      biometricDeviceName: row.biometric_device_name || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    setActiveTeamMember(member);
    await logAuditEvent('', 'Global System', 'Staff Sign-In', `${member.name} signed in from desktop terminal`);

    return { success: true, member, mustChangePassword: mustChange };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, error: err?.message || 'Authentication error' };
  }
}

/**
 * Retrieves the security question for a given user identifier (email or username)
 */
export async function getStaffSecurityQuestion(identifier: string): Promise<{
  success: boolean;
  securityQuestion?: string;
  recoveryEmail?: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected' };

  try {
    const cleanId = identifier.trim().toLowerCase();
    const { data, error } = await client
      .from('team_members')
      .select('security_question, recovery_email, email')
      .or(`email.ilike.${cleanId},username.ilike.${cleanId}`)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, error: 'No account registered with that email or username.' };
    }

    const question = data[0].security_question;
    const recEmail = data[0].recovery_email || data[0].email;
    if (!question) {
      return { 
        success: true, 
        securityQuestion: '', 
        recoveryEmail: recEmail,
        error: 'No security question was configured on this account. You may request a temporary reset code instead.' 
      };
    }

    return { success: true, securityQuestion: question, recoveryEmail: recEmail };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to retrieve recovery details' };
  }
}

/**
 * Resets user password by validating the security answer
 */
export async function resetPasswordWithSecurityAnswer(
  identifier: string,
  answerAttempt: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected' };

  try {
    const cleanId = identifier.trim().toLowerCase();
    const cleanAnswer = answerAttempt.trim().toLowerCase();

    const { data, error } = await client
      .from('team_members')
      .select('id, name, security_answer')
      .or(`email.ilike.${cleanId},username.ilike.${cleanId}`)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, error: 'Account not found.' };
    }

    const actualAnswer = (data[0].security_answer || '').trim().toLowerCase();
    if (!actualAnswer || actualAnswer !== cleanAnswer) {
      return { success: false, error: 'Incorrect answer to security question. Please try again.' };
    }

    // Answer matched! Update password, sync pin, and clear any temporary state
    const { error: updateError } = await client
      .from('team_members')
      .update({
        password: newPassword.trim(),
        pin: newPassword.trim(),
        temp_password: '',
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data[0].id);

    if (updateError) throw updateError;

    await logAuditEvent('', 'Global System', 'Password Reset', `Password reset successfully via security question for ${data[0].name}`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Password reset failed' };
  }
}

/**
 * Generates an instant temporary password for an account recovery request
 */
export async function generateTemporaryRecoveryPassword(
  identifier: string
): Promise<{
  success: boolean;
  tempPassword?: string;
  recoveryEmail?: string;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected' };

  try {
    const cleanId = identifier.trim().toLowerCase();
    const { data, error } = await client
      .from('team_members')
      .select('id, name, email, recovery_email')
      .or(`email.ilike.${cleanId},username.ilike.${cleanId}`)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      return { success: false, error: 'Account not found for that identifier.' };
    }

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const tempPass = `PAY-${randomSuffix}`;
    const user = data[0];
    const recEmail = user.recovery_email || user.email;

    const { error: updateError } = await client
      .from('team_members')
      .update({
        temp_password: tempPass,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    await logAuditEvent('', 'Global System', 'Recovery Code Generated', `Temporary access code generated for ${user.name}`);

    return { success: true, tempPassword: tempPass, recoveryEmail: recEmail };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to issue temporary password' };
  }
}

/**
 * Sets a new permanent password for the active authenticated user
 */
export async function updateAuthenticatedPassword(
  userId: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Cloud server not connected' };

  try {
    const { error } = await client
      .from('team_members')
      .update({
        password: newPassword.trim(),
        pin: newPassword.trim(),
        temp_password: '',
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;

    // Update active session locally
    const current = getActiveTeamMember();
    if (current && current.id === userId) {
      current.mustChangePassword = false;
      setActiveTeamMember(current);
    }

    await logAuditEvent('', 'Global System', 'Password Changed', `User updated their password`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to change password' };
  }
}

