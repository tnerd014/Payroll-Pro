import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, ArrowLeft, ZoomIn, ZoomOut, RotateCcw, ShieldCheck, Check } from 'lucide-react';
import { CalculatedPayrollItem, CompanyProfile, Employee } from '../../types';
import { formatNaira, formatDate } from '../../engine/payePensionEngine';
import { PinchZoomContainer } from '../mobile/PinchZoomContainer';

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
  const [zoomFit, setZoomFit] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    if (!isOpen) return;
    const handleBeforePrint = () => document.body.classList.add('print-portal-active');
    const handleAfterPrint = () => document.body.classList.remove('print-portal-active');
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('print-portal-active');
    };
  }, [isOpen]);

  const handlePrint = () => {
    document.body.classList.add('print-portal-active');
    window.print();
  };

  // Safe filtered items memoized
  const safeItems = useMemo(() => (Array.isArray(items) ? items.filter(Boolean) : []), [items]);

  // Active items based on selected report type
  const reportItems = useMemo(() => {
    if (selectedType === 'bank') return safeItems;
    if (selectedType === 'paye') return safeItems.filter(i => i.hasPaye);
    return safeItems.filter(i => i.hasPension);
  }, [selectedType, safeItems]);

  // Calculations
  const totalNet = safeItems.reduce((s, i) => s + (i.netTakeHome || 0), 0);
  const totalPaye = safeItems.reduce((s, i) => s + (i.monthlyPaye || 0), 0);
  const totalEmpPension = safeItems.reduce((s, i) => s + (i.employeePension || 0), 0);
  const totalEmplrPension = safeItems.reduce((s, i) => s + (i.employerPension || 0), 0);
  const totalPension = totalEmpPension + totalEmplrPension;
  const totalGross = safeItems.reduce((s, i) => s + (i.monthlyGross || 0), 0);

  const currentDateStr = formatDate(new Date());

  // A4 Portrait Pagination:
  // Page 1 contains company letterhead + metadata + KPI metrics + rows (holds ~13 items)
  // Continuation pages hold up to 20 rows each.
  const PAGE_1_SIZE = 13;
  const CONT_PAGE_SIZE = 20;

  const paginatedPages = useMemo(() => {
    if (reportItems.length === 0) return [[]];
    const pages: (typeof reportItems)[] = [];
    pages.push(reportItems.slice(0, PAGE_1_SIZE));

    let offset = PAGE_1_SIZE;
    while (offset < reportItems.length) {
      pages.push(reportItems.slice(offset, offset + CONT_PAGE_SIZE));
      offset += CONT_PAGE_SIZE;
    }
    return pages;
  }, [reportItems]);

  const totalPages = paginatedPages.length;

  const renderPageContent = (pageItems: typeof reportItems, pageIndex: number, isPrintMode = false) => {
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === totalPages - 1;
    const startIdx = pageIndex === 0 ? 0 : PAGE_1_SIZE + (pageIndex - 1) * CONT_PAGE_SIZE;

    return (
      <div 
        key={`${isPrintMode ? 'print' : 'screen'}-${pageIndex}`}
        className={
          isPrintMode
            ? "w-full min-h-[268mm] bg-white text-zinc-900 p-0 flex flex-col justify-between"
            : "w-[794px] min-h-[1123px] bg-white text-zinc-900 rounded-lg shadow-md border border-zinc-200/90 p-8 sm:p-10 flex flex-col justify-between mb-8 a4-sheet"
        }
        style={{ breakAfter: isLastPage ? 'auto' : 'page', pageBreakAfter: isLastPage ? 'auto' : 'always' }}
      >
        <div className="space-y-4">
          {/* Header on First Page */}
          {isFirstPage ? (
            <div className="border-b border-zinc-200 pb-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
                    ) : (
                      <div className="w-8 h-8 rounded border border-zinc-300 flex items-center justify-center font-bold text-xs text-zinc-900">
                        ⚡
                      </div>
                    )}
                    <h1 className="text-base font-bold tracking-tight uppercase text-zinc-900">
                      {company.name}
                    </h1>
                  </div>
                  {company.subtitle && (
                    <p className="text-[11px] text-zinc-500 font-medium pl-10.5">{company.subtitle}</p>
                  )}
                  {company.address && (
                    <p className="text-[10px] text-zinc-400 pl-10.5">{company.address}</p>
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
              <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
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

              {/* Key Summary Badges */}
              <div className="grid grid-cols-4 gap-3 bg-zinc-50 p-2.5 rounded border border-zinc-200 mt-3 text-xs">
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
                  <span className="text-xs font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" /> Reconciled &bull; Validated
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Continuation Header for Page 2+ */
            <div className="border-b border-zinc-200 pb-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold uppercase tracking-wider text-zinc-900 block">
                  {company.name} &bull; {selectedType === 'bank' ? 'Bank Disbursement Schedule' : selectedType === 'paye' ? 'PAYE Tax Schedule' : 'Pension Remittance Schedule'}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Period: {monthLabel.toUpperCase()} {year} &bull; Continued
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase">
                  Page {pageIndex + 1} of {totalPages}
                </span>
              </div>
            </div>
          )}

          {/* Table Data for Current Page */}
          {selectedType === 'bank' && (
            <div className="border border-zinc-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-2 px-2.5 w-10">S/N</th>
                    <th className="py-2 px-2.5">Beneficiary Name</th>
                    <th className="py-2 px-2.5">Bank Name</th>
                    <th className="py-2 px-2.5">NUBAN Account No</th>
                    <th className="py-2 px-2.5 text-right">Net Amount (₦)</th>
                    <th className="py-2 px-2.5">Payment Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono text-zinc-800 text-[11px]">
                  {pageItems.map((i, idx) => (
                    <tr key={i.employeeId} className="hover:bg-zinc-50/50">
                      <td className="py-1.5 px-2.5 text-zinc-400">{startIdx + idx + 1}</td>
                      <td className="py-1.5 px-2.5 font-sans font-medium text-zinc-900">{i.fullName}</td>
                      <td className="py-1.5 px-2.5 font-sans text-zinc-700">{i.bankName}</td>
                      <td className="py-1.5 px-2.5 font-semibold text-zinc-900">{i.accountNumber}</td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-zinc-900">{formatNaira(i.netTakeHome)}</td>
                      <td className="py-1.5 px-2.5 font-sans text-zinc-500 text-[10px]">
                        SALARY {monthLabel.toUpperCase()} {year}
                      </td>
                    </tr>
                  ))}
                  {isLastPage && (
                    <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                      <td colSpan={4} className="py-2 px-2.5 text-right font-sans uppercase tracking-wider text-[11px] text-zinc-800">
                        Total Net Outflow to Debit:
                      </td>
                      <td className="py-2 px-2.5 text-right text-xs font-mono text-zinc-900">
                        {formatNaira(totalNet)}
                      </td>
                      <td className="py-2 px-2.5 font-sans font-normal text-zinc-500 text-[10px]">
                        {safeItems.length} credit instructions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {selectedType === 'paye' && (
            <div className="border border-zinc-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-2 px-2.5 w-10">S/N</th>
                    <th className="py-2 px-2.5">Staff Code</th>
                    <th className="py-2 px-2.5">Taxpayer Name</th>
                    <th className="py-2 px-2.5">State Tax ID / PAYE</th>
                    <th className="py-2 px-2.5 text-right">Annual Gross (₦)</th>
                    <th className="py-2 px-2.5 text-right">Total CRA (₦)</th>
                    <th className="py-2 px-2.5 text-right">Taxable Income (₦)</th>
                    <th className="py-2 px-2.5 text-right">Monthly PAYE (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono text-zinc-800 text-[11px]">
                  {pageItems.map((i, idx) => (
                    <tr key={i.employeeId} className="hover:bg-zinc-50/50">
                      <td className="py-1.5 px-2.5 text-zinc-400">{startIdx + idx + 1}</td>
                      <td className="py-1.5 px-2.5 text-zinc-500">{i.employeeCode}</td>
                      <td className="py-1.5 px-2.5 font-sans font-medium text-zinc-900">{i.fullName}</td>
                      <td className="py-1.5 px-2.5 font-semibold text-zinc-800">{i.payeNumber || '-'}</td>
                      <td className="py-1.5 px-2.5 text-right text-zinc-600">{formatNaira(i.monthlyGross * 12)}</td>
                      <td className="py-1.5 px-2.5 text-right text-zinc-600">{formatNaira(i.totalCra)}</td>
                      <td className="py-1.5 px-2.5 text-right text-zinc-700">{formatNaira(i.taxableIncome)}</td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-zinc-900">{formatNaira(i.monthlyPaye)}</td>
                    </tr>
                  ))}
                  {isLastPage && (
                    <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                      <td colSpan={7} className="py-2 px-2.5 text-right font-sans uppercase tracking-wider text-[11px] text-zinc-800">
                        Total Monthly PAYE Tax Remittance:
                      </td>
                      <td className="py-2 px-2.5 text-right text-xs font-mono text-zinc-900">
                        {formatNaira(totalPaye)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {selectedType === 'pension' && (
            <div className="border border-zinc-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 uppercase text-[10px] font-semibold tracking-wider">
                  <tr>
                    <th className="py-2 px-2.5 w-10">S/N</th>
                    <th className="py-2 px-2.5">Staff Code</th>
                    <th className="py-2 px-2.5">Beneficiary Name</th>
                    <th className="py-2 px-2.5">RSA PIN Number</th>
                    <th className="py-2 px-2.5">Pension PFA</th>
                    <th className="py-2 px-2.5 text-right">Employee (8%)</th>
                    <th className="py-2 px-2.5 text-right">Employer (10%)</th>
                    <th className="py-2 px-2.5 text-right">Total Pool (₦)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-mono text-zinc-800 text-[11px]">
                  {pageItems.map((i, idx) => (
                    <tr key={i.employeeId} className="hover:bg-zinc-50/50">
                      <td className="py-1.5 px-2.5 text-zinc-400">{startIdx + idx + 1}</td>
                      <td className="py-1.5 px-2.5 text-zinc-500">{i.employeeCode}</td>
                      <td className="py-1.5 px-2.5 font-sans font-medium text-zinc-900">{i.fullName}</td>
                      <td className="py-1.5 px-2.5 font-semibold text-zinc-800">{i.pensionNumber || '-'}</td>
                      <td className="py-1.5 px-2.5 font-sans text-zinc-600 text-[11px]">{i.pfaName || 'Standard RSA'}</td>
                      <td className="py-1.5 px-2.5 text-right text-zinc-600">{formatNaira(i.employeePension)}</td>
                      <td className="py-1.5 px-2.5 text-right text-zinc-600">{formatNaira(i.employerPension)}</td>
                      <td className="py-1.5 px-2.5 text-right font-bold text-zinc-900">
                        {formatNaira(i.employeePension + i.employerPension)}
                      </td>
                    </tr>
                  ))}
                  {isLastPage && (
                    <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                      <td colSpan={7} className="py-2 px-2.5 text-right font-sans uppercase tracking-wider text-[11px] text-zinc-800">
                        Total Pension Fund Contribution Pool:
                      </td>
                      <td className="py-2 px-2.5 text-right text-xs font-mono text-zinc-900">
                        {formatNaira(totalPension)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatory / Verification Blocks on Last Page */}
          {isLastPage && (
            <div className="pt-6 border-t border-zinc-200 mt-6 grid grid-cols-2 gap-8 text-xs">
              <div className="space-y-4">
                <p className="text-[10px] uppercase font-semibold text-zinc-400">Prepared & Reconciled By</p>
                <div className="border-b border-zinc-300 h-8" />
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Payroll Officer / Accountant</span>
                  <span>Date</span>
                </div>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] uppercase font-semibold text-zinc-400">Authorized & Approved By</p>
                <div className="border-b border-zinc-300 h-8" />
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Managing Director / CFO</span>
                  <span>Date</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Page Footer */}
        <div className="border-t border-zinc-100 pt-3 flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-4">
          <span>Payroll Pro Official Mandate &bull; Ref: SALARY-{monthLabel.toUpperCase()}-{year}</span>
          <span className="font-semibold text-zinc-600">
            Page {pageIndex + 1} of {totalPages}
          </span>
        </div>
      </div>
    );
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="print-modal-root fixed top-9 inset-x-0 bottom-0 z-50 bg-[#f4f4f5] dark:bg-[#09090b] flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100 print:top-0 print:inset-0 print:bg-white print:z-auto">
      
      {/* Top Application Header Bar - no-print */}
      <div className="no-print h-12 bg-white dark:bg-[#121215] border-b border-zinc-200 dark:border-zinc-800 px-3 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors shrink-0 cursor-pointer"
            title="Back to Reports (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Official Schedule
            </span>
            <span className="text-xs text-zinc-400 hidden sm:inline">&bull; {monthLabel} {year}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
              {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
            </span>
          </div>

          {/* Schedule Switcher */}
          <div className="hidden md:flex items-center bg-zinc-100 dark:bg-zinc-800/60 p-0.5 rounded-lg ml-2 text-xs">
            <button
              onClick={() => setSelectedType('bank')}
              className={`px-3 py-1 rounded text-xs transition cursor-pointer ${
                selectedType === 'bank'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Bank Disbursement
            </button>
            <button
              onClick={() => setSelectedType('paye')}
              className={`px-3 py-1 rounded text-xs transition cursor-pointer ${
                selectedType === 'paye'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              PAYE Tax
            </button>
            <button
              onClick={() => setSelectedType('pension')}
              className={`px-3 py-1 rounded text-xs transition cursor-pointer ${
                selectedType === 'pension'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Pension
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              type="button"
              onClick={() => setZoomFit(!zoomFit)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition"
              title="Toggle Zoom Fit"
            >
              {zoomFit ? '100%' : 'Fit'}
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Mobile Schedule Switcher Bar */}
      <div className="md:hidden no-print bg-white dark:bg-[#121215] border-b border-zinc-200 dark:border-zinc-800 p-1.5 flex items-center justify-around text-xs">
        <button
          onClick={() => setSelectedType('bank')}
          className={`flex-1 py-1 rounded text-center font-medium transition ${
            selectedType === 'bank'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
              : 'text-zinc-500'
          }`}
        >
          Bank
        </button>
        <button
          onClick={() => setSelectedType('paye')}
          className={`flex-1 py-1 rounded text-center font-medium transition ${
            selectedType === 'paye'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
              : 'text-zinc-500'
          }`}
        >
          PAYE Tax
        </button>
        <button
          onClick={() => setSelectedType('pension')}
          className={`flex-1 py-1 rounded text-center font-medium transition ${
            selectedType === 'pension'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
              : 'text-zinc-500'
          }`}
        >
          Pension
        </button>
      </div>

      {/* ── Screen Preview Canvas (Interactive zoom, pan, mobile preview - NEVER PRINTED) ── */}
      <div className="no-print flex-1 overflow-y-auto p-2 sm:p-6 flex flex-col items-center bg-zinc-100/90 dark:bg-[#0c0c0e]">
        {isMobile ? (
          <div className="w-full flex flex-col items-center">
            <PinchZoomContainer
              contentWidth={794}
              zoomMode={zoomFit ? 'fit' : 'full'}
              onZoomModeChange={(mode) => setZoomFit(mode === 'fit')}
              showFloatingControls={true}
              className="w-full flex flex-col items-center"
            >
              <div className="flex flex-col items-center w-[794px]">
                {paginatedPages.map((pageItems, idx) => renderPageContent(pageItems, idx, false))}
              </div>
            </PinchZoomContainer>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {paginatedPages.map((pageItems, idx) => renderPageContent(pageItems, idx, false))}
          </div>
        )}
      </div>

      {/* ── Dedicated Print Container (Brought into flow ONLY during print) ── */}
      <div className="hidden print:block w-full bg-white print-modal-list">
        {paginatedPages.map((pageItems, idx) => (
          <div key={`print-page-${idx}`} className="print-page w-full bg-white">
            {renderPageContent(pageItems, idx, true)}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
};
