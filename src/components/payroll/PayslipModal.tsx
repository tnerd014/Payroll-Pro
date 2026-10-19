import React, { useEffect } from 'react';
import { Printer, ArrowLeft, Building2, User, Landmark, ShieldCheck } from 'lucide-react';
import { CalculatedPayrollItem, CompanyProfile } from '../../types';
import { formatNaira } from '../../engine/payePensionEngine';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CalculatedPayrollItem;
  company: CompanyProfile;
  monthLabel: string;
  year: number;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  item,
  company,
  monthLabel,
  year
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 flex justify-center items-start bg-zinc-100/90 dark:bg-[#0c0c0e]">
        <div className="w-full max-w-3xl bg-white text-zinc-900 rounded-lg shadow-sm border border-zinc-200 my-3 mb-16 overflow-hidden flex flex-col">
          
          {/* Printable Payslip Body */}
          <div className="p-8 space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-zinc-200 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
                ) : (
                  <div className="w-7 h-7 rounded border border-zinc-300 flex items-center justify-center font-bold text-xs text-zinc-900">
                    ⚡
                  </div>
                )}
                <h2 className="text-base font-semibold tracking-tight uppercase text-zinc-900">
                  {company.name}
                </h2>
              </div>
              {company.subtitle && (
                <p className="text-[11px] text-zinc-500 mt-1">{company.subtitle}</p>
              )}
              {company.address && (
                <p className="text-[10px] text-zinc-400">{company.address}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block">
                Pay Period
              </span>
              <span className="text-xs font-semibold font-mono text-zinc-900">
                {monthLabel.toUpperCase()} {year}
              </span>
            </div>
          </div>

          {/* Employee Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-4 rounded border border-zinc-200 text-xs">
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-medium">Employee Name</span>
              <span className="font-medium text-zinc-900 mt-0.5 block">{item.fullName}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-medium">Staff ID</span>
              <span className="font-mono font-medium text-zinc-900 mt-0.5 block">{item.employeeCode}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-medium">Department</span>
              <span className="font-medium text-zinc-800 mt-0.5 block">{item.department}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-medium">Designation</span>
              <span className="text-zinc-800 mt-0.5 block">{item.position}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-medium">Bank & Account</span>
              <span className="font-medium text-zinc-800 mt-0.5 block">{item.bankName}</span>
              <span className="font-mono text-[10px] text-zinc-500 block">{item.accountNumber}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-medium">PAYE / Tax ID</span>
              <span className="font-mono font-medium text-zinc-800 mt-0.5 block">
                {item.payeNumber || '-'}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-medium">Pension RSA PIN</span>
              <span className="font-mono font-medium text-zinc-800 mt-0.5 block">
                {item.pensionNumber || '-'}
              </span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px] uppercase font-medium">Pension Custodian (PFA)</span>
              <span className="text-zinc-800 text-[11px] mt-0.5 block truncate">
                {item.pfaName || 'Standard RSA'}
              </span>
            </div>
          </div>

          {/* Dual Columns: Earnings vs Deductions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Earnings */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1.5">
                Earnings Breakdown
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Basic Salary (40%):</span>
                  <span className="font-mono text-zinc-900">{formatNaira(item.basic)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Housing Allowance (30%):</span>
                  <span className="font-mono text-zinc-900">{formatNaira(item.housing)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Transport Allowance (20%):</span>
                  <span className="font-mono text-zinc-900">{formatNaira(item.transport)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Other Allowances (10%):</span>
                  <span className="font-mono text-zinc-900">{formatNaira(item.otherAllowances)}</span>
                </div>
                <div className="flex justify-between font-semibold text-zinc-900 pt-2 border-t border-zinc-200">
                  <span>Total Gross Earnings:</span>
                  <span className="font-mono text-zinc-900">{formatNaira(item.monthlyGross)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 border-b border-zinc-200 pb-1.5">
                Statutory Deductions
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>PAYE Income Tax:</span>
                  <span className="font-mono text-zinc-900">-{formatNaira(item.monthlyPaye)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Employee Pension (8%):</span>
                  <span className="font-mono text-zinc-900">-{formatNaira(item.employeePension)}</span>
                </div>
                <div className="flex justify-between font-semibold text-zinc-900 pt-2 border-t border-zinc-200">
                  <span>Total Deductions:</span>
                  <span className="font-mono text-zinc-900">-{formatNaira(item.totalDeductions)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Net Take-Home Box */}
          <div className="bg-zinc-50 border border-zinc-200 rounded p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block">
                Net Take-Home Pay
              </span>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Direct bank transfer disbursement amount
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-semibold font-mono text-zinc-900">
                {formatNaira(item.netTakeHome)}
              </span>
            </div>
          </div>

          {/* Employer Contributions & Emolument Bar */}
          <div className="bg-zinc-50 rounded p-2.5 border border-zinc-200 text-[11px] text-zinc-500 flex justify-between items-center">
            <div>
              <span>Employer Statutory Pension (10%): </span>
              <strong className="font-mono text-zinc-800">{formatNaira(item.employerPension)}</strong>
            </div>
            <div>
              <span>Total Emolument: </span>
              <strong className="font-mono text-zinc-800">{formatNaira(item.employerTotalCost || (item.monthlyGross + item.employerPension))}</strong>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar - no-print */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 no-print rounded-b-lg">
          <span className="text-xs text-zinc-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono text-zinc-700 dark:text-zinc-300">Esc</kbd> or click outside to close
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Payroll</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
  );
};
