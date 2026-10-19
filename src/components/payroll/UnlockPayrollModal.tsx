import React, { useState } from 'react';
import { Unlock, Lock, AlertTriangle, X } from 'lucide-react';
import { PayrollSnapshot } from '../../types';

interface UnlockPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  monthLabel: string;
  year: number;
  activeSnapshot: PayrollSnapshot | undefined;
}

export const UnlockPayrollModal: React.FC<UnlockPayrollModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  monthLabel,
  year,
  activeSnapshot,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const currentVersion = activeSnapshot?.version || 1;
  const nextVersion = currentVersion + 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason.trim() || `Revision for v${nextVersion}`);
    onClose();
  };

  return (
    <div className="fixed top-9 inset-x-0 bottom-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
              <Unlock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Unlock Payroll for Revision
              </h3>
              <p className="text-[11px] text-zinc-500">
                {monthLabel} {year} &bull; Currently Locked (v{currentVersion})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>How Versioning &amp; Editing Works:</span>
            </div>
            <ul className="text-zinc-600 dark:text-zinc-400 text-[11px] space-y-1 list-disc list-inside">
              <li>Unlocking restores live recalculation for <strong>{monthLabel} {year}</strong>.</li>
              <li>You can update employee salaries, target net pay, or allowances in the directory.</li>
              <li>When you finish editing, click <strong>Finalize &amp; Lock</strong> to archive <strong>Version {nextVersion}</strong>.</li>
              <li>Your previous <strong>v{currentVersion}</strong> snapshot will remain safely preserved in the audit log.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-zinc-700 dark:text-zinc-300">
              Reason / Revision Note (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Salary adjustment, new hire additions, correction..."
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition"
            >
              Keep Locked
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs transition shadow-xs"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Payroll (Enable Edits)</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
