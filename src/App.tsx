import React, { useState, useEffect } from 'react';
import { AlertTriangle, Save } from 'lucide-react';
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
import { AppView, CompanyAccount } from './types';

export const App: React.FC = () => {
  const {
    state,
    companies,
    activeCompanyId,
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
  } = usePayrollStore();

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

  const handleBackToPrevious = () => {
    if (previousActiveCompanyId) {
      const prevComp = companies.find(c => c.id === previousActiveCompanyId);
      const res = selectCompany(previousActiveCompanyId, prevComp?.password);
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

  const handleRequestNavigate = (targetView: AppView) => {
    if (targetView === state.activeView) return;

    const isSettingsActive = 
      state.activeView === 'settings' || 
      state.activeView === 'variables' || 
      state.activeView === 'excel';

    if (isSettingsActive && unsavedSettingsInfo?.isDirty) {
      setPendingNavView(targetView);
      setIsUnsavedLeaveModalOpen(true);
      return;
    }

    setActiveView(targetView);
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

  // If no company workspace is active, display the Windows OS-style Account Picker
  if (!activeCompanyId) {
    return (
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
        onSelectCompany={(companyId, passwordAttempt) => {
          const res = selectCompany(companyId, passwordAttempt);
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
      />
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
          onSelectCompany={(id) => {
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
            const res = selectCompany(id);
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
        />
      </ErrorBoundary>

      {/* Main Window Body (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Minimalist Sidebar Navigation */}
        <SidebarNav
          activeView={state.activeView}
          onViewChange={handleRequestNavigate}
          staffCount={activeEmployees.length}
          activeLoansCount={state.loans?.filter(l => l.status === 'Active').length || 0}
          isLocked={Boolean(activeSnapshot?.isLocked)}
          companyName={state.company.name}
          companyLogoUrl={state.company.logoUrl}
          onLockOrSwitchCompany={handleExplicitLockOrSwitch}
        />

        {/* Viewport Content Area wrapped with Error Boundary */}
        <ErrorBoundary onResetView={() => setActiveView('dashboard')}>
          <main 
            key={refreshTick} 
            className={`flex-1 ${
              state.activeView === 'analytics'
                ? 'flex flex-col overflow-hidden bg-[#fbfbfb] dark:bg-[#09090b]'
                : 'overflow-y-auto px-6 pb-6 pt-0 md:px-8 md:pb-8 md:pt-0 bg-[#fbfbfb] dark:bg-[#09090b]'
            }`}
          >
            {state.activeView === 'analytics' ? (
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
              />
            ) : (
              <div className="max-w-6xl mx-auto space-y-4">
                {state.activeView === 'loans' && (
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
                  />
                )}
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

                {state.activeView === 'employees' && (
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
                  />
                )}

                {state.activeView === 'payroll' && (
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
                  />
                )}

              {(state.activeView === 'settings' || state.activeView === 'variables' || state.activeView === 'excel') && (
                <SettingsView
                  initialTab={
                    state.activeView === 'variables' ? 'tax' :
                    state.activeView === 'excel' ? 'excel' :
                    'branding'
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
                  snapshotsCount={state.snapshots.length}
                  onImportEmployees={importEmployees}
                  onResetAllData={resetAllData}
                  onNavigate={handleRequestNavigate}
                  onRegisterDirtyState={setUnsavedSettingsInfo}
                />
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

    </div>
  );
};

export default App;
