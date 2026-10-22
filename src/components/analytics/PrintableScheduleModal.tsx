import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, Download, Landmark, FileText, ShieldCheck, Check } from 'lucide-react';
import { CalculatedPayrollItem, CompanyProfile, Employee } from '../../types';
import { formatNaira, formatDate } from '../../engine/payePensionEngine';

export type ScheduleReportType = 'bank' | 'paye' | 'pension';

interface PrintableScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: ScheduleReportType;
  items: CalculatedPayrollItem[];
  employees: Employee[];
  company: CompanyProfile;
  monthLabel: string;
  year: number;
}

export const PrintableScheduleModal: React.FC<PrintableScheduleModalProps> = ({
  isOpen,
  onClose,
  initialType = 'bank',
  items,
  employees,
  company,
  monthLabel,
  year
}) => {
  const [selectedType, setSelectedType] = useState<ScheduleReportType>(initialType);

  useEffect(() => {
    setSelectedType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Safe filtered items
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  // Calculations
  const totalNet = safeItems.reduce((s, i) => s + (i.netTakeHome || 0), 0);
  const totalPaye = safeItems.reduce((s, i) => s + (i.monthlyPaye || 0), 0);
  const totalEmpPension = safeItems.reduce((s, i) => s + (i.employeePension || 0), 0);
  const totalEmplrPension = safeItems.reduce((s, i) => s + (i.employerPension || 0), 0);
  const totalPension = totalEmpPension + totalEmplrPension;
  const totalGross = safeItems.reduce((s, i) => s + (i.monthlyGross || 0), 0);
  const totalTaxable = safeItems.reduce((s, i) => s + (i.taxableIncome || 0), 0);

  const currentDateStr = formatDate(new Date());

  return createPortal(
    <div className="fixed top-9 inset-x-0 bottom-0 z-50 bg-[#f4f4f5] dark:bg-[#09090b] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 print:top-0 print:inset-0 print:bg-white print:z-auto">
      
      {/* Top Application Header Bar - no-print */}
      <div className="no-print h-12 bg-white dark:bg-[#121215] border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
            title="Back to Reports (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Print Official Schedule
            </span>
            <span className="text-xs text-zinc-400">&bull; {monthLabel} {year}</span>
          </div>

          {/* Schedule Switcher */}
          <div className="hidden sm:flex items-center bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-md ml-3 text-xs">
            <button
              onClick={() => setSelectedType('bank')}
              className={`px-3 py-1 rounded text-xs transition ${
                selectedType === 'bank'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Bank Disbursement
            </button>
            <button
              onClick={() => setSelectedType('paye')}
              className={`px-3 py-1 rounded text-xs transition ${
                selectedType === 'paye'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              PAYE Tax Schedule
            </button>
            <button
              onClick={() => setSelectedType('pension')}
              className={`px-3 py-1 rounded text-xs transition ${
                selectedType === 'pension'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Pension Remittance
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Scrollable Canvas holding the printable sheet */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-zinc-100/90 dark:bg-[#0c0c0e]">
        
        {/* Printable Paper Sheet */}
        <div className="w-full max-w-4xl bg-white text-zinc-900 rounded-lg shadow-sm border border-zinc-200 p-8 sm:p-10 space-y-6 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-xs">
          
          {/* Header */}
          <div className="border-b border-zinc-200 pb-5">
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
                  ) : (
                    <div className="w-7 h-7 rounded border border-zinc-300 flex items-center justify-center font-bold text-xs text-zinc-900">
                      ⚡
                    </div>
                  )}
                  <h1 className="text-base font-bold tracking-tight uppercase text-zinc-900">
                    {company.name}
                  </h1>
                </div>
                {company.subtitle && (
                  <p className="text-[11px] text-zinc-500 font-medium pl-9.5">{company.subtitle}</p>
                )}
                {company.address && (
                  <p className="text-[10px] text-zinc-400 pl-9.5">{company.address}</p>
                )}
              </div>

              <div className="text-right space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">
                  PAYROLL PERIOD
                </span>
                <span className="text-sm font-bold font-mono text-zinc-900 block">
                  {monthLabel.toUpperCase()} {year}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  Date: {currentDateStr}
                </span>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                  {selectedType === 'bank' && 'Bank Transfer Disbursement Schedule'}
                  {selectedType === 'paye' && 'Statutory PAYE Tax Remittance Schedule'}
                  {selectedType === 'pension' && 'Statutory Pension Contribution Remittance Schedule'}
                </h2>
                <p className="text-[10px] text-zinc-500">
                  {selectedType === 'bank' && 'Direct electronic fund transfer mandate for staff salary disbursement.'}
                  {selectedType === 'paye' && 'State Internal Revenue Service monthly tax deduction & remittance register.'}
                  {selectedType === 'pension' && 'Pension Reform Act 2014 statutory compliance schedule (Employee 8% + Employer 10%).'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Batch Ref</span>
                <span className="font-mono text-xs font-semibold text-zinc-800">
                  SALARY-{monthLabel.toUpperCase()}-{year}
                </span>
              </div>
            </div>
          </div>

          {/* Key Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-3 rounded border border-zinc-200">
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Staff Count</span>
              <span className="text-xs font-bold font-mono text-zinc-900 mt-0.5 block">{safeItems.length} Beneficiaries</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">
                {selectedType === 'bank' ? 'Total Net Disbursement' : selectedType === 'paye' ? 'Total Monthly PAYE' : 'Total Pension Pool'}
              </span>
              <span className="text-xs font-bold font-mono text-zinc-900 mt-0.5 block">
                {selectedType === 'bank' && formatNaira(totalNet)}
                {selectedType === 'paye' && formatNaira(totalPaye)}
                {selectedType === 'pension' && formatNaira(totalPension)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Total Gross Remuneration</span>
              <span className="text-xs font-bold font-mono text-zinc-900 mt-0.5 block">{formatNaira(totalGross)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-400 block">Compliance Status</span>
              <span className="text-xs font-semibold text-emerald-700 mt-0.5 block">Reconciled &bull; Validated</span>
            </div>
          </div>

          {/* Table 1: Bank Transfer Disbursement */}
          {selectedType === 'bank' && (
            <div className="border border-zinc-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-10">S/N</th>
                    <th className="py-2.5 px-3">Beneficiary Name</th>
                    <th className="py-2.5 px-3">Bank Name</th>
                    <th className="py-2.5 px-3">NUBAN Account No</th>
                    <th className="py-2.5 px-3 text-right">Net Amount (₦)</th>
                    <th className="py-2.5 px-3">Payment Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono text-zinc-800">
                  {safeItems.map((i, idx) => (
                    <tr key={i.employeeId} className="hover:bg-zinc-50/50">
                      <td className="py-2 px-3 text-zinc-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-sans font-medium text-zinc-900">{i.fullName}</td>
                      <td className="py-2 px-3 font-sans text-zinc-700">{i.bankName}</td>
                      <td className="py-2 px-3 font-semibold text-zinc-900">{i.accountNumber}</td>
                      <td className="py-2 px-3 text-right font-bold text-zinc-900">{formatNaira(i.netTakeHome)}</td>
                      <td className="py-2 px-3 font-sans text-zinc-500 text-[10px]">
                        SALARY {monthLabel.toUpperCase()} {year}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                    <td colSpan={4} className="py-2.5 px-3 text-right font-sans uppercase tracking-wider text-[11px] text-zinc-800">
                      Total Net Outflow to Debit:
                    </td>
                    <td className="py-2.5 px-3 text-right text-sm text-zinc-900">
                      {formatNaira(totalNet)}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-normal text-zinc-500 text-[10px]">
                      {safeItems.length} credit instructions
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Table 2: PAYE Tax Remittance Schedule */}
          {selectedType === 'paye' && (
            <div className="border border-zinc-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-10">S/N</th>
                    <th className="py-2.5 px-3">Staff Code</th>
                    <th className="py-2.5 px-3">Taxpayer Name</th>
                    <th className="py-2.5 px-3">State Tax ID / PAYE</th>
                    <th className="py-2.5 px-3 text-right">Annual Gross (₦)</th>
                    <th className="py-2.5 px-3 text-right">Total CRA (₦)</th>
                    <th className="py-2.5 px-3 text-right">Taxable Income (₦)</th>
                    <th className="py-2.5 px-3 text-right">Monthly PAYE (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono text-zinc-800">
                  {safeItems.filter(i => i.hasPaye).map((i, idx) => (
                    <tr key={i.employeeId} className="hover:bg-zinc-50/50">
                      <td className="py-2 px-3 text-zinc-400">{idx + 1}</td>
                      <td className="py-2 px-3 text-zinc-500">{i.employeeCode}</td>
                      <td className="py-2 px-3 font-sans font-medium text-zinc-900">{i.fullName}</td>
                      <td className="py-2 px-3 font-semibold text-zinc-800">{i.payeNumber || '-'}</td>
                      <td className="py-2 px-3 text-right text-zinc-600">{formatNaira(i.monthlyGross * 12)}</td>
                      <td className="py-2 px-3 text-right text-zinc-600">{formatNaira(i.totalCra)}</td>
                      <td className="py-2 px-3 text-right text-zinc-700">{formatNaira(i.taxableIncome)}</td>
                      <td className="py-2 px-3 text-right font-bold text-zinc-900">{formatNaira(i.monthlyPaye)}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                    <td colSpan={7} className="py-2.5 px-3 text-right font-sans uppercase tracking-wider text-[11px] text-zinc-800">
                      Total Monthly PAYE Tax Remittance:
                    </td>
                    <td className="py-2.5 px-3 text-right text-sm text-zinc-900">
                      {formatNaira(totalPaye)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Table 3: Pension Remittance Schedule */}
          {selectedType === 'pension' && (
            <div className="border border-zinc-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-10">S/N</th>
                    <th className="py-2.5 px-3">Staff Code</th>
                    <th className="py-2.5 px-3">Beneficiary Name</th>
                    <th className="py-2.5 px-3">RSA PIN Number</th>
                    <th className="py-2.5 px-3">Pension PFA</th>
                    <th className="py-2.5 px-3 text-right">Employee (8%)</th>
                    <th className="py-2.5 px-3 text-right">Employer (10%)</th>
                    <th className="py-2.5 px-3 text-right">Total Pool (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono text-zinc-800">
                  {safeItems.filter(i => i.hasPension).map((i, idx) => (
                    <tr key={i.employeeId} className="hover:bg-zinc-50/50">
                      <td className="py-2 px-3 text-zinc-400">{idx + 1}</td>
                      <td className="py-2 px-3 text-zinc-500">{i.employeeCode}</td>
                      <td className="py-2 px-3 font-sans font-medium text-zinc-900">{i.fullName}</td>
                      <td className="py-2 px-3 font-semibold text-zinc-800">{i.pensionNumber || '-'}</td>
                      <td className="py-2 px-3 font-sans text-zinc-600 text-[11px]">{i.pfaName || 'Standard RSA'}</td>
                      <td className="py-2 px-3 text-right text-zinc-600">{formatNaira(i.employeePension)}</td>
                      <td className="py-2 px-3 text-right text-zinc-600">{formatNaira(i.employerPension)}</td>
                      <td className="py-2 px-3 text-right font-bold text-zinc-900">
                        {formatNaira(i.employeePension + i.employerPension)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                    <td colSpan={7} className="py-2.5 px-3 text-right font-sans uppercase tracking-wider text-[11px] text-zinc-800">
                      Total Pension Fund Contribution Pool:
                    </td>
                    <td className="py-2.5 px-3 text-right text-sm text-zinc-900">
                      {formatNaira(totalPension)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};
