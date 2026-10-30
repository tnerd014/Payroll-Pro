import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Mail, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  FileText, 
  Paperclip, 
  Settings, 
  Sparkles, 
  RefreshCw,
  ExternalLink,
  Edit2,
  Check,
  AlertTriangle,
  StopCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  History,
  RotateCcw,
  MoreVertical,
  Lock,
  Unlock
} from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  CompanyProfile, 
  PayslipDesignConfig, 
  Employee, 
  EmailSettings, 
  DEFAULT_EMAIL_SETTINGS,
  DEFAULT_PAYSLIP_DESIGN,
  EmailedPayslipRecord,
  EmailSendHistoryItem,
  TeamMember,
  PayrollSnapshot
} from '../../types';
import { 
  sendIndividualPayslipEmail, 
  getEmailTemplateData, 
  interpolateEmailTemplate,
  EmailDispatchResult 
} from '../../services/emailService';
import { formatNaira } from '../../engine/payePensionEngine';

interface EmailRecipientState {
  employeeId: string;
  employeeCode: string;
  payeNumber?: string;
  pensionNumber?: string;
  fullName: string;
  department: string;
  email: string;
  netPay: number;
  item: CalculatedPayrollItem;
  selected: boolean;
  status: 'idle' | 'sending' | 'sent' | 'failed' | 'no-email';
  error?: string;
  messageId?: string;
  lastSentAt?: string;
  sendCount: number;
  version?: number;
  priorNetPay?: number;
  isRevised?: boolean;
  history?: EmailSendHistoryItem[];
}

interface EmailPayslipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CalculatedPayrollItem[];
  employees: Employee[];
  company: CompanyProfile;
  monthLabel: string;
  selectedMonth: string;
  year: number;
  emailSettings?: EmailSettings;
  payslipDesign?: PayslipDesignConfig;
  emailedPayslips?: Record<string, EmailedPayslipRecord>;
  onRecordEmailedPayslips?: (records: EmailedPayslipRecord[]) => void;
  onOpenSettings?: () => void;
  onUpdateEmployeeEmail?: (employeeId: string, newEmail: string) => void;
  isAdmin?: boolean;
  currentUser?: TeamMember | null;
  activeSnapshot?: PayrollSnapshot;
  isLocked?: boolean;
}

