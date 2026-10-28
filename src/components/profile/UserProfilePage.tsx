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
  ArrowLeft,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  LogOut,
  Download,
  Lock,
  Phone,
  Mail,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Monitor,
  Clock,
  Sparkles
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
  { name: 'Emerald', bg: 'bg-emerald-600', ring: 'ring-emerald-400' },
  { name: 'Indigo', bg: 'bg-indigo-600', ring: 'ring-indigo-400' },
  { name: 'Violet', bg: 'bg-violet-600', ring: 'ring-violet-400' },
  { name: 'Sky', bg: 'bg-sky-600', ring: 'ring-sky-400' },
  { name: 'Amber', bg: 'bg-amber-600', ring: 'ring-amber-400' },
  { name: 'Rose', bg: 'bg-rose-600', ring: 'ring-rose-400' },
];

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  currentUser,
  onBack,
  onUpdateCurrentUser,
  onSignOut,
  isMobileView = false,
}) => {
  // Navigation Tabs: 'profile' | 'security' | 'biometrics' | 'twofactor' | 'session'
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'biometrics' | 'twofactor' | 'session'>('profile');

  // Workstation & Session Settings
  const [logoutOnClose, setLogoutOnClose] = useState<boolean>(() => getLogoutOnClosePreference());
  const [inactivityMinutes, setInactivityMinutes] = useState<number>(() => getInactivityLockMinutes());
  const [privacyMask, setPrivacyMask] = useState<boolean>(() => getPrivacyMaskPreference());
  const [rememberUsername, setRememberUsername] = useState<boolean>(() => {
    try {
      return localStorage.getItem('payroll_pro_remember_me') !== 'false';
    } catch {
      return true;
    }
  });

  // Member local working state
  const [name, setName] = useState(currentUser?.name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || AVATAR_COLORS[0].bg);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState(currentUser?.passwordHint || '');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

  // 4-Digit Quick PIN state
  const [pin, setPin] = useState(currentUser?.pin || '1234');
  const [showPin, setShowPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Security Questions state
  const [securityQuestion, setSecurityQuestion] = useState(currentUser?.securityQuestion || DEFAULT_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState(currentUser?.securityAnswer || '');
  const [showSecurityAnswer, setShowSecurityAnswer] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState(currentUser?.recoveryEmail || '');

  // Biometrics State
  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability | null>(null);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState<boolean>(() => {
    if (!currentUser?.id) return false;
    try {
      const stored = localStorage.getItem(`payroll_pro_bio_${currentUser.id}`);
      return Boolean(stored) || Boolean(currentUser.biometricEnabled);
    } catch {
      return false;
    }
  });
  const [isTestingBiometric, setIsTestingBiometric] = useState(false);
  const [biometricTestResult, setBiometricTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Two-Factor Authentication (2FA) State
  const [is2FaEnabled, setIs2FaEnabled] = useState<boolean>(Boolean(currentUser?.twoFactorEnabled));
  const [mfaSecret, setMfaSecret] = useState<string>(() => currentUser?.twoFactorSecret || generateMfaSecret());
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>(() => currentUser?.twoFactorBackupCodes || generateBackupCodes());
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);

  // General Save & Status
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password strength
  const passwordStrength = evaluatePasswordStrength(newPassword);

  // Check biometric support on mount
  useEffect(() => {
    checkBiometricSupport().then((cap) => setBiometricCapability(cap));
  }, []);

  // Update initial form values if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setPin(currentUser.pin || '1234');
      setSecurityQuestion(currentUser.securityQuestion || DEFAULT_SECURITY_QUESTIONS[0]);
      setSecurityAnswer(currentUser.securityAnswer || '');
      setRecoveryEmail(currentUser.recoveryEmail || '');
      setIs2FaEnabled(Boolean(currentUser.twoFactorEnabled));
      if (currentUser.twoFactorSecret) setMfaSecret(currentUser.twoFactorSecret);
      if (currentUser.avatarColor) setAvatarColor(currentUser.avatarColor);
    }
  }, [currentUser]);

  // Clean status toast after 4s
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#fbfbfb] dark:bg-[#09090b]">
        <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">No Active Session</h2>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">Please sign in with your staff account to customize your profile and security settings.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-xs font-medium cursor-pointer"
        >
          Return to Login
        </button>
      </div>
    );
  }

  // Calculate Security Health Score
  const getSecurityScore = () => {
    let score = 30; // base score with active account
    if (currentUser.password && currentUser.password.length >= 8) score += 20;
    if (currentUser.securityQuestion && currentUser.securityAnswer) score += 15;
    if (isBiometricEnrolled) score += 15;
    if (is2FaEnabled) score += 20;
    return Math.min(100, score);
  };
  const securityScore = getSecurityScore();

  // QR Code SVG generation for TOTP
  const otpauthUri = buildOtpAuthUri(currentUser.email || currentUser.username || 'staff', mfaSecret);
  const qrSvgMarkup = generateQrSvg(otpauthUri, 180, '#09090b', '#ffffff');

  // Save Personal Profile Info
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setStatusMessage({ type: 'error', text: 'Full Name cannot be empty.' });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const updatedMember: TeamMember = {
      ...currentUser,
      name: name.trim(),
      username: currentUser.username, // Staff cannot change their username
      email: currentUser.email,       // Staff cannot change their email
      phone: phone.trim(),
      avatarColor,
      updatedAt: new Date().toISOString(),
    };

    setActiveTeamMember(updatedMember);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updatedMember);

    const cloudRes = await saveTeamMemberToCloud(updatedMember);
    setIsSaving(false);

    if (cloudRes.success) {
      setStatusMessage({ type: 'success', text: 'Profile information updated successfully!' });
    } else {
      setStatusMessage({ type: 'success', text: 'Profile updated locally (offline mode active).' });
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    setPasswordChangeSuccess(false);

    if (currentUser.password && currentPassword !== currentUser.password) {
      setPasswordChangeError('Current password does not match. Please verify your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New password and confirmation do not match.');
      return;
    }

    setIsSaving(true);
    const updatedMember: TeamMember = {
      ...currentUser,
      password: newPassword,
      pin: newPassword,
      passwordHint: passwordHint.trim() || undefined,
      mustChangePassword: false,
      updatedAt: new Date().toISOString(),
    };

    setActiveTeamMember(updatedMember);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updatedMember);

    const cloudRes = await saveTeamMemberToCloud(updatedMember);
    setIsSaving(false);

    if (cloudRes.success) {
      setPasswordChangeSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage({ type: 'success', text: 'Password and hint successfully changed and secured!' });
    } else {
      setPasswordChangeSuccess(true);
      setStatusMessage({ type: 'success', text: 'Password saved to local terminal vault.' });
    }
  };

  // Save 4-Digit Quick PIN
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setStatusMessage({ type: 'error', text: 'PIN must be exactly 4 numeric digits.' });
      return;
    }

    setIsSaving(true);
    const updatedMember: TeamMember = {
      ...currentUser,
      pin,
      updatedAt: new Date().toISOString(),
    };

    setActiveTeamMember(updatedMember);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updatedMember);

    await saveTeamMemberToCloud(updatedMember);
    setIsSaving(false);
    setPinSuccess(true);
    setTimeout(() => setPinSuccess(false), 3000);
    setStatusMessage({ type: 'success', text: '4-Digit Quick PIN saved!' });
  };

  // Save Security Questions & Recovery
  const handleSaveSecurityQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedQuestion = securityQuestion === 'Write your own custom question...' ? customQuestion.trim() : securityQuestion;

    if (!resolvedQuestion) {
      setStatusMessage({ type: 'error', text: 'Please select or provide a security question.' });
      return;
    }
    if (!securityAnswer.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter an answer for your security question.' });
      return;
    }

    setIsSaving(true);
    const updatedMember: TeamMember = {
      ...currentUser,
      securityQuestion: resolvedQuestion,
      securityAnswer: securityAnswer.trim(),
      recoveryEmail: recoveryEmail.trim(),
      updatedAt: new Date().toISOString(),
    };

    setActiveTeamMember(updatedMember);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updatedMember);

    const cloudRes = await saveTeamMemberToCloud(updatedMember);
    setIsSaving(false);

    if (cloudRes.success) {
      setStatusMessage({ type: 'success', text: 'Security recovery questions updated.' });
    } else {
      setStatusMessage({ type: 'success', text: 'Security recovery details saved.' });
    }
  };

  // Toggle & Enroll Biometric
  const handleToggleBiometric = async () => {
    setBiometricTestResult(null);

    if (isBiometricEnrolled) {
      // Disable
      removeBiometric(currentUser.id);
      setIsBiometricEnrolled(false);

      const updated: TeamMember = {
        ...currentUser,
        biometricEnabled: false,
      };
      setActiveTeamMember(updated);
      if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
      await saveTeamMemberToCloud(updated);
      setStatusMessage({ type: 'success', text: 'Biometric authentication disabled for this terminal.' });
      return;
    }

    // Require platform authenticator hardware (Windows Hello / Android BiometricPrompt)
    if (!biometricCapability?.platformAuthenticatorAvailable) {
      setBiometricTestResult({
        success: false,
        message: 'No active Windows Hello or Android Biometric sensor detected on this device. Please set up Windows Hello in Windows Settings or fingerprint recognition on Android first.',
      });
      return;
    }

    // Enable / Register
    setIsTestingBiometric(true);
    const regRes = await registerBiometric(currentUser.id, currentUser.name);
    setIsTestingBiometric(false);

    if (regRes.success) {
      setIsBiometricEnrolled(true);
      const updated: TeamMember = {
        ...currentUser,
        biometricEnabled: true,
        biometricDeviceName: getDeviceDisplayName(),
      };
      setActiveTeamMember(updated);
      if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
      await saveTeamMemberToCloud(updated);
      setBiometricTestResult({
        success: true,
        message: 'Biometric sensor verified and registered successfully on this device!',
      });
      setStatusMessage({ type: 'success', text: 'Biometric sensor enrolled successfully!' });
    } else {
      setBiometricTestResult({
        success: false,
        message: regRes.error || 'Failed to enroll biometric sensor.',
      });
    }
  };

  // Test Biometric Verification
  const handleTestBiometric = async () => {
    setIsTestingBiometric(true);
    setBiometricTestResult(null);
    const verifyRes = await verifyBiometric(currentUser.id);
    setIsTestingBiometric(false);

    if (verifyRes.success) {
      setBiometricTestResult({
        success: true,
        message: 'Biometric scan verified! Identity matched terminal credentials.',
      });
    } else {
      setBiometricTestResult({
        success: false,
        message: verifyRes.error || 'Biometric verification unsuccessful.',
      });
    }
  };

  // Activate / Verify 2FA
  const handleActivate2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);
    setMfaSuccess(null);

    if (!mfaVerifyCode.trim()) {
      setMfaError('Please enter the 6-digit code shown in your authenticator app.');
      return;
    }

    const isValid = verifyMfaToken(mfaVerifyCode, mfaSecret, backupCodes);
    if (!isValid) {
      setMfaError('Invalid verification code. Please check your authenticator clock and try again.');
      return;
    }

    setIsSaving(true);
    const updated: TeamMember = {
      ...currentUser,
      twoFactorEnabled: true,
      twoFactorSecret: mfaSecret,
      twoFactorBackupCodes: backupCodes,
      updatedAt: new Date().toISOString(),
    };

    setActiveTeamMember(updated);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
    await saveTeamMemberToCloud(updated);

    setIsSaving(false);
    setIs2FaEnabled(true);
    setMfaVerifyCode('');
    setMfaSuccess('Two-Factor Authentication is now active! Keep your backup codes safe.');
    setStatusMessage({ type: 'success', text: 'Two-Factor Authentication activated!' });
  };

  // Disable 2FA
  const handleDisable2Fa = async () => {
    if (!confirm('Are you sure you want to disable Two-Factor Authentication? Your account security will be reduced.')) {
      return;
    }

    setIsSaving(true);
    const updated: TeamMember = {
      ...currentUser,
      twoFactorEnabled: false,
      updatedAt: new Date().toISOString(),
    };

    setActiveTeamMember(updated);
    if (onUpdateCurrentUser) onUpdateCurrentUser(updated);
    await saveTeamMemberToCloud(updated);

    setIsSaving(false);
    setIs2FaEnabled(false);
    setMfaSuccess(null);
    setStatusMessage({ type: 'success', text: 'Two-Factor Authentication disabled.' });
  };

  // Copy secret key
  const handleCopySecret = () => {
    navigator.clipboard?.writeText(mfaSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // Copy backup codes
  const handleCopyBackupCodes = () => {
    navigator.clipboard?.writeText(backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  // Download backup codes file
  const handleDownloadBackupCodes = () => {
    const text = `PAYROLL PRO - 2FA EMERGENCY BACKUP CODES\nUser: ${currentUser.name} (${currentUser.email || currentUser.username})\nDate: ${new Date().toLocaleDateString()}\n\nCodes:\n${backupCodes.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\nKeep these codes in a safe, secure place. Each code can be used once.`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-pro-backup-codes-${currentUser.username || 'staff'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const userInitial = (name || currentUser.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fbfbfb] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 animate-in fade-in duration-200">
      
      {/* ─── Top Header Bar ─────────────────────────────────────────── */}
      <div className="shrink-0 h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#121215]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Back to workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Profile</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {currentUser.role}
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Manage your credentials, security preferences, biometric hardware, and privacy
            </p>
          </div>
        </div>

        {/* Right header actions */}
        <div className="flex items-center gap-2">
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg flex items-center gap-1.5 font-medium transition cursor-pointer"
              title="Sign out of this terminal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Switch User</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 rounded-lg shadow-xs transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div className="fixed top-16 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl shadow-lg text-xs font-medium border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {/* ─── Scrollable Content Body ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        
        {/* Profile Card Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] shadow-xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
              {/* Dynamic Avatar */}
              <div className="relative group">
                <div
                  className={`w-16 h-16 sm:w-18 sm:h-18 rounded-2xl ${avatarColor} text-white font-extrabold text-2xl flex items-center justify-center shadow-md ring-4 ring-white dark:ring-[#121215] transition-transform duration-200`}
                >
                  {userInitial}
                </div>
              </div>

              {/* User Identity Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {name || currentUser.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    @{username || currentUser.username || 'staff'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{email || currentUser.email || 'No email attached'}</span>
                </p>
              </div>
            </div>

            {/* Security Health Score Card */}
            <div className="sm:border-l sm:border-zinc-200 dark:sm:border-zinc-800 sm:pl-6 flex flex-col justify-center min-w-[190px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  Security Score
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {securityScore}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${securityScore}%` }}
                />
              </div>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-400">
                <span className={is2FaEnabled ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                  {is2FaEnabled ? '✓ 2FA Active' : '✕ 2FA Off'}
                </span>
                <span>&bull;</span>
                <span className={isBiometricEnrolled ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}>
                  {isBiometricEnrolled ? '✓ Biometric On' : '✕ Biometric Off'}
                </span>
              </div>
            </div>

          </div>

          {/* Color Palettes for Avatar */}
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-medium">Avatar Color:</span>
            <div className="flex items-center gap-1.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setAvatarColor(c.bg)}
                  title={c.name}
                  className={`w-5 h-5 rounded-full ${c.bg} transition-all cursor-pointer ${
                    avatarColor === c.bg ? 'ring-2 ring-offset-2 ring-zinc-800 dark:ring-zinc-200 scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ─── Segmented Navigation Tabs ──────────────────────────────── */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-500" />
            <span>Profile Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
            <span>Password & PIN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('biometrics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
              activeTab === 'biometrics'
                ? 'bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5 text-violet-500" />
            <span>Biometric Unlock</span>
            {isMobileView && (
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold">
                Mobile
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('twofactor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
              activeTab === 'twofactor'
                ? 'bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-teal-500" />
            <span>Two-Factor (2FA)</span>
            {is2FaEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('session')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
              activeTab === 'session'
                ? 'bg-white dark:bg-[#18181b] text-zinc-900 dark:text-zinc-100 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Session & Privacy</span>
            {logoutOnClose && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            )}
          </button>
        </div>

        {/* ─── TAB 1: PERSONAL PROFILE ─────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Personal Information</h3>
                    <p className="text-xs text-zinc-400">Update how your identity appears across audit logs and terminal sessions</p>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-400">
                    Role: <strong className="text-zinc-800 dark:text-zinc-200">{currentUser.role}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Full Legal / Staff Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Username (Locked / Read-Only) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Staff Username
                      </label>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
                        <Lock className="w-2.5 h-2.5 text-zinc-400" /> Bound to account
                      </span>
                    </div>
                    <div className="relative">
                      <span className="text-zinc-400 text-xs font-bold absolute left-3 top-1/2 -translate-y-1/2">@</span>
                      <input
                        type="text"
                        value={username}
                        readOnly
                        disabled
                        title="Username is bound to your staff account and managed by organization administrator"
                        className="w-full h-9 bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl pl-8 pr-8 text-xs text-zinc-500 dark:text-zinc-400 font-mono cursor-not-allowed select-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Work Email (Locked / Read-Only) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Work / Contact Email
                      </label>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1 font-medium">
                        <Lock className="w-2.5 h-2.5 text-zinc-400" /> Managed credential
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        readOnly
                        disabled
                        title="Login email is managed by organization administrator"
                        className="w-full h-9 bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl pl-9 pr-8 text-xs text-zinc-500 dark:text-zinc-400 cursor-not-allowed select-none"
                      />
                      <Lock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Mobile Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+234 800 000 0000"
                        className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB 2: PASSWORD & PIN ──────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-500" />
                  <span>Change Password</span>
                </h3>
                <p className="text-xs text-zinc-400">Ensure your password contains letters, digits, and special characters</p>
              </div>

              {passwordChangeError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{passwordChangeError}</span>
                </div>
              )}

              {passwordChangeSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Password changed successfully!</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter existing password"
                      className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 pr-9 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 pr-9 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">Strength:</span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`flex-1 h-full rounded-full transition-all ${
                              passwordStrength.score >= step ? passwordStrength.color : 'bg-transparent'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-400 pt-1">
                        <span className={passwordStrength.hasMinLength ? 'text-emerald-500 font-medium' : ''}>
                          {passwordStrength.hasMinLength ? '✓' : '•'} 8+ characters
                        </span>
                        <span className={passwordStrength.hasUppercase ? 'text-emerald-500 font-medium' : ''}>
                          {passwordStrength.hasUppercase ? '✓' : '•'} Uppercase letter
                        </span>
                        <span className={passwordStrength.hasNumber ? 'text-emerald-500 font-medium' : ''}>
                          {passwordStrength.hasNumber ? '✓' : '•'} Number (0-9)
                        </span>
                        <span className={passwordStrength.hasSymbol ? 'text-emerald-500 font-medium' : ''}>
                          {passwordStrength.hasSymbol ? '✓' : '•'} Special symbol
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 pr-9 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Password Hint */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Password Hint <span className="text-zinc-400 font-normal">(Optional)</span>
                    </label>
                    <span className="text-[10px] text-zinc-400">
                      Helpful reminder if you forget your password
                    </span>
                  </div>
                  <input
                    type="text"
                    value={passwordHint}
                    onChange={(e) => setPasswordHint(e.target.value)}
                    placeholder="e.g. Childhood pet + graduation year"
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving || !newPassword}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>

            {/* Quick 4-Digit Terminal PIN */}
            <form onSubmit={handleSavePin} className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>4-Digit Quick Terminal PIN</span>
                </h3>
                <p className="text-xs text-zinc-400">Used for rapid screen unlocking and signing off payroll approvals without typing your full password</p>
              </div>

              {pinSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Terminal PIN updated successfully!</span>
                </div>
              )}

              <div className="max-w-xs space-y-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  4-Digit Numeric PIN
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="1234"
                    className="w-full h-10 tracking-widest text-center font-mono text-base font-bold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving || pin.length !== 4}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Save PIN
                </button>
              </div>
            </form>

            {/* Security Question & Recovery Email */}
            <form onSubmit={handleSaveSecurityQuestions} className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-500" />
                  <span>Security Question & Password Recovery</span>
                </h3>
                <p className="text-xs text-zinc-400">Allows you to self-recover your staff password if forgotten</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Security Question
                  </label>
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  >
                    {DEFAULT_SECURITY_QUESTIONS.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                {securityQuestion === 'Write your own custom question...' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Custom Question
                    </label>
                    <input
                      type="text"
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      placeholder="e.g. What is the name of your first pet?"
                      className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Security Answer <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecurityAnswer ? 'text' : 'password'}
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder="Answer required to reset your account"
                      className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 pr-9 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecurityAnswer(!showSecurityAnswer)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {showSecurityAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Emergency Recovery Email
                  </label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="recovery@personalemail.com"
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
                >
                  Save Recovery Settings
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB 3: BIOMETRIC UNLOCK (MOBILE VIEW & WEBAUTHN) ─────────── */}
        {activeTab === 'biometrics' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-violet-500" />
                      <span>Biometric Authentication</span>
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isBiometricEnrolled
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {isBiometricEnrolled ? 'Enrolled & Active' : 'Not Enrolled'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Unlock Payroll Pro instantly with your fingerprint, Face ID, or Windows Hello sensor without typing credentials
                  </p>
                </div>

                {/* Primary Toggle Switch */}
                <button
                  type="button"
                  onClick={handleToggleBiometric}
                  disabled={!biometricCapability?.platformAuthenticatorAvailable || isTestingBiometric}
                  title={
                    !biometricCapability?.platformAuthenticatorAvailable
                      ? 'No hardware Windows Hello or Android biometric sensor active on this device'
                      : isBiometricEnrolled
                      ? 'Click to disable biometric login'
                      : 'Click to enroll Windows Hello or Android biometric sensor'
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    !biometricCapability?.platformAuthenticatorAvailable
                      ? 'opacity-40 cursor-not-allowed bg-zinc-300 dark:bg-zinc-700'
                      : isBiometricEnrolled
                      ? 'bg-violet-600 cursor-pointer'
                      : 'bg-zinc-300 dark:bg-zinc-700 cursor-pointer'
                  }`}
                  role="switch"
                  aria-checked={isBiometricEnrolled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isBiometricEnrolled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Hardware Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                biometricCapability?.platformAuthenticatorAvailable
                  ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/50'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50'
              }`}>
                <Smartphone className={`w-5 h-5 shrink-0 mt-0.5 ${
                  biometricCapability?.platformAuthenticatorAvailable ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-400'
                }`} />
                <div className="text-xs leading-relaxed">
                  <p className={`font-semibold ${
                    biometricCapability?.platformAuthenticatorAvailable
                      ? 'text-violet-900 dark:text-violet-100'
                      : 'text-amber-900 dark:text-amber-200'
                  }`}>
                    {biometricCapability?.platformAuthenticatorAvailable
                      ? 'Windows Hello / Android Biometric sensor detected and ready.'
                      : 'Hardware Biometric Sensor Unavailable on This Device'}
                  </p>
                  <p className={`mt-0.5 ${
                    biometricCapability?.platformAuthenticatorAvailable
                      ? 'text-violet-800/80 dark:text-violet-300/80'
                      : 'text-amber-800/80 dark:text-amber-300/80'
                  }`}>
                    {biometricCapability?.platformAuthenticatorAvailable
                      ? 'On Android devices, this utilizes native BiometricPrompt (fingerprint or face recognition). On Windows, it connects strictly to Windows Hello (Fingerprint, Facial Recognition, or Device PIN).'
                      : 'No active Windows Hello sensor or Android BiometricPrompt hardware was detected. To enable, configure Windows Hello in Windows Settings (Accounts > Sign-in options) or biometric security on Android.'}
                  </p>
                </div>
              </div>

              {/* Test / Verify Result Banner */}
              {biometricTestResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                    biometricTestResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {biometricTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span>{biometricTestResult.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleToggleBiometric}
                  disabled={!biometricCapability?.platformAuthenticatorAvailable || isTestingBiometric}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{isBiometricEnrolled ? 'Re-Enroll / Change Biometric' : 'Enroll Biometric Sensor'}</span>
                </button>

                {isBiometricEnrolled && (
                  <button
                    type="button"
                    onClick={handleTestBiometric}
                    disabled={isTestingBiometric}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isTestingBiometric ? <RefreshCw className="w-4 h-4 animate-spin text-violet-500" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
                    <span>Test Biometric Scan</span>
                  </button>
                )}
              </div>

              {/* Mobile View Tips */}
              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-4 space-y-2">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Mobile Terminal Fast Login</h4>
                <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
                  <li>When opening Payroll Pro on mobile, you will be prompted for your fingerprint instead of entering your password each time.</li>
                  <li>Biometric credentials are bound to this terminal hardware and never leave your device.</li>
                  <li>You can always use your 4-digit PIN as a fallback if your hands are wet or sensor is unavailable.</li>
                </ul>
              </div>

            </div>
          </div>
        )}

        {/* ─── TAB 4: TWO-FACTOR AUTHENTICATION (2FA / MFA) ───────────── */}
        {activeTab === 'twofactor' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-teal-500" />
                      <span>Two-Factor Authentication (2FA / MFA)</span>
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        is2FaEnabled
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {is2FaEnabled ? 'Enabled & Protecting Account' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Protect your staff credentials by requiring a 6-digit code from Google Authenticator, Microsoft Authenticator, or 1Password
                  </p>
                </div>

                {is2FaEnabled ? (
                  <button
                    type="button"
                    onClick={handleDisable2Fa}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer"
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMfaSecret(generateMfaSecret());
                      setBackupCodes(generateBackupCodes());
                    }}
                    className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate New Key</span>
                  </button>
                )}
              </div>

              {mfaSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{mfaSuccess}</span>
                </div>
              )}

              {mfaError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{mfaError}</span>
                </div>
              )}

              {/* MFA Setup Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-2">
                
                {/* Left: QR Code & Secret */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    <QrCode className="w-4 h-4 text-teal-500" />
                    <span>Step 1: Scan QR Code with Authenticator</span>
                  </div>

                  {/* Generated QR Code SVG */}
                  <div className="flex justify-center p-3 bg-white rounded-xl shadow-xs border border-zinc-200">
                    <div
                      className="w-44 h-44 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
                    />
                  </div>

                  {/* Manual Key Code */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                      Or Enter Key Manually
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg font-mono text-xs text-zinc-800 dark:text-zinc-200 tracking-wider">
                        {formatMfaSecret(mfaSecret)}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="px-2.5 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                      >
                        {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Verification Form & Backup Codes */}
                <div className="space-y-5">
                  
                  {/* Step 2: Verification Input */}
                  {!is2FaEnabled ? (
                    <form onSubmit={handleActivate2Fa} className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        <KeyRound className="w-4 h-4 text-emerald-500" />
                        <span>Step 2: Enter 6-Digit Code to Activate</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Type the 6-digit code currently shown in your authenticator app
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={mfaVerifyCode}
                          onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="000000"
                          className="flex-1 h-10 tracking-widest text-center font-mono text-base font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 focus:outline-none focus:border-teal-500"
                        />
                        <button
                          type="submit"
                          disabled={mfaVerifyCode.length !== 6 || isSaving}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                        >
                          Verify & Turn On
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Two-Factor Authentication is Active</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                        Your account requires this authenticator app code on any new terminal sign-in.
                      </p>
                    </div>
                  )}

                  {/* Step 3: Emergency Backup Codes */}
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        <span>Emergency Backup Codes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyBackupCodes}
                          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                          title="Copy all backup codes"
                        >
                          {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadBackupCodes}
                          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                          title="Download as text file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-400">
                      Save these one-time codes in a safe place. If you ever lose your authenticator phone, each code can be used once to access your account.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {backupCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center font-mono text-[11px] text-zinc-700 dark:text-zinc-300"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* ─── TAB 5: SESSION & PRIVACY (MINIMALIST WORKSTATION SECURITY) ── */}
        {activeTab === 'session' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            
            {/* Setting 1: Logout on App Close (Requested Feature) */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Require Login on App Launch (Log Out on Close)</span>
                  </h4>
                  <span
                    className={`px-2 py-0.2 rounded-full text-[9px] font-semibold ${
                      logoutOnClose
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {logoutOnClose ? 'Active • Secured' : 'Disabled • Stay Signed In'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  When enabled, closing this app window terminates your session immediately. Anyone launching Payroll Pro on this PC must enter your username and password before they can view any payroll or employee data.
                </p>
              </div>

              {/* Minimalist Switch */}
              <button
                type="button"
                onClick={() => {
                  const next = !logoutOnClose;
                  setLogoutOnClose(next);
                  setLogoutOnClosePreference(next);
                  setStatusMessage({
                    type: 'success',
                    text: next
                      ? 'Session will now terminate whenever this app is closed.'
                      : 'Session will now stay signed in across app launches.',
                  });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  logoutOnClose ? 'bg-amber-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
                role="switch"
                aria-checked={logoutOnClose}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    logoutOnClose ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 2: Inactivity Screen Auto-Lock */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Inactivity Screen Auto-Lock</span>
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Locks the screen with your 4-digit PIN if left idle on your desk to prevent colleagues from viewing salaries
                  </p>
                </div>
              </div>

              {/* Minimalist Segmented Pill Options */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {[
                  { label: 'Off', val: 0 },
                  { label: '2 mins', val: 2 },
                  { label: '5 mins', val: 5 },
                  { label: '10 mins', val: 10 },
                  { label: '15 mins', val: 15 },
                  { label: '30 mins', val: 30 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => {
                      setInactivityMinutes(item.val);
                      setInactivityLockMinutes(item.val);
                      setStatusMessage({
                        type: 'success',
                        text: item.val === 0 ? 'Inactivity lock disabled.' : `Auto-lock set to ${item.label}.`,
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      inactivityMinutes === item.val
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Setting 3: Privacy Shield (Mask Salary Numbers) */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-teal-500" />
                    <span>Privacy Shield (Mask Salary Numbers by Default)</span>
                  </h4>
                  <span
                    className={`px-2 py-0.2 rounded-full text-[9px] font-semibold ${
                      privacyMask
                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {privacyMask ? 'Mask Active • ₦••••••' : 'Visible'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Blurs net pay and gross totals across dashboard widgets and employee directory to prevent shoulder surfing in open offices.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = !privacyMask;
                  setPrivacyMask(next);
                  setPrivacyMaskPreference(next);
                  setStatusMessage({
                    type: 'success',
                    text: next ? 'Privacy Shield enabled: salary figures will be masked.' : 'Privacy Shield disabled.',
                  });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  privacyMask ? 'bg-teal-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
                role="switch"
                aria-checked={privacyMask}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    privacyMask ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 4: Remember Staff Username */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 pr-4">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span>Remember Username on Login Screen</span>
                </h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Pre-fills your staff email or username on this computer for faster sign-ins while still requiring your password each time.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = !rememberUsername;
                  setRememberUsername(next);
                  try {
                    localStorage.setItem('payroll_pro_remember_me', next ? 'true' : 'false');
                    if (next && currentUser.email) {
                      localStorage.setItem('payroll_pro_remembered_staff', currentUser.email);
                    } else if (!next) {
                      localStorage.removeItem('payroll_pro_remembered_staff');
                    }
                  } catch {}
                  setStatusMessage({
                    type: 'success',
                    text: next ? 'Username will be remembered on login.' : 'Username will not be remembered.',
                  });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  rememberUsername ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
                role="switch"
                aria-checked={rememberUsername}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    rememberUsername ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Setting 5: Active Terminal Info & One-Click Sign Out */}
            <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Active Workstation Session</span>
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Current device: <strong className="text-zinc-800 dark:text-zinc-200">{getDeviceDisplayName()}</strong>
                  </p>
                </div>

                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out Now</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
