import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Bookmark, Sparkles, ChevronDown } from 'lucide-react';
import { 
  PayslipDesignConfig, 
  PayslipCustomPreset, 
  DEFAULT_PAYSLIP_DESIGN 
} from '../../types';

export interface BuiltinTheme {
  id: string;
  name: string;
  color: string;
  desc: string;
  config: Partial<PayslipDesignConfig>;
}

export const BUILTIN_THEMES: BuiltinTheme[] = [
  {
    id: 'default-slate',
    name: 'Default Slate',
    color: '#64748b',
    desc: 'Clean, modern neutral grey layout with soft card accents',
    config: {
      ...DEFAULT_PAYSLIP_DESIGN,
      themeColor: 'slate',
      customColor: '#64748b',
      accentTintStyle: 'soft',
      headerLayout: 'modern',
      fontFamily: 'sans',
      density: 'standard',
      breakdownLayout: 'two-column',
    }
  },
  {
    id: 'modern-indigo',
    name: 'Modern Indigo',
    color: '#4f46e5',
    desc: 'Tech-forward indigo brand styling with rounded cards',
    config: {
      ...DEFAULT_PAYSLIP_DESIGN,
      themeColor: 'indigo',
      customColor: '#4f46e5',
      accentTintStyle: 'soft',
      tableStyle: 'minimal',
      cornerRadius: 'md',
      headerLayout: 'modern',
      fontFamily: 'sans',
      density: 'standard',
      breakdownLayout: 'two-column',
      roundedCorners: true,
      watermark: 'none',
    }
  },
  {
    id: 'executive-emerald',
    name: 'Executive Emerald',
    color: '#059669',
    desc: 'Top solid emerald banner, spacious layout, watermark advice',
    config: {
      ...DEFAULT_PAYSLIP_DESIGN,
      themeColor: 'emerald',
      customColor: '#059669',
      accentTintStyle: 'solid',
      tableStyle: 'striped',
      cornerRadius: 'md',
      headerLayout: 'banner',
      fontFamily: 'sans',
      density: 'spacious',
      breakdownLayout: 'two-column',
      roundedCorners: true,
      watermark: 'confidential',
      watermarkOpacity: 0.06,
      payslipTitle: 'EMPLOYEE SALARY ADVICE',
      payslipSubtitle: 'Direct Bank Transfer Remittance Advice',
    }
  },
  {
    id: 'formal-corporate',
    name: 'Corporate Blue Serif',
    color: '#1d4ed8',
    desc: 'Centered logo, editorial serif typography, signatures block',
    config: {
      ...DEFAULT_PAYSLIP_DESIGN,
      themeColor: 'blue',
      customColor: '#1d4ed8',
      accentTintStyle: 'soft',
      tableStyle: 'bordered',
      cornerRadius: 'sm',
      headerLayout: 'centered',
      fontFamily: 'serif',
      density: 'standard',
      breakdownLayout: 'two-column',
      roundedCorners: true,
      watermark: 'none',
      payslipTitle: 'MONTHLY STATEMENT OF EMOLUMENTS',
      payslipSubtitle: 'Official Payroll Record & Advice',
    }
  },
  {
    id: 'minimal-mono',
    name: 'Monochrome Voucher',
    color: '#18181b',
    desc: 'High-contrast technical mono with sharp corners & borders',
    config: {
      ...DEFAULT_PAYSLIP_DESIGN,
      themeColor: 'black',
      customColor: '#18181b',
      accentTintStyle: 'minimal',
      tableStyle: 'bordered',
      cornerRadius: 'none',
      headerLayout: 'clean',
      fontFamily: 'mono',
      density: 'compact',
      breakdownLayout: 'two-column',
      roundedCorners: false,
      watermark: 'none',
      payslipTitle: 'PAYMENT VOUCHER & STATEMENT',
      payslipSubtitle: 'Confidential Emoluments Statement',
    }
  },
  {
    id: 'prestige-amber',
    name: 'Prestige Amber',
    color: '#d97706',
    desc: 'Warm gold & amber accents, elegant executive presentation',
    config: {
      ...DEFAULT_PAYSLIP_DESIGN,
      themeColor: 'amber',
      customColor: '#d97706',
      accentTintStyle: 'soft',
      tableStyle: 'minimal',
      cornerRadius: 'md',
      headerLayout: 'modern',
      fontFamily: 'sans',
      density: 'standard',
      breakdownLayout: 'two-column',
      roundedCorners: true,
      watermark: 'none',
      payslipTitle: 'EXECUTIVE REMUNERATION STATEMENT',
      payslipSubtitle: 'Private & Confidential',
    }
  },
  {
    id: 'crimson-rose',
    name: 'Crimson Rose',
    color: '#e11d48',
    desc: 'High-energy crimson accents with bold summary styling',
    config: {
      ...DEFAULT_PAYSLIP_DESIGN,
      themeColor: 'rose',
      customColor: '#e11d48',
      accentTintStyle: 'solid',
      tableStyle: 'minimal',
      cornerRadius: 'md',
      headerLayout: 'modern',
      fontFamily: 'sans',
      density: 'standard',
      breakdownLayout: 'two-column',
      roundedCorners: true,
      watermark: 'none',
    }
  }
];

