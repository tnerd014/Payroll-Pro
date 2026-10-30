import React, { useState, useRef, useEffect } from 'react';
import { Building2, Upload, X, Check, Image as ImageIcon, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { CompanyProfile, DEFAULT_SECURITY_QUESTIONS } from '../../types';

interface CompanySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyProfile;
  onSave: (profile: Partial<CompanyProfile>) => void;
  isReadOnly?: boolean;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  isOpen,
  onClose,
  company,
  onSave,
  isReadOnly = false,
}) => {
  const [formData, setFormData] = useState<CompanyProfile>(company);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmDeleteLogo, setConfirmDeleteLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(company);
    setPasswordError(null);
  }, [company, isOpen]);

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
    if (isReadOnly) return;
    setPasswordError(null);

    if (formData.hasPassword) {
      if (!formData.password) {
        setPasswordError('Please enter a password or disable password protection.');
        return;
      }
      if (!formData.securityAnswer?.trim()) {
        setPasswordError('Please provide a security answer for password recovery.');
        return;
      }
    }

    const payload: Partial<CompanyProfile> = {
      ...formData,
      hasPassword: Boolean(formData.hasPassword && formData.password),
      password: formData.hasPassword ? formData.password : '',
      passwordHint: formData.hasPassword ? (formData.passwordHint || '') : '',
      securityQuestion: formData.hasPassword ? (formData.securityQuestion || DEFAULT_SECURITY_QUESTIONS[0]) : '',
      securityAnswer: formData.hasPassword ? (formData.securityAnswer?.trim() || '') : '',
    };

    onSave(payload);
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
                  confirmDeleteLogo ? (
                    <div className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded">
                      <span className="text-rose-600 dark:text-rose-400 font-medium">Delete?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, logoUrl: '' }));
                          setConfirmDeleteLogo(false);
                        }}
                        className="px-1.5 py-0.2 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteLogo(false)}
                        className="px-1 text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteLogo(true)}
                      className="px-2 py-1 text-slate-500 hover:text-rose-600 transition text-[11px] cursor-pointer"
                    >
                      Remove
                    </button>
                  )
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

          {/* Security & Access Protection Section */}
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/40 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">Password Protection</span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">Require password or PIN on startup / account switch</span>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.hasPassword)}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    hasPassword: e.target.checked,
                    password: e.target.checked ? prev.password || '' : '',
                    passwordHint: e.target.checked ? prev.passwordHint || '' : '',
                  }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formData.hasPassword && (
              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 space-y-2.5 animate-in fade-in">
                {passwordError && (
                  <p className="text-[11px] text-rose-500 font-medium">{passwordError}</p>
                )}
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Company Password / PIN</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password || ''}
                      onChange={e => {
                        setFormData({ ...formData, password: e.target.value });
                        if (passwordError) setPasswordError(null);
                      }}
                      className="w-full h-8 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 px-2.5 pr-8 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                      placeholder="Enter password or PIN"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">Password Hint (Optional)</label>
                  <input
                    type="text"
                    value={formData.passwordHint || ''}
                    onChange={e => setFormData({ ...formData, passwordHint: e.target.value })}
                    className="w-full h-8 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 px-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                    placeholder="e.g. Director's phone number or code"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Security Question (For Recovery) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.securityQuestion || DEFAULT_SECURITY_QUESTIONS[0]}
                    onChange={e => setFormData({ ...formData, securityQuestion: e.target.value })}
                    className="w-full h-8 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 px-2 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                  >
                    {DEFAULT_SECURITY_QUESTIONS.map((q, idx) => (
                      <option key={idx} value={q}>{q}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Security Answer <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.securityAnswer || ''}
                    onChange={e => setFormData({ ...formData, securityAnswer: e.target.value })}
                    className="w-full h-8 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/80 px-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-600"
                    placeholder="Answer to reset PIN if forgotten"
                  />
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Always-Visible Fixed Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 shrink-0">
            {isReadOnly ? (
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Offline Mode &bull; Read-Only
              </span>
            ) : <span />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isReadOnly}
                title={isReadOnly ? 'Saving is disabled in offline read-only mode' : undefined}
                className="px-4 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium text-xs transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Profile
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
