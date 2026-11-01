import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Save, Smartphone, Lock, Fingerprint, WifiOff, RefreshCw, ShieldAlert } from 'lucide-react';
import { usePayrollStore } from './store/usePayrollStore';
import { DesktopTitleBar } from './components/layout/DesktopTitleBar';
import { SidebarNav } from './components/layout/SidebarNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { EmployeeListView } from './components/employees/EmployeeListView';
import { PayrollProcessingView } from './components/payroll/PayrollProcessingView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView, SettingsTab, DirtyStateInfo } from './components/settings/SettingsView';
import { CompanySettingsModal } from './components/settings/CompanySettingsModal';
import { WindowsAccountPicker } from './components/auth/WindowsAccountPicker';
import { PayslipDesignerPage } from './components/payslip/PayslipDesignerPage';
import { LoansAdvancesView } from './components/loans/LoansAdvancesView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppView, CompanyAccount, TeamMember } from './types';
import { CloudStaffGate } from './components/auth/CloudStaffGate';
import { MobileAppShell } from './components/mobile/MobileAppShell';
import { AndroidDeviceFrame } from './components/mobile/AndroidDeviceFrame';
import { UserProfilePage } from './components/profile/UserProfilePage';
import { Capacitor } from '@capacitor/core';
import { 
  getActiveTeamMember, 
  setActiveTeamMember, 
  saveCloudConfig, 
  leavePresenceChannel, 
  joinPresenceChannel, 
  fetchCompaniesFromSupabase, 
  getSupabaseClient, 
  subscribeToMemberUpdates,
  getInactivityLockMinutes,
  setStandaloneOfflineMode,
  isStandaloneOfflineMode,
  getSavedCloudConfig,
} from './services/supabaseClient';
import { verifyBiometric } from './utils/security';
import { verifyCredential } from './utils/cryptoAuth';
import { purgeAllLocalDataOnDisconnect, confirmDisconnectWithPendingSync } from './store/usePayrollStore';

