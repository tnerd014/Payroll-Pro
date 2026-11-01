import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { ShieldAlert } from 'lucide-react';
import { 
  AppView, 
  CompanyAccount, 
  TeamMember, 
  CalculatedPayrollItem, 
  PayrollSnapshot, 
  Employee, 
  CompanyProfile,
  PayrollVariables,
  PayeTaxVariables,
  EmployeeLoan,
  PayslipDesignConfig,
  PayslipCustomPreset,
  EmploymentTypeRule,
  SalaryCalculationMode,
  EmailSettings,
  EmailedPayslipRecord,
  EmailPayslipContext
} from '../../types';
import { MobileTopAppBar } from './MobileTopAppBar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMoreSheet } from './MobileMoreSheet';
import { AndroidDeviceFrame } from './AndroidDeviceFrame';
import { initializeMobileBackHandler, registerBackHandler } from '../../utils/mobileBackHandler';
import { MobileDashboardView } from './views/MobileDashboardView';
import { MobilePayrollRunView } from './views/MobilePayrollRunView';
import { MobileStaffDirectoryView } from './views/MobileStaffDirectoryView';
import { MobileLoansDirectoryView } from './views/MobileLoansDirectoryView';
import { MobileAnalyticsView } from './views/MobileAnalyticsView';
import { MobileSettingsView, MobileSettingsTab } from './views/MobileSettingsView';
import { MobilePayslipDesignerView } from './views/MobilePayslipDesignerView';
import { MobilePayslipPrintView } from './views/MobilePayslipPrintView';
import { VariablesView } from '../variables/VariablesView';
import { ExcelHubView } from '../excel/ExcelHubView';
import { UserProfilePage } from '../profile/UserProfilePage';
import { isStandaloneOfflineMode, getSavedCloudConfig } from '../../services/supabaseClient';
import { EmailPayslipsModal } from '../payroll/EmailPayslipsModal';

interface MobileAppShellProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  company: CompanyProfile;
  companies: CompanyAccount[];
  activeCompanyId?: string;
  onSelectCompany: (companyId: string) => void;
  onLockOrSwitchCompany?: () => void;
  selectedMonth: string;
  selectedYear: number;
  monthLabel: string;
  onPeriodChange: (month: string, year: number) => void;
  isLocked: boolean;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  currentUser: TeamMember | null;
  onUpdateCurrentUser?: (member: TeamMember) => void;
  onSignOut: () => void;
  
  // Data
  payrollItems: CalculatedPayrollItem[];
  employees: Employee[];
  activeSnapshot: PayrollSnapshot | undefined;
  snapshots?: PayrollSnapshot[];
  loans: EmployeeLoan[];
  departments: string[];
  onAddDepartment?: (name: string) => void;
  onUpdateDepartment?: (oldName: string, newName: string) => void;
  onDeleteDepartment?: (name: string) => void;
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  payslipDesign?: PayslipDesignConfig;
  savedPresets?: PayslipCustomPreset[];
  onUpdatePayslipDesign?: (updates: Partial<PayslipDesignConfig>) => void;
  onResetPayslipDesign?: () => void;
  onSavePreset?: (name: string, config: PayslipDesignConfig) => void;
  onDeletePreset?: (id: string) => void;
  
  // Actions
  onFinalizeAndLock: (notes: string) => void;
  onUnlock: (reason: string) => void;
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (id: string, updates: Partial<Employee>) => void;
  onDeleteEmployee: (id: string) => void;
  onAddLoan: (loan: any) => void;
  onUpdateLoan?: (id: string, updates: Partial<EmployeeLoan>) => void;
  onDeleteLoan?: (id: string) => void;
  onPauseResumeLoan: (id: string) => void;
  onRecordManualPayment: (id: string, amt: number, notes?: string) => void;
  onUpdateCompany: (profile: Partial<CompanyProfile>) => void;
  onUpdatePayrollVariables: (v: Partial<PayrollVariables>) => void;
  onUpdatePayeTaxVariables: (v: Partial<PayeTaxVariables>) => void;
  onImportEmployees?: (items: Partial<Employee>[], mode: 'merge' | 'overwrite', scope?: 'all' | 'salary-only' | 'bank-only') => void;
  onResetAllData?: (options: any) => void;

  // Email & Permission Props
  settingsInitialTab?: string;
  onOpenEmailSettings?: () => void;
  emailSettings?: EmailSettings;
  onUpdateEmailSettings?: (settings: Partial<EmailSettings>) => void;
  emailedPayslips?: Record<string, EmailedPayslipRecord>;
  onRecordEmailedPayslips?: (records: EmailedPayslipRecord[]) => void;
  onUpdateEmployeeEmail?: (id: string, email: string) => void;
  isAdmin?: boolean;
  isCloudOffline?: boolean;

  // Simulator Toggle
  isPhoneFramePreview: boolean;
  onTogglePhoneFrame: () => void;
}

