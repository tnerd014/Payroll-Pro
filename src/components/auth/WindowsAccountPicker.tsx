import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Lock, 
  Unlock, 
  Plus, 
  ArrowRight, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  KeyRound, 
  Upload, 
  Image as ImageIcon, 
  Sun, 
  Moon, 
  Minus, 
  Square, 
  X,
  AlertTriangle,
  HelpCircle,
  Search,
  Check,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Cloud,
  User,
  UserCircle,
  Users,
  LogOut,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { CompanyAccount, DEFAULT_SECURITY_QUESTIONS, TeamMember } from '../../types';
import { formatDate } from '../../engine/dateUtils';
import appLogo from '../../../assets/icon.png';
import { GlobalCloudModal } from './GlobalCloudModal';
import { TeamMembersPage } from '../team/TeamMembersPage';
import { UserProfilePage } from '../profile/UserProfilePage';
import { getSavedCloudConfig, SupabaseCloudConfig } from '../../services/supabaseClient';
import { LegalModal } from '../legal/LegalModal';

interface WindowsAccountPickerProps {
  companies: CompanyAccount[];
  initialCompanyId?: string | null;
  onClearInitialCompany?: () => void;
  canGoBack?: boolean;
  onBackToPrevious?: () => void;
  onSelectCompany: (companyId: string, passwordAttempt?: string) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
  onCreateCompany: (account: Omit<CompanyAccount, 'id'>, template?: 'default' | 'blank') => { success: boolean; companyId?: string; error?: string };
  onUpdateCompany: (companyId: string, updates: Partial<CompanyAccount>) => void;
  onDeleteCompany: (companyId: string) => { success: boolean; error?: string };
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onCompaniesSynced?: (companies: CompanyAccount[]) => void;
  currentUser?: TeamMember | null;
  onUpdateCurrentUser?: (member: TeamMember) => void;
  onSignOut?: () => void;
  onDisconnectServer?: () => void;
  isMobileView?: boolean;
  isSimulatorMode?: boolean;
  onToggleSimulator?: () => void;
}

