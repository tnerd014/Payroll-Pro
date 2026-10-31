import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Fingerprint,
  QrCode,
  Copy,
  Check,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  LogOut,
  Download,
  Lock,
  Phone,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Monitor,
  Clock,
  Sparkles,
  ChevronRight,
  X,
  Edit2,
} from 'lucide-react';
import { TeamMember, DEFAULT_SECURITY_QUESTIONS } from '../../types';
import {
  saveTeamMemberToCloud,
  setActiveTeamMember,
  getLogoutOnClosePreference,
  setLogoutOnClosePreference,
  getInactivityLockMinutes,
  setInactivityLockMinutes,
  getPrivacyMaskPreference,
  setPrivacyMaskPreference,
} from '../../services/supabaseClient';
import { generateQrSvg } from '../../utils/qrCode';
import {
  generateMfaSecret,
  formatMfaSecret,
  generateBackupCodes,
  buildOtpAuthUri,
  verifyMfaToken,
  checkBiometricSupport,
  registerBiometric,
  verifyBiometric,
  removeBiometric,
  getDeviceDisplayName,
  evaluatePasswordStrength,
  BiometricCapability,
} from '../../utils/security';

interface UserProfilePageProps {
  currentUser: TeamMember | null;
  onBack: () => void;
  onUpdateCurrentUser?: (member: TeamMember) => void;
  onSignOut?: () => void;
  isMobileView?: boolean;
}

const AVATAR_COLORS = [
  { name: 'Emerald', bg: 'bg-emerald-600' },
  { name: 'Indigo',  bg: 'bg-indigo-600'  },
  { name: 'Violet',  bg: 'bg-violet-600'  },
  { name: 'Sky',     bg: 'bg-sky-600'     },
  { name: 'Amber',   bg: 'bg-amber-600'   },
  { name: 'Rose',    bg: 'bg-rose-600'    },
];

// ─── Small reusable Modal shell ───────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title, onClose, children,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="relative bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  </div>
);

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle: React.FC<{ checked: boolean; onChange: () => void; color?: string }> = ({
  checked, onChange, color = 'bg-emerald-600',
}) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out cursor-pointer focus:outline-none ${
      checked ? color : 'bg-zinc-200 dark:bg-zinc-700'
    }`}
    role="switch"
    aria-checked={checked}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

// ─── Status pill ──────────────────────────────────────────────────────────────
const StatusPill: React.FC<{ active: boolean; activeLabel?: string; inactiveLabel?: string }> = ({
  active, activeLabel = 'Active', inactiveLabel = 'Off',
}) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
    active
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
      : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
  }`}>
    {active ? activeLabel : inactiveLabel}
  </span>
);

// ─── Setting row ──────────────────────────────────────────────────────────────
const SettingRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  description?: string;
  value?: React.ReactNode;
  onClick?: () => void;
  chevron?: boolean;
}> = ({ icon, label, description, value, onClick, chevron }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3.5 transition group ${
      onClick ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer' : ''
    }`}
  >
    <div className="shrink-0 w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{label}</p>
      {description && (
        <p className="text-[11px] text-zinc-400 truncate mt-0.5">{description}</p>
      )}
    </div>
    {value && <div className="shrink-0 ml-2">{value}</div>}
    {chevron && onClick && (
      <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 shrink-0 group-hover:text-zinc-500 transition ml-1" />
    )}
  </div>
);

// ─── Input helpers ────────────────────────────────────────────────────────────
const FieldLabel: React.FC<{ label: string; required?: boolean; hint?: string }> = ({
  label, required, hint,
}) => (
  <div className="flex items-center justify-between mb-1.5">
    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
      {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
    {hint && <span className="text-[10px] text-zinc-400">{hint}</span>}
  </div>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { accent?: string }> = ({
  className = '', accent = 'focus:border-zinc-500', ...props
}) => (
  <input
    className={`w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none transition ${accent} ${className}`}
    {...props}
  />
);

// ─── Error/Success banner ─────────────────────────────────────────────────────
const Banner: React.FC<{ type: 'error' | 'success'; message: string }> = ({ type, message }) => (
  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
    type === 'success'
      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
  }`}>
    {type === 'success'
      ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
      : <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />}
    <span>{message}</span>
  </div>
);

