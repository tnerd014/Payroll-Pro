import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  MessageCircle, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Settings, 
  Sparkles, 
  RefreshCw,
  ExternalLink,
  Edit2,
  Check,
  AlertTriangle,
  StopCircle,
  History,
  RotateCcw,
  MoreVertical,
  Lock,
  ArrowLeft,
  Smartphone,
  Phone
} from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  CompanyProfile, 
  PayslipDesignConfig, 
  Employee, 
  WhatsAppSettings, 
  DEFAULT_WHATSAPP_SETTINGS,
  DEFAULT_PAYSLIP_DESIGN,
  WhatsAppedPayslipRecord,
  WhatsAppSendHistoryItem,
  TeamMember,
  PayrollSnapshot,
  WhatsAppPayslipContext,
  PayrollVariables,
  PayeTaxVariables
} from '../../types';
import { 
  sendWhatsAppPayslip,
  formatPhoneNumberForWhatsApp,
  buildWhatsAppPayslipData,
  interpolateWhatsAppTemplate
} from '../../services/whatsappService';
import { 
  formatNaira,
  DEFAULT_PAYROLL_VARIABLES,
  DEFAULT_PAYE_VARIABLES,
  calculatePayrollItem,
  isEmployeeActiveForPeriod
} from '../../engine/payePensionEngine';
import { MONTHS } from '../../store/usePayrollStore';

interface WhatsAppRecipientState {
  employeeId: string;
  employeeCode: string;
  payeNumber?: string;
  pensionNumber?: string;
  fullName: string;
  department: string;
  phone: string;
  netPay: number;
  item: CalculatedPayrollItem;
  selected: boolean;
  status: 'idle' | 'sending' | 'sent' | 'failed' | 'no-phone';
  error?: string;
  messageId?: string;
  lastSentAt?: string;
  sendCount: number;
  version?: number;
  priorNetPay?: number;
  isRevised?: boolean;
  history?: WhatsAppSendHistoryItem[];
  periodLabel?: string;
  periodsCount?: number;
}

interface WhatsAppPayslipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CalculatedPayrollItem[];
  employees: Employee[];
  company: CompanyProfile;
  monthLabel: string;
  selectedMonth: string;
  year: number;
  whatsappSettings?: WhatsAppSettings;
  payslipDesign?: PayslipDesignConfig;
  whatsappedPayslips?: Record<string, WhatsAppedPayslipRecord>;
  onRecordWhatsAppedPayslips?: (records: WhatsAppedPayslipRecord[]) => void;
  onOpenSettings?: () => void;
  onUpdateWhatsAppSettings?: (settings: Partial<WhatsAppSettings>) => void;
  onUpdateEmployeePhone?: (employeeId: string, newPhone: string) => void;
  isAdmin?: boolean;
  currentUser?: TeamMember | null;
  activeSnapshot?: PayrollSnapshot;
  isLocked?: boolean;
  initialContext?: WhatsAppPayslipContext | null;
  snapshots?: PayrollSnapshot[];
  payrollVariables?: PayrollVariables;
  payeTaxVariables?: PayeTaxVariables;
}

