import React, { useState } from 'react';
import ReactDOM from 'react-dom';
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
  UserCheck,
  Calendar
} from 'lucide-react';
import { Employee } from '../../types';
import { formatNaira } from '../../engine/payePensionEngine';
import { formatDate } from '../../engine/dateUtils';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobileStaffDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onEdit: (emp: Employee) => void;
  onDelete?: (id: string) => void;
  isReadOnly?: boolean;
}

export const MobileStaffDetailSheet: React.FC<MobileStaffDetailSheetProps> = ({
  isOpen,
  onClose,
  employee,
  onEdit,
  onDelete,
  isReadOnly = false,
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
    <>
      {/* ── Delete Confirmation: Centered Overlay Modal via Portal ── */}
      {showDeleteConfirm && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-5 animate-in fade-in duration-150"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setShowDeleteConfirm(false)}
          />
          {/* Modal Card */}
          <div className="relative w-full max-w-xs bg-white dark:bg-[#18181b] rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-800/60 p-5 space-y-3 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">Delete Employee?</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">This cannot be undone</p>
              </div>
            </div>
            {/* Body */}
            <p className="text-[12px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <span className="font-semibold text-zinc-800 dark:text-zinc-100">{employee.firstName} {employee.lastName}</span> ({employee.code}) will be permanently removed from all future payroll calculations.
            </p>
            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer active:scale-95 shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <MobileBottomSheet
        isOpen={isOpen}
        onClose={onClose}
        maxHeight="max-h-[90vh]"
        bodyClassName="px-5 py-4 overflow-y-auto flex-1 space-y-5"
        footer={
          !isReadOnly ? (
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
        ) : undefined
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

        {/* ── 4. Employment Tenure Dates ── */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
            Employment Tenure &amp; Dates
          </span>

          <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs shadow-2xs">
            {/* Start Date / Hire Date */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-500 dark:text-zinc-400">Start Date (Hire)</span>
              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                {employee.startDate ? formatDate(employee.startDate) : 'Not Specified'}
              </span>
            </div>

            {/* Exit Date / Ongoing */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-500 dark:text-zinc-400">Exit Date</span>
              <span className={`font-mono font-semibold ${employee.endDate ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {employee.endDate ? formatDate(employee.endDate) : 'Active & Ongoing'}
              </span>
            </div>

            {/* Multi-stint History */}
            {employee.stints && employee.stints.length > 0 && (
              <div className="p-3.5 space-y-1.5 bg-zinc-50/50 dark:bg-zinc-900/40">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Tenure History ({employee.stints.length} stints)
                </span>
                {employee.stints.map((st, idx) => (
                  <div key={st.stintId || idx} className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                    <span>#{idx + 1}: {formatDate(st.startDate)} → {st.endDate ? formatDate(st.endDate) : 'Active'}</span>
                    {st.exitReason && <span className="text-zinc-400 text-[10px] font-sans">({st.exitReason})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 5. Statutory & Tax Registration (Clean List Rows) ── */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-1">
            Statutory Credentials &amp; Tax IDs
          </span>

          <div className="bg-white dark:bg-[#121215] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs shadow-2xs">
            {/* State of Residence */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-500 dark:text-zinc-400">State of Residence (IRS)</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {employee.stateOfResidence || 'Lagos State'}
              </span>
            </div>

            {/* PAYE Income Tax & Status */}
            <div className="flex items-center justify-between p-3.5">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block">PAYE Income Tax</span>
                <span className="text-[10px] text-zinc-400">
                  {employee.hasPaye !== false ? 'Standard CRA & PITA Brackets' : 'Exempt from Tax Deductions'}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                employee.hasPaye !== false
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700'
              }`}>
                {employee.hasPaye !== false ? 'Enrolled' : 'Exempt'}
              </span>
            </div>

            {/* Taxpayer ID / PAYE No */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-500 dark:text-zinc-400">Taxpayer ID (PAYE No)</span>
              <button
                type="button"
                disabled={!employee.payeNumber}
                onClick={() => employee.payeNumber && handleCopy(employee.payeNumber, 'paye')}
                className="inline-flex items-center gap-1.5 font-mono font-semibold text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              >
                <span>{employee.payeNumber || 'Not Registered'}</span>
                {employee.payeNumber && (
                  copiedField === 'paye' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded font-sans">
                      <Check className="w-3 h-3" /> Copied
                    </span>
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  )
                )}
              </button>
            </div>

            {/* Pension Scheme & Status */}
            <div className="flex items-center justify-between p-3.5">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 block">Pension Scheme</span>
                <span className="text-[10px] text-zinc-400">
                  {employee.hasPension !== false ? '8% Employee + 10% Employer' : 'Exempt from Pension Scheme'}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                employee.hasPension !== false
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700'
              }`}>
                {employee.hasPension !== false ? 'Enrolled' : 'Exempt'}
              </span>
            </div>

            {/* Pension PFA */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-500 dark:text-zinc-400">Pension Fund (PFA)</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-right truncate max-w-[200px]">
                {employee.pfaName || 'Not Assigned'}
              </span>
            </div>

            {/* Pension RSA PIN */}
            <div className="flex items-center justify-between p-3.5">
              <span className="text-zinc-500 dark:text-zinc-400">Pension RSA PIN</span>
              <button
                type="button"
                disabled={!employee.pensionNumber}
                onClick={() => employee.pensionNumber && handleCopy(employee.pensionNumber, 'rsa')}
                className="inline-flex items-center gap-1.5 font-mono font-semibold text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              >
                <span>{employee.pensionNumber || 'Not Registered'}</span>
                {employee.pensionNumber && (
                  copiedField === 'rsa' ? (
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

        {/* (Delete confirmation is now a centered overlay modal — see portal above) */}

      </div>
    </MobileBottomSheet>
    </>
  );
};
