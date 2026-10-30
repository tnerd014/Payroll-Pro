import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Lock, 
  KeyRound, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft,
  Eye, 
  EyeOff, 
  RefreshCw, 
  Database, 
  Copy, 
  Download, 
  Check,
  Server,
  Sun,
  Moon,
  Minus,
  Square,
  X,
  ShieldAlert,
  WifiOff,
  Smartphone
} from 'lucide-react';
import { 
  getSavedCloudConfig, 
  saveCloudConfig, 
  testSupabaseConnection, 
  fetchCompaniesFromSupabase,
  checkHasAdminUser,
  registerInitialAdmin,
  loginStaffMember,
  getStaffSecurityQuestion,
  resetPasswordWithSecurityAnswer,
  generateTemporaryRecoveryPassword,
  updateAuthenticatedPassword,
  getActiveTeamMember,
  setActiveTeamMember,
  joinPresenceChannel,
  leavePresenceChannel,
  SupabaseCloudConfig,
  isStandaloneOfflineMode,
  setStandaloneOfflineMode,
  LOCAL_STANDALONE_ADMIN
} from '../../services/supabaseClient';
import { loadCompaniesRegistry } from '../../store/usePayrollStore';
import { SUPABASE_SQL_SCHEMA } from '../../constants/supabaseSchema';
import { TeamMember, DEFAULT_SECURITY_QUESTIONS, CompanyAccount } from '../../types';
import { formatDate } from '../../engine/dateUtils';
import appLogo from '../../../assets/icon.png';
import { LegalModal } from '../legal/LegalModal';
import { verifyMfaToken } from '../../utils/security';

// =============================================================================
// DEVELOPER TOGGLE SWITCH: SHOW / HIDE SQL SETUP IN LOGIN & SERVER SCREENS
// Change to true if you want the "SQL Setup" drawer visible to users.
// Change to false to completely hide it so nobody can see the schema script.
// =============================================================================
export const SHOW_SQL_SETUP_ON_LOGIN = false;

interface CloudStaffGateProps {
  onAuthenticated: (member: TeamMember, companies: CompanyAccount[]) => void;
  isDarkTheme?: boolean;
  onToggleTheme?: () => void;
  isMobileView?: boolean;
  isSimulatorMode?: boolean;
  onToggleSimulator?: () => void;
}