export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  activeView,
  onNavigate,
  company,
  companies,
  activeCompanyId,
  onSelectCompany,
  onLockOrSwitchCompany,
  selectedMonth,
  selectedYear,
  monthLabel,
  onPeriodChange,
  isLocked,
  isDarkTheme,
  onToggleTheme,
  currentUser,
  onUpdateCurrentUser,
  onSignOut,
  payrollItems,
  employees,
  activeSnapshot,
  snapshots = [],
  loans = [],
  departments = [],
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  payrollVariables,
  payeTaxVariables,
  payslipDesign,
  savedPresets = [],
  onUpdatePayslipDesign,
  onResetPayslipDesign,
  onSavePreset,
  onDeletePreset,
  onFinalizeAndLock,
  onUnlock,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddLoan,
  onUpdateLoan,
  onDeleteLoan,
  onPauseResumeLoan,
  onRecordManualPayment,
  onUpdateCompany,
  onUpdatePayrollVariables,
  onUpdatePayeTaxVariables,
  onImportEmployees,
  onResetAllData,
  settingsInitialTab,
  onOpenEmailSettings,
  emailSettings,
  onUpdateEmailSettings,
  emailedPayslips,
  onRecordEmailedPayslips,
  onUpdateEmployeeEmail,
  isAdmin = true,
  isCloudOffline = false,
  isPhoneFramePreview,
  onTogglePhoneFrame,
}) => {
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isEmailPayslipsOpen, setIsEmailPayslipsOpen] = useState(false);
  const [emailModalContext, setEmailModalContext] = useState<EmailPayslipContext | null>(null);
  const [previousView, setPreviousView] = useState<AppView>('payroll');
  const isAuditor = currentUser?.role === 'Auditor';
  const [mobileSettingsTab, setMobileSettingsTab] = useState<MobileSettingsTab | undefined>(() => {
    return settingsInitialTab === 'email' ? 'email' : undefined;
  });

  // Mobile navigation history stack for Android hardware back button
  const [viewHistory, setViewHistory] = useState<AppView[]>([activeView || 'dashboard']);
  const [showExitToast, setShowExitToast] = useState(false);
  const isPoppingRef = useRef(false);

  // Sync forward view transitions into history
  useEffect(() => {
    if (isPoppingRef.current) {
      isPoppingRef.current = false;
      return;
    }
    setViewHistory(prev => {
      if (prev[prev.length - 1] === activeView) return prev;
      return [...prev, activeView];
    });
  }, [activeView]);

  // Handle popping back through the view history stack
  const popViewHistory = useCallback((): boolean => {
    let didPop = false;
    let targetView: AppView = 'dashboard';

    setViewHistory(prev => {
      if (prev.length > 1) {
        const next = [...prev];
        next.pop(); // remove current view
        const prevTarget = next[next.length - 1];
        if (prevTarget && prevTarget !== activeView) {
          targetView = prevTarget;
          didPop = true;
          return next;
        }
      }
      // Fallback: if on a sub-view (not dashboard), go back to dashboard
      if (activeView !== 'dashboard') {
        targetView = 'dashboard';
        didPop = true;
        return ['dashboard'];
      }
      return prev;
    });

    if (didPop) {
      isPoppingRef.current = true;
      onNavigate(targetView);
      return true;
    }

    return false; // at root dashboard
  }, [activeView, onNavigate]);

  // Intercept email payslips modal on Android hardware back button
  useEffect(() => {
    if (!isEmailPayslipsOpen) return;
    return registerBackHandler(() => {
      setIsEmailPayslipsOpen(false);
      return true;
    });
  }, [isEmailPayslipsOpen]);

  // Initialize Android hardware back button and browser popstate listener
  useEffect(() => {
    const cleanup = initializeMobileBackHandler(
      popViewHistory,
      () => {
        setShowExitToast(true);
        setTimeout(() => setShowExitToast(false), 2000);
      }
    );
    return cleanup;
  }, [popViewHistory]);

  // Keep mobileSettingsTab in sync when settingsInitialTab changes
  useEffect(() => {
    if (settingsInitialTab === 'email') {
      setMobileSettingsTab('email');
    }
  }, [settingsInitialTab]);

  const isLocalUser = currentUser?.id === 'local_offline_operator' || isStandaloneOfflineMode() || !getSavedCloudConfig().isEnabled;
  const mainScrollRef = useRef<HTMLElement>(null);

  // Automatically reset scroll position to top whenever activeView changes
  useLayoutEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [activeView]);

  // Handle navigation: switch page or smooth scroll to top if already on active tab
  const handleNavigate = (view: AppView, tab?: MobileSettingsTab) => {
    if (tab) {
      setMobileSettingsTab(tab);
    } else if (view !== 'settings') {
      setMobileSettingsTab(undefined);
    }

    if (view === activeView) {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      setPreviousView(activeView);
      onNavigate(view);
    }
  };

  const handleOpenEmailSettingsFlow = () => {
    setMobileSettingsTab('email');
    if (onOpenEmailSettings) {
      onOpenEmailSettings();
    } else {
      handleNavigate('settings');
    }
  };

  const activeLoansCount = loans.filter(l => l.status === 'Active').length;

  return (
    <AndroidDeviceFrame isFramed={isPhoneFramePreview}>
      {/* ── Android Material 3 Top App Bar (Hidden on full-screen payslips, designer & profile) ── */}
      {activeView !== 'payslip-designer' && activeView !== 'payslips' && activeView !== 'profile' && (
        <MobileTopAppBar
          activeView={activeView}
          company={company}
          companies={companies}
          activeCompanyId={activeCompanyId}
          onSelectCompany={onSelectCompany}
          onLockOrSwitchCompany={onLockOrSwitchCompany}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onPeriodChange={onPeriodChange}
          isLocked={isLocked}
          isDarkTheme={isDarkTheme}
          onToggleTheme={onToggleTheme}
          currentUser={currentUser}
          onSignOut={onSignOut}
          isPhoneFramePreview={isPhoneFramePreview}
          onTogglePhoneFrame={onTogglePhoneFrame}
          onNavigate={handleNavigate}
        />
      )}

      {/* ── Scrollable Viewport Content ── */}
      <main 
        ref={mainScrollRef}
        key={activeView}
        className={`flex-1 min-h-0 w-full overflow-y-auto overscroll-y-contain ${(activeView === 'payslip-designer' || activeView === 'payslips' || activeView === 'profile') ? 'p-0' : 'px-4 pt-3.5 pb-3'}`}
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {activeView === 'dashboard' ? (
          <MobileDashboardView
            items={payrollItems}
            staffCount={employees.length}
            monthLabel={monthLabel}
            year={selectedYear}
            activeSnapshot={activeSnapshot}
            onNavigate={onNavigate}
            company={company}
          />
        ) : activeView === 'payroll' ? (
          <MobilePayrollRunView
            items={payrollItems}
            activeSnapshot={activeSnapshot}
            monthLabel={monthLabel}
            selectedMonth={selectedMonth}
            year={selectedYear}
            onFinalizeAndLock={onFinalizeAndLock}
            onUnlock={onUnlock}
            company={company}
            payslipDesign={payslipDesign}
            departments={departments}
            onNavigate={handleNavigate}
            currentUser={currentUser}
            employees={employees}
            emailSettings={emailSettings}
            emailedPayslips={emailedPayslips}
            onRecordEmailedPayslips={onRecordEmailedPayslips}
            onUpdateEmployeeEmail={onUpdateEmployeeEmail}
            isAdmin={isAdmin}
            onOpenEmailSettings={handleOpenEmailSettingsFlow}
          />
        ) : activeView === 'employees' ? (
          <MobileStaffDirectoryView
            employees={employees}
            departments={departments}
            onAddEmployee={onAddEmployee}
            onUpdateEmployee={onUpdateEmployee}
            onDeleteEmployee={onDeleteEmployee}
            salaryCalculationMode={payrollVariables.salaryCalculationMode}
            employmentTypeRules={payrollVariables.employmentTypeRules}
            currentMonth={selectedMonth}
            currentYear={selectedYear}
            currentUser={currentUser}
            isReadOnly={isCloudOffline}
          />
        ) : activeView === 'loans' ? (
          <MobileLoansDirectoryView
            loans={loans}
            employees={employees}
            payrollItems={payrollItems}
            company={company}
            monthLabel={monthLabel}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onAddLoan={onAddLoan}
            onUpdateLoan={onUpdateLoan}
            onDeleteLoan={onDeleteLoan}
            onPauseResumeLoan={onPauseResumeLoan}
            onRecordManualPayment={onRecordManualPayment}
            currentUser={currentUser}
            isReadOnly={isCloudOffline}
          />
        ) : activeView === 'analytics' ? (
          <MobileAnalyticsView
            items={payrollItems}
            employees={employees}
            payrollVariables={payrollVariables}
            payeTaxVariables={payeTaxVariables}
            monthLabel={monthLabel}
            selectedMonth={selectedMonth}
            year={selectedYear}
            activeSnapshot={activeSnapshot}
            snapshots={snapshots}
            departments={departments}
            company={company}
            loans={loans}
          />
        ) : activeView === 'payslips' ? (
          <MobilePayslipPrintView
            company={company}
            employees={employees}
            items={payrollItems}
            payrollVariables={payrollVariables}
            payeTaxVariables={payeTaxVariables}
            monthLabel={monthLabel}
            selectedMonth={selectedMonth}
            year={selectedYear}
            payslipDesign={payslipDesign}
            savedPresets={savedPresets}
            snapshots={snapshots}
            onUpdatePayslipDesign={onUpdatePayslipDesign || (() => {})}
            onResetPayslipDesign={onResetPayslipDesign || (() => {})}
            onBack={() => onNavigate('payroll')}
            loans={loans}
            isLocked={isLocked}
            onEmailPayslips={!isAuditor ? (ctx) => {
              setEmailModalContext(ctx || null);
              setIsEmailPayslipsOpen(true);
            } : undefined}
          />
        ) : activeView === 'payslip-designer' ? (
          <MobilePayslipDesignerView
            company={company}
            employees={employees}
            items={payrollItems}
            payrollVariables={payrollVariables}
            payeTaxVariables={payeTaxVariables}
            monthLabel={monthLabel}
            selectedMonth={selectedMonth}
            year={selectedYear}
            payslipDesign={payslipDesign}
            savedPresets={savedPresets}
            snapshots={snapshots}
            onUpdatePayslipDesign={onUpdatePayslipDesign || (() => {})}
            onResetPayslipDesign={onResetPayslipDesign || (() => {})}
            onSavePreset={onSavePreset}
            onDeletePreset={onDeletePreset}
            onBack={() => onNavigate(previousView || 'payroll')}
            loans={loans}
            isLocked={isLocked}
            isReadOnly={isCloudOffline}
          />
        ) : (activeView === 'settings' || activeView === 'variables' || activeView === 'excel') ? (
          (activeView === 'settings' && !isAdmin) ? (
            <div className="p-6 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3 my-6">
              <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Access Restricted</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Only company administrators have permission to access Settings and Email Delivery configuration.
              </p>
              <button
                onClick={() => handleNavigate('dashboard')}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          ) : (
            <MobileSettingsView
              initialTab={
                mobileSettingsTab ||
                (activeView === 'variables' ? 'payroll' :
                 activeView === 'excel' ? 'excel' :
                 undefined)
              }
              company={company}
              onUpdateCompany={onUpdateCompany}
              payrollVariables={payrollVariables}
              payeTaxVariables={payeTaxVariables}
              onUpdatePayrollVariables={onUpdatePayrollVariables}
              onUpdatePayeTaxVariables={onUpdatePayeTaxVariables}
              departments={departments}
              onAddDepartment={onAddDepartment}
              onUpdateDepartment={onUpdateDepartment}
              onDeleteDepartment={onDeleteDepartment}
              employees={employees}
              payrollItems={payrollItems}
              monthLabel={monthLabel}
              selectedMonth={selectedMonth}
              year={selectedYear}
              activeSnapshot={activeSnapshot}
              snapshots={snapshots}
              loans={loans}
              currentUser={currentUser}
              onImportEmployees={onImportEmployees}
              onResetAllData={onResetAllData}
              onNavigate={onNavigate}
              emailSettings={emailSettings}
              onUpdateEmailSettings={onUpdateEmailSettings}
              isReadOnly={isCloudOffline}
            />
          )
        ) : activeView === 'profile' && !isLocalUser ? (
          <UserProfilePage
            currentUser={currentUser}
            onBack={() => handleNavigate(previousView || 'dashboard')}
            onUpdateCurrentUser={onUpdateCurrentUser}
            onSignOut={onSignOut}
            isMobileView={true}
          />
        ) : (
          <MobileDashboardView
            items={payrollItems}
            staffCount={employees.length}
            monthLabel={monthLabel}
            year={selectedYear}
            activeSnapshot={activeSnapshot}
            onNavigate={onNavigate}
            company={company}
          />
        )}
      </main>

      {/* ── Android Material 3 Bottom Navigation Bar (Thumb Zone) ── */}
      {activeView !== 'payslip-designer' && activeView !== 'payslips' && activeView !== 'profile' && (
        <MobileBottomNav
          activeView={activeView}
          onViewChange={handleNavigate}
          staffCount={employees.length}
          activeLoansCount={activeLoansCount}
          isLocked={isLocked}
          onOpenMoreSheet={() => setIsMoreSheetOpen(true)}
        />
      )}

      {/* ── Material 3 Services Action Sheet ── */}
      <MobileMoreSheet
        isOpen={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        activeView={activeView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onSignOut={onSignOut}
        onLockOrSwitchCompany={onLockOrSwitchCompany}
      />

      {/* ── Email Payslips Modal ── */}
      {isEmailPayslipsOpen && (
        <EmailPayslipsModal
          isOpen={isEmailPayslipsOpen}
          onClose={() => {
            setIsEmailPayslipsOpen(false);
            setEmailModalContext(null);
          }}
          items={payrollItems}
          employees={employees}
          company={company}
          monthLabel={monthLabel}
          selectedMonth={selectedMonth}
          year={selectedYear}
          emailSettings={emailSettings}
          payslipDesign={payslipDesign}
          emailedPayslips={emailedPayslips}
          onRecordEmailedPayslips={onRecordEmailedPayslips}
          onOpenSettings={handleOpenEmailSettingsFlow}
          onUpdateEmployeeEmail={onUpdateEmployeeEmail}
          isAdmin={isAdmin}
          currentUser={currentUser}
          activeSnapshot={activeSnapshot}
          isLocked={isLocked}
          initialContext={emailModalContext}
          snapshots={snapshots}
          payrollVariables={payrollVariables}
          payeTaxVariables={payeTaxVariables}
        />
      )}

      {/* Android Exit Confirmation Toast */}
      {showExitToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[999] px-4 py-2 bg-zinc-900/95 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs font-semibold rounded-full shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-none select-none">
          Press back again to exit
        </div>
      )}
    </AndroidDeviceFrame>
  );
};
