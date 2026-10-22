import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, Palette } from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  CompanyProfile, 
  PayslipDesignConfig, 
  DEFAULT_PAYSLIP_DESIGN,
  Employee,
  PayrollVariables,
  PayeTaxVariables,
  PayslipCustomPreset
} from '../../types';
import { DEFAULT_PAYROLL_VARIABLES, DEFAULT_PAYE_VARIABLES } from '../../engine/payePensionEngine';
import { CustomizablePayslipView } from '../payslip/CustomizablePayslipView';
import { PayslipDesignerPage } from '../payslip/PayslipDesignerPage';
import { PayslipThemeSelector } from '../payslip/payslipThemes';

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
}) => {
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);

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
      <div className="fixed top-9 inset-x-0 bottom-0 z-50 bg-zinc-100 dark:bg-[#09090b] flex flex-col select-none overflow-hidden print:top-0 print:inset-0">
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
    <div className="fixed top-9 inset-x-0 bottom-0 z-50 bg-[#f4f4f5] dark:bg-[#09090b] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 print:top-0 print:inset-0 print:bg-white print:z-auto">
      
      {/* Flush Top Header Bar - Directly below desktop menu bar */}
      <div className="no-print h-11 bg-white dark:bg-[#121215] border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
            title="Back to Payroll (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Employee Payslip
            </span>
            <span className="text-xs text-zinc-400 font-mono">[{item.employeeCode}]</span>
            <span className="text-xs text-zinc-500 font-medium hidden sm:inline">&bull; {item.fullName}</span>
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
            title="Design Payslip Layout & Theme"
          >
            <Palette className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Design Layout</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Scrollable Canvas for the Payslip */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-10 flex justify-center items-start bg-zinc-100/90 dark:bg-[#0c0c0e]">
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

    </div>,
    document.body
  );
};