export const WhatsAppPayslipsModal: React.FC<WhatsAppPayslipsModalProps> = ({
  isOpen,
  onClose,
  items,
  employees,
  company,
  monthLabel,
  selectedMonth,
  year,
  whatsappSettings = DEFAULT_WHATSAPP_SETTINGS,
  payslipDesign = DEFAULT_PAYSLIP_DESIGN,
  whatsappedPayslips = {},
  onRecordWhatsAppedPayslips,
  onOpenSettings,
  onUpdateWhatsAppSettings,
  onUpdateEmployeePhone,
  isAdmin = true,
  currentUser,
  activeSnapshot,
  isLocked = true,
  initialContext,
  snapshots = [],
  payrollVariables,
  payeTaxVariables,
}) => {
  const effectiveYear = initialContext?.year || year;
  const selectedMonthKeys = useMemo(() => {
    if (initialContext?.selectedMonthKeys && initialContext.selectedMonthKeys.length > 0) {
      return initialContext.selectedMonthKeys;
    }
    return [(selectedMonth || 'jan').toLowerCase()];
  }, [initialContext, selectedMonth]);

  const isMultiMonth = selectedMonthKeys.length > 1;

  const effectivePeriodLabel = useMemo(() => {
    if (selectedMonthKeys.length === 1) {
      const m = MONTHS.find(mo => mo.key === selectedMonthKeys[0]);
      return `${m?.label || monthLabel} ${effectiveYear}`;
    }
    if (selectedMonthKeys.length === 12) {
      return `All 12 Months ${effectiveYear}`;
    }
    const sorted = MONTHS.filter(m => selectedMonthKeys.includes(m.key));
    const indices = sorted.map(m => MONTHS.findIndex(mo => mo.key === m.key)).sort((a, b) => a - b);
    const isRange = indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
    if (isRange && sorted.length >= 2) {
      return `${sorted[0].label}–${sorted[sorted.length - 1].label} ${effectiveYear}`;
    }
    return `${sorted.map(m => m.label.slice(0, 3)).join(', ')} ${effectiveYear}`;
  }, [selectedMonthKeys, effectiveYear, monthLabel]);

  const periodKey = `${effectiveYear}-${(selectedMonthKeys[0] || selectedMonth || '').toLowerCase()}`;
  const isActualAdmin = Boolean(isAdmin && (!currentUser || currentUser.role === 'Admin'));
  const canDispatch = isLocked || Boolean(initialContext);

  // Message template state
  const [messageTemplate, setMessageTemplate] = useState(
    whatsappSettings.defaultMessageTemplate || DEFAULT_WHATSAPP_SETTINGS.defaultMessageTemplate
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [tabFilter, setTabFilter] = useState<'all' | 'pending' | 'sent' | 'revised'>('all');
  const [filterMissingPhone, setFilterMissingPhone] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // 3-dot menu state
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  useEffect(() => {
    if (!activeActionMenuId) return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu]') && !target.closest('[data-action-dropdown]')) {
        setActiveActionMenuId(null);
        setMenuCoords(null);
      }
    };
    const handleScrollOrResize = () => {
      setActiveActionMenuId(null);
      setMenuCoords(null);
    };
    document.addEventListener('mousedown', handleGlobalClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeActionMenuId]);

  // Inline editing of phone
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [tempPhoneVal, setTempPhoneVal] = useState('');

  // History & Resend modal state
  const [historyTarget, setHistoryTarget] = useState<WhatsAppRecipientState | null>(null);
  const [resendingEmpId, setResendingEmpId] = useState<string | null>(null);

  // Sending state
  const [isSending, setIsSending] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const cancelRef = useRef(false);
  const [currentSendingName, setCurrentSendingName] = useState('');
  const [testPhoneNumber, setTestPhoneNumber] = useState(company.phone || '');
  const [testSending, setTestSending] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Configuration check
  const provider = whatsappSettings.provider || 'direct';
  const isApiConfigured = useMemo(() => {
    if (provider === 'cloud_api') {
      return Boolean(whatsappSettings.cloudApi?.phoneNumberId && whatsappSettings.cloudApi?.accessToken);
    }
    if (provider === 'ultramsg') {
      return Boolean(whatsappSettings.ultramsg?.instanceId && whatsappSettings.ultramsg?.token);
    }
    if (provider === 'termii') {
      return Boolean(whatsappSettings.termii?.apiKey);
    }
    return true; // direct wa.me is always technically ready
  }, [provider, whatsappSettings]);

  const isWhatsAppActive = Boolean(whatsappSettings?.isActive ?? whatsappSettings?.enabled ?? true);
  const isConfigured = isWhatsAppActive && isApiConfigured;

  // Build recipient state
  const buildRecipientList = (): WhatsAppRecipientState[] => {
    const pv = payrollVariables || DEFAULT_PAYROLL_VARIABLES;
    const pt = payeTaxVariables || DEFAULT_PAYE_VARIABLES;

    const sourceEmployees = 
      employees && employees.length > 0
        ? employees.map(e => ({
            id: e.id,
            code: e.code,
            fullName: `${e.firstName} ${e.lastName}`.trim(),
            department: e.department || 'General',
            phone: (e.phone || '').trim(),
            payeNumber: e.payeNumber,
            pensionNumber: e.pensionNumber,
            monthlyGross: e.monthlyGross,
            empObj: e,
          }))
        : items.map(i => ({
            id: i.employeeId,
            code: i.employeeCode,
            fullName: i.fullName,
            department: i.department || 'General',
            phone: '',
            payeNumber: i.payeNumber,
            pensionNumber: i.pensionNumber,
            monthlyGross: i.monthlyGross,
            empObj: undefined as Employee | undefined,
          }));

    return sourceEmployees.map(emp => {
      const phone = emp.phone;
      const validPhone = formatPhoneNumberForWhatsApp(phone);
      const hasValidPhone = Boolean(validPhone && validPhone.length >= 10);

      // Period resolution
      const fallbackItem = items.find(i => i.employeeId === emp.id || i.employeeCode === emp.code);
      let primaryItem: CalculatedPayrollItem;
      if (fallbackItem) {
        primaryItem = fallbackItem;
      } else if (emp.empObj) {
        primaryItem = calculatePayrollItem(emp.empObj, pv, pt, selectedMonthKeys[0] || 'jan', effectiveYear);
      } else {
        primaryItem = {
          employeeId: emp.id,
          employeeCode: emp.code,
          fullName: emp.fullName,
          department: emp.department,
          monthlyGross: emp.monthlyGross,
          basic: emp.monthlyGross * 0.4,
          housing: emp.monthlyGross * 0.2,
          transport: emp.monthlyGross * 0.1,
          otherAllowances: emp.monthlyGross * 0.3,
          monthlyPaye: 0,
          employeePension: 0,
          employerPension: 0,
          netTakeHome: emp.monthlyGross,
          totalDeductions: 0,
          totalAllowances: emp.monthlyGross,
          daysWorked: 30,
          annualGross: emp.monthlyGross * 12,
          cra: 0,
          taxableIncome: 0,
          annualTax: 0,
        } as unknown as CalculatedPayrollItem;
      }

      const totalNetPay = primaryItem.netTakeHome;
      const prior = whatsappedPayslips[`${periodKey}_${emp.id}`];
      const sendCount = prior?.sendCount ?? (prior?.sentAt ? 1 : 0);
      const priorNet = prior?.netPayAtSend;
      const isRevised = Boolean(prior && priorNet !== undefined && Math.abs(priorNet - totalNetPay) > 0.5);

      const history: WhatsAppSendHistoryItem[] = prior?.history && prior.history.length > 0
        ? prior.history
        : (prior?.sentAt ? [{
            sentAt: prior.sentAt,
            recipientPhone: prior.recipientPhone || phone,
            messageId: prior.messageId,
            version: prior.version || 1,
            status: 'sent' as const,
            netPay: prior.netPayAtSend ?? totalNetPay,
            sentBy: 'Administrator',
          }] : []);

      const isPreSelected = initialContext?.selectedEmployeeIds && initialContext.selectedEmployeeIds.length > 0
        ? initialContext.selectedEmployeeIds.includes(emp.id)
        : Boolean(hasValidPhone && (!prior || isRevised));

      return {
        employeeId: emp.id,
        employeeCode: emp.code,
        payeNumber: emp.payeNumber || '',
        pensionNumber: emp.pensionNumber || '',
        fullName: emp.fullName,
        department: emp.department,
        phone,
        netPay: totalNetPay,
        item: primaryItem,
        selected: Boolean(hasValidPhone && isPreSelected),
        status: prior ? 'sent' : (hasValidPhone ? 'idle' : 'no-phone'),
        lastSentAt: prior?.sentAt,
        sendCount,
        version: prior?.version,
        priorNetPay: priorNet,
        isRevised,
        history,
        periodLabel: effectivePeriodLabel,
        periodsCount: 1,
      };
    });
  };

  const [recipients, setRecipients] = useState<WhatsAppRecipientState[]>(() => buildRecipientList());

  useEffect(() => {
    setRecipients(prev => {
      const prevMap = new Map(prev.map(p => [p.employeeId, p]));
      const nextList = buildRecipientList();
      return nextList.map(mapped => {
        const existing = prevMap.get(mapped.employeeId);
        if (existing) {
          return {
            ...mapped,
            selected: existing.selected,
            phone: mapped.phone || existing.phone,
            status: (existing.status === 'sending' || existing.status === 'failed') ? existing.status : mapped.status,
          };
        }
        return mapped;
      });
    });
  }, [items, employees, periodKey, whatsappedPayslips, initialContext]);

  if (!isOpen) return null;

  const totalCount = recipients.length;
  const withPhoneCount = recipients.filter(r => Boolean(formatPhoneNumberForWhatsApp(r.phone))).length;
  const missingPhoneCount = totalCount - withPhoneCount;
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
      r.phone.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterMissingPhone && r.phone && formatPhoneNumberForWhatsApp(r.phone).length >= 10) return false;
    if (tabFilter === 'pending' && r.status === 'sent' && !r.isRevised) return false;
    if (tabFilter === 'sent' && r.status !== 'sent') return false;
    if (tabFilter === 'revised' && !(r.isRevised || r.sendCount > 1)) return false;

    return matchesSearch;
  });

  const isAllFilteredSelected = 
    filteredRecipients.length > 0 && 
    filteredRecipients.every(r => r.selected || !formatPhoneNumberForWhatsApp(r.phone));

  const handleToggleSelectAll = () => {
    const nextVal = !isAllFilteredSelected;
    setRecipients(prev => prev.map(r => {
      if (filteredRecipients.some(fr => fr.employeeId === r.employeeId) && formatPhoneNumberForWhatsApp(r.phone)) {
        return { ...r, selected: nextVal };
      }
      return r;
    }));
  };

  const handleSelectPendingOnly = () => {
    setRecipients(prev => prev.map(r => ({
      ...r,
      selected: Boolean(formatPhoneNumberForWhatsApp(r.phone) && (r.status !== 'sent' || r.isRevised)),
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

  const handleSaveInlinePhone = (empId: string) => {
    const cleanPhone = tempPhoneVal.trim();
    setRecipients(prev => prev.map(r => {
      if (r.employeeId === empId) {
        const hasPhone = Boolean(formatPhoneNumberForWhatsApp(cleanPhone).length >= 10);
        return {
          ...r,
          phone: cleanPhone,
          selected: hasPhone,
          status: hasPhone ? 'idle' : 'no-phone',
        };
      }
      return r;
    }));

    if (onUpdateEmployeePhone && cleanPhone) {
      onUpdateEmployeePhone(empId, cleanPhone);
    }
    setEditingEmpId(null);
  };

  const insertToken = (token: string) => {
    setMessageTemplate(prev => prev + ` {{${token}}}`);
  };

  // Test Dispatch
  const handleSendTest = async () => {
    const cleanPhone = formatPhoneNumberForWhatsApp(testPhoneNumber);
    if (!cleanPhone || cleanPhone.length < 10) {
      setTestFeedback({ type: 'error', message: 'Enter a valid test WhatsApp phone number.' });
      return;
    }

    const sampleRec = recipients[0];
    const sampleItem = sampleRec?.item || items[0];
    if (!sampleItem) {
      setTestFeedback({ type: 'error', message: 'No employee payroll items available.' });
      return;
    }

    setTestSending(true);
    setTestFeedback(null);

    try {
      const activeSettings: WhatsAppSettings = {
        ...whatsappSettings,
        defaultMessageTemplate: messageTemplate,
      };

      const res = await sendWhatsAppPayslip({
        item: sampleItem,
        company,
        monthLabel: sampleRec?.periodLabel || effectivePeriodLabel,
        year: effectiveYear,
        phone: cleanPhone,
        settings: activeSettings,
        config: payslipDesign,
      }, provider === 'direct');

      if (res.success) {
        setTestFeedback({ 
          type: 'success', 
          message: provider === 'direct' 
            ? `Direct WhatsApp chat link opened for ${cleanPhone}!` 
            : `Sample test payslip dispatched via API to ${cleanPhone}!` 
        });
      } else {
        setTestFeedback({ 
          type: 'error', 
          message: res.error || 'Failed to dispatch test WhatsApp payslip.' 
        });
      }
    } catch (err: any) {
      setTestFeedback({ type: 'error', message: err?.message || 'Error sending test WhatsApp payslip.' });
    } finally {
      setTestSending(false);
    }
  };

  // Single Dispatch
  const handleResendSingle = async (rec: WhatsAppRecipientState) => {
    if (!canDispatch) {
      alert(`Cannot dispatch payslip: ${effectivePeriodLabel} payroll has not been finalized and locked yet. Please finalize and lock the payroll cycle before dispatching.`);
      return;
    }
    const cleanPhone = formatPhoneNumberForWhatsApp(rec.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      alert(`Cannot dispatch payslip: ${rec.fullName} does not have a valid phone number.`);
      return;
    }

    const nextVer = (rec.version || 1) + (rec.sendCount > 0 ? 1 : 0);
    const confirmPrompt = rec.sendCount > 0
      ? `Resend official ${rec.periodLabel || effectivePeriodLabel} WhatsApp payslip to ${rec.fullName} (${rec.phone})?\n\nThis will be logged as dispatch #${rec.sendCount + 1} (Version v${nextVer}) in the audit history.`
      : `Send official ${rec.periodLabel || effectivePeriodLabel} WhatsApp payslip to ${rec.fullName} (${rec.phone})?`;

    if (!confirm(confirmPrompt)) return;

    setResendingEmpId(rec.employeeId);
    try {
      const activeSettings: WhatsAppSettings = {
        ...whatsappSettings,
        defaultMessageTemplate: messageTemplate,
      };

      const result = await sendWhatsAppPayslip({
        item: rec.item,
        company,
        monthLabel: rec.periodLabel || effectivePeriodLabel,
        year: effectiveYear,
        phone: rec.phone,
        settings: activeSettings,
        config: payslipDesign,
      }, provider === 'direct');

      if (result.success) {
        const newHistoryItem: WhatsAppSendHistoryItem = {
          sentAt: new Date().toISOString(),
          recipientPhone: rec.phone,
          messageId: result.messageId,
          version: nextVer,
          status: 'sent',
          netPay: rec.netPay,
          sentBy: currentUser?.name || currentUser?.email || 'Administrator',
        };

        const updatedHistory: WhatsAppSendHistoryItem[] = [
          ...(rec.history || []),
          newHistoryItem,
        ];

        const sentRecord: WhatsAppedPayslipRecord = {
          employeeId: rec.employeeId,
          periodKey,
          sentAt: newHistoryItem.sentAt,
          recipientPhone: rec.phone,
          messageId: result.messageId,
          version: nextVer,
          sendCount: rec.sendCount + 1,
          netPayAtSend: rec.netPay,
          history: updatedHistory,
        };
        onRecordWhatsAppedPayslips?.([sentRecord]);

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
        alert(`Failed to send WhatsApp to ${rec.fullName}: ${result.error || 'Delivery failed'}`);
      }
    } catch (err: any) {
      alert(`Error sending WhatsApp to ${rec.fullName}: ${err?.message || 'Dispatch error'}`);
    } finally {
      setResendingEmpId(null);
    }
  };

  // Bulk Dispatch Loop
  const handleStartDispatch = async () => {
    if (!canDispatch) {
      alert(`Cannot dispatch payslips: ${effectivePeriodLabel} payroll has not been finalized and locked yet. Please finalize and lock the payroll cycle before dispatching.`);
      return;
    }
    const toSend = recipients.filter(r => r.selected && formatPhoneNumberForWhatsApp(r.phone));
    if (toSend.length === 0) {
      alert('Please select at least one employee with a valid WhatsApp phone number.');
      return;
    }

    const resendCount = toSend.filter(r => r.sendCount > 0).length;
    const isDirect = provider === 'direct';
    const confirmPrompt = isDirect
      ? `Notice: You are using Direct WhatsApp (wa.me) mode. Dispatching will prepare chats sequentially.\n\nReady to proceed with ${toSend.length} employee(s)?`
      : resendCount > 0
      ? `Are you ready to dispatch official WhatsApp payslips via ${provider === 'cloud_api' ? 'Meta Cloud API' : provider === 'ultramsg' ? 'UltraMsg' : 'Termii'} to ${toSend.length} employee(s)?\n\nNotice: ${resendCount} employee(s) were previously dispatched. An updated revision will be dispatched and tracked in their version history.`
      : `Are you ready to dispatch official WhatsApp payslips via ${provider === 'cloud_api' ? 'Meta Cloud API' : provider === 'ultramsg' ? 'UltraMsg' : 'Termii'} to ${toSend.length} employee(s)?`;

    if (!confirm(confirmPrompt)) {
      return;
    }

    setIsSending(true);
    setIsCancelled(false);
    cancelRef.current = false;

    // Mark selected as idle before dispatch
    setRecipients(prev => prev.map(r => {
      if (r.selected && formatPhoneNumberForWhatsApp(r.phone)) {
        return { ...r, status: 'idle', error: undefined };
      }
      return r;
    }));

    const activeSettings: WhatsAppSettings = {
      ...whatsappSettings,
      defaultMessageTemplate: messageTemplate,
    };

    for (let i = 0; i < toSend.length; i++) {
      if (cancelRef.current) break;

      const rec = toSend[i];
      setCurrentSendingName(rec.fullName);

      setRecipients(prev => prev.map(r => r.employeeId === rec.employeeId ? { ...r, status: 'sending' } : r));

      try {
        const nextVer = (rec.version || 1) + (rec.sendCount > 0 ? 1 : 0);

        const result = await sendWhatsAppPayslip({
          item: rec.item,
          company,
          monthLabel: rec.periodLabel || effectivePeriodLabel,
          year: effectiveYear,
          phone: rec.phone,
          settings: activeSettings,
          config: payslipDesign,
        }, isDirect);

        if (result.success) {
          const newHistoryItem: WhatsAppSendHistoryItem = {
            sentAt: new Date().toISOString(),
            recipientPhone: rec.phone,
            messageId: result.messageId,
            version: nextVer,
            status: 'sent',
            netPay: rec.netPay,
            sentBy: currentUser?.name || currentUser?.email || 'Administrator',
          };

          const updatedHistory: WhatsAppSendHistoryItem[] = [
            ...(rec.history || []),
            newHistoryItem,
          ];

          const sentRecord: WhatsAppedPayslipRecord = {
            employeeId: rec.employeeId,
            periodKey,
            sentAt: newHistoryItem.sentAt,
            recipientPhone: rec.phone,
            messageId: result.messageId,
            version: nextVer,
            sendCount: rec.sendCount + 1,
            netPayAtSend: rec.netPay,
            history: updatedHistory,
          };
          onRecordWhatsAppedPayslips?.([sentRecord]);

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

      // Small throttling delay between messages (400ms)
      await new Promise(res => setTimeout(res, 400));
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
    <div className="fixed top-0 md:top-9 inset-x-0 bottom-0 z-50 flex flex-col animate-in fade-in duration-150 overflow-hidden">
      <div className="app-surface-card bg-white dark:bg-[#121215] flex flex-col w-full h-full overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-3 sm:px-5 py-3 sm:py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 shrink-0 bg-zinc-50/70 dark:bg-zinc-900/40">

          {/* Back button */}
          <button
            onClick={onClose}
            disabled={isSending}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
            title="Back (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <span className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 shrink-0" />

          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  WhatsApp Payslips Studio
                </h2>
                <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0">
                  {effectivePeriodLabel}
                </span>
                {isMultiMonth && (
                  <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                    <Smartphone className="w-3 h-3" />
                    {selectedMonthKeys.length} Months
                  </span>
                )}
                <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded font-medium border shrink-0 ${
                  isConfigured 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                    : provider === 'direct'
                    ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                }`}>
                  {provider === 'cloud_api' ? 'Meta Cloud API Ready' : provider === 'ultramsg' ? 'UltraMsg Ready' : provider === 'termii' ? 'Termii Ready' : 'Direct Link (wa.me)'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 hidden sm:block">
                Dispatch official payslip breakdown messages &amp; downloadable vouchers directly to employee WhatsApp lines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              title="Customize WhatsApp Message Template"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">Customize Template</span>
            </button>
            {onOpenSettings && isActualAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                title="Configure WhatsApp API Settings"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 ml-1 disabled:opacity-40"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Unlocked / Draft Period Alert Banner */}
        {!canDispatch && (
          <div className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-300/80 dark:border-amber-800 flex items-start sm:items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="leading-relaxed flex-1">
              <strong className="font-semibold text-amber-950 dark:text-amber-100">Payroll Cycle Unlocked:</strong>{' '}
              <span>
                Payslips can only be dispatched via WhatsApp after this month has been finalized and locked to guarantee immutable calculations. Please finalize and lock payroll before dispatching.
              </span>
            </div>
          </div>
        )}

        {/* Not Active Warning Banner */}
        {!isWhatsAppActive && (
          <div className="px-3.5 sm:px-5 py-2.5 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <strong className="font-semibold text-xs text-amber-900 dark:text-amber-100 truncate">
                WhatsApp Dispatch Engine is Currently Disabled in Settings
              </strong>
            </div>
            {isActualAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                {onUpdateWhatsAppSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateWhatsAppSettings({ enabled: true, isActive: true });
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg font-medium text-[11px] shrink-0 transition shadow-2xs cursor-pointer"
                  >
                    Enable WhatsApp
                  </button>
                )}
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="px-2.5 py-1.5 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg font-medium text-[11px] shrink-0 transition cursor-pointer"
                  >
                    Open Settings
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5">

          {/* Active Sending Progress Bar */}
          {isSending && (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                  <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                    Dispatching WhatsApp payslips... {currentSendingName ? `Sending to ${currentSendingName}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {sentCount + failedCount} / {selectedCount} ({progressPercent}%)
                  </span>
                  <button
                    type="button"
                    onClick={handleStopDispatch}
                    className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition cursor-pointer"
                  >
                    <StopCircle className="w-3 h-3" />
                    <span>Stop</span>
                  </button>
                </div>
              </div>

              <div className="w-full bg-emerald-200 dark:bg-emerald-900/60 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Filter Bar & Counters */}
          <div className="hidden md:flex flex-row justify-between items-center gap-2 text-xs pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search staff, code, phone..."
                  className="pl-8 pr-7 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-xs text-zinc-900 dark:text-zinc-100 w-48 focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Tab Filters */}
              <div className="flex items-center gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => setTabFilter('all')}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
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
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
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
                  className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
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
                    className={`px-2 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 cursor-pointer ${
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
                  className="px-2 py-1 rounded text-[11px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 font-medium cursor-pointer"
                  title="Select only un-sent staff"
                >
                  Select Pending Only
                </button>
              )}

              {missingPhoneCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMissingPhone(!filterMissingPhone)}
                  className={`flex items-center gap-1 px-2 py-1 rounded border transition text-[11px] font-medium cursor-pointer ${
                    filterMissingPhone
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                      : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>{missingPhoneCount} Missing Phone</span>
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

          {/* ── MOBILE Filter Bar (below md) ── */}
          <div className="flex md:hidden flex-col gap-2 pt-1 text-xs">
            {/* Row 1: Select-All checkbox + counters */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllFilteredSelected}
                  onChange={handleToggleSelectAll}
                  disabled={isSending}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 cursor-pointer disabled:opacity-30"
                />
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Select All</span>
              </label>
              <div className="flex items-center gap-2 text-zinc-500">
                <span>Selected: <strong className="text-zinc-900 dark:text-zinc-100">{selectedCount}</strong></span>
                <span>&bull;</span>
                <span>Sent: <strong className="text-emerald-600">{sentCount}</strong></span>
              </div>
            </div>

            {/* Row 2: Tab filters + Search icon trigger */}
            {!isMobileSearchOpen ? (
              <div className="flex items-center gap-1">
                {/* Tab filter pills */}
                <div className="flex items-center gap-1 p-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 flex-1 min-w-0 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setTabFilter('all')}
                    className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap cursor-pointer ${
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
                    className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap cursor-pointer ${
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
                    className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap cursor-pointer ${
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
                      className={`px-2 py-1 rounded text-[11px] font-medium transition whitespace-nowrap cursor-pointer ${
                        tabFilter === 'revised'
                          ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 shadow-2xs font-semibold'
                          : 'text-amber-600/80 dark:text-amber-400/80 hover:text-amber-700 dark:hover:text-amber-300'
                      }`}
                    >
                      Revised ({revisedCount})
                    </button>
                  )}
                </div>

                {/* Search icon button */}
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="relative shrink-0 p-2 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition cursor-pointer"
                  title="Search"
                >
                  <Search className="w-4 h-4" />
                  {searchQuery && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              </div>
            ) : (
              /* Search expanded row */
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search staff, code, phone..."
                    autoFocus
                    className="pl-8 pr-7 py-1.5 w-full bg-zinc-50 dark:bg-zinc-900 border border-emerald-400 dark:border-emerald-600 rounded text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setIsMobileSearchOpen(false); setSearchQuery(''); }}
                  className="shrink-0 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="app-surface-card hidden md:block border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-[#121215]">
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
                        className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3 min-w-[200px]">Employee &amp; ID</th>
                    <th className="py-2.5 px-3 w-36">Department</th>
                    <th className="py-2.5 px-3 min-w-[220px]">WhatsApp Phone</th>
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
                      const hasPhone = Boolean(formatPhoneNumberForWhatsApp(r.phone).length >= 10);
                      return (
                        <tr 
                          key={r.employeeId}
                          className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                            r.selected ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                          }`}
                        >
                          <td className="py-2.5 pl-3.5 pr-2">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={() => handleToggleSelectOne(r.employeeId)}
                              disabled={!hasPhone || isSending}
                              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
                                  type="text"
                                  value={tempPhoneVal}
                                  onChange={e => setTempPhoneVal(e.target.value)}
                                  placeholder="08012345678"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveInlinePhone(r.employeeId);
                                    if (e.key === 'Escape') setEditingEmpId(null);
                                  }}
                                  className="px-2 py-0.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-emerald-500 rounded focus:outline-none w-40"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlinePhone(r.employeeId)}
                                  className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                  title="Save Phone"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEmpId(null)}
                                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                {hasPhone ? (
                                  <span className="font-mono text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span>{r.phone}</span>
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                    No Phone Set
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmpId(r.employeeId);
                                    setTempPhoneVal(r.phone);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-400 hover:text-emerald-600 transition cursor-pointer"
                                  title="Edit / Add Phone"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-medium text-zinc-900 dark:text-zinc-100">
                            <div>{formatNaira(r.netPay)}</div>
                          </td>

                          {/* Status */}
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
                                title={r.lastSentAt ? `Sent on ${new Date(r.lastSentAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Dispatched successfully'}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{r.sendCount > 1 ? `Sent ${r.sendCount}x` : `Sent v${r.version || 1}`}</span>
                              </span>
                            ) : r.status === 'sending' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 animate-pulse">
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
                                No Phone
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
                                  if (activeActionMenuId === r.employeeId) {
                                    setActiveActionMenuId(null);
                                    setMenuCoords(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const spaceBelow = window.innerHeight - rect.bottom;
                                    const spaceAbove = rect.top;
                                    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
                                    setMenuCoords({
                                      top: openUp ? undefined : rect.bottom + 4,
                                      bottom: openUp ? Math.max(10, window.innerHeight - rect.top + 4) : undefined,
                                      right: Math.max(10, window.innerWidth - rect.right),
                                    });
                                    setActiveActionMenuId(r.employeeId);
                                  }
                                }}
                                disabled={isSending}
                                className={`p-1.5 rounded-md transition cursor-pointer ${
                                  isMenuOpen
                                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                                title="Employee WhatsApp Actions"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {isMenuOpen && menuCoords && (
                                <div 
                                  data-action-dropdown
                                  style={{
                                    top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
                                    bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
                                    right: `${menuCoords.right}px`,
                                  }}
                                  className="fixed w-48 rounded-xl bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 shadow-2xl py-1 z-[9999] text-xs animate-in fade-in-50 zoom-in-95 text-left"
                                >
                                  {/* Send via WhatsApp */}
                                  {hasPhone && (
                                    <button
                                      type="button"
                                      disabled={!isLocked || isSending || resendingEmpId === r.employeeId}
                                      onClick={() => {
                                        setActiveActionMenuId(null);
                                        setMenuCoords(null);
                                        handleResendSingle(r);
                                      }}
                                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                      <Send className={`w-3.5 h-3.5 text-emerald-600 shrink-0 ${resendingEmpId === r.employeeId ? 'animate-spin' : ''}`} />
                                      <div className="truncate">
                                        <div>{r.sendCount > 0 ? `Resend (v${(r.version || 1) + 1})` : 'Send WhatsApp'}</div>
                                        {!isLocked && <div className="text-[9px] text-amber-600 font-medium">Locked Period Req.</div>}
                                      </div>
                                    </button>
                                  )}

                                  {/* Dispatch Logs */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setMenuCoords(null);
                                      setHistoryTarget(r);
                                    }}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                                  >
                                    <History className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    <span>Dispatch Logs ({r.history?.length || 0})</span>
                                  </button>

                                  {/* Edit Phone */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      setMenuCoords(null);
                                      setEditingEmpId(r.employeeId);
                                      setTempPhoneVal(r.phone);
                                    }}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                    <span>{hasPhone ? 'Edit Phone' : 'Add Phone'}</span>
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

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-2.5 pb-2">
            {filteredRecipients.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl">
                No employees match the current filter.
              </div>
            ) : (
              filteredRecipients.map(r => {
                const isEditing = editingEmpId === r.employeeId;
                const isMenuOpen = activeActionMenuId === r.employeeId;
                const hasPhone = Boolean(formatPhoneNumberForWhatsApp(r.phone).length >= 10);
                return (
                  <div
                    key={r.employeeId}
                    className={`p-3.5 rounded-xl border transition ${
                      r.selected
                        ? 'bg-emerald-50/25 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                        : 'bg-white dark:bg-[#121215] border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={r.selected}
                        onChange={() => handleToggleSelectOne(r.employeeId)}
                        disabled={!hasPhone || isSending}
                        className="w-4 h-4 rounded mt-0.5 text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700 cursor-pointer disabled:opacity-30"
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
                          <span className="text-[10px] text-zinc-400 truncate">
                            {r.department}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                          {/* Phone */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={tempPhoneVal}
                                  onChange={e => setTempPhoneVal(e.target.value)}
                                  placeholder="08012345678"
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveInlinePhone(r.employeeId);
                                    if (e.key === 'Escape') setEditingEmpId(null);
                                  }}
                                  className="px-2 py-1 text-xs bg-zinc-50 dark:bg-zinc-900 border border-emerald-500 rounded focus:outline-none w-full"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveInlinePhone(r.employeeId)}
                                  className="p-1 rounded bg-emerald-600 text-white shrink-0 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingEmpId(null)}
                                  className="p-1 rounded text-zinc-400 shrink-0 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {hasPhone ? (
                                  <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                                    {r.phone}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                    No Phone
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmpId(r.employeeId);
                                    setTempPhoneVal(r.phone);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-emerald-600 transition shrink-0 cursor-pointer"
                                  title="Edit Phone"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Status pill & actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {r.status === 'sent' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Sent</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400">
                                {hasPhone ? 'Ready' : 'No Phone'}
                              </span>
                            )}

                            {hasPhone && (
                              <button
                                type="button"
                                onClick={() => handleResendSingle(r)}
                                disabled={!isLocked || isSending}
                                className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 transition cursor-pointer"
                                title="Send WhatsApp"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            )}
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
                Dispatching via <strong>
                  {provider === 'cloud_api' ? 'Meta Cloud API' : provider === 'ultramsg' ? 'UltraMsg' : provider === 'termii' ? 'Termii' : 'Direct WhatsApp Links (wa.me)'}
                </strong>
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
              disabled={isSending || selectedCount === 0 || !canDispatch}
              className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-md text-xs font-semibold shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                !canDispatch
                  ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : !canDispatch ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Finalize &amp; Lock Required to Send</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Dispatch {selectedCount} WhatsApp Payslips
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Dispatch History Modal */}
      {historyTarget && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    WhatsApp Dispatch History
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

            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/20 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Phone:</span>
                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{historyTarget.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Current Net Pay:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatNaira(historyTarget.netPay)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Total Dispatches:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{historyTarget.history?.length || 0} time(s)</span>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {historyTarget.history && historyTarget.history.length > 0 ? (
                historyTarget.history.map((h, i) => (
                  <div key={i} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">Version v{h.version || 1} &bull; {h.status}</div>
                      <div className="text-[10px] text-zinc-500">{new Date(h.sentAt).toLocaleString()}</div>
                    </div>
                    <div className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {h.netPay ? formatNaira(h.netPay) : '—'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-zinc-400">No prior dispatch history recorded.</div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end bg-zinc-50/80 dark:bg-zinc-900/60">
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Customize Template Modal */}
      {showTemplateModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div className="app-surface-card bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Customize WhatsApp Message Template
                  </h3>
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

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 mb-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    WhatsApp Message Text Template
                  </label>
                  <div className="flex items-center gap-1 overflow-x-auto text-[10px] pb-1 sm:pb-0">
                    <span className="text-zinc-400 shrink-0">Insert:</span>
                    {['employeeName', 'netPay', 'grossPay', 'month', 'year', 'companyName', 'employeeCode'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => insertToken(t)}
                        className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-600 text-zinc-600 dark:text-zinc-300 font-mono transition shrink-0 cursor-pointer"
                      >
                        +{t}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={8}
                  value={messageTemplate}
                  onChange={e => setMessageTemplate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-2.5 text-xs font-mono text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
                />
              </div>

              {/* Send Test WhatsApp to Admin */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Send Sample Test WhatsApp Message
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testPhoneNumber}
                    onChange={e => setTestPhoneNumber(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={testSending}
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition disabled:opacity-40 whitespace-nowrap flex items-center gap-1.5 shrink-0 cursor-pointer"
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

            <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50/80 dark:bg-zinc-900/60 shrink-0">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
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