export const WindowsAccountPicker: React.FC<WindowsAccountPickerProps> = ({
  companies,
  initialCompanyId,
  onClearInitialCompany,
  canGoBack = false,
  onBackToPrevious,
  onSelectCompany,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany,
  isDarkTheme,
  onToggleTheme,
  onCompaniesSynced,
  currentUser,
  onUpdateCurrentUser,
  onSignOut,
  onDisconnectServer,
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
  const isAdmin = currentUser?.role === 'Admin';
  const isAuditor = currentUser?.role === 'Auditor';
  // Only Admin can create/add companies; Payroll Officers and Auditors cannot
  const canAddCompany = !currentUser || isAdmin;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isTeamPageOpen, setIsTeamPageOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'privacy' | 'terms'>('privacy');
  const [cloudConfig, setCloudConfig] = useState<SupabaseCloudConfig>(() => getSavedCloudConfig());
  // Local mode = no cloud server configured/connected; hide cloud-specific UI
  const isLocalMode = !cloudConfig.isEnabled;
  // The local default system account has id 'local_offline_operator'
  const isLocalDefaultAdmin = currentUser?.id === 'local_offline_operator';
  const isLocalUser = isLocalMode || isLocalDefaultAdmin;

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const handleCompaniesSynced = (updated: CompanyAccount[]) => {
    setCloudConfig(getSavedCloudConfig());
    if (onCompaniesSynced) {
      onCompaniesSynced(updated);
    }
  };

  // Live Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Focused company for password prompt
  const [selectedForPassword, setSelectedForPassword] = useState<CompanyAccount | null>(() => {
    if (initialCompanyId) {
      return companies.find(c => c.id === initialCompanyId) || null;
    }
    return null;
  });
  const [openingCompanyId, setOpeningCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (initialCompanyId) {
      const target = companies.find(c => c.id === initialCompanyId);
      if (target) {
        setSelectedForPassword(target);
      }
    }
  }, [initialCompanyId, companies]);

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyAccount | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<CompanyAccount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Form State for Create / Edit
  const [formName, setFormName] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formHasPassword, setFormHasPassword] = useState(false);
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [formPasswordHint, setFormPasswordHint] = useState('');
  const [formSecurityQuestion, setFormSecurityQuestion] = useState(DEFAULT_SECURITY_QUESTIONS[0]);
  const [formCustomSecurityQuestion, setFormCustomSecurityQuestion] = useState('');
  const [formSecurityAnswer, setFormSecurityAnswer] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Password Recovery State
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'answer' | 'reset'>('answer');
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [newPasswordHintInput, setNewPasswordHintInput] = useState('');
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string | null>(null);

  // Dedicated Password / PIN Modal State
  const [passwordModalCompany, setPasswordModalCompany] = useState<CompanyAccount | null>(null);
  const [pwdModalHasPassword, setPwdModalHasPassword] = useState(true);
  const [pwdModalCurrentPassword, setPwdModalCurrentPassword] = useState('');
  const [pwdModalNewPassword, setPwdModalNewPassword] = useState('');
  const [pwdModalConfirmPassword, setPwdModalConfirmPassword] = useState('');
  const [pwdModalHint, setPwdModalHint] = useState('');
  const [pwdModalSecurityQuestion, setPwdModalSecurityQuestion] = useState(DEFAULT_SECURITY_QUESTIONS[0]);
  const [pwdModalCustomQuestion, setPwdModalCustomQuestion] = useState('');
  const [pwdModalSecurityAnswer, setPwdModalSecurityAnswer] = useState('');
  const [pwdModalError, setPwdModalError] = useState<string | null>(null);
  const [showModalNewPwd, setShowModalNewPwd] = useState(false);
  const [showModalCurrentPwd, setShowModalCurrentPwd] = useState(false);
  const [showModalSecurityAnswer, setShowModalSecurityAnswer] = useState(false);
  const [showFormSecurityAnswer, setShowFormSecurityAnswer] = useState(false);

  const passwordFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedForPassword && passwordFieldRef.current && !isRecoveringPassword) {
      passwordFieldRef.current.focus();
    }
  }, [selectedForPassword, isRecoveringPassword]);

  // Click on a company card
  const handleCompanyClick = async (comp: CompanyAccount) => {
    setAuthError(null);
    setPasswordInput('');
    setShowPassword(false);
    setShowHint(false);
    setIsRecoveringPassword(false);
    setRecoveryStep('answer');
    setRecoveryAnswerInput('');
    setRecoveryError(null);
    setRecoverySuccessMessage(null);
    setNewPasswordInput('');
    setConfirmNewPasswordInput('');
    setNewPasswordHintInput('');

    if (comp.hasPassword && comp.password) {
      setSelectedForPassword(comp);
    } else {
      setOpeningCompanyId(comp.id);
      try {
        const res = await onSelectCompany(comp.id);
        if (!res.success && res.error) {
          setAuthError(res.error);
        }
      } finally {
        setOpeningCompanyId(null);
      }
    }
  };

  // Submit Password
  const handlePasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedForPassword || openingCompanyId) return;

    setOpeningCompanyId(selectedForPassword.id);
    try {
      const res = await onSelectCompany(selectedForPassword.id, passwordInput);
      if (!res.success) {
        setAuthError(res.error || 'Incorrect password.');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setPasswordInput('');
        passwordFieldRef.current?.focus();
      }
    } finally {
      setOpeningCompanyId(null);
    }
  };

  // Verify Security Question Answer for Recovery
  const handleVerifyRecoveryAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (!selectedForPassword) return;

    const storedAnswer = (selectedForPassword.securityAnswer || '').trim().toLowerCase();
    const inputAnswer = recoveryAnswerInput.trim().toLowerCase();

    if (storedAnswer) {
      if (inputAnswer !== storedAnswer) {
        setRecoveryError('Incorrect answer. Please verify and try again.');
        return;
      }
    } else {
      // Fallback for legacy accounts without a configured security answer
      const storedHint = (selectedForPassword.passwordHint || '').trim().toLowerCase();
      const storedPass = (selectedForPassword.password || '').trim().toLowerCase();
      if (storedHint && inputAnswer === storedHint) {
        // match
      } else if (storedPass && inputAnswer === storedPass) {
        // match
      } else if (!inputAnswer && !storedAnswer && !storedPass) {
        // allow proceed if no security was ever stored
      } else {
        setRecoveryError('Incorrect answer. Please check your answer or password hint.');
        return;
      }
    }

    setRecoveryStep('reset');
    setRecoveryError(null);
  };

  // Complete Password Reset
  const handleCompletePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (!selectedForPassword) return;

    if (!newPasswordInput) {
      setRecoveryError('Please enter a new password.');
      return;
    }

    if (newPasswordInput !== confirmNewPasswordInput) {
      setRecoveryError('Passwords do not match.');
      return;
    }

    const updatedHint = newPasswordHintInput.trim() || selectedForPassword.passwordHint || '';

    onUpdateCompany(selectedForPassword.id, {
      hasPassword: true,
      password: newPasswordInput,
      passwordHint: updatedHint,
    });

    setRecoverySuccessMessage('Password updated successfully! Unlocking workspace...');

    setTimeout(async () => {
      setOpeningCompanyId(selectedForPassword.id);
      try {
        await onSelectCompany(selectedForPassword.id, newPasswordInput);
      } finally {
        setOpeningCompanyId(null);
      }
    }, 700);
  };

  // Open Create Modal — Admin only
  const openCreateModal = () => {
    if (!canAddCompany) return;
    setFormName('');
    setFormSubtitle('');
    setFormAddress('');
    setFormPhone('');
    setFormEmail('');
    setFormLogoUrl('');
    setFormHasPassword(false);
    setFormPassword('');
    setFormConfirmPassword('');
    setFormPasswordHint('');
    setFormSecurityQuestion(DEFAULT_SECURITY_QUESTIONS[0]);
    setFormCustomSecurityQuestion('');
    setFormSecurityAnswer('');
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Profile Modal (Strictly company profile details)
  const openEditModal = (comp: CompanyAccount) => {
    if (isAuditor) return;
    setEditingCompany(comp);
    setFormName(comp.name);
    setFormSubtitle(comp.subtitle || '');
    setFormAddress(comp.address || '');
    setFormPhone(comp.phone || '');
    setFormEmail(comp.email || '');
    setFormLogoUrl(comp.logoUrl || '');
    setFormError(null);
    setActionMenuOpenId(null);
  };

  // Open Dedicated Password / PIN Modal (Strictly security & recovery, no company profile inputs)
  const openPasswordModal = (comp: CompanyAccount) => {
    if (!isAdmin) return;
    setPasswordModalCompany(comp);
    setPwdModalHasPassword(Boolean(comp.hasPassword));
    setPwdModalCurrentPassword('');
    setPwdModalNewPassword('');
    setPwdModalConfirmPassword('');
    setPwdModalHint(comp.passwordHint || '');

    const existingQ = comp.securityQuestion || '';
    if (existingQ && !DEFAULT_SECURITY_QUESTIONS.slice(0, -1).includes(existingQ)) {
      setPwdModalSecurityQuestion('Write your own custom question...');
      setPwdModalCustomQuestion(existingQ);
    } else {
      setPwdModalSecurityQuestion(existingQ || DEFAULT_SECURITY_QUESTIONS[0]);
      setPwdModalCustomQuestion('');
    }
    // SECURITY: Never pre-populate the stored answer into the UI
    setPwdModalSecurityAnswer('');
    setPwdModalError(null);
    setShowModalNewPwd(false);
    setShowModalCurrentPwd(false);
    setShowModalSecurityAnswer(false);
    setActionMenuOpenId(null);
  };

  // Save changes from dedicated Password Modal
  const handleSavePasswordOnly = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdModalError(null);

    if (!passwordModalCompany) return;

    // Turning off password protection
    if (!pwdModalHasPassword) {
      if (passwordModalCompany.hasPassword && passwordModalCompany.password) {
        if (!pwdModalCurrentPassword) {
          setPwdModalError('Please enter your current password to disable protection.');
          return;
        }
        if (pwdModalCurrentPassword !== passwordModalCompany.password) {
          setPwdModalError('Current password is incorrect.');
          return;
        }
      }
      onUpdateCompany(passwordModalCompany.id, {
        hasPassword: false,
        password: '',
        passwordHint: '',
        securityQuestion: '',
        securityAnswer: '',
      });
      setPasswordModalCompany(null);
      return;
    }

    // Changing existing password requires verifying current password
    if (passwordModalCompany.hasPassword && passwordModalCompany.password) {
      if (!pwdModalCurrentPassword) {
        setPwdModalError('Please enter your current password.');
        return;
      }
      if (pwdModalCurrentPassword !== passwordModalCompany.password) {
        setPwdModalError('Current password is incorrect.');
        return;
      }
    }

    if (!pwdModalNewPassword) {
      setPwdModalError('Please enter a new password.');
      return;
    }

    if (pwdModalNewPassword !== pwdModalConfirmPassword) {
      setPwdModalError('Passwords do not match.');
      return;
    }

    const finalQuestion = pwdModalSecurityQuestion === 'Write your own custom question...'
      ? pwdModalCustomQuestion.trim()
      : pwdModalSecurityQuestion;

    if (pwdModalSecurityQuestion === 'Write your own custom question...' && !pwdModalCustomQuestion.trim()) {
      setPwdModalError('Please type your custom security question.');
      return;
    }

    // Determine security answer:
    // If the user typed an answer, use it.
    // If left blank, retain the existing stored answer (only if question didn't change).
    const questionChanged = finalQuestion !== (passwordModalCompany.securityQuestion || '');
    let finalAnswer = pwdModalSecurityAnswer.trim();

    if (!finalAnswer) {
      if (passwordModalCompany.securityAnswer && !questionChanged) {
        finalAnswer = passwordModalCompany.securityAnswer;
      } else {
        setPwdModalError(
          questionChanged
            ? 'The security question changed. Please enter a new security answer.'
            : 'Please provide a security answer for password recovery.'
        );
        return;
      }
    }

    onUpdateCompany(passwordModalCompany.id, {
      hasPassword: true,
      password: pwdModalNewPassword,
      passwordHint: pwdModalHint.trim(),
      securityQuestion: finalQuestion,
      securityAnswer: finalAnswer,
    });

    setPasswordModalCompany(null);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Company name is required.');
      return;
    }

    if (editingCompany) {
      onUpdateCompany(editingCompany.id, {
        name: formName.trim(),
        subtitle: formSubtitle.trim(),
        address: formAddress.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        logoUrl: formLogoUrl,
      });
      setEditingCompany(null);
    } else {
      const finalSecurityQuestion = formSecurityQuestion === 'Write your own custom question...'
        ? formCustomSecurityQuestion.trim()
        : formSecurityQuestion;

      if (formHasPassword) {
        if (!formPassword) {
          setFormError('Please enter a password or disable password protection.');
          return;
        }
        if (formPassword !== formConfirmPassword) {
          setFormError('Passwords do not match.');
          return;
        }
        if (!formSecurityAnswer.trim()) {
          setFormError('Please provide a security answer for password recovery.');
          return;
        }
        if (formSecurityQuestion === 'Write your own custom question...' && !formCustomSecurityQuestion.trim()) {
          setFormError('Please type your custom security question.');
          return;
        }
      }
      const result = onCreateCompany({
        name: formName.trim(),
        subtitle: formSubtitle.trim(),
        address: formAddress.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        logoUrl: formLogoUrl,
        hasPassword: formHasPassword,
        password: formHasPassword ? formPassword : '',
        passwordHint: formHasPassword ? formPasswordHint : '',
        securityQuestion: formHasPassword ? finalSecurityQuestion : '',
        securityAnswer: formHasPassword ? formSecurityAnswer.trim() : '',
      });

      if (!result.success) {
        setFormError(result.error || 'Failed to create company.');
        return;
      }
      setIsCreateModalOpen(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper for company initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'CP';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Search filter
  const filteredCompanies = companies.filter(comp => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      comp.name.toLowerCase().includes(query) ||
      (comp.subtitle && comp.subtitle.toLowerCase().includes(query)) ||
      (comp.address && comp.address.toLowerCase().includes(query))
    );
  });

  return (
    <div className={`relative w-full h-full overflow-hidden select-none flex flex-col bg-[#fbfbfb] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans ${isDarkTheme ? 'dark' : ''}`}>
      
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
                <span className="font-bold text-xs tracking-tight text-zinc-900 dark:text-zinc-100 block">
                  Payroll Pro
                </span>
                <p className="text-[10px] text-zinc-400 font-medium">Select Company</p>
              </div>
            </div>

            <div className="flex items-center gap-1">

              <button
                type="button"
                onClick={() => setIsCloudModalOpen(true)}
                title={cloudConfig.isEnabled ? 'Connected to Team Server' : 'Connect to Team Server'}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                  cloudConfig.isEnabled
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Cloud className="w-4 h-4" />
              </button>

              {currentUser && (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    title={`${currentUser.name} (${currentUser.role})`}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                          {currentUser.name || currentUser.username || currentUser.email}
                        </div>
                      </div>
                      {!isLocalUser && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsProfileOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 flex items-center gap-2 cursor-pointer font-medium"
                        >
                          <UserCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Profile</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut?.();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onToggleTheme}
                title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>
      ) : (
        /* Top Windows Native-Style Bar for Desktop */
        <header 
          className="no-print h-9 bg-white dark:bg-[#09090b] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 select-none relative z-50 shrink-0 transition-colors"
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          {/* Left: App Title */}
          <div className="flex items-center gap-2">
            <img src={appLogo} alt="Payroll Pro" className="w-4 h-4 rounded object-contain shrink-0" />
            <span className="font-semibold text-xs tracking-tight text-zinc-800 dark:text-zinc-200">Payroll Pro</span>
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

          {/* Right: Simulator toggle, Cloud Gateway, Theme Toggle & Native Window Controls */}
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

            {/* Cloud Setup — only show when cloud is active (already connected) */}
            {!isLocalMode && (
              <button
                onClick={() => setIsCloudModalOpen(true)}
                title={'Connected to Team Cloud Database'}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Cloud Live</span>
              </button>
            )}

            {currentUser && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  title={`${currentUser.name} (${currentUser.role})`}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                        {currentUser.name || currentUser.username || currentUser.email}
                      </div>
                    </div>
                    {!isLocalUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsProfileOpen(true);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <UserCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Profile</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSignOut?.();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onToggleTheme}
              title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              {isDarkTheme ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

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

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden max-w-7xl mx-auto w-full px-3 sm:px-6">

        {/* VIEW 1: FOCUSED PASSWORD SIGN-IN & RECOVERY */}
        {selectedForPassword ? (
          <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto p-4 md:p-6">
            <div className="w-full max-w-xs flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
              
              {/* Back button */}
              <div className="self-start flex items-center justify-between w-full mb-6">
                <button
                  onClick={() => {
                    if (isRecoveringPassword) {
                      setIsRecoveringPassword(false);
                      setRecoveryError(null);
                    } else if (canGoBack && onBackToPrevious) {
                      onBackToPrevious();
                    } else {
                      setSelectedForPassword(null);
                      setAuthError(null);
                      onClearInitialCompany?.();
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  title={canGoBack ? 'Back to previous page' : 'Back to all accounts'}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>
                    {isRecoveringPassword 
                      ? 'Back to PIN' 
                      : (canGoBack ? 'Back' : 'All Companies')}
                  </span>
                </button>

                {canGoBack && !isRecoveringPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedForPassword(null);
                      setAuthError(null);
                      onClearInitialCompany?.();
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer"
                  >
                    All Companies
                  </button>
                )}
              </div>

              {/* Company Avatar */}
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shadow-xs">
                  {selectedForPassword.logoUrl ? (
                    <img 
                      src={selectedForPassword.logoUrl} 
                      alt={selectedForPassword.name} 
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 font-bold text-lg">
                      {getInitials(selectedForPassword.name)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shadow-xs">
                  {isRecoveringPassword ? <ShieldAlert className="w-2.5 h-2.5 text-blue-500" /> : <Lock className="w-2.5 h-2.5" />}
                </div>
              </div>

              {/* Company Name */}
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-center tracking-tight mb-0.5 max-w-xs truncate">
                {isRecoveringPassword ? 'Password Recovery' : selectedForPassword.name}
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mb-5 max-w-xs truncate">
                {isRecoveringPassword
                  ? `Recover access to ${selectedForPassword.name}`
                  : (selectedForPassword.subtitle || 'Workspace is password protected')}
              </p>

              {/* NORMAL PASSWORD ENTRY */}
              {!isRecoveringPassword ? (
                <form onSubmit={handlePasswordSubmit} className="w-full space-y-2.5">
                  <div className={`relative flex items-center ${isShaking ? 'animate-shake' : ''}`}>
                    <input
                      ref={passwordFieldRef}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (authError) setAuthError(null);
                      }}
                      className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 pr-16 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                    />

                    <div className="absolute right-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded transition cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="submit"
                        disabled={Boolean(openingCompanyId)}
                        className="p-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded transition shadow-xs cursor-pointer active:scale-95"
                        title="Enter"
                      >
                        {openingCompanyId === selectedForPassword.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error Notification */}
                  {authError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-md animate-in fade-in">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {/* Password Hint & Forgot Password Links */}
                  <div className="flex items-center justify-center gap-3 pt-1 text-xs">
                    {selectedForPassword.passwordHint && (
                      <button
                        type="button"
                        onClick={() => setShowHint(!showHint)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3 h-3" />
                        <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsRecoveringPassword(true);
                        setRecoveryStep('answer');
                        setRecoveryAnswerInput('');
                        setRecoveryError(null);
                        setRecoverySuccessMessage(null);
                      }}
                      className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition inline-flex items-center gap-1 cursor-pointer font-medium hover:underline"
                    >
                      <KeyRound className="w-3 h-3 text-zinc-400" />
                      <span>Forgot Password?</span>
                    </button>
                  </div>

                  {showHint && selectedForPassword.passwordHint && (
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded text-center animate-in fade-in">
                      Hint: {selectedForPassword.passwordHint}
                    </p>
                  )}
                </form>
              ) : (
                /* RECOVERY WORKFLOW */
                <div className="w-full space-y-3">
                  {recoveryStep === 'answer' ? (
                    <form onSubmit={handleVerifyRecoveryAnswer} className="w-full space-y-3">
                      {/* Security Question Box */}
                      <div className="w-full text-left p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                          <HelpCircle className="w-3 h-3 text-blue-500" />
                          <span>Security Question</span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {selectedForPassword.securityQuestion || "What is your company's CAC/RC registration number or founding record?"}
                        </p>
                      </div>

                      <div>
                        <label className="block text-left text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Your Answer
                        </label>
                        <input
                          type="text"
                          autoFocus
                          placeholder="Type your answer..."
                          value={recoveryAnswerInput}
                          onChange={(e) => {
                            setRecoveryAnswerInput(e.target.value);
                            if (recoveryError) setRecoveryError(null);
                          }}
                          className="w-full h-9 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 focus:border-zinc-900 dark:focus:border-zinc-300 rounded-lg px-3 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none transition shadow-xs"
                        />
                      </div>

                      {recoveryError && (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-md animate-in fade-in">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{recoveryError}</span>
                        </div>
                      )}

                      {selectedForPassword.passwordHint && (
                        <p className="text-[11px] text-zinc-400 text-center">
                          Hint: <span className="text-zinc-600 dark:text-zinc-300 font-medium">{selectedForPassword.passwordHint}</span>
                        </p>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer mt-1"
                      >
                        Verify Answer
                      </button>
                    </form>
                  ) : (
                    /* STEP 2: SET NEW PASSWORD */
                    <form onSubmit={handleCompletePasswordReset} className="w-full space-y-2.5 animate-in fade-in">
                      <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        <span>Answer verified! Set a new password below.</span>
                      </div>

                      <div>
                        <label className="block text-left text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          New Password / PIN
                        </label>
                        <input
                          type="password"
                          autoFocus
                          placeholder="Enter new password"
                          value={newPasswordInput}
                          onChange={(e) => {
                            setNewPasswordInput(e.target.value);
                            if (recoveryError) setRecoveryError(null);
                          }}
                          className="w-full h-8 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                        />
                      </div>

                      <div>
                        <label className="block text-left text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmNewPasswordInput}
                          onChange={(e) => {
                            setConfirmNewPasswordInput(e.target.value);
                            if (recoveryError) setRecoveryError(null);
                          }}
                          className="w-full h-8 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                        />
                      </div>

                      <div>
                        <label className="block text-left text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Password Hint (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="New hint (optional)"
                          value={newPasswordHintInput}
                          onChange={(e) => setNewPasswordHintInput(e.target.value)}
                          className="w-full h-8 bg-white dark:bg-[#121215] border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                        />
                      </div>

                      {recoveryError && (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1.5 rounded-md">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{recoveryError}</span>
                        </div>
                      )}

                      {recoverySuccessMessage && (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>{recoverySuccessMessage}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer mt-1"
                      >
                        Save & Unlock Workspace
                      </button>
                    </form>
                  )}
                </div>
              )}

            </div>
          </div>
        ) : isProfileOpen && !isLocalUser ? (
          /* VIEW 2: USER PERSONALISED PROFILE & SECURITY */
          <UserProfilePage
            currentUser={currentUser || null}
            onBack={() => setIsProfileOpen(false)}
            onUpdateCurrentUser={onUpdateCurrentUser}
            onSignOut={onSignOut}
            isMobileView={isMobile}
          />
        ) : isTeamPageOpen ? (
          /* VIEW 3: FULL PAGE AUTHORIZED TEAM MEMBERS */
          <TeamMembersPage
            onBack={() => setIsTeamPageOpen(false)}
            currentUser={currentUser || null}
          />
        ) : (
          /* VIEW 3: MINIMALIST ACCOUNT SELECTION GRID */
          <div className="flex-1 flex flex-col min-h-0 w-full animate-in fade-in duration-150">
            
            {/* Pinned Minimalist Toolbar (always visible at top, never scrolls) */}
            <div className="shrink-0 pt-3 pb-3 bg-[#fbfbfb] dark:bg-[#09090b] z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              
              {/* Left: Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 sm:h-8 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 rounded-lg pl-8 pr-7 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none transition shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 sm:ml-auto shrink-0 justify-between sm:justify-end">
                {/* Authorized Staff — only shown in cloud mode where staff are managed centrally */}
                {isAdmin && !isLocalMode && (
                  <button
                    type="button"
                    onClick={() => setIsTeamPageOpen(true)}
                    className="flex-1 sm:flex-none h-9 sm:h-8 px-3 rounded-lg bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-medium text-xs transition inline-flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Manage authorized staff and operator accounts"
                  >
                    <Users className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                    <span>Authorized Staff</span>
                  </button>
                )}
                {canAddCompany && (
                  <button
                    onClick={openCreateModal}
                    className="flex-1 sm:flex-none h-9 sm:h-8 px-3 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium text-xs transition inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Company</span>
                  </button>
                )}
              </div>

            </div>

            {/* Scrollable Container for Company Cards */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-8 pr-1">
              {/* Zero State if no companies or no search match */}
              {filteredCompanies.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-3 max-w-sm mx-auto">
                  {searchQuery ? (
                    <>
                      <p className="text-xs text-zinc-500">No company found matching "{searchQuery}"</p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Clear search
                      </button>
                    </>
                  ) : !cloudConfig.isEnabled ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-6">
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No Company Added</p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Create a company to get started.</p>
                    </div>
                  ) : (
                    <div className="p-6 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3 w-full">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-900 dark:text-white">No Companies Found</h3>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Connected to cloud server. Create your first company workspace to get started.
                        </p>
                      </div>
                      {canAddCompany && (
                        <button
                          onClick={openCreateModal}
                          className="w-full py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs inline-flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Company</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Minimalist 5-Column Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 w-full pb-4">
                {filteredCompanies.map((comp) => {
                  const isMenuOpen = actionMenuOpenId === comp.id;

                  return (
                    <div
                      key={comp.id}
                      className={`group bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-700 rounded-xl p-3.5 flex flex-col justify-between transition hover:shadow-2xs cursor-pointer relative min-h-[155px] ${openingCompanyId ? 'pointer-events-none' : ''}`}
                      onClick={() => handleCompanyClick(comp)}
                    >
                      {/* Top Action Options Button */}
                      {!isAuditor && (
                        <div 
                          className="absolute top-2.5 right-2.5 z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setActionMenuOpenId(isMenuOpen ? null : comp.id)}
                            className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                            title="Options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs text-left z-30 animate-in fade-in">
                              <button
                                onClick={() => openEditModal(comp)}
                                className="w-full px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3 text-zinc-400" />
                                <span>Edit Details</span>
                              </button>
                              
                              {isAdmin && (
                                <button
                                  onClick={() => openPasswordModal(comp)}
                                  className="w-full px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer"
                                >
                                  <KeyRound className="w-3 h-3 text-zinc-400" />
                                  <span>{comp.hasPassword ? 'Change PIN' : 'Set Password'}</span>
                                </button>
                              )}

                              {isAdmin && companies.length > 1 && (
                                <>
                                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                                  <button
                                    onClick={() => {
                                      setDeletingCompany(comp);
                                      setDeleteConfirmText('');
                                      setActionMenuOpenId(null);
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete Company</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Header Avatar & Details */}
                      <div>
                        <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center overflow-hidden mb-2.5 shrink-0">
                          {comp.logoUrl ? (
                            <img 
                              src={comp.logoUrl} 
                              alt={comp.name} 
                              className="w-full h-full object-contain p-0.5"
                            />
                          ) : (
                            <span className="text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                              {getInitials(comp.name)}
                            </span>
                          )}
                        </div>

                        <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 tracking-tight line-clamp-2 leading-snug mb-0.5" title={comp.name}>
                          {comp.name}
                        </h3>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 line-clamp-1" title={comp.subtitle || ''}>
                          {comp.subtitle || 'Workspace'}
                        </p>
                      </div>

                      {/* Footer Status */}
                      <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[10px]">
                        {comp.hasPassword ? (
                          <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500 font-medium">
                            <Lock className="w-2.5 h-2.5 text-amber-500" />
                            <span>Protected</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500 font-medium">
                            <Unlock className="w-2.5 h-2.5 text-zinc-400" />
                            <span>Open</span>
                          </span>
                        )}

                        {openingCompanyId === comp.id ? (
                          <span className="text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 font-medium">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-zinc-500" />
                            <span>Opening...</span>
                          </span>
                        ) : (
                          <span className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition inline-flex items-center gap-0.5 font-medium">
                            <span>Enter</span>
                            <ArrowRight className="w-2.5 h-2.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}

                {/* Add Company Card — Admin only */}
                {canAddCompany && (
                  <div
                    onClick={openCreateModal}
                    className="border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/40 rounded-xl p-3.5 flex flex-col items-center justify-center text-center transition cursor-pointer min-h-[155px]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center mb-1.5">
                      <Plus className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-xs text-zinc-700 dark:text-zinc-300 tracking-tight">
                      Add Company
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      New workspace
                    </p>
                  </div>
                )}

              </div>
            )}
            </div>



          </div>
        )}

      </main>

      {/* MODAL: CREATE OR EDIT COMPANY */}
      {(isCreateModalOpen || editingCompany) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {editingCompany ? 'Edit Company Profile' : 'Add New Company'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingCompany(null);
                }} 
                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveCompany} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-4 space-y-3.5 text-xs overflow-y-auto flex-1">
                
                {formError && (
                  <div className="flex items-center gap-2 p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Company Name */}
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Company Registered Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zenith Energy Ltd"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-200 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Subtitle / Tagline */}
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Industry / Tagline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering & Power Solutions"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    className="w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-200 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Logo Upload Section */}
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Logo
                  </label>
                  <div className="flex items-center gap-3 p-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="w-12 h-12 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                      {formLogoUrl ? (
                        <img src={formLogoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] text-zinc-400">Used for company tile &amp; payslips</p>
                      <div className="flex items-center gap-2">
                        <label className="px-2 py-0.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 rounded text-[10px] font-medium transition inline-flex items-center gap-1 cursor-pointer">
                          <Upload className="w-2.5 h-2.5" />
                          <span>Upload</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {formLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormLogoUrl('')}
                            className="px-1.5 py-0.5 text-zinc-400 hover:text-rose-500 text-[10px] transition cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address, Phone, Email */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+234..."
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-200 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="info@company.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-200 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Office Address</label>
                  <input
                    type="text"
                    placeholder="Address, City, State"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-200 rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                {/* Password Protection Card — only shown when creating a new company */}
                {!editingCompany && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 block text-xs">Password Protection</span>
                        <span className="text-[10px] text-zinc-400">Require password or PIN to open this workspace</span>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formHasPassword}
                          onChange={(e) => setFormHasPassword(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full relative transition-colors peer-checked:bg-zinc-800 dark:peer-checked:bg-zinc-200 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[14px] after:w-[14px] after:transition-all after:shadow-sm peer-checked:after:translate-x-4"></div>
                      </label>
                    </div>

                    {formHasPassword && (
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2 animate-in fade-in">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-zinc-500 mb-1">Password</label>
                            <input
                              type="password"
                              placeholder="Password"
                              value={formPassword}
                              onChange={(e) => setFormPassword(e.target.value)}
                              className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-zinc-500 mb-1">Confirm</label>
                            <input
                              type="password"
                              placeholder="Confirm password"
                              value={formConfirmPassword}
                              onChange={(e) => setFormConfirmPassword(e.target.value)}
                              className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Hint (Optional)</label>
                          <input
                            type="text"
                            placeholder="Password hint"
                            value={formPasswordHint}
                            onChange={(e) => setFormPasswordHint(e.target.value)}
                            className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                          />
                        </div>

                        {/* Security Question */}
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">
                            Security Question <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={formSecurityQuestion}
                            onChange={(e) => setFormSecurityQuestion(e.target.value)}
                            className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                          >
                            {DEFAULT_SECURITY_QUESTIONS.map((q, idx) => (
                              <option key={idx} value={q}>{q}</option>
                            ))}
                          </select>
                          {formSecurityQuestion === 'Write your own custom question...' && (
                            <input
                              type="text"
                              placeholder="Type your custom security question"
                              value={formCustomSecurityQuestion}
                              onChange={(e) => setFormCustomSecurityQuestion(e.target.value)}
                              className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 text-xs text-zinc-900 dark:text-white focus:outline-none mt-1.5"
                            />
                          )}
                        </div>

                        {/* Security Answer */}
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">
                            Security Answer <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showFormSecurityAnswer ? 'text' : 'password'}
                              placeholder="Answer for password recovery (e.g. RC-10294 or Lagos)"
                              value={formSecurityAnswer}
                              onChange={(e) => setFormSecurityAnswer(e.target.value)}
                              className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded pl-2 pr-6 text-xs text-zinc-900 dark:text-white focus:outline-none"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              onClick={() => setShowFormSecurityAnswer(v => !v)}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                              title={showFormSecurityAnswer ? 'Hide answer' : 'Show answer'}
                            >
                              {showFormSecurityAnswer ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                          <span className="text-[9px] text-zinc-400 mt-0.5 block">
                            Required to verify your identity and reset your PIN if forgotten.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingCompany(null);
                  }}
                  className="px-3 py-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 rounded text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  {editingCompany ? 'Save Changes' : 'Create Company'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE COMPANY CONFIRMATION */}
      {deletingCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl p-5 text-center animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-2.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Delete Company Account?</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
              Are you sure you want to delete <strong className="text-zinc-900 dark:text-white">{deletingCompany.name}</strong>? All employee and payroll records will be removed.
            </p>

            <div className="mb-4 text-left">
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1.5 text-center">
                Type <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold">delete</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirmText.trim().toLowerCase() === 'delete') {
                    onDeleteCompany(deletingCompany.id);
                    setDeletingCompany(null);
                    setDeleteConfirmText('');
                  }
                }}
                placeholder='delete'
                autoFocus
                className="w-full text-center px-3 py-1.5 text-xs font-mono border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none focus:border-rose-500 dark:focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingCompany(null);
                  setDeleteConfirmText('');
                }}
                className="px-3.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim().toLowerCase() !== 'delete'}
                onClick={() => {
                  if (deleteConfirmText.trim().toLowerCase() === 'delete') {
                    onDeleteCompany(deletingCompany.id);
                    setDeletingCompany(null);
                    setDeleteConfirmText('');
                  }
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-semibold transition cursor-pointer"
              >
                Delete Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEDICATED SET / CHANGE PASSWORD */}
      {passwordModalCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {passwordModalCompany.hasPassword ? 'Change Password / PIN' : 'Set Password / PIN'}
                  </h3>
                  <p className="text-[10px] text-zinc-400 truncate max-w-[180px]">{passwordModalCompany.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalCompany(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSavePasswordOnly} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-4 space-y-3 text-xs overflow-y-auto flex-1">

                {pwdModalError && (
                  <div className="flex items-center gap-2 p-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{pwdModalError}</span>
                  </div>
                )}

                {/* Enable / disable toggle */}
                <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">Enable Protection</span>
                    <span className="text-[10px] text-zinc-400">Require password to open this workspace</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pwdModalHasPassword}
                      onChange={(e) => setPwdModalHasPassword(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-200 dark:bg-zinc-700 rounded-full relative transition-colors peer-checked:bg-zinc-800 dark:peer-checked:bg-zinc-200 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-[14px] after:w-[14px] after:transition-all after:shadow-sm peer-checked:after:translate-x-4"></div>
                  </label>
                </div>

                {/* Fields only when protection is ON */}
                {pwdModalHasPassword && (
                  <div className="space-y-2.5 animate-in fade-in">

                    {/* Current password (only if one already exists) */}
                    {passwordModalCompany.hasPassword && passwordModalCompany.password && (
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">
                          Current Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showModalCurrentPwd ? 'text' : 'password'}
                            placeholder="Enter current password"
                            value={pwdModalCurrentPassword}
                            onChange={(e) => setPwdModalCurrentPassword(e.target.value)}
                            className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded pl-2 pr-6 text-xs text-zinc-900 dark:text-white focus:outline-none"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowModalCurrentPwd(v => !v)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                            title={showModalCurrentPwd ? 'Hide password' : 'Show password'}
                          >
                            {showModalCurrentPwd ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* New Password */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">New Password <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <input
                            type={showModalNewPwd ? 'text' : 'password'}
                            placeholder="New password"
                            value={pwdModalNewPassword}
                            onChange={(e) => setPwdModalNewPassword(e.target.value)}
                            className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded pl-2 pr-6 text-xs text-zinc-900 dark:text-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowModalNewPwd(v => !v)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                          >
                            {showModalNewPwd ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 mb-1">Confirm <span className="text-rose-500">*</span></label>
                        <input
                          type="password"
                          placeholder="Confirm password"
                          value={pwdModalConfirmPassword}
                          onChange={(e) => setPwdModalConfirmPassword(e.target.value)}
                          className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Hint */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Password Hint (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. My cat's name"
                        value={pwdModalHint}
                        onChange={(e) => setPwdModalHint(e.target.value)}
                        className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    {/* Security Question */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">
                        Security Question <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={pwdModalSecurityQuestion}
                        onChange={(e) => setPwdModalSecurityQuestion(e.target.value)}
                        className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                      >
                        {DEFAULT_SECURITY_QUESTIONS.map((q, idx) => (
                          <option key={idx} value={q}>{q}</option>
                        ))}
                      </select>
                      {pwdModalSecurityQuestion === 'Write your own custom question...' && (
                        <input
                          type="text"
                          placeholder="Type your custom security question"
                          value={pwdModalCustomQuestion}
                          onChange={(e) => setPwdModalCustomQuestion(e.target.value)}
                          className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 text-xs text-zinc-900 dark:text-white focus:outline-none mt-1.5"
                        />
                      )}
                    </div>

                    {/* Security Answer */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] text-zinc-500">
                          Security Answer{' '}
                          {Boolean(passwordModalCompany.securityAnswer) ? (
                            <span className="text-zinc-400 font-normal">(Leave blank to keep current)</span>
                          ) : (
                            <span className="text-rose-500">*</span>
                          )}
                        </label>
                        {Boolean(passwordModalCompany.securityAnswer) && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-0.5">
                            <Check className="w-2.5 h-2.5" /> Configured
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showModalSecurityAnswer ? 'text' : 'password'}
                          placeholder={
                            passwordModalCompany.securityAnswer
                              ? '•••••••• (Enter new answer to update)'
                              : 'Answer used for password recovery'
                          }
                          value={pwdModalSecurityAnswer}
                          onChange={(e) => setPwdModalSecurityAnswer(e.target.value)}
                          className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded pl-2 pr-6 text-xs text-zinc-900 dark:text-white focus:outline-none"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setShowModalSecurityAnswer(v => !v)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                          title={showModalSecurityAnswer ? 'Hide answer' : 'Show answer'}
                        >
                          {showModalSecurityAnswer ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                      <span className="text-[9px] text-zinc-400 mt-0.5 block">
                        {passwordModalCompany.securityAnswer
                          ? 'Protected: stored securely and hidden from view to prevent unauthorized resets.'
                          : 'Required to verify your identity and reset your PIN if forgotten.'}
                      </span>
                    </div>

                  </div>
                )}

                {/* Disable protection: verify current password before removing */}
                {!pwdModalHasPassword && passwordModalCompany.hasPassword && passwordModalCompany.password && (
                  <div className="animate-in fade-in">
                    <label className="block text-[10px] text-zinc-500 mb-1">
                      Enter current password to disable protection <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showModalCurrentPwd ? 'text' : 'password'}
                        placeholder="Current password"
                        value={pwdModalCurrentPassword}
                        onChange={(e) => setPwdModalCurrentPassword(e.target.value)}
                        className="w-full h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded pl-2 pr-6 text-xs text-zinc-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalCurrentPwd(v => !v)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                        title={showModalCurrentPwd ? 'Hide password' : 'Show password'}
                      >
                        {showModalCurrentPwd ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setPasswordModalCompany(null)}
                  className="px-3 py-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 rounded text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                >
                  {pwdModalHasPassword ? 'Save Password' : 'Remove Protection'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Global Cloud Database Setup Modal */}
      <GlobalCloudModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        localCompanies={companies}
        onCompaniesSynced={handleCompaniesSynced}
      />

      {/* Global Legal & Help Modal (Terms of Service / Privacy Policy) */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />

    </div>
  );
};