// ─── Password field with eye toggle ──────────────────────────────────────────
const PasswordInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  accent?: string;
  required?: boolean;
}> = ({ value, onChange, placeholder, accent, required }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextInput
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        accent={accent}
        required={required}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

// ─── Modal action buttons ─────────────────────────────────────────────────────
const ModalActions: React.FC<{
  onCancel: () => void;
  submitLabel: string;
  disabled?: boolean;
  isSaving?: boolean;
  color?: string;
}> = ({ onCancel, submitLabel, disabled, isSaving, color = 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' }) => (
  <div className="flex justify-end gap-2 pt-1">
    <button
      type="button"
      onClick={onCancel}
      className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
    >
      Cancel
    </button>
    <button
      type="submit"
      disabled={disabled || isSaving}
      className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-2 ${color}`}
    >
      {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
      {submitLabel}
    </button>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
type Section = 'profile' | 'password' | 'biometrics' | 'twofactor' | 'session';
type ModalType = null | 'edit-profile' | 'change-password' | 'change-pin' | 'security-questions' | 'setup-2fa';

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  currentUser, onBack, onUpdateCurrentUser, onSignOut, isMobileView = false,
}) => {
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [modal, setModal] = useState<ModalType>(null);
  const closeModal = () => setModal(null);

  // Profile form state
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || AVATAR_COLORS[0].bg);

  // Password form state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [passwordHint, setPasswordHint] = useState(currentUser?.passwordHint || '');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // PIN state
  const [pin, setPin] = useState(currentUser?.pin || '');
  const [showPin, setShowPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Security questions state
  const [securityQuestion, setSecurityQuestion] = useState(
    currentUser?.securityQuestion || DEFAULT_SECURITY_QUESTIONS[0]
  );
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState(currentUser?.securityAnswer || '');
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState(currentUser?.recoveryEmail || '');

  // Biometric state
  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability | null>(null);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState<boolean>(() => {
    if (!currentUser?.id) return false;
    try {
      return Boolean(localStorage.getItem(`payroll_pro_bio_${currentUser.id}`)) || Boolean(currentUser.biometricEnabled);
    } catch { return false; }
  });
  const [isTestingBiometric, setIsTestingBiometric] = useState(false);
  const [biometricTestResult, setBiometricTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 2FA state
  const [is2FaEnabled, setIs2FaEnabled] = useState<boolean>(Boolean(currentUser?.twoFactorEnabled));
  const [mfaSecret, setMfaSecret] = useState<string>(() => currentUser?.twoFactorSecret || generateMfaSecret());
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>(() => currentUser?.twoFactorBackupCodes || generateBackupCodes());
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Session state
  const [logoutOnClose, setLogoutOnClose] = useState<boolean>(() => getLogoutOnClosePreference());
  const [inactivityMinutes, setInactivityMinutes] = useState<number>(() => getInactivityLockMinutes());
  const [privacyMask, setPrivacyMask] = useState<boolean>(() => getPrivacyMaskPreference());
  const [rememberUsername, setRememberUsername] = useState<boolean>(() => {
    try { return localStorage.getItem('payroll_pro_remember_me') !== 'false'; } catch { return true; }
  });

  // Saving / toast
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const passwordStrength = evaluatePasswordStrength(newPw);
  const otpauthUri = buildOtpAuthUri(currentUser?.email || currentUser?.username || 'staff', mfaSecret);
  const qrSvgMarkup = generateQrSvg(otpauthUri, 160, '#09090b', '#ffffff');

  useEffect(() => {
    checkBiometricSupport().then((cap) => setBiometricCapability(cap));
  }, []);

  useEffect(() => {
    // Avoid overwriting fields if user is actively editing inside a modal
    if (modal) return;
    if (currentUser) {
      setName(currentUser.name || '');
      setPhone(currentUser.phone || '');
      setPin(currentUser.pin || '');
      setPasswordHint(currentUser.passwordHint || '');
      setSecurityQuestion(currentUser.securityQuestion || DEFAULT_SECURITY_QUESTIONS[0]);
      setSecurityAnswer(currentUser.securityAnswer || '');
      setRecoveryEmail(currentUser.recoveryEmail || '');
      setIs2FaEnabled(Boolean(currentUser.twoFactorEnabled));
      if (currentUser.twoFactorSecret) setMfaSecret(currentUser.twoFactorSecret);
      if (currentUser.avatarColor) setAvatarColor(currentUser.avatarColor);
    }
  }, [currentUser, modal]);

  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-[#09090b]">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">No Active Session</p>
          <button onClick={onBack} className="mt-3 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const userInitial = (name || currentUser.name || 'U').charAt(0).toUpperCase();
  const isLocalDefaultAdmin = currentUser.id === 'local_offline_operator';

  // Security score
  const getSecurityScore = () => {
    let s = 30;
    if (currentUser.password && currentUser.password.length >= 8) s += 20;
    if (currentUser.securityQuestion && currentUser.securityAnswer) s += 15;
    if (isBiometricEnrolled) s += 15;
    if (is2FaEnabled) s += 20;
    return Math.min(100, s);
  };
  const securityScore = getSecurityScore();
  const scoreGradient = securityScore >= 80
    ? 'from-emerald-500 to-teal-400'
    : securityScore >= 50
    ? 'from-amber-500 to-yellow-400'
    : 'from-rose-500 to-red-400';

  // ── Handlers ────────────────────────────────────────────────────────────
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showToast('error', 'Full name cannot be empty.'); return; }
    setIsSaving(true);
    const updated: TeamMember = { ...currentUser, name: name.trim(), phone: phone.trim(), avatarColor, updatedAt: new Date().toISOString() };
    setActiveTeamMember(updated);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
    await saveTeamMemberToCloud(updated);
    setIsSaving(false);
    showToast('success', 'Profile updated.');
    closeModal();
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (currentUser.password && currentPw !== currentUser.password) { setPasswordError('Current password does not match.'); return; }
    if (newPw.length < 6) { setPasswordError('Password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPasswordError('Passwords do not match.'); return; }
    setIsSaving(true);
    const updated: TeamMember = { ...currentUser, password: newPw, pin: newPw, passwordHint: passwordHint.trim() || undefined, mustChangePassword: false, updatedAt: new Date().toISOString() };
    setActiveTeamMember(updated);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
    await saveTeamMemberToCloud(updated);
    setIsSaving(false);
    setPasswordSuccess(true);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    showToast('success', 'Password changed.');
    setTimeout(() => { setPasswordSuccess(false); closeModal(); }, 1200);
  };

  const savePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) { showToast('error', 'PIN must be exactly 4 digits.'); return; }
    setIsSaving(true);
    const updated: TeamMember = { ...currentUser, pin, updatedAt: new Date().toISOString() };
    setActiveTeamMember(updated);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
    await saveTeamMemberToCloud(updated);
    setIsSaving(false);
    setPinSuccess(true);
    showToast('success', 'PIN saved.');
    setTimeout(() => { setPinSuccess(false); closeModal(); }, 1200);
  };

  const saveSecurityQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = securityQuestion === 'Write your own custom question...' ? customQuestion.trim() : securityQuestion;
    if (!q || !securityAnswer.trim()) { showToast('error', 'Fill in the question and answer.'); return; }
    setIsSaving(true);
    const updated: TeamMember = { ...currentUser, securityQuestion: q, securityAnswer: securityAnswer.trim(), recoveryEmail: recoveryEmail.trim(), updatedAt: new Date().toISOString() };
    setActiveTeamMember(updated);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
    await saveTeamMemberToCloud(updated);
    setIsSaving(false);
    showToast('success', 'Security recovery updated.');
    closeModal();
  };

  const toggleBiometric = async () => {
    setBiometricTestResult(null);
    if (isBiometricEnrolled) {
      removeBiometric(currentUser.id);
      setIsBiometricEnrolled(false);
      const updated: TeamMember = { ...currentUser, biometricEnabled: false };
      setActiveTeamMember(updated);
      if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
      await saveTeamMemberToCloud(updated);
      showToast('success', 'Biometric disabled.');
      return;
    }
    if (!biometricCapability?.platformAuthenticatorAvailable) {
      setBiometricTestResult({ success: false, message: 'No biometric sensor detected on this device.' });
      return;
    }
    setIsTestingBiometric(true);
    const res = await registerBiometric(currentUser.id, currentUser.name);
    setIsTestingBiometric(false);
    if (res.success) {
      setIsBiometricEnrolled(true);
      const updated: TeamMember = { ...currentUser, biometricEnabled: true, biometricDeviceName: getDeviceDisplayName() };
      setActiveTeamMember(updated);
      if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
      await saveTeamMemberToCloud(updated);
      setBiometricTestResult({ success: true, message: 'Biometrics enrolled successfully.' });
      showToast('success', 'Biometrics enrolled.');
    } else {
      setBiometricTestResult({ success: false, message: res.error || 'Enrollment failed.' });
    }
  };

  const testBiometric = async () => {
    setIsTestingBiometric(true);
    setBiometricTestResult(null);
    const res = await verifyBiometric(currentUser.id);
    setIsTestingBiometric(false);
    setBiometricTestResult({ success: res.success, message: res.success ? 'Verification passed.' : (res.error || 'Verification failed.') });
  };

  const activate2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    if (!mfaVerifyCode.trim()) { setMfaError('Enter the 6-digit code from your authenticator.'); return; }
    const valid = await verifyMfaToken(mfaVerifyCode, mfaSecret, backupCodes);
    if (!valid) { setMfaError('Invalid code. Check your authenticator clock.'); return; }
    setIsSaving(true);
    const updated: TeamMember = { ...currentUser, twoFactorEnabled: true, twoFactorSecret: mfaSecret, twoFactorBackupCodes: backupCodes, updatedAt: new Date().toISOString() };
    setActiveTeamMember(updated);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
    await saveTeamMemberToCloud(updated);
    setIsSaving(false);
    setIs2FaEnabled(true);
    setMfaVerifyCode('');
    showToast('success', '2FA activated.');
    closeModal();
  };

  const disable2Fa = async () => {
    if (!confirm('Disable Two-Factor Authentication? Your account security will be reduced.')) return;
    setIsSaving(true);
    const updated: TeamMember = { ...currentUser, twoFactorEnabled: false, updatedAt: new Date().toISOString() };
    setActiveTeamMember(updated);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
    await saveTeamMemberToCloud(updated);
    setIsSaving(false);
    setIs2FaEnabled(false);
    showToast('success', '2FA disabled.');
  };

  const NAV_ITEMS: { id: Section; icon: React.ReactNode; label: string }[] = isLocalDefaultAdmin
    ? [{ id: 'profile', icon: <User className="w-4 h-4" />, label: 'Profile' }]
    : [
        { id: 'profile',    icon: <User className="w-4 h-4" />,       label: 'Profile'           },
        { id: 'password',   icon: <KeyRound className="w-4 h-4" />,   label: 'Password & PIN'    },
        { id: 'biometrics', icon: <Fingerprint className="w-4 h-4" />,label: 'Biometric'         },
        { id: 'twofactor',  icon: <Shield className="w-4 h-4" />,     label: 'Two-Factor Auth'   },
        { id: 'session',    icon: <ShieldCheck className="w-4 h-4" />,label: 'Session & Privacy' },
      ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100">

      {/* ── Toast notification ────────────────────────────────────────── */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium border ${
            toast.type === 'success'
              ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700'
              : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* ── Mobile Top Header & Navigation (Shown on mobile devices or isMobileView) ── */}
      <div className={`${isMobileView ? 'flex' : 'flex md:hidden'} flex-col bg-white dark:bg-[#121215] border-b border-zinc-200 dark:border-zinc-800 shrink-0`}>
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              title="Back"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <div className={`w-8 h-8 rounded-xl ${avatarColor} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
              {userInitial}
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{name || currentUser.name}</h1>
              <p className="text-[10px] text-zinc-400 truncate">{currentUser.role} {!isLocalDefaultAdmin && `• ${securityScore}% Secure`}</p>
            </div>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="text-xs text-rose-500 font-semibold px-2.5 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0 cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>

        {/* Horizontal Category Nav */}
        <div className="px-3 pb-2.5 overflow-x-auto no-scrollbar flex items-center gap-1.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                activeSection === item.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Layout: Left rail (desktop) + Right content (both) ────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Navigation Rail (Hidden on mobile or when isMobileView) */}
        <aside className={`${isMobileView ? 'hidden' : 'hidden md:flex'} w-64 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-y-auto`}>

          {/* Back + user identity */}
          <div className="px-4 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition cursor-pointer mb-4"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Back to Dashboard
            </button>

            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl ${avatarColor} text-white font-bold text-sm flex items-center justify-center shrink-0`}>
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{name || currentUser.name}</p>
                <p className="text-[10px] text-zinc-400 truncate">{currentUser.role}</p>
              </div>
            </div>

            {!isLocalDefaultAdmin && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-zinc-400 font-medium">Security Health</span>
                  <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">{securityScore}%</span>
                </div>
                <div className="h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${scoreGradient} transition-all duration-500 rounded-full`}
                    style={{ width: `${securityScore}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left ${
                  activeSection === item.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Sign out */}
          {onSignOut && (
            <div className="px-2 py-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 overflow-y-auto">

          {/* ── PROFILE ──────────────────────────────────────────────── */}
          {activeSection === 'profile' && (
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
              <div>
                <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Personal Profile</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Your identity across audit logs and sessions</p>
              </div>

              {/* Identity card */}
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${avatarColor} text-white font-extrabold text-lg flex items-center justify-center shrink-0`}>
                      {userInitial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{name || currentUser.name}</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                          {currentUser.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{currentUser.email || currentUser.username || '—'}</p>
                      {currentUser.phone && <p className="text-[11px] text-zinc-400 mt-0.5">{currentUser.phone}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setModal('edit-profile')}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>

                  {/* Avatar picker */}
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                    <span className="text-[11px] text-zinc-400 font-medium shrink-0">Avatar</span>
                    <div className="flex items-center gap-2">
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          title={c.name}
                          onClick={async () => {
                            setAvatarColor(c.bg);
                            const u: TeamMember = { ...currentUser, avatarColor: c.bg, updatedAt: new Date().toISOString() };
                            setActiveTeamMember(u);
                            if (onUpdateCurrentUser) onUpdateCurrentUser(u);
                            await saveTeamMemberToCloud(u);
                          }}
                          className={`w-5 h-5 rounded-full ${c.bg} transition-all cursor-pointer ${
                            avatarColor === c.bg
                              ? 'ring-2 ring-offset-2 ring-zinc-800 dark:ring-zinc-100 scale-110'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Locked credentials */}
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
                <SettingRow
                  icon={<Mail className="w-3.5 h-3.5 text-zinc-400" />}
                  label="Work Email"
                  description={currentUser.email || 'Not set'}
                  value={<span className="flex items-center gap-1 text-[10px] text-zinc-400"><Lock className="w-2.5 h-2.5" />Managed</span>}
                />
                <SettingRow
                  icon={<User className="w-3.5 h-3.5 text-zinc-400" />}
                  label="Username"
                  description={currentUser.username ? `@${currentUser.username}` : '—'}
                  value={<span className="flex items-center gap-1 text-[10px] text-zinc-400"><Lock className="w-2.5 h-2.5" />Bound</span>}
                />
              </div>

              {isLocalDefaultAdmin && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Local system account</p>
                    <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70 leading-snug mt-0.5">
                      Password and security features are managed per company. Connect to a cloud server to add named staff accounts.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PASSWORD & PIN ────────────────────────────────────────── */}
          {activeSection === 'password' && !isLocalDefaultAdmin && (
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
              <div>
                <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Password & PIN</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Manage your login credentials and quick-access PIN</p>
              </div>
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
                <SettingRow
                  icon={<KeyRound className="w-3.5 h-3.5 text-indigo-500" />}
                  label="Login Password"
                  description={currentUser.passwordHint ? `Hint: "${currentUser.passwordHint}"` : 'Change your account password'}
                  onClick={() => { setPasswordError(null); setPasswordSuccess(false); setModal('change-password'); }}
                  chevron
                />
                <SettingRow
                  icon={<Lock className="w-3.5 h-3.5 text-amber-500" />}
                  label="4-Digit Quick PIN"
                  description="For rapid screen unlock and approvals"
                  value={<StatusPill active={Boolean(currentUser.pin)} activeLabel="Set" inactiveLabel="Not set" />}
                  onClick={() => { setPinSuccess(false); setModal('change-pin'); }}
                  chevron
                />
                <SettingRow
                  icon={<HelpCircle className="w-3.5 h-3.5 text-emerald-500" />}
                  label="Security Question"
                  description={currentUser.securityQuestion
                    ? `"${currentUser.securityQuestion.slice(0, 50)}${currentUser.securityQuestion.length > 50 ? '…' : ''}"`
                    : 'Set a recovery question'}
                  value={<StatusPill active={Boolean(currentUser.securityAnswer)} activeLabel="Set" inactiveLabel="Not set" />}
                  onClick={() => setModal('security-questions')}
                  chevron
                />
              </div>
            </div>
          )}

          {/* ── BIOMETRIC ─────────────────────────────────────────────── */}
          {activeSection === 'biometrics' && !isLocalDefaultAdmin && (
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
              <div>
                <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Biometric Authentication</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Use Windows Hello, fingerprint, or face ID to unlock this terminal</p>
              </div>

              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <SettingRow
                  icon={<Fingerprint className="w-3.5 h-3.5 text-violet-500" />}
                  label="Biometric Unlock"
                  description={isBiometricEnrolled ? `Active — ${getDeviceDisplayName()}` : 'Not configured'}
                  value={<Toggle checked={isBiometricEnrolled} onChange={toggleBiometric} color="bg-violet-600" />}
                />
              </div>

              {biometricTestResult && (
                <Banner
                  type={biometricTestResult.success ? 'success' : 'error'}
                  message={biometricTestResult.message}
                />
              )}

              {!biometricCapability?.platformAuthenticatorAvailable && (
                <div className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-500">No biometric sensor detected. Windows Hello, fingerprint scanner, or face recognition hardware is required.</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleBiometric}
                  disabled={!biometricCapability?.platformAuthenticatorAvailable || isTestingBiometric}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  {isBiometricEnrolled ? 'Re-enroll' : 'Enroll Biometrics'}
                </button>
                {isBiometricEnrolled && (
                  <button
                    type="button"
                    onClick={testBiometric}
                    disabled={isTestingBiometric}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold transition cursor-pointer"
                  >
                    {isTestingBiometric
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                    Test Sensor
                  </button>
                )}
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Biometric credentials are stored locally only and never sent to the cloud. Authentication uses your device's secure enclave (Windows Hello TPM / WebAuthn platform authenticator).
                </p>
              </div>
            </div>
          )}

          {/* ── TWO-FACTOR AUTH ───────────────────────────────────────── */}
          {activeSection === 'twofactor' && !isLocalDefaultAdmin && (
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
              <div>
                <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Two-Factor Authentication</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Require a 6-digit code from an authenticator app on every sign-in</p>
              </div>

              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${is2FaEnabled ? 'bg-teal-50 dark:bg-teal-950/50' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                      <Shield className={`w-4 h-4 ${is2FaEnabled ? 'text-teal-600 dark:text-teal-400' : 'text-zinc-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">2FA Status</p>
                        <StatusPill active={is2FaEnabled} activeLabel="Enabled" inactiveLabel="Disabled" />
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                        {is2FaEnabled
                          ? 'Authenticator code required on every new sign-in.'
                          : 'Enable 2FA to significantly strengthen your account.'}
                      </p>
                    </div>
                  </div>
                  {is2FaEnabled ? (
                    <button
                      type="button"
                      onClick={disable2Fa}
                      className="shrink-0 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setMfaError(null); setMfaVerifyCode(''); setModal('setup-2fa'); }}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      Set Up 2FA
                    </button>
                  )}
                </div>
              </div>

              {is2FaEnabled && (
                <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Emergency Backup Codes</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => { navigator.clipboard?.writeText(backupCodes.join('\n')); setCopiedCodes(true); setTimeout(() => setCopiedCodes(false), 2000); }}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition cursor-pointer" title="Copy all">
                        {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button type="button" onClick={() => {
                        const t = `PAYROLL PRO - 2FA BACKUP CODES\nUser: ${currentUser.name}\nDate: ${new Date().toLocaleDateString()}\n\n${backupCodes.map((c,i)=>`${i+1}. ${c}`).join('\n')}\n\nEach code can be used once.`;
                        const b = new Blob([t], {type:'text/plain;charset=utf-8'});
                        const u = URL.createObjectURL(b); const l = document.createElement('a');
                        l.href=u; l.download='payroll-pro-backup-codes.txt'; l.click(); URL.revokeObjectURL(u);
                      }} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition cursor-pointer" title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">Save these in a safe place. Each can be used once if you lose your authenticator device.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, idx) => (
                      <div key={idx} className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Compatible with Google Authenticator, Microsoft Authenticator, Authy, and 1Password. Install one before setting up 2FA.
                </p>
              </div>
            </div>
          )}

          {/* ── SESSION & PRIVACY ─────────────────────────────────────── */}
          {activeSection === 'session' && !isLocalDefaultAdmin && (
            <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
              <div>
                <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Session & Privacy</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Control how this device stores and manages your session</p>
              </div>

              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
                <SettingRow
                  icon={<Lock className="w-3.5 h-3.5 text-amber-500" />}
                  label="Require Login on App Launch"
                  description="Clears session when the app is closed and reopened"
                  value={<Toggle checked={logoutOnClose} onChange={() => {
                    const next = !logoutOnClose;
                    setLogoutOnClose(next);
                    setLogoutOnClosePreference(next);
                    showToast('success', next ? 'Session will reset on app close.' : 'Session will persist.');
                  }} color="bg-amber-600" />}
                />
                <SettingRow
                  icon={<EyeOff className="w-3.5 h-3.5 text-teal-500" />}
                  label="Privacy Shield"
                  description={privacyMask ? 'Salary figures masked — ₦••••••' : 'All figures visible'}
                  value={<Toggle checked={privacyMask} onChange={() => {
                    const next = !privacyMask;
                    setPrivacyMask(next);
                    setPrivacyMaskPreference(next);
                    showToast('success', next ? 'Privacy Shield enabled.' : 'Privacy Shield disabled.');
                  }} color="bg-teal-600" />}
                />
                <SettingRow
                  icon={<User className="w-3.5 h-3.5 text-sky-500" />}
                  label="Remember Username on Login"
                  description="Pre-fills your username on the sign-in screen"
                  value={<Toggle checked={rememberUsername} onChange={() => {
                    const next = !rememberUsername;
                    setRememberUsername(next);
                    try {
                      localStorage.setItem('payroll_pro_remember_me', next ? 'true' : 'false');
                      if (!next) localStorage.removeItem('payroll_pro_remembered_staff');
                    } catch {}
                    showToast('success', next ? 'Username will be remembered.' : 'Username will not be remembered.');
                  }} color="bg-sky-600" />}
                />
              </div>

              {/* Inactivity lock */}
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Inactivity Auto-Lock</p>
                </div>
                <p className="text-[11px] text-zinc-400">Lock the screen automatically after a period of inactivity</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Off', val: 0 },
                    { label: '2m',  val: 2 },
                    { label: '5m',  val: 5 },
                    { label: '10m', val: 10 },
                    { label: '15m', val: 15 },
                    { label: '30m', val: 30 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => {
                        setInactivityMinutes(item.val);
                        setInactivityLockMinutes(item.val);
                        showToast('success', item.val === 0 ? 'Auto-lock disabled.' : `Auto-lock set to ${item.label}.`);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        inactivityMinutes === item.val
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active device */}
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                <SettingRow
                  icon={<Monitor className="w-3.5 h-3.5 text-zinc-400" />}
                  label="Active Device"
                  description={getDeviceDisplayName()}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════ MODALS ═══════════════════════════════════ */}

      {/* Edit Profile */}
      {modal === 'edit-profile' && (
        <Modal title="Edit Profile" onClose={closeModal}>
          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <FieldLabel label="Full Name" required />
              <TextInput type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" required />
            </div>
            <div>
              <FieldLabel label="Mobile Phone" />
              <TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
            </div>
            <ModalActions onCancel={closeModal} submitLabel="Save Changes" isSaving={isSaving} />
          </form>
        </Modal>
      )}

      {/* Change Password */}
      {modal === 'change-password' && (
        <Modal title="Change Password" onClose={closeModal}>
          <form onSubmit={savePassword} className="space-y-3">
            {passwordError && <Banner type="error" message={passwordError} />}
            {passwordSuccess && <Banner type="success" message="Password changed successfully!" />}
            <div>
              <FieldLabel label="Current Password" required />
              <PasswordInput value={currentPw} onChange={setCurrentPw} placeholder="Your existing password" accent="focus:border-indigo-500" required />
            </div>
            <div>
              <FieldLabel label="New Password" required />
              <PasswordInput value={newPw} onChange={setNewPw} placeholder="Enter strong new password" accent="focus:border-indigo-500" required />
              {newPw && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4].map((s) => (
                      <div key={s} className={`flex-1 h-1 rounded-full transition-all ${passwordStrength.score >= s ? passwordStrength.color : 'bg-zinc-100 dark:bg-zinc-800'}`} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span className={passwordStrength.hasMinLength ? 'text-emerald-500' : ''}>8+ chars</span>
                    <span className={passwordStrength.hasUppercase ? 'text-emerald-500' : ''}>Uppercase</span>
                    <span className={passwordStrength.hasNumber ? 'text-emerald-500' : ''}>Number</span>
                    <span className={passwordStrength.hasSymbol ? 'text-emerald-500' : ''}>Symbol</span>
                  </div>
                </div>
              )}
            </div>
            <div>
              <FieldLabel label="Confirm New Password" required />
              <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Re-enter new password" accent="focus:border-indigo-500" required />
            </div>
            <div>
              <FieldLabel label="Password Hint" hint="Optional" />
              <TextInput type="text" value={passwordHint} onChange={(e) => setPasswordHint(e.target.value)} placeholder="e.g. Pet name + year" />
            </div>
            <ModalActions
              onCancel={closeModal}
              submitLabel="Update Password"
              disabled={!newPw}
              isSaving={isSaving}
              color="bg-indigo-600 hover:bg-indigo-700 text-white"
            />
          </form>
        </Modal>
      )}

      {/* Change PIN */}
      {modal === 'change-pin' && (
        <Modal title="4-Digit Quick PIN" onClose={closeModal}>
          <form onSubmit={savePin} className="space-y-4">
            {pinSuccess && <Banner type="success" message="PIN saved successfully!" />}
            <p className="text-xs text-zinc-400 leading-relaxed">
              Used for rapid screen unlock and to sign off payroll approvals without typing your full password.
            </p>
            <div>
              <FieldLabel label="4-Digit Numeric PIN" required />
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl tracking-widest text-center font-mono text-xl font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 transition"
                />
                <button type="button" onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <ModalActions
              onCancel={closeModal}
              submitLabel="Save PIN"
              disabled={pin.length !== 4}
              isSaving={isSaving}
              color="bg-amber-600 hover:bg-amber-700 text-white"
            />
          </form>
        </Modal>
      )}

      {/* Security Questions */}
      {modal === 'security-questions' && (
        <Modal title="Security Question & Recovery" onClose={closeModal}>
          <form onSubmit={saveSecurityQuestions} className="space-y-3">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Allows you to self-recover your account if you forget your password.
            </p>
            <div>
              <FieldLabel label="Security Question" />
              <select
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 transition"
              >
                {DEFAULT_SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            {securityQuestion === 'Write your own custom question...' && (
              <div>
                <FieldLabel label="Custom Question" />
                <TextInput type="text" value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} placeholder="e.g. What was your first pet's name?" required />
              </div>
            )}
            <div>
              <FieldLabel label="Security Answer" required />
              <div className="relative">
                <TextInput
                  type={showSecurityAnswer ? 'text' : 'password'}
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Your answer (case-sensitive)"
                  accent="focus:border-emerald-500"
                  required
                />
                <button type="button" onClick={() => setShowSecurityAnswer(!showSecurityAnswer)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer">
                  {showSecurityAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <FieldLabel label="Recovery Email" hint="Optional" />
              <TextInput type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="personal@email.com" />
            </div>
            <ModalActions onCancel={closeModal} submitLabel="Save Recovery" isSaving={isSaving} />
          </form>
        </Modal>
      )}

      {/* Setup 2FA */}
      {modal === 'setup-2fa' && (
        <Modal title="Set Up Two-Factor Authentication" onClose={closeModal}>
          <div className="space-y-4">
            {mfaError && <Banner type="error" message={mfaError} />}
            <p className="text-xs text-zinc-400 leading-relaxed">
              Install Google Authenticator, Microsoft Authenticator, or Authy, then scan the QR code below.
            </p>

            {/* QR Code */}
            <div className="flex justify-center p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="w-40 h-40 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: qrSvgMarkup }} />
            </div>

            {/* Manual key */}
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Or enter key manually</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-xs text-zinc-700 dark:text-zinc-300 tracking-wider">
                  {formatMfaSecret(mfaSecret)}
                </code>
                <button type="button" onClick={() => { navigator.clipboard?.writeText(mfaSecret); setCopiedSecret(true); setTimeout(() => setCopiedSecret(false), 2000); }}
                  className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition cursor-pointer">
                  {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Verify */}
            <form onSubmit={activate2Fa} className="space-y-3">
              <div>
                <FieldLabel label="Enter 6-digit code from your app" required />
                <input
                  type="text"
                  maxLength={6}
                  value={mfaVerifyCode}
                  onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full h-11 tracking-widest text-center font-mono text-xl font-bold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-teal-500 transition text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <ModalActions
                onCancel={closeModal}
                submitLabel="Verify & Activate"
                disabled={mfaVerifyCode.length !== 6}
                isSaving={isSaving}
                color="bg-teal-600 hover:bg-teal-700 text-white"
              />
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
