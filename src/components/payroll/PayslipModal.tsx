import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, Palette, Mail, ChevronDown, MessageCircle, X } from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  CompanyProfile, 
  PayslipDesignConfig, 
  DEFAULT_PAYSLIP_DESIGN,
  Employee,
  PayrollVariables,
  PayeTaxVariables,
  PayslipCustomPreset,
  EmailPayslipContext,
  WhatsAppPayslipContext,
  DEFAULT_WHATSAPP_SETTINGS
} from '../../types';
import { DEFAULT_PAYROLL_VARIABLES, DEFAULT_PAYE_VARIABLES } from '../../engine/payePensionEngine';
import { CustomizablePayslipView } from '../payslip/CustomizablePayslipView';
import { PayslipDesignerPage } from '../payslip/PayslipDesignerPage';
import { PayslipThemeSelector } from '../payslip/payslipThemes';
import { sendWhatsAppPayslip } from '../../services/whatsappService';
import { usePayrollStore } from '../../store/usePayrollStore';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CalculatedPayrollItem;
  company: CompanyProfile;
  monthLabel: string;
  year: number;
  config?: PayslipDesignConfig;
  onOpenPayslipDesigner?: () => void;
  employees?: Employee[];
  payrollVariables?: PayrollVariables;
  payeTaxVariables?: PayeTaxVariables;
  selectedMonth?: string;
  onUpdatePayslipDesign?: (updates: Partial<PayslipDesignConfig>) => void;
  onResetPayslipDesign?: () => void;
  savedPresets?: PayslipCustomPreset[];
  onSavePreset?: (name: string, config: PayslipDesignConfig) => void;
  onDeletePreset?: (id: string) => void;
  onEmailPayslips?: (context?: EmailPayslipContext) => void;
  onWhatsAppPayslips?: (context?: WhatsAppPayslipContext) => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  item,
  company,
  monthLabel,
  year,
  config = DEFAULT_PAYSLIP_DESIGN,
  onOpenPayslipDesigner,
  employees = [],
  payrollVariables,
  payeTaxVariables,
  selectedMonth,
  onUpdatePayslipDesign,
  onResetPayslipDesign,
  savedPresets = [],
  onSavePreset,
  onDeletePreset,
  onEmailPayslips,
  onWhatsAppPayslips,
}) => {
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsappToast, setWhatsappToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const { whatsappSettings } = usePayrollStore();
  const currentWhatsAppSettings = whatsappSettings || DEFAULT_WHATSAPP_SETTINGS;

  useEffect(() => {
    if (!whatsappToast) return;
    const t = setTimeout(() => setWhatsappToast(null), 5000);
    return () => clearTimeout(t);
  }, [whatsappToast]);

  const handleSendWhatsApp = async () => {
    setIsActionMenuOpen(false);
    const emp = employees?.find(e => e.id === item.employeeId);
    const phone = emp?.phone;
    if (!phone) {
      setWhatsappToast({
        type: 'error',
        message: `No phone number configured for ${item.fullName}. Add phone number in Staff Profile.`
      });
      return;
    }
    const activeSettings = currentWhatsAppSettings;
    setIsSendingWhatsApp(true);
    setWhatsappToast({ type: 'info', message: `Dispatching WhatsApp payslip to ${phone}...` });
    try {
      const res = await sendWhatsAppPayslip({
        item,
        company,
        monthLabel,
        year,
        phone,
        config,
        settings: activeSettings,
      }, activeSettings.provider === 'direct');

      if (res.success) {
        if (activeSettings.provider === 'direct') {
          setWhatsappToast({ type: 'success', message: `Opened WhatsApp chat for ${item.fullName}.` });
        } else {
          const providerName = activeSettings.provider === 'cloud_api'
            ? 'Meta Cloud API'
            : activeSettings.provider === 'ultramsg'
              ? 'UltraMsg'
              : 'Termii API';
          setWhatsappToast({
            type: 'success',
            message: `✅ Payslip sent to ${item.fullName} (${phone}) via ${providerName}!`
          });
        }
      } else {
        setWhatsappToast({ type: 'error', message: res.error || 'Failed to dispatch WhatsApp payslip.' });
      }
    } catch (err: any) {
      setWhatsappToast({ type: 'error', message: err?.message || 'Error sending WhatsApp payslip.' });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    if (isActionMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isActionMenuOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDesignerOpen) {
          setIsDesignerOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDesignerOpen]);

  if (!isOpen || !item) return null;

  if (isDesignerOpen) {
    return createPortal(
      <div className="app-shell-bg fixed top-9 inset-x-0 bottom-0 z-50 bg-zinc-100 dark:bg-[#09090b] flex flex-col select-none overflow-hidden print:top-0 print:inset-0">
        <PayslipDesignerPage
          company={company}
          employees={employees && employees.length > 0 ? employees : []}
          payrollVariables={payrollVariables || DEFAULT_PAYROLL_VARIABLES}
          payeTaxVariables={payeTaxVariables || DEFAULT_PAYE_VARIABLES}
          monthLabel={monthLabel}
          selectedMonth={selectedMonth || 'jan'}
          year={year}
          payslipDesign={config}
          onUpdatePayslipDesign={onUpdatePayslipDesign || (() => {})}
          onResetPayslipDesign={onResetPayslipDesign || (() => {})}
          onBackToPayroll={() => setIsDesignerOpen(false)}
          savedPresets={savedPresets}
          onSavePreset={onSavePreset}
          onDeletePreset={onDeletePreset}
        />
      </div>,
      document.body
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="app-shell-bg fixed top-9 inset-x-0 bottom-0 z-50 bg-[#f4f4f5] dark:bg-[#09090b] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 print:top-0 print:inset-0 print:bg-white print:z-auto">
      
      {/* Flush Top Header Bar - Directly below desktop menu bar */}
      <div className="no-print app-surface-card h-11 bg-white dark:bg-[#121215] border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="app-subtle-surface flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            title="Back to Payroll (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Employee Payslip
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">[{item.employeeCode}]</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium hidden sm:inline">&bull; {item.fullName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Theme Selector Dropdown */}
          <PayslipThemeSelector
            currentConfig={config}
            savedPresets={savedPresets}
            onSelectTheme={onUpdatePayslipDesign || (() => {})}
          />

          <button
            type="button"
            onClick={() => setIsDesignerOpen(true)}
            className="app-subtle-surface flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
            title="Design Payslip Layout & Theme"
          >
            <Palette className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Design Layout</span>
          </button>
          {/* Print & Email Action Dropdown */}
          <div className="relative inline-block text-left" ref={actionMenuRef}>
            <button
              type="button"
              onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              className="app-primary-btn flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
              <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-150 ${isActionMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isActionMenuOpen && (
              <div className="app-surface-card absolute right-0 mt-1.5 w-32 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    handlePrint();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span className="font-medium">Print</span>
                </button>

                {onEmailPayslips && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      onEmailPayslips({
                        selectedEmployeeIds: [item.employeeId],
                        selectedMonthKeys: [selectedMonth || 'jan'],
                        year: year,
                      });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-left cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium">Email</span>
                  </button>
                )}

                {onWhatsAppPayslips ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsActionMenuOpen(false);
                      onWhatsAppPayslips({
                        selectedEmployeeIds: [item.employeeId],
                        selectedMonthKeys: [selectedMonth || 'jan'],
                        year: year,
                      });
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition text-left cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">WhatsApp</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    disabled={isSendingWhatsApp}
                    className="w-full flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition text-left cursor-pointer disabled:opacity-50"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      {isSendingWhatsApp ? 'Sending…' : 'WhatsApp'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 ml-1"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Canvas for the Payslip */}
      <div className="app-shell-bg flex-1 overflow-y-auto p-4 sm:p-6 pb-10 flex justify-center items-start bg-zinc-100/90 dark:bg-[#0c0c0e] print:bg-white">
        <div className="w-full max-w-3xl my-3 mb-8 overflow-hidden flex flex-col">
          <CustomizablePayslipView
            item={item}
            company={company}
            monthLabel={monthLabel}
            year={year}
            config={config}
          />
        </div>
      </div>

      {/* WhatsApp Toast Notification */}
      {whatsappToast && (
        <div className={`fixed bottom-6 right-6 z-[100] max-w-sm px-4 py-3 rounded-xl shadow-2xl border text-xs flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200 ${
          whatsappToast.type === 'success' 
            ? 'bg-emerald-900 text-white border-emerald-700' 
            : whatsappToast.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : 'bg-zinc-900 text-white border-zinc-700'
        }`}>
          <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="flex-1 font-medium">{whatsappToast.message}</span>
          <button 
            type="button" 
            onClick={() => setWhatsappToast(null)} 
            className="p-1 text-zinc-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>,
    document.body
  );
};
