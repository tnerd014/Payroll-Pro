import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight
} from 'lucide-react';
import { Employee, CalculatedPayrollItem, PayrollVariables, PayeTaxVariables, PayrollSnapshot } from '../../types';
import { exportPayrollProToExcel, parseEmployeesFromExcel } from '../../engine/excelEngine';

interface ExcelHubViewProps {
  employees: Employee[];
  payrollItems: CalculatedPayrollItem[];
  payrollVariables: PayrollVariables;
  payeTaxVariables: PayeTaxVariables;
  monthLabel: string;
  year: number;
  activeSnapshot: PayrollSnapshot | undefined;
  onImportEmployees: (items: Partial<Employee>[], mode: 'merge' | 'overwrite') => void;
}

export const ExcelHubView: React.FC<ExcelHubViewProps> = ({
  employees,
  payrollItems,
  payrollVariables,
  payeTaxVariables,
  monthLabel,
  year,
  activeSnapshot,
  onImportEmployees
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedData, setParsedData] = useState<Partial<Employee>[] | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadWorkbook = () => {
    try {
      exportPayrollProToExcel(
        employees,
        payrollItems,
        payrollVariables,
        payeTaxVariables,
        monthLabel,
        year,
        activeSnapshot
      );
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      alert('Error generating Excel workbook: ' + (err as Error).message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseEmployeesFromExcel(file);

      if (result.employees.length === 0) {
        alert('No valid employee records found in this spreadsheet.');
        return;
      }

      setParsedData(result.employees);
      setImportErrors(result.errors);
      setIsImportModalOpen(true);
    } catch (err) {
      alert('Failed to parse Excel file: ' + (err as Error).message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData) return;
    onImportEmployees(parsedData, importMode);
    setIsImportModalOpen(false);
    setParsedData(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Excel Data Hub
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Export complete multi-tab payroll workbooks and import staff directories with smart conflict resolution.
          </p>
        </div>
      </div>

      {/* Main Dual Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Export Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Download className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Export Complete Payroll Workbook
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Generates a multi-tab Microsoft Excel file formatted with summary headers:
            </p>
            <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1 pl-4 list-disc">
              <li><strong className="text-zinc-900 dark:text-zinc-100">Summary:</strong> Executive C-Suite KPI dashboard and departmental cost matrix</li>
              <li><strong className="text-zinc-900 dark:text-zinc-100">Payroll_Register:</strong> Master register with live Excel formulas and filter subtotals</li>
              <li><strong className="text-zinc-900 dark:text-zinc-100">Bank_Schedule:</strong> Corporate NUBAN batch payment disbursement schedule</li>
              <li><strong className="text-zinc-900 dark:text-zinc-100">Statutory Schedules:</strong> State PAYE tax and PenCom pension remittance</li>
              <li><strong className="text-zinc-900 dark:text-zinc-100">Annual_Matrix & Staff_Database:</strong> 12-month pay matrix and staff directory</li>
              <li><strong className="text-zinc-900 dark:text-zinc-100">Variables:</strong> Centralized statutory parameters driving workbook calculations</li>
            </ul>
          </div>

          <button
            onClick={handleDownloadWorkbook}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-none"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadSuccess ? 'Downloaded!' : 'Download Payroll Workbook (.xlsx)'}</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="w-8 h-8 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Upload className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Import & Sync from Excel
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Upload a spreadsheet to refresh staff compensation or add new team members.
            </p>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 space-y-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100 block">Dual-Mode Support:</span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Choose between <strong>Smart Merge</strong> (updates matching staff by code and appends new rows) or <strong>Complete Overwrite</strong>.
              </p>
            </div>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="excel-file-upload"
            />
            <label
              htmlFor="excel-file-upload"
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Select Excel File to Upload</span>
            </label>
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {isImportModalOpen && parsedData && (
        <div className="fixed top-9 inset-x-0 bottom-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg w-full max-w-lg p-5 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                Confirm Excel Data Import
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">✕</button>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 p-3 rounded border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Records Detected:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">{parsedData.length} Staff</span>
              </div>
              {importErrors.length > 0 && (
                <div className="pt-1.5 border-t border-zinc-200 dark:border-zinc-800 text-amber-600 dark:text-amber-400 text-[11px]">
                  <strong>Warnings:</strong> {importErrors.length} rows had missing or skipped fields.
                </div>
              )}
            </div>

            {/* Strategy Selection */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Choose Import Resolution Mode:
              </label>

              <div className="grid grid-cols-1 gap-2">
                <label 
                  onClick={() => setImportMode('merge')}
                  className={`flex items-start gap-2.5 p-3 rounded border cursor-pointer transition-colors ${
                    importMode === 'merge' 
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100' 
                      : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="mt-0.5"
                  />
                  <div>
                    <strong className="block text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      Option A: Smart Merge & Update (Recommended)
                    </strong>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Matches staff by Employee Code, updates changed salaries/accounts, appends new rows, and leaves existing records intact.
                    </span>
                  </div>
                </label>

                <label 
                  onClick={() => setImportMode('overwrite')}
                  className={`flex items-start gap-2.5 p-3 rounded border cursor-pointer transition-colors ${
                    importMode === 'overwrite' 
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100' 
                      : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'overwrite'}
                    onChange={() => setImportMode('overwrite')}
                    className="mt-0.5"
                  />
                  <div>
                    <strong className="block text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      Option B: Complete Overwrite
                    </strong>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Wipes the existing staff list and replaces it entirely with the rows in this uploaded spreadsheet.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-none"
              >
                Apply Import ({parsedData.length} records)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
