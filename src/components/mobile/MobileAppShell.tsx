import React, { useState, useRef, useLayoutEffect } from 'react';
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
  SalaryCalculationMode
} from '../../types';
import { MobileTopAppBar } from './MobileTopAppBar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMoreSheet } from './MobileMoreSheet';
import { AndroidDeviceFrame } from './AndroidDeviceFrame';
import { MobileDashboardView } from './views/MobileDashboardView';
import { MobilePayrollRunView } from './views/MobilePayrollRunView';
import { MobileStaffDirectoryView } from './views/MobileStaffDirectoryView';
import { MobileLoansDirectoryView } from './views/MobileLoansDirectoryView';
import { MobileAnalyticsView } from './views/MobileAnalyticsView';
import { MobileSettingsView } from './views/MobileSettingsView';
import { MobilePayslipDesignerView } from './views/MobilePayslipDesignerView';
import { MobilePayslipPrintView } from './views/MobilePayslipPrintView';
import { VariablesView } from '../variables/VariablesView';
import { ExcelHubView } from '../excel/ExcelHubView';
import { UserProfilePage } from '../profile/UserProfilePage';

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
  onPauseResumeLoan: (id: string) => void;
  onRecordManualPayment: (id: string, amt: number, notes?: string) => void;
  onUpdateCompany: (profile: Partial<CompanyProfile>) => void;
  onUpdatePayrollVariables: (v: Partial<PayrollVariables>) => void;
  onUpdatePayeTaxVariables: (v: Partial<PayeTaxVariables>) => void;
  onImportEmployees?: (items: Partial<Employee>[], mode: 'merge' | 'overwrite', scope?: 'all' | 'salary-only' | 'bank-only') => void;
  onResetAllData?: (options: any) => void;

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
  onPauseResumeLoan,
  onRecordManualPayment,
  onUpdateCompany,
  onUpdatePayrollVariables,
  onUpdatePayeTaxVariables,
  onImportEmployees,
  onResetAllData,
  isPhoneFramePreview,
  onTogglePhoneFrame,
}) => {
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [previousView, setPreviousView] = useState<AppView>('payroll');
  const mainScrollRef = useRef<HTMLElement>(null);

  // Automatically reset scroll position to top whenever activeView changes
  useLayoutEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [activeView]);

  // Handle navigation: switch page or smooth scroll to top if already on active tab
  const handleNavigate = (view: AppView) => {
    if (view === activeView) {
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      setPreviousView(activeView);
      onNavigate(view);
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
            year={selectedYear}
            onFinalizeAndLock={onFinalizeAndLock}
            onUnlock={onUnlock}
            company={company}
            payslipDesign={payslipDesign}
            departments={departments}
            onNavigate={handleNavigate}
            currentUser={currentUser}
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
            onPauseResumeLoan={onPauseResumeLoan}
            onRecordManualPayment={onRecordManualPayment}
            currentUser={currentUser}
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
          />
        ) : (activeView === 'settings' || activeView === 'variables' || activeView === 'excel') ? (
          <MobileSettingsView
            initialTab={
              activeView === 'variables' ? 'payroll' :
              activeView === 'excel' ? 'excel' :
              undefined
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
          />
        ) : activeView === 'profile' ? (
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
    </AndroidDeviceFrame>
  );
};
