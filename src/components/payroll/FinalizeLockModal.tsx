import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { formatNaira } from '../../engine/payePensionEngine';
import { CalculatedPayrollItem } from '../../types';

interface FinalizeLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  monthLabel: string;
  year: number;
  items: CalculatedPayrollItem[];
  nextVersion: number;
}

export const FinalizeLockModal: React.FC<FinalizeLockModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  monthLabel,
  year,
  items,
  nextVersion = 1,
}) => {
  if (!isOpen) return null;

  const [notes, setNotes] = React.useState('');
  const totalNet = items.reduce((s, i) => s + i.netTakeHome, 0);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return createPortal(
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Finalize &amp; Lock Payroll (Version {nextVersion})
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              v{nextVersion}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Locking this payroll cycle for <strong className="text-zinc-900 dark:text-zinc-100">{monthLabel} {year}</strong> will save and archive <strong className="text-zinc-900 dark:text-zinc-100">Version {nextVersion}</strong> across <strong className="text-zinc-900 dark:text-zinc-100">{items.length} personnel</strong> with a total disbursement of <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatNaira(totalNet)}</strong>.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Finalization Note / Memo (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={`e.g. Finalized ${monthLabel} ${year} (v${nextVersion})`}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400"
            />
          </div>
        </div>

        {/* Action Buttons (Always Fixed Footer) */}
        <div className="flex items-center justify-end gap-2 p-3.5 px-4 sm:px-5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-zinc-200 dark:border-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(notes.trim() || `Finalized ${monthLabel} ${year} (v${nextVersion})`);
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium text-xs transition shadow-xs cursor-pointer"
          >
            Confirm &amp; Lock v{nextVersion}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