interface PayslipThemeSelectorProps {
  currentConfig?: PayslipDesignConfig;
  savedPresets?: PayslipCustomPreset[];
  activePresetName?: string | null;
  onSelectTheme: (config: Partial<PayslipDesignConfig>, preset?: PayslipCustomPreset) => void;
  className?: string;
}

export const PayslipThemeSelector: React.FC<PayslipThemeSelectorProps> = ({
  currentConfig = DEFAULT_PAYSLIP_DESIGN,
  savedPresets = [],
  activePresetName,
  onSelectTheme,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine current active theme display name
  const currentAccent = currentConfig.customColor || '#18181b';
  const matchingCustom = savedPresets.find(p => 
    (activePresetName && p.name.toLowerCase() === activePresetName.toLowerCase()) ||
    (p.design.customColor === currentConfig.customColor &&
     p.design.headerLayout === currentConfig.headerLayout)
  );
  const matchingBuiltin = BUILTIN_THEMES.find(t => 
    t.config.customColor === currentConfig.customColor &&
    t.config.headerLayout === currentConfig.headerLayout
  );

  const activeLabel = activePresetName || (matchingCustom 
    ? matchingCustom.name 
    : matchingBuiltin 
    ? matchingBuiltin.name 
    : 'Custom Theme');

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 transition shadow-2xs cursor-pointer"
        title="Select Payslip Theme / Preset"
      >
        <span 
          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" 
          style={{ backgroundColor: currentAccent }} 
        />
        <span className="text-zinc-500 dark:text-zinc-400 font-normal">Theme:</span>
        <span className="font-semibold text-zinc-800 dark:text-zinc-100 max-w-[110px] truncate">
          {activeLabel}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white dark:bg-[#121215] border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 text-xs z-50 animate-in fade-in zoom-in-95">
          
          {/* User's Custom Saved Themes */}
          {savedPresets.length > 0 && (
            <div className="px-2 py-1 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="px-1.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-amber-500" />
                <span>My Saved Themes</span>
              </div>
              <div className="space-y-0.5 max-h-36 overflow-y-auto">
                {savedPresets.map(preset => {
                  const isSelected = preset.name === activeLabel;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        onSelectTheme(preset.design, preset);
                        setIsOpen(false);
                      }}
                      className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition ${
                        isSelected 
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold' 
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span 
                          className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" 
                          style={{ backgroundColor: preset.design.customColor || '#18181b' }} 
                        />
                        <span className="truncate">{preset.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Built-in Presets */}
          <div className="px-2 py-1">
            <div className="px-1.5 py-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>Standard Presets</span>
            </div>
            <div className="space-y-0.5">
              {BUILTIN_THEMES.map(theme => {
                const isSelected = theme.name === activeLabel;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      onSelectTheme(theme.config);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition ${
                      isSelected 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span 
                        className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" 
                        style={{ backgroundColor: theme.color }} 
                      />
                      <div>
                        <div className="text-xs">{theme.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate max-w-[190px]">{theme.desc}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
