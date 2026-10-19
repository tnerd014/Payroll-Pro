import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Zap, 
  Check, 
  CornerDownLeft, 
  AlertCircle, 
  Clipboard, 
  ArrowRight, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { Employee, EmploymentTypeRule } from '../../types';
import { formatNaira, DEFAULT_EMPLOYMENT_TYPE_RULES } from '../../engine/payePensionEngine';

export interface QuickRow {
  id: string;
  fullName: string;
  monthlySalary: string;
  employmentType: string;
}

interface QuickAddFormProps {
  existingEmployees: Employee[];
  availableDepartments?: string[];
  employmentTypeRules?: EmploymentTypeRule[];
  onSaveMultiple: (employees: Omit<Employee, 'id'>[]) => void;
  onCancel: () => void;
  onSwitchToStandard?: () => void;
}

export function parseFullName(fullName: string): { firstName: string; lastName: string } {
  const clean = fullName.trim();
  if (!clean) return { firstName: 'Staff', lastName: '' };
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export function parseSalaryNumber(salaryStr: string | number): number {
  if (typeof salaryStr === 'number') return isNaN(salaryStr) ? 0 : salaryStr;
  const cleaned = (salaryStr || '').replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

export function generateNextEmployeeCodes(existing: Employee[], count: number): string[] {
  let maxNum = 0;
  const existingSet = new Set(existing.map(e => (e.code || '').toUpperCase().trim()));

  for (const emp of existing) {
    const match = (emp.code || '').match(/EMP-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const results: string[] = [];
  let next = maxNum > 0 ? maxNum + 1 : existing.length + 1;
  for (let i = 0; i < count; i++) {
    let code = `EMP-${String(next).padStart(3, '0')}`;
    while (existingSet.has(code)) {
      next++;
      code = `EMP-${String(next).padStart(3, '0')}`;
    }
    existingSet.add(code);
    results.push(code);
    next++;
  }
  return results;
}

export const QuickAddForm: React.FC<QuickAddFormProps> = ({
  existingEmployees,
  availableDepartments = ['Operations', 'Admin', 'Finance'],
  employmentTypeRules = DEFAULT_EMPLOYMENT_TYPE_RULES,
  onSaveMultiple,
  onCancel,
  onSwitchToStandard,
}) => {
  const activeRules = employmentTypeRules && employmentTypeRules.length > 0 
    ? employmentTypeRules 
    : DEFAULT_EMPLOYMENT_TYPE_RULES;

  const defaultType = activeRules[0]?.name || 'Full-Time';
  const defaultDept = availableDepartments[0] || 'Operations';

  const [selectedDept, setSelectedDept] = useState(defaultDept);
  const [fastEnterMode, setFastEnterMode] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize with 4 empty rows
  const [rows, setRows] = useState<QuickRow[]>([
    { id: 'row-1', fullName: '', monthlySalary: '', employmentType: defaultType },
    { id: 'row-2', fullName: '', monthlySalary: '', employmentType: defaultType },
    { id: 'row-3', fullName: '', monthlySalary: '', employmentType: defaultType },
    { id: 'row-4', fullName: '', monthlySalary: '', employmentType: defaultType },
  ]);

  // Input refs for keyboard navigation
  const nameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const salaryRefs = useRef<(HTMLInputElement | null)[]>([]);
  const typeRefs = useRef<(HTMLSelectElement | null)[]>([]);

  // Focus the first row's name on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      nameRefs.current[0]?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const updateRow = (idx: number, updates: Partial<QuickRow>) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...updates };
      return next;
    });
  };

  const addRow = (focusIndex?: number) => {
    const newRow: QuickRow = {
      id: 'row-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      fullName: '',
      monthlySalary: '',
      employmentType: defaultType,
    };
    setRows(prev => [...prev, newRow]);
    
    if (focusIndex !== undefined) {
      setTimeout(() => {
        nameRefs.current[focusIndex]?.focus();
      }, 50);
    }
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) {
      // Don't remove last row, just clear it
      setRows([{ id: 'row-1', fullName: '', monthlySalary: '', employmentType: defaultType }]);
      setTimeout(() => nameRefs.current[0]?.focus(), 50);
      return;
    }
    setRows(prev => prev.filter((_, i) => i !== idx));
    setTimeout(() => {
      const targetIdx = Math.max(0, idx - 1);
      nameRefs.current[targetIdx]?.focus();
    }, 50);
  };

  const applyTypeToAll = (type: string) => {
    setRows(prev => prev.map(r => ({ ...r, employmentType: type })));
    setStatusMessage(`Applied "${type}" to all rows`);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Keyboard navigation on Name input
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      salaryRefs.current[idx]?.focus();
      salaryRefs.current[idx]?.select();
    } else if (e.key === 'ArrowDown') {
      if (idx < rows.length - 1) {
        e.preventDefault();
        nameRefs.current[idx + 1]?.focus();
      } else if (rows[idx].fullName.trim()) {
        e.preventDefault();
        addRow(idx + 1);
      }
    } else if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      nameRefs.current[idx - 1]?.focus();
    }
  };

  // Keyboard navigation on Salary input
  const handleSalaryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Fast Enter mode or Ctrl+Enter skips type and jumps directly to next line
      if (fastEnterMode || e.ctrlKey || e.metaKey) {
        if (idx === rows.length - 1) {
          addRow(idx + 1);
        } else {
          nameRefs.current[idx + 1]?.focus();
        }
      } else {
        // Standard Enter: jump to Employment Type
        typeRefs.current[idx]?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      if (idx < rows.length - 1) {
        e.preventDefault();
        salaryRefs.current[idx + 1]?.focus();
      }
    } else if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      salaryRefs.current[idx - 1]?.focus();
    }
  };

  // Keyboard navigation on Employment Type select
  const handleTypeKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>, idx: number) => {
    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (idx === rows.length - 1) {
        addRow(idx + 1);
      } else {
        nameRefs.current[idx + 1]?.focus();
      }
    }
  };

  // Handle multi-line paste into Name input
  const handleNamePaste = (e: React.ClipboardEvent<HTMLInputElement>, idx: number) => {
    const text = e.clipboardData.getData('text');
    if (text && (text.includes('\n') || text.includes('\t'))) {
      e.preventDefault();
      parseAndApplyBatchText(text, idx);
    }
  };

  // Parse batch text (tab-separated or comma-separated)
  const parseAndApplyBatchText = (text: string, startIndex: number = 0) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const parsedRows: QuickRow[] = lines.map((line, i) => {
      // Split by tab first, else by comma
      let tokens: string[] = [];
      if (line.includes('\t')) {
        tokens = line.split('\t').map(t => t.trim());
      } else if (line.includes(',')) {
        tokens = line.split(',').map(t => t.trim());
      } else {
        tokens = [line];
      }

      const name = tokens[0] || '';
      const salary = tokens[1] || '';
      let type = tokens[2] || defaultType;

      // Match type case-insensitively
      const matched = activeRules.find(r => r.name.toLowerCase() === type.toLowerCase());
      if (matched) type = matched.name;

      return {
        id: 'pasted-' + Date.now() + '-' + i,
        fullName: name,
        monthlySalary: salary,
        employmentType: type,
      };
    });

    setRows(prev => {
      const updated = [...prev];
      // Replace starting from startIndex
      parsedRows.forEach((pRow, i) => {
        const targetIdx = startIndex + i;
        if (targetIdx < updated.length) {
          updated[targetIdx] = pRow;
        } else {
          updated.push(pRow);
        }
      });
      return updated;
    });

    setStatusMessage(`Imported ${parsedRows.length} employees from text`);
    setTimeout(() => setStatusMessage(null), 3000);
    setShowPasteModal(false);
    setPasteText('');
  };

  // Valid rows have at least a non-empty name
  const validRows = useMemo(() => {
    return rows.filter(r => r.fullName.trim().length > 0);
  }, [rows]);

  // Total salary sum for valid rows
  const totalCommitment = useMemo(() => {
    return validRows.reduce((sum, r) => sum + parseSalaryNumber(r.monthlySalary), 0);
  }, [validRows]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (validRows.length === 0) {
      setStatusMessage('Please enter at least one employee name');
      nameRefs.current[0]?.focus();
      return;
    }

    // Generate unique sequential codes
    const codes = generateNextEmployeeCodes(existingEmployees, validRows.length);

    const employeesToAdd: Omit<Employee, 'id'>[] = validRows.map((row, idx) => {
      const { firstName, lastName } = parseFullName(row.fullName);
      const gross = parseSalaryNumber(row.monthlySalary);
      const empType = row.employmentType || defaultType;

      // Find statutory rule defaults
      const rule = activeRules.find(r => r.name.toLowerCase() === empType.toLowerCase());
      const hasPaye = rule ? rule.hasPayeDefault : true;
      const hasPension = rule ? rule.hasPensionDefault : true;

      return {
        code: codes[idx],
        firstName,
        lastName,
        department: selectedDept,
        position: 'Staff Member',
        employmentType: empType,
        email: '',
        phone: '',
        monthlyGross: gross,
        annualRent: 0,
        bankName: 'Access Bank',
        accountNumber: '',
        hasPension,
        hasPaye,
        payeNumber: '',
        pensionNumber: '',
        pfaName: '',
        status: 'Active',
      };
    });

    onSaveMultiple(employeesToAdd);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Top Controls Toolbar */}
      <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Department:</span>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              {availableDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Default Type:</span>
            <div className="flex items-center gap-1">
              <select
                id="quick-add-default-type-select"
                defaultValue={defaultType}
                onChange={e => applyTypeToAll(e.target.value)}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
              >
                {activeRules.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <input 
              type="checkbox"
              checked={fastEnterMode}
              onChange={e => setFastEnterMode(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-0 cursor-pointer w-3.5 h-3.5"
            />
            <span>Fast Enter (skip to next line from salary)</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPasteModal(!showPasteModal)}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-xs"
          >
            <Clipboard className="w-3 h-3 text-zinc-500" />
            <span>Paste Batch</span>
          </button>
          <button
            type="button"
            onClick={() => addRow(rows.length)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium transition-colors cursor-pointer text-xs"
          >
            <Plus className="w-3 h-3" />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Paste Batch Collapsible Panel */}
      {showPasteModal && (
        <div className="p-4 bg-zinc-100/80 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 shrink-0 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Paste Text / Excel Columns
            </span>
            <span className="text-[10px] text-zinc-500">
              Format: Name [tab or comma] Monthly Salary [tab or comma] Type
            </span>
          </div>
          <textarea
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            rows={4}
            placeholder={`Adebayo Olawale, 350000, Full-Time\nGrace Danjuma, 280000, Contract\nChidi Okafor, 400000, Full-Time`}
            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="px-3 py-1 rounded text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => parseAndApplyBatchText(pasteText, 0)}
              disabled={!pasteText.trim()}
              className="px-3 py-1 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 disabled:opacity-50"
            >
              Apply to Rows
            </button>
          </div>
        </div>
      )}

      {/* Notification banner if any */}
      {statusMessage && (
        <div className="px-5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 dark:hover:text-emerald-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* Rows Table */}
      <div className="flex-1 overflow-y-auto min-h-[260px] p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              <th className="pb-2 pl-2 w-10 text-center">#</th>
              <th className="pb-2 px-2 w-[44%]">Full Name <span className="text-rose-500">*</span></th>
              <th className="pb-2 px-2 w-[28%]">Monthly Salary (₦)</th>
              <th className="pb-2 px-2 w-[24%]">Employee Type</th>
              <th className="pb-2 pr-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {rows.map((row, idx) => {
              const salaryNum = parseSalaryNumber(row.monthlySalary);
              const isFilled = row.fullName.trim().length > 0;

              return (
                <tr 
                  key={row.id} 
                  className={`group transition-colors ${
                    isFilled ? 'bg-white dark:bg-[#121215]' : 'bg-zinc-50/30 dark:bg-zinc-900/10'
                  }`}
                >
                  {/* Row Index */}
                  <td className="py-2 pl-2 text-center text-[11px] font-mono text-zinc-400">
                    {idx + 1}
                  </td>

                  {/* Name Input */}
                  <td className="py-2 px-2">
                    <input
                      ref={el => { nameRefs.current[idx] = el; }}
                      type="text"
                      value={row.fullName}
                      onChange={e => updateRow(idx, { fullName: e.target.value })}
                      onKeyDown={e => handleNameKeyDown(e, idx)}
                      onPaste={e => handleNamePaste(e, idx)}
                      placeholder="e.g. Babatunde Raji"
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                  </td>

                  {/* Monthly Salary Input */}
                  <td className="py-2 px-2">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">
                        ₦
                      </span>
                      <input
                        ref={el => { salaryRefs.current[idx] = el; }}
                        type="text"
                        value={row.monthlySalary}
                        onChange={e => {
                          // Allow digits, dots, commas
                          const clean = e.target.value.replace(/[^0-9.,]/g, '');
                          updateRow(idx, { monthlySalary: clean });
                        }}
                        onBlur={() => {
                          if (salaryNum > 0) {
                            updateRow(idx, { monthlySalary: salaryNum.toLocaleString('en-US') });
                          }
                        }}
                        onKeyDown={e => handleSalaryKeyDown(e, idx)}
                        placeholder="350,000"
                        className="w-full pl-6 pr-2.5 py-1.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                      />
                    </div>
                  </td>

                  {/* Employee Type Select */}
                  <td className="py-2 px-2">
                    <select
                      ref={el => { typeRefs.current[idx] = el; }}
                      value={row.employmentType}
                      onChange={e => updateRow(idx, { employmentType: e.target.value })}
                      onKeyDown={e => handleTypeKeyDown(e, idx)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    >
                      {activeRules.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Remove Button */}
                  <td className="py-2 pr-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      tabIndex={-1}
                      title="Remove row"
                      className="p-1 rounded text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Quick Add Row Button below table */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => addRow(rows.length)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Next Employee Row</span>
          </button>

          <span className="text-[11px] text-zinc-400">
            💡 Press <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">Enter</kbd> to move to next field &amp; line automatically
          </span>
        </div>
      </div>

      {/* Footer Summary & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50 shrink-0">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {validRows.length} {validRows.length === 1 ? 'employee' : 'employees'} ready
            </span>
            <span className="text-zinc-400">&bull;</span>
            <span className="text-zinc-500 dark:text-zinc-400 font-mono">
              Total Gross: ₦{formatNaira(totalCommitment)}
            </span>
          </div>

          {onSwitchToStandard && (
            <button
              type="button"
              onClick={onSwitchToStandard}
              className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline text-[11px] cursor-pointer"
            >
              Need detailed single-profile form?
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={validRows.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-zinc-950 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Add {validRows.length > 0 ? `All ${validRows.length} Employees` : 'Employees'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