export const EmailPayslipsModal: React.FC<EmailPayslipsModalProps> = ({
  isOpen,
  onClose,
  items,
  employees,
  company,
  monthLabel,
  selectedMonth,
  year,
  emailSettings = DEFAULT_EMAIL_SETTINGS,
  payslipDesign = DEFAULT_PAYSLIP_DESIGN,
  emailedPayslips = {},
  onRecordEmailedPayslips,
  onOpenSettings,
  onUpdateEmployeeEmail,
  isAdmin = true,
  currentUser,
  activeSnapshot,
  isLocked = true,
}) => {
  const periodKey = `${year}-${(selectedMonth || '').toLowerCase()}`;
  const isActualAdmin = Boolean(isAdmin && (!currentUser || currentUser.role === 'Admin'));
  const currentPayrollVersion = (activeSnapshot?.version || 0) + 1;

  const [subject, setSubject] = useState(emailSettings.defaultSubjectTemplate);
  const [body, setBody] = useState(emailSettings.defaultBodyTemplate);
  const [attachPdf, setAttachPdf] = useState(emailSettings.attachPdf ?? true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'pending' | 'sent' | 'revised'>('all');
  const [filterMissingEmail, setFilterMissingEmail] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // 3-dot row actions menu state
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Close 3-dot menu on outside click
  useEffect(() => {
    if (!activeActionMenuId) return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu]')) {
        setActiveActionMenuId(null);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [activeActionMenuId]);
  
  // Inline editing of email
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [tempEmailVal, setTempEmailVal] = useState('');

  // History & Resend modal state
  const [historyTarget, setHistoryTarget] = useState<EmailRecipientState | null>(null);
  const [resendingEmpId, setResendingEmpId] = useState<string | null>(null);

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const cancelRef = useRef(false);
  const [currentSendingName, setCurrentSendingName] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState(company.email || '');
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Helper to build recipient state with revision and version detection
  const mapItemToRecipient = (item: CalculatedPayrollItem): EmailRecipientState => {
    const emp = employees.find(e => e.id === item.employeeId || e.code === item.employeeCode);
    const email = (emp?.email || '').trim();
    const prior = emailedPayslips[`${periodKey}_${item.employeeId}`];
    const sendCount = prior?.sendCount ?? (prior?.sentAt ? 1 : 0);
    const priorNet = prior?.netPayAtSend;
    const isRevised = Boolean(prior && priorNet !== undefined && Math.abs(priorNet - item.netTakeHome) > 0.5);

    const history: EmailSendHistoryItem[] = prior?.history && prior.history.length > 0 
      ? prior.history 
      : (prior?.sentAt ? [{
          sentAt: prior.sentAt,
          recipientEmail: prior.recipientEmail,
          messageId: prior.messageId,
          version: prior.version || 1,
          status: 'sent' as const,
          netPay: prior.netPayAtSend ?? item.netTakeHome,
          sentBy: 'Administrator',
        }] : []);

    return {
      employeeId: item.employeeId,
      employeeCode: item.employeeCode,
      payeNumber: emp?.payeNumber || '',
      pensionNumber: emp?.pensionNumber || '',
      fullName: item.fullName,
      department: item.department || 'General',
      email,
      netPay: item.netTakeHome,
      item,
      // Auto-select if not yet sent OR if calculation was revised since prior send!
      selected: Boolean(email && (!prior || isRevised)),
      status: prior ? 'sent' : (email ? 'idle' : 'no-email'),
      lastSentAt: prior?.sentAt,
      sendCount,
      version: prior?.version,
      priorNetPay: priorNet,
      isRevised,
      history,
    };
  };

  // Initialize recipient rows with persistent sent-status tracking & version history
  const [recipients, setRecipients] = useState<EmailRecipientState[]>(() => items.map(mapItemToRecipient));

  // Re-sync if items, employees, or period changes
  useEffect(() => {
    setRecipients(items.map(mapItemToRecipient));
  }, [items, employees, periodKey, emailedPayslips]);

  if (!isOpen) return null;

  const isConfigured = 
    (emailSettings.provider === 'smtp' && Boolean(emailSettings.smtp.host && emailSettings.smtp.user && emailSettings.smtp.pass)) ||
    (emailSettings.provider === 'resend' && Boolean(emailSettings.resend.apiKey));

  const totalCount = recipients.length;
  const withEmailCount = recipients.filter(r => Boolean(r.email)).length;
  const missingEmailCount = totalCount - withEmailCount;
  const selectedCount = recipients.filter(r => r.selected).length;
  const sentCount = recipients.filter(r => r.status === 'sent').length;
  const pendingCount = recipients.filter(r => r.status !== 'sent' || r.isRevised).length;
  const revisedCount = recipients.filter(r => r.isRevised || r.sendCount > 1).length;
  const failedCount = recipients.filter(r => r.status === 'failed').length;

  const filteredRecipients = recipients.filter(r => {
    const matchesSearch = 
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterMissingEmail && r.email) return false;
    if (tabFilter === 'pending' && r.status === 'sent' && !r.isRevised) return false;
    if (tabFilter === 'sent' && r.status !== 'sent') return false;
    if (tabFilter === 'revised' && !(r.isRevised || r.sendCount > 1)) return false;

    return matchesSearch;
  });

  const isAllFilteredSelected = 
    filteredRecipients.length > 0 && 
    filteredRecipients.every(r => r.selected || !r.email);

  const handleToggleSelectAll = () => {
    const nextVal = !isAllFilteredSelected;
    setRecipients(prev => prev.map(r => {
      if (filteredRecipients.some(fr => fr.employeeId === r.employeeId) && r.email) {
        return { ...r, selected: nextVal };
      }
      return r;
    }));
  };

  const handleSelectPendingOnly = () => {
    setRecipients(prev => prev.map(r => ({
      ...r,
      selected: Boolean(r.email && (r.status !== 'sent' || r.isRevised)),
    })));
  };

  const handleToggleSelectOne = (empId: string) => {
    setRecipients(prev => prev.map(r => {
      if (r.employeeId === empId) {
        return { ...r, selected: !r.selected };
      }
      return r;
    }));
  };

  const handleSaveInlineEmail = (empId: string) => {
    const cleanEmail = tempEmailVal.trim();
    setRecipients(prev => prev.map(r => {
      if (r.employeeId === empId) {
        return {
          ...r,
          email: cleanEmail,
          selected: Boolean(cleanEmail),
          status: cleanEmail ? 'idle' : 'no-email',
        };
      }
      return r;
    }));

    if (onUpdateEmployeeEmail && cleanEmail) {
      onUpdateEmployeeEmail(empId, cleanEmail);
    }
    setEditingEmpId(null);
  };

  // Variable helper tags to insert into textarea
  const insertToken = (token: string) => {
    setBody(prev => prev + ` {{${token}}}`);
  };

  // Send Test Email to Admin
  const handleSendTest = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setTestFeedback({ type: 'error', message: 'Enter a valid test email address.' });
      return;
    }

    const sampleItem = items[0];
    if (!sampleItem) {
      setTestFeedback({ type: 'error', message: 'No employee payroll items available.' });
      return;
    }

    setTestSending(true);
    setTestFeedback(null);

    try {
      const res = await sendIndividualPayslipEmail({
        settings: emailSettings,
        company,
        item: sampleItem,
        recipientEmail: testEmailAddress,
        monthLabel,
        year,
        config: payslipDesign,
        subjectTemplate: `[TEST SAMPLE] ${subject}`,
        bodyTemplate: body,
        attachPdf,
      });

      if (res.success) {
        setTestFeedback({ 
          type: 'success', 
          message: `Sample test payslip delivered to ${testEmailAddress}! Check your inbox.` 
        });
      } else {
        setTestFeedback({ 
          type: 'error', 
          message: res.error || 'Failed to send test email. Verify SMTP settings.' 
        });
      }
    } catch (err: any) {
      setTestFeedback({ type: 'error', message: err?.message || 'Error sending test email.' });
    } finally {
      setTestSending(false);
    }
  };

  // Single Employee Resend
  const handleResendSingle = async (rec: EmailRecipientState) => {
    if (!isLocked) {
      alert(`Cannot send payslip: ${monthLabel} ${year} payroll has not been finalized and locked yet. Please finalize and lock the payroll cycle before emailing payslips.`);
      return;
    }
    if (!isConfigured) {
      alert(isActualAdmin 
        ? 'Please configure your Email Delivery settings (SMTP or Resend API) first.' 
        : 'Email Delivery is not configured. Please contact an Administrator.'
      );
      if (onOpenSettings && isActualAdmin) onOpenSettings();
      return;
    }
    if (!rec.email) {
      alert(`Cannot send payslip: ${rec.fullName} has no email address configured.`);
      return;
    }

    const nextVer = (rec.version || 1) + (rec.sendCount > 0 ? 1 : 0);
    const confirmPrompt = rec.sendCount > 0
      ? `Resend official ${monthLabel} ${year} payslip to ${rec.fullName} (${rec.email})?\n\nThis will be logged as dispatch #${rec.sendCount + 1} (Version v${nextVer}) in the audit history.`
      : `Send official ${monthLabel} ${year} payslip to ${rec.fullName} (${rec.email})?`;

    if (!confirm(confirmPrompt)) return;

    setResendingEmpId(rec.employeeId);
    try {
      const emailSubject = rec.sendCount > 0 && !subject.toUpperCase().includes('REVISE')
        ? `[REVISED v${nextVer}] ${subject}`
        : subject;

      const result: EmailDispatchResult = await sendIndividualPayslipEmail({
        settings: emailSettings,
        company,
        item: rec.item,
        recipientEmail: rec.email,
        monthLabel,
        year,
        config: payslipDesign,
        subjectTemplate: emailSubject,
        bodyTemplate: body,
        attachPdf,
      });

      if (result.success) {
        const newHistoryItem: EmailSendHistoryItem = {
          sentAt: new Date().toISOString(),
          recipientEmail: rec.email,
          messageId: result.messageId,
          version: nextVer,
          status: 'sent',
          netPay: rec.netPay,
          sentBy: currentUser?.name || currentUser?.email || 'Administrator',
        };

        const updatedHistory: EmailSendHistoryItem[] = [
          ...(rec.history || []),
          newHistoryItem,
        ];

        const sentRecord: EmailedPayslipRecord = {
          employeeId: rec.employeeId,
          periodKey,
          sentAt: newHistoryItem.sentAt,
          recipientEmail: rec.email,
          messageId: result.messageId,
          version: nextVer,
          sendCount: rec.sendCount + 1,
          netPayAtSend: rec.netPay,
          history: updatedHistory,
        };
        onRecordEmailedPayslips?.([sentRecord]);

        setRecipients(prev => prev.map(r => 
          r.employeeId === rec.employeeId 
            ? { 
                ...r, 
                status: 'sent', 
                messageId: result.messageId, 
                lastSentAt: sentRecord.sentAt,
                sendCount: rec.sendCount + 1,
                version: nextVer,
                priorNetPay: rec.netPay,
                isRevised: false,
                history: updatedHistory,
              } 
            : r
        ));
      } else {
        alert(`Failed to send email to ${rec.fullName}: ${result.error || 'Delivery failed'}`);
      }
    } catch (err: any) {
      alert(`Error sending email to ${rec.fullName}: ${err?.message || 'Dispatch error'}`);
    } finally {
      setResendingEmpId(null);
    }
  };

  // Bulk Dispatch Loop with version control and resend handling
  const handleStartDispatch = async () => {
    if (!isLocked) {
      alert(`Cannot dispatch payslips: ${monthLabel} ${year} payroll has not been finalized and locked yet. Please finalize and lock the payroll cycle before emailing payslips.`);
      return;
    }
    const toSend = recipients.filter(r => r.selected && r.email);
    if (toSend.length === 0) {
      alert('Please select at least one employee with a valid email address.');
      return;
    }

    if (!isConfigured) {
      alert(isActualAdmin 
        ? 'Please configure your Email Delivery settings (SMTP or Resend API) first.' 
        : 'Email Delivery is not configured. Please contact an Administrator.'
      );
      if (onOpenSettings && isActualAdmin) onOpenSettings();
      return;
    }

    const resendCount = toSend.filter(r => r.sendCount > 0).length;
    const confirmPrompt = resendCount > 0
      ? `Are you ready to email official ${monthLabel} ${year} payslips to ${toSend.length} employee(s)?\n\nNotice: ${resendCount} employee(s) were previously dispatched. An updated revision will be dispatched and tracked in their version control history.`
      : `Are you ready to email official ${monthLabel} ${year} payslips to ${toSend.length} employee(s)?`;

    if (!confirm(confirmPrompt)) {
      return;
    }

    setIsSending(true);
    setIsCancelled(false);
    cancelRef.current = false;

    // Mark selected as idle before dispatch
    setRecipients(prev => prev.map(r => {
      if (r.selected && r.email) {
        return { ...r, status: 'idle', error: undefined };
      }
      return r;
    }));

    for (let i = 0; i < toSend.length; i++) {
      if (cancelRef.current) {
        break;
      }

      const rec = toSend[i];
      setCurrentSendingName(rec.fullName);

      // Update state to sending
      setRecipients(prev => prev.map(r => r.employeeId === rec.employeeId ? { ...r, status: 'sending' } : r));

      try {
        const nextVer = (rec.version || 1) + (rec.sendCount > 0 ? 1 : 0);
        const emailSubject = rec.sendCount > 0 && !subject.toUpperCase().includes('REVISE')
          ? `[REVISED v${nextVer}] ${subject}`
          : subject;

        const result: EmailDispatchResult = await sendIndividualPayslipEmail({
          settings: emailSettings,
          company,
          item: rec.item,
          recipientEmail: rec.email,
          monthLabel,
          year,
          config: payslipDesign,
          subjectTemplate: emailSubject,
          bodyTemplate: body,
          attachPdf,
        });

        if (result.success) {
          const newHistoryItem: EmailSendHistoryItem = {
            sentAt: new Date().toISOString(),
            recipientEmail: rec.email,
            messageId: result.messageId,
            version: nextVer,
            status: 'sent',
            netPay: rec.netPay,
            sentBy: currentUser?.name || currentUser?.email || 'Administrator',
          };

          const updatedHistory: EmailSendHistoryItem[] = [
            ...(rec.history || []),
            newHistoryItem,
          ];

          const sentRecord: EmailedPayslipRecord = {
            employeeId: rec.employeeId,
            periodKey,
            sentAt: newHistoryItem.sentAt,
            recipientEmail: rec.email,
            messageId: result.messageId,
            version: nextVer,
            sendCount: rec.sendCount + 1,
            netPayAtSend: rec.netPay,
            history: updatedHistory,
          };
          onRecordEmailedPayslips?.([sentRecord]);

          setRecipients(prev => prev.map(r => 
            r.employeeId === rec.employeeId 
              ? { 
                  ...r, 
                  status: 'sent', 
                  messageId: result.messageId, 
                  lastSentAt: sentRecord.sentAt,
                  sendCount: rec.sendCount + 1,
                  version: nextVer,
                  priorNetPay: rec.netPay,
                  isRevised: false,
                  history: updatedHistory,
                } 
              : r
          ));
        } else {
          setRecipients(prev => prev.map(r => 
            r.employeeId === rec.employeeId 
              ? { ...r, status: 'failed', error: result.error || 'Delivery failed' } 
              : r
          ));
        }
      } catch (err: any) {
        setRecipients(prev => prev.map(r => 
          r.employeeId === rec.employeeId 
            ? { ...r, status: 'failed', error: err?.message || 'Dispatch error' } 
            : r
        ));
      }

      // Small throttling delay between emails (350ms) to prevent server rate limit triggers
      await new Promise(res => setTimeout(res, 350));
    }

    setIsSending(false);
    setCurrentSendingName('');
  };

  const handleStopDispatch = () => {
    cancelRef.current = true;
    setIsCancelled(true);
  };

  const progressPercent = selectedCount > 0 
    ? Math.round(((sentCount + failedCount) / selectedCount) * 100) 
    : 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:p-5 md:bg-black/60 md:backdrop-blur-xs overflow-hidden animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121215] flex-1 md:flex-initial border-0 md:border md:border-zinc-200 md:dark:border-zinc-800 rounded-none md:rounded-2xl w-full md:max-w-5xl lg:max-w-6xl shadow-2xl flex flex-col h-[100dvh] md:h-auto md:max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-zinc-900/40 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  Email Payslips Studio
                </h2>
                <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 shrink-0">
                  {monthLabel} {year}
                </span>
                <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-medium border shrink-0 ${
                  isConfigured 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                }`}>
                  {isConfigured ? `${emailSettings.provider.toUpperCase()} Ready` : 'Not Configured'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 hidden sm:block">
                Automatically dispatch official encrypted PDF payslips to employee mailboxes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              title="Customize Email Subject, Body & PDF Settings"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Customize Template &amp; PDF</span>
              <span className="sm:hidden">Template</span>
            </button>
            {onOpenSettings && isActualAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                title="Configure Mail Server (SMTP / Resend)"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSending}
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Unlocked / Draft Period Alert Banner */}
        {!isLocked && (
          <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-300/80 dark:border-amber-800 flex items-start sm:items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="leading-relaxed flex-1">
              <strong className="font-semibold text-amber-950 dark:text-amber-100">Payroll Cycle Unlocked:</strong>{' '}
              <span>
                Payslips can only be emailed after this month has been finalized and locked to guarantee immutable calculations. Please finalize and lock payroll before dispatching.
              </span>
            </div>
          </div>
        )}

        {/* Not Configured Banner */}
        {!isConfigured && (
          <div className="px-3.5 sm:px-5 py-2.5 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <strong className="font-semibold text-xs text-amber-900 dark:text-amber-100 truncate">
                Mail Delivery Unconfigured
              </strong>
            </div>
            {onOpenSettings && isActualAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg font-medium text-[11px] shrink-0 transition shadow-2xs cursor-pointer"
              >
                Setup Mail Now
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5">

          {/* Active Sending Progress Bar */}
          {isSending && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="font-semibold text-blue-900 dark:text-blue-100">
                    Dispatching payslips... {currentSendingName ? `Sending to ${currentSendingName}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                    {sentCount + failedCount} / {selectedCount} ({progressPercent}%)
                  </span>
                  <button
                    type="button"
                    onClick={handleStopDispatch}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition"
                  >
                    <StopCircle className="w-3 h-3" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>

              <div className="w-full bg-blue-200 dark:bg-blue-900/60 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Filter Bar & Summary Counters */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search staff, code, email..."
                  className="pl-8 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-xs text-zinc-900 dark:text-zinc-100 w-48 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Tab Filters */}
              <div className="flex items-center gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => setTabFilter('all')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    tabFilter === 'all'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('pending')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    tabFilter === 'pending'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('sent')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    tabFilter === 'sent'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Sent ({sentCount})
                </button>
                {revisedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setTabFilter('revised')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                      tabFilter === 'revised'
                        ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-2xs font-semibold'
                        : 'text-amber-600/80 dark:text-amber-400/80 hover:text-amber-700 dark:hover:text-amber-300'
                    }`}
                  >
                    <span>Revised ({revisedCount})</span>
                  </button>
                )}
              </div>

              {sentCount > 0 && pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleSelectPendingOnly}
                  className="px-2 py-1 rounded text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 font-medium cursor-pointer"
                  title="Select only un-sent staff"
                >
                  Select Pending Only
                </button>
              )}

              {missingEmailCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMissingEmail(!filterMissingEmail)}
                  className={`flex items-center gap-1 px-2 py-1 rounded border transition text-[11px] font-medium ${
                    filterMissingEmail
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                      : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>{missingEmailCount} Missing Email</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500 shrink-0">
              <span>Selected: <strong className="text-zinc-900 dark:text-zinc-100">{selectedCount}</strong></span>
              <span>&bull;</span>
              <span>Sent: <strong className="text-emerald-600">{sentCount}</strong></span>
              {revisedCount > 0 && (
                <>
                  <span>&bull;</span>
                  <span>Revised: <strong className="text-amber-600">{revisedCount}</strong></span>
                </>
              )}
              {failedCount > 0 && (
                <>
                  <span>&bull;</span>
                  <span>Failed: <strong className="text-rose-600">{failedCount}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-[#121215]">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900/90 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 uppercase tracking-wider select-none z-10">
                  <tr>
                    <th className="py-2.5 pl-3.5 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={handleToggleSelectAll}
                        disabled={isSending}
                        className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3 min-w-[200px]">Employee &amp; ID</th>
                    <th className="py-2.5 px-3 w-36">Department</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Email Address</th>
                    <th className="py-2.5 px-3 w-32 text-right">Net Take-Home</th>
                    <th className="py-2.5 px-3 w-28 text-center">Status</th>
                    <th className="py-2.5 px-3 w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                  {filteredRecipients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-400 text-xs">
                        No employees match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRecipients.map(r => {
                      const isEditing = editingEmpId === r.employeeId;
                      const isMenuOpen = activeActionMenuId === r.employeeId;
                      return (
                        <tr 
                          key={r.employeeId}
                          className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                            r.selected ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                          }`}
                        >
                          <td className="py-2.5 pl-3.5 pr-2">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={() => handleToggleSelectOne(r.employeeId)}
                              disabled={!r.email || isSending}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {r.fullName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {r.employeeCode}
                              </span>
                              <span className="text-zinc-300 dark:text-zinc-700">&bull;</span>
                              <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                PAYE: {r.payeNumber || '—'}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-zinc-500">
                            {r.department}
                          </td>

                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="email"
                                  value={tempEmailVal}
                                  onChange={e => setTempEmailVal(e.target.value)}
                                  placeholder="employee@company.com"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveInlineEmail(r.employeeId);
                                    if (e.key === 'Escape') setEditingEmpId(null);
                                  }}
                                  className="px-2 py-0.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-blue-500 rounded focus:outline-none w-48"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineEmail(r.employeeId)}
                                  className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                                  title="Save Email"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEmpId(null)}
                                  className="p-1 rounded text-zinc-400 hover:text-zinc-600"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                {r.email ? (
                                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                    {r.email}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                    No Email Set
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmpId(r.employeeId);
                                    setTempEmailVal(r.email);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-blue-600 transition"
                                  title="Edit / Add Email"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                            {formatNaira(r.netPay)}
                          </td>

                          {/* Status Column: Clean Badges */}
                          <td className="py-2.5 px-3 text-center">
                            {r.isRevised ? (
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                title={`Salary was revised: was ${formatNaira(r.priorNetPay || 0)}, current is ${formatNaira(r.netPay)}`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                <span>Revised</span>
                              </span>
                            ) : r.status === 'sent' ? (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                                title={r.lastSentAt ? `Emailed on ${new Date(r.lastSentAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Dispatched successfully'}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{r.sendCount > 1 ? `Sent ${r.sendCount}x` : `Sent v${r.version || 1}`}</span>
                              </span>
                            ) : r.status === 'sending' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Sending...</span>
                              </span>
                            ) : r.status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50" title={r.error}>
                                <AlertCircle className="w-3 h-3" />
                                <span>Failed</span>
                              </span>
                            ) : r.status === 'idle' ? (
                              <span className="text-[11px] text-zinc-400">
                                Ready
                              </span>
                            ) : (
                              <span className="text-[11px] text-zinc-400">
                                Skipped
                              </span>
                            )}
                          </td>

                          {/* 3-Dot Actions Menu */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="relative inline-block text-left" data-action-menu>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuId(isMenuOpen ? null : r.employeeId);
                                }}
                                disabled={isSending}
                                className={`p-1.5 rounded-md transition cursor-pointer ${
                                  isMenuOpen
                                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                                title="Employee Payslip Actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {isMenuOpen && (
                                <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl py-1 z-30 text-xs animate-in fade-in-50 zoom-in-95 text-left">
                                  {/* Resend / Send Payslip */}
                                  {r.email && (
                                    <button
                                      type="button"
                                      disabled={!isLocked || isSending || resendingEmpId === r.employeeId}
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleResendSingle(r);
                                      }}
                                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                    >
                                      <RotateCcw className={`w-3.5 h-3.5 text-blue-600 shrink-0 ${resendingEmpId === r.employeeId ? 'animate-spin' : ''}`} />
                                      <div className="truncate">
                                        <div>{r.sendCount > 0 ? `Resend (v${(r.version || 1) + 1})` : 'Send Payslip'}</div>
                                        {!isLocked && <div className="text-[9px] text-amber-600 font-medium">Locked Period Req.</div>}
                                      </div>
                                    </button>
                                  )}

                                  {/* Dispatch History */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setHistoryTarget(r);
                                    }}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition"
                                  >
                                    <History className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    <span>Dispatch Logs ({r.history?.length || 0})</span>
                                  </button>

                                  {/* Edit Email */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setEditingEmpId(r.employeeId);
                                      setTempEmailVal(r.email);
                                    }}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    <span>{r.email ? 'Edit Email' : 'Add Email'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Intentional Minimalist Cards View */}
          <div className="block md:hidden space-y-2.5 pb-2">
            {filteredRecipients.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl">
                No employees match the current filter.
              </div>
            ) : (
              filteredRecipients.map(r => {
                const isEditing = editingEmpId === r.employeeId;
                const isMenuOpen = activeActionMenuId === r.employeeId;
                return (
                  <div
                    key={r.employeeId}
                    className={`p-3.5 rounded-xl border transition ${
                      r.selected
                        ? 'bg-blue-50/25 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60'
                        : 'bg-white dark:bg-[#121215] border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={r.selected}
                        onChange={() => handleToggleSelectOne(r.employeeId)}
                        disabled={!r.email || isSending}
                        className="w-4 h-4 rounded mt-0.5 text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700 cursor-pointer disabled:opacity-30"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                            {r.fullName}
                          </span>
                          <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 shrink-0">
                            {formatNaira(r.netPay)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="font-mono text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                            {r.employeeCode}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-medium">
                            PAYE: {r.payeNumber || '—'}
                          </span>
                          <span className="text-[10px] text-zinc-400 truncate">
                            {r.department}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                          {/* Email Display / Inline Edit */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="email"
                                  value={tempEmailVal}
                                  onChange={e => setTempEmailVal(e.target.value)}
                                  placeholder="email@company.com"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveInlineEmail(r.employeeId);
                                    if (e.key === 'Escape') setEditingEmpId(null);
                                  }}
                                  className="px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-900 border border-blue-500 rounded focus:outline-none w-full"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlineEmail(r.employeeId)}
                                  className="p-1 rounded bg-blue-600 text-white shrink-0"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEmpId(null)}
                                  className="p-1 rounded text-zinc-400 shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {r.email ? (
                                  <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                                    {r.email}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                    No Email
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmpId(r.employeeId);
                                    setTempEmailVal(r.email);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-blue-600 transition shrink-0"
                                  title="Edit Email"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Status pill & 3-dot actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {r.isRevised ? (
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                                title={`Revised: was ${formatNaira(r.priorNetPay || 0)}, now ${formatNaira(r.netPay)}`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                <span>Revised</span>
                              </span>
                            ) : r.status === 'sent' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{r.sendCount > 1 ? `Sent ${r.sendCount}x` : `Sent v${r.version || 1}`}</span>
                              </span>
                            ) : r.status === 'sending' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Sending...</span>
                              </span>
                            ) : r.status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50" title={r.error}>
                                <AlertCircle className="w-3 h-3" />
                                <span>Failed</span>
                              </span>
                            ) : r.status === 'idle' ? (
                              <span className="text-[10px] font-medium text-zinc-400">
                                Ready
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400">
                                Skipped
                              </span>
                            )}

                            {/* 3-Dot Mobile Menu */}
                            <div className="relative inline-block text-left" data-action-menu>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuId(isMenuOpen ? null : r.employeeId);
                                }}
                                disabled={isSending}
                                className={`p-1.5 rounded-md transition cursor-pointer ${
                                  isMenuOpen
                                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                                title="Employee Actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {isMenuOpen && (
                                <div className="absolute right-0 bottom-full mb-1 w-48 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-xl py-1 z-30 text-xs animate-in fade-in-50 zoom-in-95 text-left">
                                  {r.email && (
                                    <button
                                      type="button"
                                      disabled={!isLocked || isSending || resendingEmpId === r.employeeId}
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        handleResendSingle(r);
                                      }}
                                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                    >
                                      <RotateCcw className={`w-3.5 h-3.5 text-blue-600 shrink-0 ${resendingEmpId === r.employeeId ? 'animate-spin' : ''}`} />
                                      <div className="truncate">
                                        <div>{r.sendCount > 0 ? `Resend (v${(r.version || 1) + 1})` : 'Send Payslip'}</div>
                                        {!isLocked && <div className="text-[9px] text-amber-600 font-medium">Locked Period Req.</div>}
                                      </div>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setHistoryTarget(r);
                                    }}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition"
                                  >
                                    <History className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    <span>Dispatch Logs ({r.history?.length || 0})</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setEditingEmpId(r.employeeId);
                                      setTempEmailVal(r.email);
                                    }}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    <span>{r.email ? 'Edit Email' : 'Add Email'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-3.5 sm:px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-zinc-50/70 dark:bg-zinc-900/40">
          <div className="text-[11px] text-zinc-500 truncate">
            {isCancelled && <span className="text-rose-600 font-medium">Dispatch cancelled by user.</span>}
            {!isCancelled && (
              <span>
                Sending via <strong>{emailSettings.provider === 'smtp' ? (emailSettings.smtp.host || 'SMTP') : 'Resend Cloud'}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-3 sm:px-3.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition disabled:opacity-40 cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleStartDispatch}
              disabled={isSending || selectedCount === 0 || !isConfigured || !isLocked}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-md text-xs font-semibold shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                !isLocked
                  ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : !isLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Finalize &amp; Lock Required to Send</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch {selectedCount} Payslips</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Dispatch Version History Modal (Rendered via Portal to avoid any clipping/overlap) */}
      {historyTarget && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* History Header */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    Dispatch Version History
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{historyTarget.fullName}</span>
                    <span>&bull;</span>
                    <span className="font-mono text-[11px]">{historyTarget.employeeCode}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* History Overview / Revision Notice */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Target Email:</span>
                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{historyTarget.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Current Net Pay:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatNaira(historyTarget.netPay)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Total Dispatches:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{historyTarget.history?.length || 0} time(s)</span>
              </div>

              {historyTarget.isRevised && (
                <div className="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Revision Detected:</strong> The employee&apos;s current net salary ({formatNaira(historyTarget.netPay)}) differs from what was previously emailed ({formatNaira(historyTarget.priorNetPay || 0)}). A new revision email should be dispatched.
                  </div>
                </div>
              )}
            </div>

            {/* Timeline List */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
              {(!historyTarget.history || historyTarget.history.length === 0) ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No dispatch logs found for this employee in {monthLabel} {year}.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                  {[...historyTarget.history].reverse().map((entry, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={idx} className="relative group">
                        {/* Timeline bullet */}
                        <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-[#121215] ${
                          isLatest
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-zinc-400 dark:border-zinc-600'
                        }`} />

                        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                                Version {entry.version || ((historyTarget.history?.length || 0) - idx)}
                              </span>
                              {isLatest && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                                  Latest
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {formatNaira(entry.netPay ?? 0)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              {new Date(entry.sentAt).toLocaleString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span>By: <strong className="text-zinc-700 dark:text-zinc-300">{entry.sentBy || 'Admin'}</strong></span>
                          </div>

                          <div className="text-[10px] font-mono text-zinc-400 truncate pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                            Sent to: {entry.recipientEmail}
                            {entry.messageId && <span className="ml-2 text-zinc-400">ID: {entry.messageId}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* History Footer */}
            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60 shrink-0">
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={async () => {
                  const target = historyTarget;
                  setHistoryTarget(null);
                  await handleResendSingle(target);
                }}
                disabled={!isLocked || isSending || resendingEmpId === historyTarget.employeeId || !historyTarget.email}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-40 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resendingEmpId === historyTarget.employeeId ? 'animate-spin' : ''}`} />
                <span>Resend Revision (v{(historyTarget.version || 1) + 1})</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Customize Email Template & PDF Pop-Up Modal */}
      {showTemplateModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Template Header */}
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Customize Email Template &amp; PDF
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Configure subject line, personalized body tokens, and PDF attachment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Subject */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Message Body */}
              <div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 mb-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Message Body (Markdown / Plain Text)
                  </label>
                  <div className="flex items-center gap-1 overflow-x-auto text-[10px] pb-1 sm:pb-0">
                    <span className="text-zinc-400 shrink-0">Insert:</span>
                    {['employeeName', 'netPay', 'month', 'year', 'companyName', 'employeeCode'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => insertToken(t)}
                        className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 text-zinc-600 dark:text-zinc-300 font-mono transition shrink-0 cursor-pointer"
                      >
                        +{t}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={5}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-2.5 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-blue-500 leading-relaxed resize-y"
                />
              </div>

              {/* Attach PDF Checkbox */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={attachPdf}
                    onChange={e => setAttachPdf(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                    <Paperclip className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>Attach Official Pixel-Perfect A4 PDF Payslip</span>
                  </div>
                </label>
              </div>

              {/* Send Test Email to Admin */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Send Sample Test Email
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={e => setTestEmailAddress(e.target.value)}
                    placeholder="admin@company.com"
                    className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={testSending || !isConfigured}
                    className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium text-xs transition disabled:opacity-40 whitespace-nowrap flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {testSending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span>{testSending ? 'Sending...' : 'Send Test'}</span>
                  </button>
                </div>
                {testFeedback && (
                  <div className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                    testFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {testFeedback.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{testFeedback.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Template Footer */}
            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50/80 dark:bg-zinc-900/60 shrink-0">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
              >
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};

