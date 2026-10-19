import React, { useState, useRef } from 'react';
import { Building2, Upload, X, Check, Image as ImageIcon } from 'lucide-react';
import { CompanyProfile } from '../../types';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  onSave: (profile: Partial<CompanyProfile>) => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  company,
  onSave,
}) => {
  const [formData, setFormData] = useState<CompanyProfile>(company);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, logoUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed top-9 inset-x-0 bottom-0 z-40 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-lg w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Company Profile &amp; Payslip Branding</h3>
              <p className="text-[11px] text-slate-500">Configure your company name, address, and logo for payslips</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          
          {/* Logo Section */}
          <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-zinc-800/50/50 rounded-md border border-slate-200 dark:border-zinc-800/60">
            <div className="w-16 h-16 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-white dark:bg-[#121215] shrink-0">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon className="w-6 h-6 text-slate-400" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">Company Logo</span>
              <p className="text-[11px] text-slate-500">Appears on print &amp; PDF payslip headers (PNG, JPG, SVG)</p>
              
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="company-logo-input"
              />
              <div className="flex gap-2 pt-1">
                <label
                  htmlFor="company-logo-input"
                  className="px-2.5 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 text-white font-medium rounded-md cursor-pointer transition text-[11px] inline-flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Logo</span>
                </label>
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                    className="px-2 py-1 text-slate-500 hover:text-rose-600 transition text-[11px]"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Registered Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
              placeholder="e.g. Dewatering Construction Etc Limited"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Subtitle / Industry Description</label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
              placeholder="e.g. Ground Water Control & Engineering Specialist"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Office Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
              placeholder="Street Address, City, State"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Official Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                placeholder="+234..."
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Official Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 px-3 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                placeholder="info@company.com"
              />
            </div>
          </div>
          </div>

          {/* Always-Visible Fixed Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium text-xs transition shadow-xs"
            >
              Save Profile
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
