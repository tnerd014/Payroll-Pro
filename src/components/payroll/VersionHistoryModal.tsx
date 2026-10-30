import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { History, Lock, Clock, CheckCircle2, Eye, X, ArrowRight, ArrowUpRight, ArrowDownRight, Layers, Trash2, AlertTriangle } from 'lucide-react';
import { PayrollSnapshot } from '../../types';
import { formatNaira, formatDateTime } from '../../engine/payePensionEngine';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: PayrollSnapshot[];
  monthLabel: string;
  year: number;
  currentSelectedVersion: string;
  activeSnapshot?: PayrollSnapshot;
  isLocked: boolean;
  onSelectVersion: (versionKey: string) => void;
  onDeleteSnapshot?: (snapshotId: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  monthLabel,
  year,
  currentSelectedVersion,
  activeSnapshot,
  isLocked,
  onSelectVersion,
  onDeleteSnapshot,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const sortedSnapshots = [...snapshots].sort((a, b) => b.version - a.version);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Payroll Snapshot Version History
              </h3>
              <p className="text-xs text-zinc-500">
                {monthLabel} {year} &bull; {snapshots.length} {snapshots.length === 1 ? 'Snapshot' : 'Snapshots'} Preserved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Version List */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {sortedSnapshots.map((snap, idx) => {
            const isCurrentlySelected = currentSelectedVersion === String(snap.version);
            const isActiveLock = Boolean(snap.isLocked);
            const formattedDate = snap.finalizedAt 
              ? formatDateTime(snap.finalizedAt)
              : 'Unknown date';

            // Compare with previous version if available
            const prevSnap = sortedSnapshots[idx + 1];
            const netDiff = prevSnap ? snap.totals.totalNet - prevSnap.totals.totalNet : null;

            return (
              <div
                key={snap.id}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrentlySelected
                    ? 'border-blue-500/80 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151518] hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                      v{snap.version}
                    </span>

                    {isActiveLock ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded">
                        <Lock className="w-3 h-3" />
                        Active Lock
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        Archived Snapshot
                      </span>
                    )}

                    {isCurrentlySelected && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                        <Eye className="w-3 h-3" />
                        Currently Viewing
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-zinc-400 font-mono">
                    {formattedDate} {snap.finalizedBy && `by ${snap.finalizedBy}`}
                  </div>
                </div>

                {/* Notes */}
                {snap.notes && (
                  <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 italic">
                    &ldquo;{snap.notes}&rdquo;
                  </div>
                )}

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-medium block">Total Gross</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatNaira(snap.totals.totalGross)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-medium block">PAYE Tax</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatNaira(snap.totals.totalPaye)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-medium block">Pension</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatNaira(snap.totals.totalEmpPension)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-medium block">Total Net Pay</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatNaira(snap.totals.totalNet)}
                      </span>
                      {netDiff !== null && netDiff !== 0 && (
                        <span className={`text-[10px] font-mono flex items-center ${netDiff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {netDiff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {formatNaira(Math.abs(netDiff))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/40">
                  <span className="text-[11px] text-zinc-500">
                    {snap.totals.staffCount} staff preserved
                  </span>

                  <div className="flex items-center gap-2">
                    {onDeleteSnapshot && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(snap.id)}
                        title={`Delete snapshot v${snap.version}`}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Delete</span>
                      </button>
                    )}

                    {isCurrentlySelected ? (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 cursor-default flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Viewing Active
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectVersion(String(snap.version));
                          onClose();
                        }}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Version {snap.version}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Confirmation for Deletion */}
                {confirmDeleteId === snap.id && (
                  <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs animate-fade-in">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>
                        {isActiveLock 
                          ? `Delete active locked v${snap.version}? Period will revert to an unlocked draft.` 
                          : `Permanently delete archived snapshot v${snap.version}?`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-[11px] font-medium transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onDeleteSnapshot) onDeleteSnapshot(snap.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition shadow-2xs"
                      >
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sortedSnapshots.length === 0 && (
            <div className="py-12 text-center text-zinc-400 text-xs">
              No historical versions saved for this payroll cycle yet.
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 flex-shrink-0">
          <span>
            {snapshots.length > 1 ? `${snapshots.length} versions in audit history` : '1 version available'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
