import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  X 
} from 'lucide-react';
import { ExportScope, ExportOptions, ExportInformationScope } from '../../engine/excelEngine';
import { MONTHS } from '../../store/usePayrollStore';
import { EmploymentTypeRule } from '../../types';

interface ExportScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: ExportOptions) => void;
  currentMonthLabel: string;
  currentMonthKey: string;
  currentYear: number;
  departments?: string[];
  employmentTypeRules?: EmploymentTypeRule[];
}

export const ExportScopeModal: React.FC<ExportScopeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentMonthLabel,
  currentMonthKey,
  currentYear,
  departments = [],
  employmentTypeRules = [],
}) => {
  const [scope, setScope] = useState<ExportScope>('current-month');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [informationScope, setInformationScope] = useState<ExportInformationScope>('all');
  const [includeFormulas, setIncludeFormulas] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const monthLabel = MONTHS.find(m => m.key === selectedMonth)?.label || currentMonthLabel;

  // Build unique employment type list
  const availableTypes: { id: string; name: string }[] = [
    { id: 'ALL', name: 'All Employment Types' },
  ];
  const knownTypes = ['Full-Time', 'Part-Time', 'Contract', 'Intern / NYSC'];
  knownTypes.forEach(t => {
    if (!availableTypes.some(item => item.id === t)) {
      availableTypes.push({ id: t, name: t });
    }
  });
  employmentTypeRules.forEach(r => {
    if (!availableTypes.some(item => item.id === r.name)) {
      availableTypes.push({ id: r.name, name: r.name });
    }
  });

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      onConfirm({
        scope,
        includeFormulas,
        selectedYear,
        selectedMonth,
        employmentTypeFilter,
        departmentFilter,
        informationScope,
      });
      setIsExporting(false);
      onClose();
    }, 400);
  };

  const years = [2024, 2025, 2026, 2027, 2028];

  const informationScopeOptions: { id: ExportInformationScope; label: string; desc: string }[] = [
    {
      id: 'all',
      label: 'Complete Audit Package (All Schedules & Registers)',
      desc: 'Master Payroll Register, Bank Payment Schedule, PAYE Tax, PenCom Pension, Annual Matrix, and Staff Database.',
    },
    {
      id: 'payroll-register',
      label: 'Master Payroll Register Only',
      desc: 'Monthly gross, full allowance breakdown (Basic, Housing, Transport), statutory deductions, and net pay.',
    },
    {
      id: 'bank-schedule',
      label: 'Bank Payment Schedule Only',
      desc: 'Net salaries, bank names, account numbers, and remarks formatted for commercial bank batch upload.',
    },
    {
      id: 'statutory-remittance',
      label: 'Statutory Remittances Only (PAYE Tax & Pension)',
      desc: 'State Internal Revenue Service (SIRS) PAYE schedule and PenCom RSA PFA pension remittance returns.',
    },
    {
      id: 'staff-database',
      label: 'Staff Master Database Only',
      desc: 'Staff roster with personal details, employment types, bank accounts, and statutory tax / pension IDs.',
    },
  ];

  return (
    <div className="fixed top-9 inset-x-0 bottom-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Export to Excel
              </h3>
              <p className="text-[11px] text-zinc-500">
                Generate and download formatted .xlsx spreadsheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Scope Selector: 3 Clean Segmented Options */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
              Export Scope
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScope('current-month')}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition text-center ${
                  scope === 'current-month'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Single Month
              </button>

              <button
                type="button"
                onClick={() => setScope('full-year')}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition text-center ${
                  scope === 'full-year'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Full Year (12 Mo.)
              </button>

              <button
                type="button"
                onClick={() => setScope('all-history')}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition text-center ${
                  scope === 'all-history'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                All History
              </button>
            </div>
          </div>

          {/* Period Selection (Month & Year) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                disabled={scope === 'full-year'}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              >
                {MONTHS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Information Content Scope */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Content Scope
            </label>
            <select
              value={informationScope}
              onChange={e => setInformationScope(e.target.value as ExportInformationScope)}
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Schedules &amp; Registers</option>
              <option value="payroll-register">Master Payroll Register Only</option>
              <option value="bank-schedule">Bank Payment Schedule Only</option>
              <option value="statutory-remittance">Statutory Remittances (PAYE &amp; Pension)</option>
              <option value="staff-database">Staff Database Only</option>
            </select>
          </div>

          {/* Filtering: Department & Employment Type */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                Employment Type
              </label>
              <select
                value={employmentTypeFilter}
                onChange={e => setEmploymentTypeFilter(e.target.value)}
                className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2.5 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {availableTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Formula Checkbox */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeFormulas}
                onChange={e => setIncludeFormulas(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                Include interactive Excel formulas (Basic, Tax, Pension, Net Pay)
              </span>
            </label>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Download .xlsx'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