export const CloudStaffGate: React.FC<CloudStaffGateProps> = ({ 
  onAuthenticated,
  isDarkTheme = false,
  onToggleTheme,
  isMobileView,
  isSimulatorMode,
  onToggleSimulator,
}) => {
  const [internalIsMobile, setInternalIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setInternalIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = isMobileView ?? internalIsMobile;
  const isElectron = typeof window !== 'undefined' && (Boolean((window as any).electronAPI) || /electron/i.test(navigator.userAgent));
  const [cloudConfig, setCloudConfig] = useState<SupabaseCloudConfig>(() => getSavedCloudConfig());
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(() => getActiveTeamMember());

  // Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Modes: 'staff_login' | 'connect_server' | 'initial_admin' | 'must_change_password' | 'two_factor'
  const [viewMode, setViewMode] = useState<
    'staff_login' | 'connect_server' | 'initial_admin' | 'must_change_password' | 'two_factor'
  >('staff_login');
  const [pending2FaMember, setPending2FaMember] = useState<TeamMember | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [isVerifying2Fa, setIsVerifying2Fa] = useState(false);

  // Legal Modal (Privacy Policy & Terms of Service)
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');

  const [isLoadingCheck, setIsLoadingCheck] = useState(true);

  // Server connect form state
  const [serverUrl, setServerUrl] = useState(cloudConfig.url || '');
  const [serverKey, setServerKey] = useState(cloudConfig.anonKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showSqlDrawer, setShowSqlDrawer] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Staff Sign-in Form
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('payroll_pro_remember_me');
      return stored !== 'false';
    } catch {
      return true;
    }
  });
  const [loginIdentifier, setLoginIdentifier] = useState(() => {
    try {
      return localStorage.getItem('payroll_pro_remembered_staff') || '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Initial Admin Setup Form
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminSecurityQuestion, setAdminSecurityQuestion] = useState(DEFAULT_SECURITY_QUESTIONS[0]);
  const [adminCustomQuestion, setAdminCustomQuestion] = useState('');
  const [adminSecurityAnswer, setAdminSecurityAnswer] = useState('');
  const [adminSetupError, setAdminSetupError] = useState<string | null>(null);
  const [isRegisteringAdmin, setIsRegisteringAdmin] = useState(false);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'enter_id' | 'answer_question' | 'temp_issued'>('enter_id');
  const [fetchedQuestion, setFetchedQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [recoveryTargetEmail, setRecoveryTargetEmail] = useState('');
  const [recoveryTempPassword, setRecoveryTempPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isProcessingRecovery, setIsProcessingRecovery] = useState(false);

  // Mandatory Password Change Form
  const [newPersonalPassword, setNewPersonalPassword] = useState('');
  const [confirmPersonalPassword, setConfirmPersonalPassword] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showNewPersonalPassword, setShowNewPersonalPassword] = useState(false);
  const [showConfirmPersonalPassword, setShowConfirmPersonalPassword] = useState(false);

  useEffect(() => {
    checkGatewayState();
  }, []);

  const checkGatewayState = async () => {
    setIsLoadingCheck(true);
    setConnectError(null);

    const cfg = getSavedCloudConfig();
    // If user previously selected standalone offline mode, bypass server connect gate
    if (isStandaloneOfflineMode() && !cfg.isEnabled) {
      const localAdmin = getActiveTeamMember() || LOCAL_STANDALONE_ADMIN;
      onAuthenticated(localAdmin, loadCompaniesRegistry());
      return;
    }

    if (!cfg.isEnabled || !cfg.url || !cfg.anonKey) {
      setViewMode('connect_server');
      setIsLoadingCheck(false);
      return;
    }

    try {
      const adminCheck = await checkHasAdminUser();
      if (!adminCheck.success) {
        // If server is unreachable (offline / no internet connection)
        // Check if an authorized member was already active on this terminal
        const cachedMember = getActiveTeamMember();
        if (cachedMember && !cachedMember.mustChangePassword) {
          onAuthenticated(cachedMember, []);
          return;
        }

        setViewMode('connect_server');
        setConnectError('Could not reach server. Please check your internet connection or continue offline.');
        setIsLoadingCheck(false);
        return;
      }

      if (!adminCheck.hasAdmin) {
        setViewMode('initial_admin');
        setIsLoadingCheck(false);
        return;
      }

      const member = getActiveTeamMember();
      if (member) {
        if (member.mustChangePassword) {
          setCurrentMember(member);
          setViewMode('must_change_password');
        } else {
          const compRes = await fetchCompaniesFromSupabase();
          onAuthenticated(member, compRes.companies || []);
          return;
        }
      } else {
        setViewMode('staff_login');
      }
    } catch (e: any) {
      setViewMode('connect_server');
      setConnectError(e?.message || 'Server check failed');
    } finally {
      setIsLoadingCheck(false);
    }
  };

  const handleConnectServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim() || !serverKey.trim()) {
      setConnectError('Please enter both Server URL and Key.');
      return;
    }

    setIsConnecting(true);
    setConnectError(null);

    try {
      const testRes = await testSupabaseConnection(serverUrl.trim(), serverKey.trim());
      if (!testRes.success) {
        setConnectError(testRes.message);
        setIsConnecting(false);
        return;
      }

      const newConfig: SupabaseCloudConfig = {
        url: serverUrl.trim(),
        anonKey: serverKey.trim(),
        isEnabled: true,
        lastConnectedAt: new Date().toISOString()
      };
      saveCloudConfig(newConfig);
      setCloudConfig(newConfig);

      const adminRes = await checkHasAdminUser();
      if (adminRes.hasAdmin) {
        setViewMode('staff_login');
      } else {
        setViewMode('initial_admin');
      }
    } catch (err: any) {
      setConnectError(err?.message || 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRegisterInitialAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword.length < 6) {
      setAdminSetupError('Password must be at least 6 characters');
      return;
    }
    const finalQuestion = adminSecurityQuestion === 'Write your own custom question...'
      ? adminCustomQuestion.trim()
      : adminSecurityQuestion.trim();

    if (!finalQuestion) {
      setAdminSetupError('Please enter your custom security question');
      return;
    }

    if (!adminSecurityAnswer.trim()) {
      setAdminSetupError('Please answer the security question');
      return;
    }

    setIsRegisteringAdmin(true);
    setAdminSetupError(null);

    const res = await registerInitialAdmin({
      name: adminName.trim(),
      email: adminEmail.trim(),
      username: adminUsername.trim() || adminEmail.split('@')[0].toLowerCase(),
      password: adminPassword,
      securityQuestion: finalQuestion,
      securityAnswer: adminSecurityAnswer.trim(),
      recoveryEmail: adminEmail.trim()
    });

    setIsRegisteringAdmin(false);

    if (res.success && res.member) {
      setCurrentMember(res.member);
      const compRes = await fetchCompaniesFromSupabase();
      onAuthenticated(res.member, compRes.companies || []);
    } else {
      setAdminSetupError(res.error || 'Failed to initialize administrator');
    }
  };

  const handleContinueOffline = () => {
    setStandaloneOfflineMode(true);
    setActiveTeamMember(LOCAL_STANDALONE_ADMIN);
    onAuthenticated(LOCAL_STANDALONE_ADMIN, loadCompaniesRegistry());
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setLoginError('Please enter email/username and password');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    const res = await loginStaffMember(loginIdentifier.trim(), loginPassword.trim());
    setIsLoggingIn(false);

    if (res.success && res.member) {
      try {
        if (rememberMe) {
          localStorage.setItem('payroll_pro_remember_me', 'true');
          localStorage.setItem('payroll_pro_remembered_staff', loginIdentifier.trim());
        } else {
          localStorage.setItem('payroll_pro_remember_me', 'false');
          localStorage.removeItem('payroll_pro_remembered_staff');
        }
      } catch (err) {
        console.warn('Failed to update remember me preference:', err);
      }

      setCurrentMember(res.member);
      if (res.mustChangePassword) {
        setViewMode('must_change_password');
      } else if (res.member.twoFactorEnabled && res.member.twoFactorSecret) {
        setPending2FaMember(res.member);
        setTwoFaCode('');
        setTwoFaError(null);
        setViewMode('two_factor');
      } else {
        const compRes = await fetchCompaniesFromSupabase();
        // Broadcast this session to the presence channel so admins can see who's online
        joinPresenceChannel({
          memberId: res.member.id,
          name: res.member.name,
          role: res.member.role,
          companyId: compRes.companies?.[0]?.id || '',
          companyName: compRes.companies?.[0]?.name || '',
          joinedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        });
        onAuthenticated(res.member, compRes.companies || []);
      }
    } else {
      setLoginError(res.error || 'Invalid credentials');
    }
  };

  const handleVerify2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending2FaMember) return;
    if (!twoFaCode.trim()) {
      setTwoFaError('Please enter the 6-digit code or backup code.');
      return;
    }

    setIsVerifying2Fa(true);
    setTwoFaError(null);

    const isValid = await verifyMfaToken(
      twoFaCode.trim(),
      pending2FaMember.twoFactorSecret || '',
      pending2FaMember.twoFactorBackupCodes || []
    );

    setIsVerifying2Fa(false);

    if (isValid) {
      const compRes = await fetchCompaniesFromSupabase();
      joinPresenceChannel({
        memberId: pending2FaMember.id,
        name: pending2FaMember.name,
        role: pending2FaMember.role,
        companyId: compRes.companies?.[0]?.id || '',
        companyName: compRes.companies?.[0]?.name || '',
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });
      onAuthenticated(pending2FaMember, compRes.companies || []);
    } else {
      setTwoFaError('Invalid verification code. Please check your authenticator app.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPersonalPassword.length < 6) {
      setPasswordChangeError('Password must be at least 6 characters');
      return;
    }
    if (newPersonalPassword !== confirmPersonalPassword) {
      setPasswordChangeError('Passwords do not match');
      return;
    }

    if (!currentMember) return;

    setIsUpdatingPassword(true);
    setPasswordChangeError(null);

    const res = await updateAuthenticatedPassword(currentMember.id, newPersonalPassword.trim());
    setIsUpdatingPassword(false);

    if (res.success) {
      const updatedMember = { ...currentMember, mustChangePassword: false };
      setCurrentMember(updatedMember);
      setActiveTeamMember(updatedMember);
      const compRes = await fetchCompaniesFromSupabase();
      onAuthenticated(updatedMember, compRes.companies || []);
    } else {
      setPasswordChangeError(res.error || 'Failed to update password');
    }
  };

  const handleCancelPasswordChange = () => {
    setNewPersonalPassword('');
    setConfirmPersonalPassword('');
    setPasswordChangeError(null);
    setShowNewPersonalPassword(false);
    setShowConfirmPersonalPassword(false);
    setCurrentMember(null);
    setViewMode('staff_login');
  };

  const handleOpenForgotModal = () => {
    setRecoveryIdentifier(loginIdentifier || '');
    setRecoveryStep('enter_id');
    setFetchedQuestion('');
    setRecoveryAnswer('');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
    setRecoveryError(null);
    setIsForgotModalOpen(true);
  };

  const handleLookupRecoveryAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryIdentifier.trim()) {
      setRecoveryError('Please enter your email or username');
      return;
    }

    setIsProcessingRecovery(true);
    setRecoveryError(null);

    const res = await getStaffSecurityQuestion(recoveryIdentifier.trim());
    setIsProcessingRecovery(false);

    if (res.success && res.securityQuestion) {
      setFetchedQuestion(res.securityQuestion);
      setRecoveryTargetEmail(res.recoveryEmail || '');
      setRecoveryStep('answer_question');
    } else if (res.success && !res.securityQuestion) {
      handleGenerateTempCode();
    } else {
      setRecoveryError(res.error || 'Account not found');
    }
  };

  const handleAnswerQuestionAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryAnswer.trim()) {
      setRecoveryError('Please enter your answer');
      return;
    }
    if (recoveryNewPassword.length < 6) {
      setRecoveryError('New password must be at least 6 characters');
      return;
    }
    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setRecoveryError('Passwords do not match');
      return;
    }

    setIsProcessingRecovery(true);
    setRecoveryError(null);

    const res = await resetPasswordWithSecurityAnswer(
      recoveryIdentifier.trim(),
      recoveryAnswer.trim(),
      recoveryNewPassword.trim()
    );
    setIsProcessingRecovery(false);

    if (res.success) {
      setIsForgotModalOpen(false);
      setLoginPassword(recoveryNewPassword);
    } else {
      setRecoveryError(res.error || 'Failed to reset password');
    }
  };

  const handleGenerateTempCode = async () => {
    setIsProcessingRecovery(true);
    setRecoveryError(null);

    const res = await generateTemporaryRecoveryPassword(recoveryIdentifier.trim());
    setIsProcessingRecovery(false);

    if (res.success && res.tempPassword) {
      setRecoveryTempPassword(res.tempPassword);
      setRecoveryTargetEmail(res.recoveryEmail || recoveryIdentifier);
      setRecoveryStep('temp_issued');
    } else {
      setRecoveryError(res.error || 'Failed to generate temporary code');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/sql;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'payroll_pro_server_setup.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  if (isLoadingCheck) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#fbfbfb] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">
        <RefreshCw className="w-5 h-5 text-zinc-400 animate-spin mb-2" />
        <span className="text-xs text-zinc-400 font-mono">Connecting to Team Server...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#fbfbfb] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
      
      {/* Header: Android Material 3 Mobile Bar OR Desktop Native Title Bar */}
      {isMobile ? (
        <header className="no-print bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-b border-zinc-200/90 dark:border-zinc-800/90 select-none shrink-0 z-40 shadow-xs">
          {/* Android Top App Bar */}
          <div className="h-12 px-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center p-1 border border-emerald-500/20">
                <img src={appLogo} alt="Payroll Pro" className="w-full h-full object-contain shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
                    Payroll Pro
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 px-1.5 py-0.2 rounded-full">
                    Staff Portal
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium">Team Authentication</p>
              </div>
            </div>

            <div className="flex items-center gap-1">

              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </header>
      ) : (
        /* Native Desktop Title Bar */
        <header
          className="no-print h-9 bg-white dark:bg-[#09090b] border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between px-3 text-xs select-none shrink-0"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          {/* Left: App Logo & Title */}
          <div className="flex items-center gap-2">
            <img src={appLogo} alt="Payroll Pro" className="w-4 h-4 rounded object-contain shrink-0" />
            <span className="font-semibold text-xs tracking-tight text-zinc-800 dark:text-zinc-200">
              Payroll Pro
            </span>
            <span className="text-[10px] text-zinc-400 font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
              Staff Portal
            </span>
          </div>

          {/* Center: Quiet Clock */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-normal text-zinc-400 pointer-events-none">
            <span className="font-mono text-zinc-600 dark:text-zinc-400">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
            <span className="text-zinc-400 text-[11px]">
              {currentTime.toLocaleDateString('en-GB', { weekday: 'short' })} &bull; {formatDate(currentTime)}
            </span>
          </div>

          {/* Right: Simulator toggle, Theme Toggle & Native Window Controls */}
          <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
            {onToggleSimulator && !isElectron && (
              <button
                type="button"
                onClick={onToggleSimulator}
                title={isSimulatorMode ? "Exit Android Phone Frame" : "Preview in Android Phone Frame"}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                <span className="hidden md:inline">Android View</span>
              </button>
            )}

            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                {isDarkTheme ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            )}

            {isElectron && (
              <div className="flex items-center ml-1 border-l border-zinc-200 dark:border-zinc-800 pl-1">
                <button 
                  onClick={() => (window as any).electronAPI?.windowMinimize?.()}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                  title="Minimize"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => (window as any).electronAPI?.windowMaximize?.()}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
                  title="Maximize"
                >
                  <Square className="w-2.5 h-2.5" />
                </button>
                <button 
                  onClick={() => (window as any).electronAPI?.windowClose?.()}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-rose-500 hover:text-white text-zinc-400 transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Centered Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-xs flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">

          {/* Consistent Avatar Badge */}
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shadow-xs p-2">
              <img src={appLogo} alt="Payroll Pro" className="w-full h-full object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shadow-xs">
              {viewMode === 'connect_server' ? (
                <Server className="w-2.5 h-2.5 text-blue-500" />
              ) : viewMode === 'initial_admin' ? (
                <ShieldAlert className="w-2.5 h-2.5 text-emerald-500" />
              ) : (
                <Lock className="w-2.5 h-2.5 text-zinc-500" />
              )}
            </div>
          </div>

          {/* ================= 1. STAFF SIGN IN VIEW ================= */}
          {viewMode === 'staff_login' && (
            <>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-center tracking-tight mb-0.5">
                Staff Sign In
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mb-5">
                Enter your work credentials to open payroll workspaces
              </p>

              <form onSubmit={handleStaffLogin} className="w-full space-y-2.5">
                <div>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Work email or username"
                    value={loginIdentifier}
                    onChange={(e) => {
                      setLoginIdentifier(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                  />
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 pr-10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                  >
                    {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-0 cursor-pointer accent-zinc-900 dark:accent-zinc-100"
                    />
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition">
                      Remember me
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleOpenForgotModal}
                    className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                {loginError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-md animate-in fade-in">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-lg text-xs transition shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setViewMode('connect_server')}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer"
                  >
                    Change Server
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueOffline}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer flex items-center gap-1"
                  >
                    <WifiOff className="w-3 h-3 text-zinc-400" />
                    <span>Work Offline</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ================= 2. CONNECT SERVER VIEW ================= */}
          {viewMode === 'connect_server' && (
            <>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-center tracking-tight mb-0.5">
                Connect Team Server
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mb-5">
                Enter your shared cloud database endpoint
              </p>

              <form onSubmit={handleConnectServer} className="w-full space-y-2.5">
                <div>
                  <input
                    type="url"
                    required
                    placeholder="Server URL (https://...)"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs font-mono text-[11px]"
                  />
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showKey ? 'text' : 'password'}
                    required
                    placeholder="Access Key"
                    value={serverKey}
                    onChange={(e) => setServerKey(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 pr-10 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {connectError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-md animate-in fade-in">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{connectError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isConnecting}
                  className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-lg text-xs transition shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Connect Server</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-semibold">
                    <span className="bg-white dark:bg-[#121215] px-2 text-zinc-400">or work offline</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleContinueOffline}
                  className="w-full h-9 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-medium rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-zinc-200/80 dark:border-zinc-700/60 shadow-2xs"
                >
                  <WifiOff className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Continue in Offline / Standalone Mode</span>
                </button>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center">
                  Store company records privately on this device. No server required.
                </p>

                <div className="pt-2 flex items-center justify-between text-[11px]">
                  {cloudConfig.url && (
                    <button
                      type="button"
                      onClick={() => setViewMode('staff_login')}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Back to Sign In</span>
                    </button>
                  )}
                  {SHOW_SQL_SETUP_ON_LOGIN && (
                    <button
                      type="button"
                      onClick={() => setShowSqlDrawer(!showSqlDrawer)}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 ml-auto flex items-center gap-1"
                    >
                      <Database className="w-3 h-3" />
                      <span>SQL Setup</span>
                    </button>
                  )}
                </div>

                {SHOW_SQL_SETUP_ON_LOGIN && showSqlDrawer && (
                  <div className="mt-2 p-3 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2 text-[11px] text-zinc-500">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">Schema Script</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleCopySql}
                          className="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] text-zinc-700 dark:text-zinc-300 flex items-center gap-1"
                        >
                          {copiedSql ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSql ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadSql}
                          className="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] text-zinc-700 dark:text-zinc-300 flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>.sql</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-normal">
                      Run this script in your database SQL Editor to generate all tables and triggers.
                    </p>
                  </div>
                )}
              </form>
            </>
          )}

          {/* ================= 3. INITIAL ADMIN VIEW ================= */}
          {viewMode === 'initial_admin' && (
            <>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-center tracking-tight mb-0.5">
                Set Up Primary Admin
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mb-5">
                No admin found on database. Create the master account.
              </p>

              <form onSubmit={handleRegisterInitialAdmin} className="w-full space-y-2.5">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Work Email"
                    value={adminEmail}
                    onChange={(e) => {
                      setAdminEmail(e.target.value);
                      if (!adminUsername) setAdminUsername(e.target.value.split('@')[0].toLowerCase());
                    }}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Confirm"
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                  />
                </div>

                <div className="pt-1 space-y-1.5">
                  <select
                    value={adminSecurityQuestion}
                    onChange={(e) => setAdminSecurityQuestion(e.target.value)}
                    className="w-full h-8 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 rounded-lg px-2 text-[11px] text-zinc-700 dark:text-zinc-300 focus:outline-none"
                  >
                    {DEFAULT_SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>

                  {adminSecurityQuestion === 'Write your own custom question...' && (
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Type your custom security question..."
                      value={adminCustomQuestion}
                      onChange={(e) => setAdminCustomQuestion(e.target.value)}
                      className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs animate-in fade-in"
                    />
                  )}
                  <input
                    type="text"
                    required
                    placeholder="Security Answer (for password reset)"
                    value={adminSecurityAnswer}
                    onChange={(e) => setAdminSecurityAnswer(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                  />
                </div>

                {adminSetupError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-md animate-in fade-in">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{adminSetupError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRegisteringAdmin}
                  className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-lg text-xs transition shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isRegisteringAdmin ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Create Admin &amp; Enter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ================= 4. MUST CHANGE PASSWORD VIEW ================= */}
          {viewMode === 'must_change_password' && (
            <>
              {/* Back navigation at top */}
              <div className="w-full flex items-center justify-start mb-2">
                <button
                  type="button"
                  onClick={handleCancelPasswordChange}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xs flex items-center gap-1 transition cursor-pointer p-1 -ml-1 rounded"
                  title="Back to Sign In"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              </div>

              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-center tracking-tight mb-0.5">
                Set Personal Password
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mb-5">
                Signed in with temporary code. Create permanent password.
              </p>

              <form onSubmit={handleUpdatePassword} className="w-full space-y-2.5">
                <div className="relative flex items-center">
                  <input
                    type={showNewPersonalPassword ? 'text' : 'password'}
                    required
                    placeholder="New password (min 6 chars)"
                    value={newPersonalPassword}
                    onChange={(e) => setNewPersonalPassword(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg pl-3 pr-9 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPersonalPassword(v => !v)}
                    className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
                    title={showNewPersonalPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPersonalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showConfirmPersonalPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat new password"
                    value={confirmPersonalPassword}
                    onChange={(e) => setConfirmPersonalPassword(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg pl-3 pr-9 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPersonalPassword(v => !v)}
                    className="absolute right-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer"
                    title={showConfirmPersonalPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPersonalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {passwordChangeError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-md animate-in fade-in">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{passwordChangeError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-lg text-xs transition shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isUpdatingPassword ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Save Password &amp; Enter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* Back to sign in link */}
                <div className="flex items-center justify-center pt-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleCancelPasswordChange}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ================= 5. TWO-FACTOR AUTHENTICATION (2FA) VIEW ================= */}
          {viewMode === 'two_factor' && pending2FaMember && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto mb-2 border border-teal-200/60 dark:border-teal-800/60">
                  <Lock className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Two-Factor Verification
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Enter the 6-digit authenticator code for <strong className="text-zinc-700 dark:text-zinc-300 font-medium">{pending2FaMember.name}</strong>
                </p>
              </div>

              {twoFaError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{twoFaError}</span>
                </div>
              )}

              <form onSubmit={handleVerify2Fa} className="space-y-3">
                <div>
                  <input
                    type="text"
                    autoFocus
                    maxLength={10}
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value)}
                    placeholder="000 000"
                    className="w-full h-10 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-500 rounded-lg text-center text-base font-mono tracking-widest text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isVerifying2Fa || !twoFaCode.trim()}
                  className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white font-medium rounded-lg text-xs transition shadow-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isVerifying2Fa ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Verify &amp; Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setPending2FaMember(null);
                      setViewMode('staff_login');
                    }}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Simple Privacy Policy and Terms of Service Notice */}
          {(viewMode === 'staff_login' || viewMode === 'connect_server') && (
            <div className="mt-6 pt-3 text-center select-none w-full">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Before using this app, you can review Payroll Pro&apos;s{' '}
                <button
                  type="button"
                  onClick={() => { setLegalModalTab('privacy'); setLegalModalOpen(true); }}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer inline transition-colors"
                >
                  Privacy Policy
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => { setLegalModalTab('terms'); setLegalModalOpen(true); }}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer inline transition-colors"
                >
                  Terms of Service
                </button>
                .
              </p>
            </div>
          )}

        </div>
      </main>

      {/* ================= FORGOT PASSWORD MODAL ================= */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full shadow-xl space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Password Recovery
              </span>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {recoveryError && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-md">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoveryStep === 'enter_id' && (
              <form onSubmit={handleLookupRecoveryAccount} className="space-y-3">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Enter your work email or username to retrieve your security question:
                </p>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="name@company.com or username"
                  value={recoveryIdentifier}
                  onChange={(e) => setRecoveryIdentifier(e.target.value)}
                  className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                />

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={handleGenerateTempCode}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Request temporary code
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingRecovery}
                    className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium rounded-lg"
                  >
                    Next
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 'answer_question' && (
              <form onSubmit={handleAnswerQuestionAndReset} className="space-y-3">
                <div className="p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded border border-zinc-200 dark:border-zinc-700/80 text-[11px]">
                  <span className="text-zinc-400 block text-[10px]">Security Question:</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{fetchedQuestion}</span>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Security answer"
                  value={recoveryAnswer}
                  onChange={(e) => setRecoveryAnswer(e.target.value)}
                  className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="password"
                    required
                    placeholder="New password"
                    value={recoveryNewPassword}
                    onChange={(e) => setRecoveryNewPassword(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Confirm"
                    value={recoveryConfirmPassword}
                    onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                    className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700/80 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={handleGenerateTempCode}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Forgot answer? Use temp code
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingRecovery}
                    className="px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium rounded-lg"
                  >
                    Reset &amp; Sign In
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 'temp_issued' && (
              <div className="space-y-3">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Temporary password issued for account associated with <strong>{recoveryTargetEmail}</strong>:
                </p>

                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-between font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  <span>{recoveryTempPassword}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(recoveryTempPassword)}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLoginPassword(recoveryTempPassword);
                    setIsForgotModalOpen(false);
                  }}
                  className="w-full h-8 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium rounded-lg text-xs"
                >
                  Use Code To Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Legal & Privacy / Terms Modal */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalModalTab}
      />

    </div>
  );
};