export const App: React.FC = () => {
  const [authenticatedMember, setAuthenticatedMember] = useState<TeamMember | null>(() => getActiveTeamMember());
  // Ref always holds the current authenticatedMember so realtime callbacks never read stale closures
  const authenticatedMemberRef = useRef<TeamMember | null>(authenticatedMember);
  useEffect(() => { authenticatedMemberRef.current = authenticatedMember; }, [authenticatedMember]);



  const handleSignOut = () => {
    leavePresenceChannel();
    setStandaloneOfflineMode(false);
    setActiveTeamMember(null);
    setAuthenticatedMember(null);
  };

  // Inactivity Auto-Lock State & Timers
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [lockPinAttempt, setLockPinAttempt] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);
  const [isBiometricTesting, setIsBiometricTesting] = useState(false);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    const checkAndLockIfExpired = () => {
      const lockMins = getInactivityLockMinutes();
      if (lockMins > 0 && authenticatedMemberRef.current) {
        const elapsed = (Date.now() - lastActivityRef.current) / 1000 / 60;
        if (elapsed >= lockMins) {
          setIsScreenLocked(true);
          return true;
        }
      }
      return false;
    };

    const updateActivity = () => {
      if (isScreenLocked) return;
      // Before resetting the timer, check if the user was already inactive while away
      if (checkAndLockIfExpired()) {
        return;
      }
      lastActivityRef.current = Date.now();
    };

    // User interaction events in capture phase so touch/clicks upon wake-up evaluate first
    window.addEventListener('mousemove', updateActivity, { capture: true, passive: true });
    window.addEventListener('mousedown', updateActivity, { capture: true, passive: true });
    window.addEventListener('keydown', updateActivity, { capture: true, passive: true });
    window.addEventListener('touchstart', updateActivity, { capture: true, passive: true });
    window.addEventListener('pointerdown', updateActivity, { capture: true, passive: true });
    window.addEventListener('scroll', updateActivity, { capture: true, passive: true });

    // Instantly check when app/tab regains focus or phone screen wakes up
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkAndLockIfExpired();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Explicit manual lock trigger event
    const handleExplicitLock = () => {
      if (authenticatedMemberRef.current) {
        setIsScreenLocked(true);
      }
    };
    window.addEventListener('payroll-pro-lock-screen', handleExplicitLock);

    // Fast check interval every 2 seconds
    const interval = setInterval(() => {
      if (!isScreenLocked) {
        checkAndLockIfExpired();
      }
    }, 2000);

    return () => {
      window.removeEventListener('mousemove', updateActivity, { capture: true });
      window.removeEventListener('mousedown', updateActivity, { capture: true });
      window.removeEventListener('keydown', updateActivity, { capture: true });
      window.removeEventListener('touchstart', updateActivity, { capture: true });
      window.removeEventListener('pointerdown', updateActivity, { capture: true });
      window.removeEventListener('scroll', updateActivity, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('payroll-pro-lock-screen', handleExplicitLock);
      clearInterval(interval);
    };
  }, [isScreenLocked]);

  const handleUnlockScreen = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLockError(null);
    if (!authenticatedMember) {
      setIsScreenLocked(false);
      return;
    }
    const cleanAttempt = lockPinAttempt.trim();
    const isPinMatch = Boolean(authenticatedMember.pin && verifyCredential(cleanAttempt, authenticatedMember.pin));
    const isPassMatch = Boolean(authenticatedMember.password && verifyCredential(cleanAttempt, authenticatedMember.password));
    if (isPinMatch || isPassMatch) {
      setIsScreenLocked(false);
      setLockPinAttempt('');
      lastActivityRef.current = Date.now();
    } else {
      setLockError('Incorrect PIN or password');
    }
  };

  const handleBiometricUnlock = async () => {
    if (!authenticatedMember) return;
    setIsBiometricTesting(true);
    setLockError(null);
    const res = await verifyBiometric(authenticatedMember.id);
    setIsBiometricTesting(false);
    if (res.success) {
      setIsScreenLocked(false);
      setLockPinAttempt('');
      lastActivityRef.current = Date.now();
    } else {
      setLockError(res.error || 'Biometric scan failed');
    }
  };

  const handleDisconnectServer = () => {
    if (!confirmDisconnectWithPendingSync()) return;
    leavePresenceChannel();
    // Option A: Disconnect Only — preserves all local companies & offline records intact
    setStandaloneOfflineMode(true);
    saveCloudConfig({ url: '', anonKey: '', isEnabled: false });
    window.location.reload();
  };

  // Rejoin presence channel when the app loads with an existing session.
  // joinPresenceChannel is only called inside CloudStaffGate on a fresh login;
  // if the session was restored from localStorage on startup we must re-broadcast
  // here so the admin member list shows correct Online/Offline status.
  useEffect(() => {
    if (!authenticatedMember) return;
    fetchCompaniesFromSupabase().then(compRes => {
      joinPresenceChannel({
        memberId: authenticatedMember.id,
        name: authenticatedMember.name,
        role: authenticatedMember.role,
        companyId: compRes.companies?.[0]?.id || '',
        companyName: compRes.companies?.[0]?.name || '',
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });
    }).catch(() => {
      // Offline on startup — skip presence, will try again on reconnect
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedMember?.id]);

  // ─── Instant role / deactivation enforcement ────────────────────────────────
  // When an Admin changes this user's role or deactivates them from another device or window,
  // the change takes effect immediately on screen — without needing a reload or re-login.
  useEffect(() => {
    if (!authenticatedMember?.id) return;
    const memberId = authenticatedMember.id;
    const client = getSupabaseClient();
    let isMounted = true;

    const applyRowUpdate = (row: any) => {
      if (!isMounted) return;
      const current = authenticatedMemberRef.current;
      if (!current || current.id !== memberId) return;

      // Deactivated: force sign-out immediately
      if (row.is_active === false) {
        alert('Your account has been deactivated by an administrator. You have been signed out.');
        handleSignOut();
        return;
      }

      const newRole = row.role ?? current.role;
      const newName = row.name ?? current.name;
      const newEmail = row.email ?? current.email;
      const newIsActive = row.is_active !== undefined ? Boolean(row.is_active) : current.isActive;

      const roleChanged = newRole !== current.role;



      // Only re-render if something actually changed
      if (
        roleChanged ||
        newName !== current.name ||
        newEmail !== current.email ||
        newIsActive !== current.isActive
      ) {
        const updatedMember: TeamMember = {
          ...current,
          role: newRole,
          name: newName,
          email: newEmail,
          isActive: newIsActive,
        };
        authenticatedMemberRef.current = updatedMember;
        setActiveTeamMember(updatedMember);
        setAuthenticatedMember(updatedMember);

        // Update presence channel with updated role so other operators see the update
        fetchCompaniesFromSupabase().then(compRes => {
          joinPresenceChannel({
            memberId: updatedMember.id,
            name: updatedMember.name,
            role: updatedMember.role,
            companyId: compRes.companies?.[0]?.id || '',
            companyName: compRes.companies?.[0]?.name || '',
            joinedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
          });
        }).catch(() => {});
      }
    };

    // 1. Direct DB fetch helper
    const checkFreshFromDb = async () => {
      if (!client || !isMounted) return;
      try {
        const { data, error } = await client
          .from('team_members')
          .select('id,name,email,role,is_active')
          .eq('id', memberId)
          .maybeSingle();

        if (!error && data) {
          applyRowUpdate(data);
        }
      } catch {
        // Silent network fallback
      }
    };

    // Immediate check on mount!
    checkFreshFromDb();

    // 2. Background polling fallback (every 45 seconds) — lightweight safety net while relying primarily on WebSockets/Realtime
    const pollInterval = setInterval(checkFreshFromDb, 45000);

    // 3. Window focus and visibility sync — whenever the user clicks into or switches to this window
    const handleFocus = () => { checkFreshFromDb(); };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 4. WebSocket Broadcast listener — instant notification from other admin sessions
    const unsubBroadcast = subscribeToMemberUpdates((payload) => {
      if (payload.memberId === memberId) {
        checkFreshFromDb();
      }
    });

    // 5. Postgres Changes (Database Realtime Replication)
    let pgChannel: any = null;
    if (client) {
      pgChannel = client
        .channel(`team-member-sync-${memberId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'team_members' },
          (payload: any) => {
            const row = payload.new;
            if (row && row.id === memberId) {
              applyRowUpdate(row);
            } else {
              checkFreshFromDb();
            }
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      unsubBroadcast();
      if (pgChannel && client) {
        client.removeChannel(pgChannel);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedMember?.id]);

  const handleUpdateCurrentUser = (updated: TeamMember) => {
    authenticatedMemberRef.current = updated;
    setAuthenticatedMember(updated);
    setActiveTeamMember(updated);
  };

  const {
    state,
    companies,
    activeCompanyId,
    setCompaniesList,
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
    savedPayslipPresets,
    savePayslipPreset,
    deletePayslipPreset,
    addLoan,
    updateLoan,
    deleteLoan,
    pauseResumeLoan,
    recordManualLoanRepayment,
    applyPeriodLoanDeduction,
    applyAllPeriodLoanDeductions,
    resetAllData,
    reloadFromStorage,
    isCloudOffline,
    emailSettings,
    updateEmailSettings,
    emailedPayslips,
    recordEmailedPayslips,
  } = usePayrollStore();

  // Keep the real authenticated member role — we NEVER demote it based on connectivity.
  // Offline mode only disables saves (via isCloudOffline/isReadOnly props), not access.
  const effectiveMember = authenticatedMember;

  const isAdmin = !effectiveMember || effectiveMember.role === 'Admin';

  const [refreshTick, setRefreshTick] = useState(0);
  const [addEmployeeTrigger, setAddEmployeeTrigger] = useState(0);

  const handleSoftReload = () => {
    reloadFromStorage();
    setRefreshTick(t => t + 1);
  };

  const handleTriggerAddEmployee = () => {
    handleRequestNavigate('employees');
    setAddEmployeeTrigger(prev => prev + 1);
  };

  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);

  // --- WORKSPACE DIRECT PASSWORD UNLOCK STATE ---
  const [initialLockedCompanyId, setInitialLockedCompanyId] = useState<string | null>(null);
  const [previousActiveCompanyId, setPreviousActiveCompanyId] = useState<string | null>(null);
  const [previousActiveView, setPreviousActiveView] = useState<AppView | null>(null);

  const handleBackToPrevious = async () => {
    if (previousActiveCompanyId) {
      const prevComp = companies.find(c => c.id === previousActiveCompanyId);
      const res = await selectCompany(previousActiveCompanyId, prevComp?.password);
      if (res.success && previousActiveView) {
        setActiveView(previousActiveView);
      }
    }
    setPreviousActiveCompanyId(null);
    setPreviousActiveView(null);
    setInitialLockedCompanyId(null);
  };

  const handleExplicitLockOrSwitch = () => {
    setPreviousActiveCompanyId(null);
    setPreviousActiveView(null);
    setInitialLockedCompanyId(null);
    lockOrSwitchCompany();
  };

  // --- UNSAVED SETTINGS LEAVE PROTECTION ---
  const [unsavedSettingsInfo, setUnsavedSettingsInfo] = useState<DirtyStateInfo | null>(null);
  const [pendingNavView, setPendingNavView] = useState<AppView | null>(null);
  const [isUnsavedLeaveModalOpen, setIsUnsavedLeaveModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('branding');

  const isLocalUser = 
    authenticatedMember?.id === 'local_offline_operator' || 
    isStandaloneOfflineMode() || 
    !getSavedCloudConfig().isEnabled;

  useEffect(() => {
    if (state.activeView === 'profile' && isLocalUser) {
      setActiveView('dashboard');
    }
  }, [state.activeView, isLocalUser]);

  const handleRequestNavigate = (targetView: AppView, initialTab?: SettingsTab) => {
    if (targetView === state.activeView) {
      if (targetView === 'settings' && initialTab) {
        setSettingsInitialTab(initialTab);
      }
      return;
    }
    if (targetView === 'profile' && isLocalUser) return;
    if ((targetView === 'settings' || targetView === 'variables' || targetView === 'excel') && !isAdmin) {
      alert('Access Restricted: Only Administrators can access System Settings.');
      return;
    }

    const isSettingsActive = 
      state.activeView === 'settings' || 
      state.activeView === 'variables' || 
      state.activeView === 'excel';

    if (isSettingsActive && unsavedSettingsInfo?.isDirty) {
      setPendingNavView(targetView);
      setIsUnsavedLeaveModalOpen(true);
      return;
    }

    // Set settings tab (defaults to branding if not explicitly specified)
    if (targetView === 'settings') {
      setSettingsInitialTab(initialTab || 'branding');
    }

    setActiveView(targetView);
  };

  const handleOpenEmailSettings = () => {
    handleRequestNavigate('settings', 'email');
  };

  // Sync dark class on document root and body for bulletproof dark/light mode switching
  useEffect(() => {
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDarkTheme]);

  // --- RESPONSIVE & MOBILE SIMULATOR STATE ---
  const isElectron = typeof window !== 'undefined' && (Boolean((window as any).electronAPI) || /electron/i.test(navigator.userAgent));
  const isNativeApp = typeof window !== 'undefined' && (Capacitor.isNativePlatform() || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (isElectron) return false;
    return isNativeApp || window.innerWidth < 768;
  });

  useEffect(() => {
    if (isElectron) {
      setIsMobileViewport(false);
      return;
    }
    const handleResize = () => {
      setIsMobileViewport(isNativeApp || window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isNativeApp, isElectron]);

  const [isSimulatorMode, setIsSimulatorMode] = useState<boolean>(() => {
    if (isElectron || isNativeApp) return false;
    try {
      return localStorage.getItem('payroll_pro_mobile_simulator') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSimulatorMode = () => {
    if (isElectron || isNativeApp) return;
    setIsSimulatorMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('payroll_pro_mobile_simulator', String(next));
      } catch {}
      return next;
    });
  };

  // Cloud & Staff Authentication Gate:
  if (!authenticatedMember) {
    const staffGate = (
      <CloudStaffGate
        onAuthenticated={(member, loadedCompanies) => {
          setAuthenticatedMember(member);
          if (loadedCompanies && loadedCompanies.length > 0) {
            setCompaniesList(loadedCompanies);
          }
        }}
        isDarkTheme={isDarkTheme}
        onToggleTheme={toggleTheme}
        isMobileView={isMobileViewport || isSimulatorMode}
        isSimulatorMode={isSimulatorMode}
        onToggleSimulator={(!isElectron && !isNativeApp) ? toggleSimulatorMode : undefined}
      />
    );

    if (isSimulatorMode) {
      return (
        <AndroidDeviceFrame isFramed={true}>
          {staffGate}
        </AndroidDeviceFrame>
      );
    }
    return staffGate;
  }

  // If no company workspace is active, display the Account Picker
  if (!activeCompanyId) {
    const accountPicker = (
      <WindowsAccountPicker
        companies={companies}
        initialCompanyId={initialLockedCompanyId}
        canGoBack={Boolean(previousActiveCompanyId)}
        onBackToPrevious={handleBackToPrevious}
        onClearInitialCompany={() => {
          setInitialLockedCompanyId(null);
          setPreviousActiveCompanyId(null);
          setPreviousActiveView(null);
        }}
        onSelectCompany={async (companyId, passwordAttempt) => {
          const res = await selectCompany(companyId, passwordAttempt);
          if (res.success) {
            setInitialLockedCompanyId(null);
            setPreviousActiveCompanyId(null);
            setPreviousActiveView(null);
          }
          return res;
        }}
        onCreateCompany={createCompany}
        onUpdateCompany={updateCompanyAccount}
        onDeleteCompany={deleteCompany}
        isDarkTheme={isDarkTheme}
        onToggleTheme={toggleTheme}
        onCompaniesSynced={setCompaniesList}
        currentUser={authenticatedMember}
        onUpdateCurrentUser={handleUpdateCurrentUser}
        onSignOut={handleSignOut}
        onDisconnectServer={handleDisconnectServer}
        isMobileView={isMobileViewport || isSimulatorMode}
        isSimulatorMode={isSimulatorMode}
        onToggleSimulator={(!isElectron && !isNativeApp) ? toggleSimulatorMode : undefined}
      />
    );

    if (isSimulatorMode) {
      return (
        <AndroidDeviceFrame isFramed={true}>
          {accountPicker}
        </AndroidDeviceFrame>
      );
    }
    return accountPicker;
  }

  // ─── ANDROID MOBILE VIEW OR SIMULATOR MODE ──────────────────────────────────
  if (isMobileViewport || isSimulatorMode) {
    return (
      <div className={`fixed inset-0 w-full h-full overflow-hidden flex flex-col bg-[#fbfbfb] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans ${isDarkTheme ? 'dark' : ''}`}>
        {/* Mobile Offline Read-Only Banner */}
        {isCloudOffline && (
          <div className="no-print bg-amber-500 text-white dark:bg-amber-600 px-3 py-1.5 text-[11px] font-semibold flex items-center justify-between shadow-xs shrink-0 z-30">
            <div className="flex items-center gap-1.5 min-w-0">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Offline Mode (Read-Only) &bull; Cloud connection offline.
              </span>
            </div>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-600/60 shrink-0">
              Read-Only
            </span>
          </div>
        )}


        <MobileAppShell
          activeView={state.activeView}
          onNavigate={handleRequestNavigate}
          company={state.company}
          companies={companies}
          activeCompanyId={activeCompanyId}
          onSelectCompany={async (id) => {
            const target = companies.find(c => c.id === id);
            if (!target) return;
            if (target.id === activeCompanyId) return;

            if (target.hasPassword && target.password) {
              setPreviousActiveCompanyId(activeCompanyId);
              setPreviousActiveView(state.activeView);
              setInitialLockedCompanyId(target.id);
              lockOrSwitchCompany();
              return;
            }

            const res = await selectCompany(id);
            if (!res.success) {
              setPreviousActiveCompanyId(activeCompanyId);
              setPreviousActiveView(state.activeView);
              setInitialLockedCompanyId(target.id);
              lockOrSwitchCompany();
            }
          }}
          onLockOrSwitchCompany={handleExplicitLockOrSwitch}
          selectedMonth={state.selectedMonth}
          selectedYear={state.selectedYear}
          monthLabel={monthLabel}
          onPeriodChange={setSelectedPeriod}
          isLocked={Boolean(activeSnapshot?.isLocked)}
          isDarkTheme={isDarkTheme}
          onToggleTheme={toggleTheme}
          currentUser={effectiveMember}
          onUpdateCurrentUser={handleUpdateCurrentUser}
          onSignOut={handleSignOut}
          payrollItems={currentPayrollItems}
          employees={state.employees}
          activeSnapshot={activeSnapshot}
          snapshots={state.snapshots}
          loans={state.loans || []}
          departments={state.departments || []}
          onAddDepartment={addDepartment}
          onUpdateDepartment={updateDepartment}
          onDeleteDepartment={deleteDepartment}
          payrollVariables={state.payrollVariables}
          payeTaxVariables={state.payeTaxVariables}
          payslipDesign={state.payslipDesign}
          savedPresets={savedPayslipPresets}
          onUpdatePayslipDesign={updatePayslipDesign}
          onResetPayslipDesign={resetPayslipDesign}
          onSavePreset={savePayslipPreset}
          onDeletePreset={deletePayslipPreset}
          onFinalizeAndLock={finalizeAndLockPayroll}
          onUnlock={unlockPayroll}
          onAddEmployee={addEmployee}
          onUpdateEmployee={updateEmployee}
          onDeleteEmployee={deleteEmployee}
          onAddLoan={addLoan}
          onUpdateLoan={updateLoan}
          onDeleteLoan={deleteLoan}
          onPauseResumeLoan={pauseResumeLoan}
          onRecordManualPayment={recordManualLoanRepayment}
          onUpdateCompany={updateCompanyProfile}
          onUpdatePayrollVariables={updatePayrollVariables}
          onUpdatePayeTaxVariables={updatePayeTaxVariables}
          onImportEmployees={importEmployees}
          onResetAllData={resetAllData}
          settingsInitialTab={settingsInitialTab}
          onOpenEmailSettings={handleOpenEmailSettings}
          emailSettings={emailSettings}
          onUpdateEmailSettings={updateEmailSettings}
          emailedPayslips={emailedPayslips}
          onRecordEmailedPayslips={recordEmailedPayslips}
          onUpdateEmployeeEmail={(id, email) => updateEmployee(id, { email })}
          isAdmin={isAdmin}
          isCloudOffline={isCloudOffline}
          isPhoneFramePreview={isSimulatorMode && !isMobileViewport}
          onTogglePhoneFrame={toggleSimulatorMode}
        />


      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden bg-[#fbfbfb] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans ${isDarkTheme ? 'dark' : ''}`}>
      


      {/* Desktop Native Title Bar with Menu Bar */}
      <ErrorBoundary
        fallback={
          <header className="no-print h-9 bg-white dark:bg-[#09090b] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 text-xs shrink-0">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Payroll Pro</span>
            <button 
              type="button"
              onClick={() => window.location.reload()}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline cursor-pointer"
            >
              Reload Window
            </button>
          </header>
        }
      >
        <DesktopTitleBar
          selectedMonth={state.selectedMonth}
          selectedYear={state.selectedYear}
          onPeriodChange={setSelectedPeriod}
          activeSnapshot={activeSnapshot}
          employees={state.employees}
          payrollItems={currentPayrollItems}
          payrollVariables={state.payrollVariables}
          payeTaxVariables={state.payeTaxVariables}
          monthLabel={monthLabel}
          isDarkTheme={isDarkTheme}
          onToggleTheme={toggleTheme}
          company={state.company}
          companies={companies}
          activeCompanyId={activeCompanyId}
          loans={state.loans || []}
          departments={state.departments || []}
          employmentTypeRules={state.payrollVariables?.employmentTypeRules || []}
          onSelectCompany={async (id) => {
            const target = companies.find(c => c.id === id);
            if (!target) return;
            if (target.id === activeCompanyId) return;

            // If the workspace requires a password, take user directly to the account sign-in view
            if (target.hasPassword && target.password) {
              setPreviousActiveCompanyId(activeCompanyId);
              setPreviousActiveView(state.activeView);
              setInitialLockedCompanyId(target.id);
              lockOrSwitchCompany();
              return;
            }

            // Otherwise switch directly
            const res = await selectCompany(id);
            if (!res.success) {
              setPreviousActiveCompanyId(activeCompanyId);
              setPreviousActiveView(state.activeView);
              setInitialLockedCompanyId(target.id);
              lockOrSwitchCompany();
            }
          }}
          onOpenCompanySettings={() => handleRequestNavigate('settings')}
          onNavigate={handleRequestNavigate}
          onSoftReload={handleSoftReload}
          onTriggerAddEmployee={handleTriggerAddEmployee}
          onLockOrSwitchCompany={handleExplicitLockOrSwitch}
          currentUser={effectiveMember}
          onSignOut={handleSignOut}
        />
      </ErrorBoundary>

      {/* Desktop Offline Read-Only Banner */}
      {isCloudOffline && (
        <div className="no-print bg-amber-500 text-white dark:bg-amber-600 px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-xs shrink-0 z-30 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-100" />
            <span className="truncate">
              Offline Mode (Read-Only) &bull; Cloud connection is offline. Changes are disabled to protect data integrity.
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-600/60 dark:bg-amber-700/60 shrink-0">
            Read-Only
          </span>
        </div>
      )}

      {/* Main Window Body (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Minimalist Sidebar Navigation — hidden on full-page profile view */}
        {state.activeView !== 'profile' && (
          <SidebarNav
            activeView={state.activeView}
            onViewChange={handleRequestNavigate}
            staffCount={activeEmployees.length}
            activeLoansCount={state.loans?.filter(l => l.status === 'Active').length || 0}
            isLocked={Boolean(activeSnapshot?.isLocked)}
            companyName={state.company.name}
            companyLogoUrl={state.company.logoUrl}
            onLockOrSwitchCompany={handleExplicitLockOrSwitch}
            isAdmin={isAdmin}
          />
        )}

        {/* Viewport Content Area wrapped with Error Boundary */}
        <ErrorBoundary onResetView={() => setActiveView('dashboard')}>
          <main 
            key={refreshTick} 
            className={`flex-1 ${
              state.activeView === 'analytics'
                ? 'flex flex-col overflow-hidden bg-[#fbfbfb] dark:bg-[#09090b]'
                : state.activeView === 'profile'
                ? 'flex flex-col overflow-hidden bg-[#fbfbfb] dark:bg-[#09090b]'
                : 'overflow-auto px-6 pb-6 pt-0 md:px-8 md:pb-8 md:pt-0 bg-[#fbfbfb] dark:bg-[#09090b]'
            }`}
          >
            {state.activeView === 'profile' && !isLocalUser ? (
              <UserProfilePage
                currentUser={authenticatedMember}
                onBack={() => handleRequestNavigate('dashboard')}
                onUpdateCurrentUser={handleUpdateCurrentUser}
                onSignOut={handleSignOut}
                isMobileView={false}
              />
            ) : state.activeView === 'analytics' ? (
              <AnalyticsView
                items={currentPayrollItems}
                employees={state.employees}
                payrollVariables={state.payrollVariables}
                payeTaxVariables={state.payeTaxVariables}
                monthLabel={monthLabel}
                selectedMonth={state.selectedMonth}
                year={state.selectedYear}
                activeSnapshot={activeSnapshot}
                snapshots={state.snapshots}
                departments={state.departments}
                company={state.company}
                loans={state.loans || []}
              />
            ) : state.activeView === 'employees' ? (
              <EmployeeListView
                employees={state.employees}
                departments={state.departments}
                onAddEmployee={addEmployee}
                onAddEmployees={addEmployees}
                onUpdateEmployee={updateEmployee}
                onDeleteEmployee={deleteEmployee}
                onNavigateToExcel={() => handleRequestNavigate('excel')}
                currentYear={state.selectedYear}
                currentMonth={state.selectedMonth}
                salaryCalculationMode={state.payrollVariables.salaryCalculationMode}
                employmentTypeRules={state.payrollVariables.employmentTypeRules}
                addEmployeeTrigger={addEmployeeTrigger}
                loans={state.loans || []}
                currentUser={effectiveMember}
                isReadOnly={isCloudOffline}
              />
            ) : state.activeView === 'payroll' ? (
              <PayrollProcessingView
                monthLabel={monthLabel}
                year={state.selectedYear}
                items={currentPayrollItems}
                activeSnapshot={activeSnapshot}
                snapshots={state.snapshots}
                onFinalizeAndLock={finalizeAndLockPayroll}
                onUnlock={unlockPayroll}
                onDeleteSnapshot={deleteSnapshot}
                employees={state.employees}
                payrollVariables={state.payrollVariables}
                payeTaxVariables={state.payeTaxVariables}
                selectedMonth={state.selectedMonth}
                onPeriodChange={setSelectedPeriod}
                company={state.company}
                onOpenCompanySettings={() => handleRequestNavigate('settings')}
                departmentsList={state.departments}
                onOpenPayslipDesigner={() => handleRequestNavigate('payslip-designer')}
                payslipDesign={state.payslipDesign}
                onUpdatePayslipDesign={updatePayslipDesign}
                onResetPayslipDesign={resetPayslipDesign}
                savedPresets={savedPayslipPresets}
                onSavePreset={savePayslipPreset}
                onDeletePreset={deletePayslipPreset}
                loans={state.loans || []}
                currentUser={effectiveMember}
                emailSettings={emailSettings}
                onUpdateEmployeeEmail={(id, email) => updateEmployee(id, { email })}
                onOpenEmailSettings={handleOpenEmailSettings}
                emailedPayslips={emailedPayslips}
                onRecordEmailedPayslips={recordEmailedPayslips}
                isAdmin={isAdmin}
              />
            ) : state.activeView === 'loans' ? (
              <LoansAdvancesView
                loans={state.loans || []}
                employees={state.employees}
                payrollItems={currentPayrollItems}
                company={state.company}
                monthLabel={monthLabel}
                selectedMonth={state.selectedMonth}
                selectedYear={state.selectedYear}
                onAddLoan={addLoan}
                onUpdateLoan={updateLoan}
                onDeleteLoan={deleteLoan}
                onPauseResumeLoan={pauseResumeLoan}
                onRecordManualPayment={recordManualLoanRepayment}
                onApplyLoanDeduction={applyPeriodLoanDeduction}
                onApplyAllLoanDeductions={applyAllPeriodLoanDeductions}
                currentUser={effectiveMember}
                isReadOnly={isCloudOffline}
              />
            ) : (
              <div className="max-w-6xl mx-auto space-y-4">
                {state.activeView === 'dashboard' && (
                  <DashboardView
                    items={currentPayrollItems}
                    staffCount={activeEmployees.length}
                    monthLabel={monthLabel}
                    selectedMonth={state.selectedMonth}
                    year={state.selectedYear}
                    activeSnapshot={activeSnapshot}
                    onNavigate={handleRequestNavigate}
                    departments={state.departments}
                    employees={state.employees}
                    payrollVariables={state.payrollVariables}
                    payeTaxVariables={state.payeTaxVariables}
                    onPeriodChange={setSelectedPeriod}
                  />
                )}

                {state.activeView === 'payslip-designer' && (
                  <PayslipDesignerPage
                    company={state.company}
                    employees={state.employees}
                    payrollVariables={state.payrollVariables}
                    payeTaxVariables={state.payeTaxVariables}
                    monthLabel={monthLabel}
                    selectedMonth={state.selectedMonth}
                    year={state.selectedYear}
                    payslipDesign={state.payslipDesign}
                    onUpdatePayslipDesign={updatePayslipDesign}
                    onResetPayslipDesign={resetPayslipDesign}
                    onBackToPayroll={() => handleRequestNavigate('payroll')}
                    savedPresets={savedPayslipPresets}
                    onSavePreset={savePayslipPreset}
                    onDeletePreset={deletePayslipPreset}
                    loans={state.loans || []}
                    isReadOnly={isCloudOffline}
                  />
                )}

              {(state.activeView === 'settings' || state.activeView === 'variables' || state.activeView === 'excel') && (
                isAdmin ? (
                  <SettingsView
                    initialTab={
                      state.activeView === 'variables' ? 'tax' :
                      state.activeView === 'excel' ? 'excel' :
                      settingsInitialTab
                    }
                    company={state.company}
                    onUpdateCompany={updateCompanyProfile}
                    payrollVariables={state.payrollVariables}
                    payeTaxVariables={state.payeTaxVariables}
                    onUpdatePayrollVariables={updatePayrollVariables}
                    onUpdatePayeTaxVariables={updatePayeTaxVariables}
                    departments={state.departments}
                    onAddDepartment={addDepartment}
                    onUpdateDepartment={updateDepartment}
                    onDeleteDepartment={deleteDepartment}
                    employees={state.employees}
                    payrollItems={currentPayrollItems}
                    monthLabel={monthLabel}
                    selectedMonth={state.selectedMonth}
                    year={state.selectedYear}
                    activeSnapshot={activeSnapshot}
                    snapshots={state.snapshots}
                    snapshotsCount={state.snapshots.length}
                    loans={state.loans || []}
                    payslipDesign={state.payslipDesign}
                    onImportEmployees={importEmployees}
                    onResetAllData={resetAllData}
                    onNavigate={handleRequestNavigate}
                    onRegisterDirtyState={setUnsavedSettingsInfo}
                    onRefreshData={handleSoftReload}
                    currentUser={effectiveMember}
                    emailSettings={emailSettings}
                    onUpdateEmailSettings={updateEmailSettings}
                    isReadOnly={isCloudOffline}
                  />
                ) : (
                  <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3 max-w-md mx-auto my-12">
                    <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Access Restricted</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Only company administrators have permission to access System Settings and Email Delivery configuration.
                    </p>
                    <button
                      onClick={() => handleRequestNavigate('dashboard')}
                      className="px-4 py-2 rounded-md text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </main>
      </ErrorBoundary>

      </div>

      {/* Company Branding Settings Modal */}
      {isCompanySettingsOpen && (
        <CompanySettingsModal
          isOpen={isCompanySettingsOpen}
          company={state.company}
          onSave={updateCompanyProfile}
          isReadOnly={isCloudOffline}
          onClose={() => setIsCompanySettingsOpen(false)}
        />
      )}

      {/* ================= UNSAVED CHANGES LEAVE SETTINGS MODAL ================= */}
      {isUnsavedLeaveModalOpen && (
        <div className="fixed top-9 inset-x-0 bottom-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-amber-300 dark:border-amber-900/60 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Unsaved Changes
                </h3>
                <p className="text-xs text-zinc-500">
                  You have unsaved changes in {unsavedSettingsInfo?.tabName || 'Settings'}.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Do you want to save your modifications before leaving the Settings page, or discard them?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsUnsavedLeaveModalOpen(false);
                  setPendingNavView(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Keep Editing
              </button>

              <button
                type="button"
                onClick={() => {
                  unsavedSettingsInfo?.discard();
                  setIsUnsavedLeaveModalOpen(false);
                  if (pendingNavView) {
                    setActiveView(pendingNavView);
                    setPendingNavView(null);
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition border border-rose-200 dark:border-rose-900/50"
              >
                Discard Changes
              </button>

              <button
                type="button"
                onClick={() => {
                  const saved = unsavedSettingsInfo ? unsavedSettingsInfo.save() : true;
                  if (saved) {
                    setIsUnsavedLeaveModalOpen(false);
                    if (pendingNavView) {
                      setActiveView(pendingNavView);
                      setPendingNavView(null);
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded font-medium text-xs hover:opacity-90 transition shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save &amp; Leave</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Android Simulator Floating Trigger on Desktop (Browser only, NEVER in Electron or Native App) */}
      {!isElectron && !isNativeApp && (
        <div className="fixed bottom-4 right-4 z-40 no-print">
          <button
            type="button"
            onClick={toggleSimulatorMode}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold shadow-xl hover:scale-105 transition-all active:scale-95 border border-zinc-700/60 dark:border-zinc-300/60 cursor-pointer"
            title="Toggle Android Mobile View Simulator"
          >
            <Smartphone className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>Android Mobile View</span>
          </button>
        </div>
      )}

      {/* ================= INACTIVITY WORKSTATION LOCK OVERLAY ================= */}
      {isScreenLocked && authenticatedMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-6 h-6 text-amber-500" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Workstation Locked
              </h3>
              <p className="text-xs text-zinc-400">
                Screen locked due to inactivity. Enter your PIN or password to resume.
              </p>
            </div>

            {/* User Badge */}
            <div className="flex items-center justify-center gap-2.5 py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                {(authenticatedMember.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {authenticatedMember.name}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {authenticatedMember.role}
                </p>
              </div>
            </div>

            {lockError && (
              <p className="text-xs text-rose-500 font-medium animate-in fade-in">
                {lockError}
              </p>
            )}

            <form onSubmit={handleUnlockScreen} className="space-y-3">
              <input
                type="password"
                autoFocus
                placeholder="Enter 4-digit PIN or password"
                value={lockPinAttempt}
                onChange={(e) => setLockPinAttempt(e.target.value)}
                className="w-full h-11 text-center font-mono text-base font-bold tracking-widest bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-400 transition"
              />

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!lockPinAttempt}
                  className="flex-1 h-10 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  Unlock Workstation
                </button>

                {authenticatedMember.biometricEnabled && (
                  <button
                    type="button"
                    onClick={handleBiometricUnlock}
                    disabled={isBiometricTesting}
                    title="Unlock with Biometric Passkey"
                    className="w-10 h-10 bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-violet-100 transition shrink-0"
                  >
                    <Fingerprint className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setIsScreenLocked(false);
                  handleSignOut();
                }}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default App;
