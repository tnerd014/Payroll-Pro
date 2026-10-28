import React, { useState } from 'react';
import { 
  Building2, 
  Phone, 
  Mail, 
  Landmark, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Banknote, 
  AlertTriangle,
  BadgeCheck,
  UserCheck
} from 'lucide-react';
import { Employee } from '../../types';
import { formatNaira } from '../../engine/payePensionEngine';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobileStaffDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEdit: (emp: Employee) => void;
  onDelete?: (id: string) => void;
}

export const MobileStaffDetailSheet: React.FC<MobileStaffDetailSheetProps> = ({
  isOpen,
  onClose,
  employee,
  onEdit,
  onDelete,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!employee) return null;

  const initials = `${employee.firstName?.charAt(0) || ''}${employee.lastName?.charAt(0) || ''}`.toUpperCase() || 'E';
  const isActive = employee.status === 'Active';

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStartEdit = () => {
    onClose();
    onEdit(employee);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(employee.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      maxHeight="max-h-[90vh]"
      bodyClassName="px-5 py-4 overflow-y-auto flex-1 space-y-5"
      footer={
        <div className="flex items-center gap-2.5 w-full">
          {onDelete && !showDeleteConfirm && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-12 h-12 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Delete Personnel"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleStartEdit}
            className="flex-1 h-12 rounded-2xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5 select-none text-zinc-900 dark:text-zinc-100 pb-2">
        
        {/* ── 1. Clean Minimalist Profile Header (Spacious, Apple Contacts Style) ── */}
        <div className="flex flex-col items-center text-center space-y-2 pt-1">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-extrabold text-xl flex items-center justify-center border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs">
            {initials}
          </div>

          {/* Full Name & Status */}
          <div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {employee.firstName} {employee.lastName}
              </h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/60'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                <span>{employee.status}</span>
              </span>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {employee.position || 'Staff Member'} &bull; <span className="font-semibold text-zinc-700 dark:text-zinc-300">{employee.department || 'General'}</span>
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-2">
              <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md text-zinc-700 dark:text-zinc-300 font-bold border border-zinc-200/60 dark:border-zinc-700/60">
                {employee.code || 'NO-ID'}
              </span>
              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md text-zinc-600 dark:text-zinc-300 font-medium border border-zinc-200/60 dark:border-zinc-700/60">
                {employee.employmentType || 'Full-Time'}
              </span>
            </div>
          </div>

          {/* Quick Contact Buttons (Call & Mail) */}
          {(employee.phone || employee.email) && (
            <div className="flex items-center justify-center gap-2 pt-2 w-full max-w-xs">
              {employee.phone && (
                <a
                  href={`tel:${employee.phone}`}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate">{employee.phone}</span>
                </a>
              )}

              {employee.email && (
                <a
                  href={`mailto:${employee.email}`}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="truncate">Email</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── 2. Prominent Minimalist Compensation Card ── */}
        <div className="bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800 rounded-2xl p-4 text-center space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Monthly Gross Salary
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-zinc-900 dark:text-zinc-50 tracking-tight">
            {formatNaira(employee.monthlyGross)}
          </div>
          <div className="text-xs text-zinc-500 font-mono pt-0.5">
            Annual: {formatNaira(employee.monthlyGross * 12)} / year
          </div>
        </div>

        {/* ── 3. Direct Transfer & Bank Details (Clean List Rows) ── */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
            Bank Transfer Details
          </span>

          <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs shadow-2xs">
            
            {/* Bank Name */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-500 dark:text-zinc-400">Bank Name</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {employee.bankName || 'Not Provided'}
              </span>
            </div>

            {/* Account Number */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-500 dark:text-zinc-400">Account Number</span>
              
              <button
                type="button"
                disabled={!employee.accountNumber}
                onClick={() => employee.accountNumber && handleCopy(employee.accountNumber, 'acc')}
                className="inline-flex items-center gap-1.5 font-mono font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              >
                <span>{employee.accountNumber || 'Not Provided'}</span>
                {employee.accountNumber && (
                  copiedField === 'acc' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded font-sans">
                      <Check className="w-3 h-3" /> Copied
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  )
                )}
              </button>
            </div>

          </div>
        </div>

        {/* ── 4. Statutory & Tax Registration (Clean List Rows) ── */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
            Statutory Credentials
          </span>

          <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs shadow-2xs">
            
            {/* PAYE Tax ID */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-500 dark:text-zinc-400">PAYE Tax ID</span>
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                {employee.hasPaye !== false 
                  ? (employee.payeNumber || 'Enrolled') 
                  : 'Statutory Exempt'}
              </span>
            </div>

            {/* Pension / RSA */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-500 dark:text-zinc-400">Pension (PFA / RSA)</span>
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 text-right truncate max-w-[220px]">
                {employee.hasPension !== false
                  ? (employee.pfaName ? `${employee.pfaName} ${employee.pensionNumber ? `(${employee.pensionNumber})` : ''}` : (employee.pensionNumber || 'Enrolled'))
                  : 'Statutory Exempt'}
              </span>
            </div>

          </div>
        </div>

        {/* Delete Confirmation Box */}
        {showDeleteConfirm && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Confirm Permanent Deletion</span>
            </div>
            <p className="text-[11px] text-rose-600 dark:text-rose-300">
              Are you sure you want to delete {employee.firstName} {employee.lastName} ({employee.code})? This will remove them from all future payroll calculations.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        )}

      </div>
    </MobileBottomSheet>
  );
};
