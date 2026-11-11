import React from 'react';
import { 
  Building2, 
  User, 
  Landmark, 
  ShieldCheck, 
  ArrowUp, 
  ArrowDown, 
  EyeOff, 
  CheckCircle2,
  FileCheck,
  CreditCard
} from 'lucide-react';
import { 
  CalculatedPayrollItem, 
  CompanyProfile, 
  PayslipDesignConfig, 
  PayslipSectionId,
  DEFAULT_PAYSLIP_DESIGN,
  PRESET_HEX_MAP,
  normalizeVisibleColumns,
  NetPayFontSize,
  BreakdownFontSize
} from '../../types';
import { formatNaira } from '../../engine/payePensionEngine';

interface CustomizablePayslipViewProps {
  item: CalculatedPayrollItem;
  company: CompanyProfile;
  monthLabel: string;
  year?: number;
  config?: PayslipDesignConfig;
  visibleColumns?: string[];
  isCol?: (id: string) => boolean;
  interactive?: boolean;
  onMoveSectionUp?: (id: PayslipSectionId) => void;
  onMoveSectionDown?: (id: PayslipSectionId) => void;
  onToggleSection?: (id: PayslipSectionId) => void;
  onUpdateConfig?: (updates: Partial<PayslipDesignConfig>) => void;
}

function hexToRgba(hex: string, alpha: number): string {
  const c = (hex || '#18181b').replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getContrastColor(hex: string): string {
  const c = (hex || '#18181b').replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) || 0;
  const g = parseInt(c.substring(2, 4), 16) || 0;
  const b = parseInt(c.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? '#09090b' : '#ffffff';
}

export const CustomizablePayslipView: React.FC<CustomizablePayslipViewProps> = ({
  item,
  company,
  monthLabel,
  year = new Date().getFullYear(),
  config = DEFAULT_PAYSLIP_DESIGN,
  visibleColumns,
  isCol: propIsCol,
  interactive = false,
  onMoveSectionUp,
  onMoveSectionDown,
  onToggleSection,
  onUpdateConfig,
}) => {
  const isCol = (colId: string): boolean => {
    if (propIsCol) return propIsCol(colId);
    if (colId.startsWith('contribution_') || colId === 'unpaid_absence' || colId === 'loan_deduction') return true;
    const cols = visibleColumns || config.visibleColumns;
    if (cols && Array.isArray(cols) && cols.length > 0) {
      return normalizeVisibleColumns(cols).includes(colId);
    }
    return true;
  };

  // Header field visibility (designer flags AND per-field column toggles)
  const showLogo = config.showLogo && isCol('hdr_logo');
  const showName = isCol('hdr_company_name');
  const showSubtitle = Boolean(company.subtitle) && isCol('hdr_subtitle');
  const showAddress = config.showCompanyAddress && Boolean(company.address) && isCol('company_address');
  const showContact = config.showCompanyPhoneEmail && Boolean(company.phone || company.email) && isCol('hdr_contact');
  const showTitle = isCol('hdr_payslip_title');
  const showPeriod = isCol('hdr_period');
  const showPayslipSubtitle = Boolean(config.payslipSubtitle) && isCol('hdr_payslip_subtitle');
  // Determine active brand color (from custom picker or preset)
  const activeColorHex = 
    config.customColor || 
    (config.themeColor && config.themeColor.startsWith('#')
      ? config.themeColor
      : PRESET_HEX_MAP[config.themeColor] || '#18181b');

  const contrastText = getContrastColor(activeColorHex);
  const isSolidTint = config.accentTintStyle === 'solid';
  const isMinimalTint = config.accentTintStyle === 'minimal';

  // Dynamic theme styles applied to headers, badges, highlights
  const themeStyles = {
    accentText: { color: activeColorHex },
    accentBg: { backgroundColor: activeColorHex, color: contrastText },
    accentBorder: { borderColor: hexToRgba(activeColorHex, 0.35) },
    accentLightBg: isSolidTint
      ? { backgroundColor: activeColorHex, color: contrastText, borderColor: activeColorHex }
      : isMinimalTint
      ? { backgroundColor: 'transparent', borderColor: hexToRgba(activeColorHex, 0.35) }
      : { backgroundColor: hexToRgba(activeColorHex, 0.08), borderColor: hexToRgba(activeColorHex, 0.22) },
    accentBadge: {
      backgroundColor: hexToRgba(activeColorHex, 0.12),
      color: activeColorHex,
      border: `1px solid ${hexToRgba(activeColorHex, 0.25)}`,
    },
    bannerBg: { backgroundColor: activeColorHex, color: contrastText },
  };

  // Unique instance ID for CSS font scaling
  const generatedId = React.useId ? React.useId().replace(/[^a-zA-Z0-9_-]/g, '') : 'pv';
  const scaleClass = `payslip-scale-${generatedId}`;

  // Font size scale ratio
  const rawFontScale = typeof config.fontScale === 'number' && config.fontScale >= 60 && config.fontScale <= 160
    ? config.fontScale
    : config.fontSize === 'compact'
    ? 88
    : config.fontSize === 'large'
    ? 114
    : config.fontSize === 'xl'
    ? 128
    : 100;

  const fontScaleRatio = rawFontScale / 100;
  const isCustomScaled = Math.abs(fontScaleRatio - 1.0) > 0.01;

  // Font class
  const fontClass = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
  }[config.fontFamily || 'sans'];

  // Density class
  const densityStyles = {
    compact: {
      padding: 'p-5 sm:p-6',
      spacing: 'space-y-4',
      fontSize: 'text-xs',
      gridGap: 'gap-2.5',
    },
    standard: {
      padding: 'p-7 sm:p-8',
      spacing: 'space-y-5',
      fontSize: 'text-xs',
      gridGap: 'gap-3',
    },
    spacious: {
      padding: 'p-8 sm:p-10',
      spacing: 'space-y-6',
      fontSize: 'text-sm',
      gridGap: 'gap-4',
    },
  }[config.density || 'standard'];

  // Corner radius
  const roundedClass = 
    !config.roundedCorners || config.cornerRadius === 'none'
      ? 'rounded-none'
      : config.cornerRadius === 'sm'
      ? 'rounded-sm'
      : config.cornerRadius === 'lg'
      ? 'rounded-2xl'
      : 'rounded-lg';

  const borderClass = config.showBorders ? 'border border-zinc-200 dark:border-zinc-800' : '';

  // Row zebra striping helper
  const getRowStripeStyle = (index: number) => {
    if (config.tableStyle === 'striped' && index % 2 === 1) {
      return { backgroundColor: hexToRgba(activeColorHex, 0.035) };
    }
    return undefined;
  };

  // Salary breakdown font size & scale helper
  const breakdownSize: BreakdownFontSize = config.breakdownFontSize || 'standard';
  const cycleBreakdownSizes: BreakdownFontSize[] = ['small', 'standard', 'large', 'xl'];
  const currentBreakdownSizeIdx = cycleBreakdownSizes.indexOf(breakdownSize);

  const handleStepBreakdownFontSize = (delta: number) => {
    if (!onUpdateConfig) return;
    const nextIdx = Math.max(0, Math.min(cycleBreakdownSizes.length - 1, currentBreakdownSizeIdx + delta));
    onUpdateConfig({ breakdownFontSize: cycleBreakdownSizes[nextIdx] });
  };

  const breakdownClasses = {
    small: {
      title: 'text-[11px]',
      row: 'text-[11px] py-0.5',
      totalRow: 'text-xs pt-1.5',
      totalNumber: 'text-xs',
    },
    standard: {
      title: 'text-xs',
      row: 'text-xs py-1',
      totalRow: 'text-xs pt-2',
      totalNumber: 'text-xs sm:text-sm',
    },
    large: {
      title: 'text-sm',
      row: 'text-sm py-1.5',
      totalRow: 'text-sm pt-2.5',
      totalNumber: 'text-sm sm:text-base font-semibold',
    },
    xl: {
      title: 'text-base',
      row: 'text-base py-2',
      totalRow: 'text-base pt-3',
      totalNumber: 'text-base sm:text-lg font-bold',
    },
  }[breakdownSize];

  // Helper to render interactive section wrapper
  const renderSectionWrapper = (id: PayslipSectionId, content: React.ReactNode) => {
    if (!interactive) return content;

    const currentIndex = config.sectionOrder.findIndex(s => s.id === id);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === config.sectionOrder.length - 1;

    return (
      <div className="group relative rounded transition-all hover:ring-2 hover:ring-indigo-400/50 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 p-1 -m-1">
        {/* Floating Quick Action Controls */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md rounded px-1.5 py-0.5 z-20 select-none">
          {/* Quick Font Size Controls for Breakdown Sections */}
          {(id === 'earnings' || id === 'deductions') && onUpdateConfig && (
            <div className="flex items-center gap-0.5 pr-1.5 mr-1 border-r border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleStepBreakdownFontSize(-1); }}
                disabled={currentBreakdownSizeIdx === 0}
                className="px-1 text-[11px] font-bold rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer"
                title="Smaller Font (Numbers & Text)"
              >
                A-
              </button>
              <span className="text-[10px] font-mono px-0.5 uppercase font-semibold text-zinc-500 dark:text-zinc-400">
                {breakdownSize}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleStepBreakdownFontSize(1); }}
                disabled={currentBreakdownSizeIdx === cycleBreakdownSizes.length - 1}
                className="px-1 text-[11px] font-bold rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 cursor-pointer"
                title="Larger Font (Numbers & Text)"
              >
                A+
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveSectionUp?.(id); }}
            disabled={isFirst}
            className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent`}
            title="Move Section Up"
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveSectionDown?.(id); }}
            disabled={isLast}
            className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-30 disabled:hover:bg-transparent`}
            title="Move Section Down"
          >
            <ArrowDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleSection?.(id); }}
            className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500"
            title="Hide Section"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
        {content}
      </div>
    );
  };

  // Section 1: Company Header
  const renderCompanyHeader = () => {
    const layout = config.headerLayout;

    if (layout === 'banner') {
      return renderSectionWrapper('company_header', (
        <div style={themeStyles.bannerBg} className={`-mx-7 -mt-7 sm:-mx-8 sm:-mt-8 p-6 sm:p-7 ${config.roundedCorners ? 'rounded-t-lg' : ''} mb-4`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              {showLogo && (
                company.logoUrl ? (
                  <img src={company.logoUrl} alt="Logo" className="h-10 w-auto object-contain bg-white/10 rounded p-1" />
                ) : (
                  <div className="w-9 h-9 rounded bg-white/20 flex items-center justify-center font-bold text-sm text-white">
                    ⚡
                  </div>
                )
              )}
              <div>
                {showName && (
                  <h1 className="text-base sm:text-lg font-bold tracking-tight uppercase">
                    {company.name}
                  </h1>
                )}
                {showSubtitle && (
                  <p className="text-xs text-white/80 mt-0.5">{company.subtitle}</p>
                )}
                {showAddress && (
                  <p className="text-[10px] text-white/70 mt-0.5">{company.address}</p>
                )}
                {showContact && (
                  <p className="text-[10px] text-white/70">
                    {[company.phone, company.email].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>
            <div className="sm:text-right">
              {showTitle && (
                interactive && onUpdateConfig ? (
                  <input
                    type="text"
                    value={config.payslipTitle}
                    onChange={(e) => onUpdateConfig({ payslipTitle: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-semibold uppercase tracking-wider text-white/90 bg-transparent border-b border-dashed border-white/40 hover:border-white focus:border-white focus:outline-none transition block sm:text-right"
                    placeholder="OFFICIAL SALARY ADVICE"
                    title="Tap to edit Document Title directly"
                  />
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70 block">
                    {config.payslipTitle}
                  </span>
                )
              )}
              {showPeriod && (
                <span className="text-sm font-bold font-mono">
                  {monthLabel.toUpperCase()} {year}
                </span>
              )}
              {showPayslipSubtitle && (
                interactive && onUpdateConfig ? (
                  <input
                    type="text"
                    value={config.payslipSubtitle}
                    onChange={(e) => onUpdateConfig({ payslipSubtitle: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-white/80 bg-transparent border-b border-dashed border-white/40 hover:border-white focus:border-white focus:outline-none transition block mt-0.5 italic sm:text-right"
                    placeholder="e.g. Strictly Private & Confidential"
                    title="Tap to edit Document Subtitle directly"
                  />
                ) : (
                  <span className="text-[10px] text-white/70 block mt-0.5 italic">
                    {config.payslipSubtitle}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      ));
    }

    if (layout === 'centered') {
      return renderSectionWrapper('company_header', (
        <div className="text-center pb-5 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
          {showLogo && (
            <div className="flex justify-center mb-1">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" className="h-11 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 rounded border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-bold text-base text-zinc-900 dark:text-zinc-100">
                  ⚡
                </div>
              )}
            </div>
          )}
          {showName && (
            <h1 className="text-lg font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100">
              {company.name}
            </h1>
          )}
          {showSubtitle && (
            <p className="text-xs text-zinc-500">{company.subtitle}</p>
          )}
          {showAddress && (
            <p className="text-[11px] text-zinc-400 max-w-md mx-auto">{company.address}</p>
          )}
          {showContact && (
            <p className="text-[10px] text-zinc-400">
              {[company.phone, company.email].filter(Boolean).join(' • ')}
            </p>
          )}
          {(showTitle || showPeriod) && (
            <div className="pt-2">
              {interactive && onUpdateConfig && showTitle ? (
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <input
                    type="text"
                    value={config.payslipTitle}
                    onChange={(e) => onUpdateConfig({ payslipTitle: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    style={themeStyles.accentBadge}
                    className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full bg-transparent border-b border-dashed border-current/30 text-center"
                    placeholder="OFFICIAL SALARY ADVICE"
                    title="Tap to edit Document Title directly"
                  />
                  {showPeriod && (
                    <span style={themeStyles.accentBadge} className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full">
                      {monthLabel.toUpperCase()} {year}
                    </span>
                  )}
                </div>
              ) : (
                <span style={themeStyles.accentBadge} className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full">
                  {[showTitle ? config.payslipTitle : '', showPeriod ? `${monthLabel.toUpperCase()} ${year}` : ''].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>
          )}
          {showPayslipSubtitle && (
            interactive && onUpdateConfig ? (
              <input
                type="text"
                value={config.payslipSubtitle}
                onChange={(e) => onUpdateConfig({ payslipSubtitle: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-zinc-400 bg-transparent border-b border-dashed border-current/30 hover:border-current focus:border-current focus:outline-none transition block mx-auto text-center mt-0.5 italic"
                placeholder="e.g. Strictly Private & Confidential"
                title="Tap to edit Document Subtitle directly"
              />
            ) : (
              <p className="text-[10px] text-zinc-400 italic">{config.payslipSubtitle}</p>
            )
          )}
        </div>
      ));
    }

    // Default 'modern' / 'clean' / 'split'
    return renderSectionWrapper('company_header', (
      <div className="flex flex-col sm:flex-row justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            {showLogo && (
              company.logoUrl ? (
                <img src={company.logoUrl} alt="Logo" className="h-9 w-auto object-contain" />
              ) : (
                <div className="w-8 h-8 rounded border border-zinc-300 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-900 dark:text-zinc-100">
                  ⚡
                </div>
              )
            )}
            {showName && (
              <h1 className="text-base font-bold tracking-tight uppercase text-zinc-900 dark:text-zinc-100">
                {company.name}
              </h1>
            )}
          </div>
          {showSubtitle && (
            <p className="text-[11px] text-zinc-500 mt-1">{company.subtitle}</p>
          )}
          {showAddress && (
            <p className="text-[10px] text-zinc-400 mt-0.5">{company.address}</p>
          )}
          {showContact && (
            <p className="text-[10px] text-zinc-400">
              {[company.phone, company.email].filter(Boolean).join(' • ')}
            </p>
          )}
        </div>
        <div className="sm:text-right shrink-0">
          {showTitle && (
            interactive && onUpdateConfig ? (
              <input
                type="text"
                value={config.payslipTitle}
                onChange={(e) => onUpdateConfig({ payslipTitle: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 bg-transparent border-b border-dashed border-current/30 hover:border-current focus:border-current focus:outline-none transition block sm:text-right"
                placeholder="OFFICIAL SALARY ADVICE"
                title="Tap to edit Document Title directly"
              />
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block">
                {config.payslipTitle}
              </span>
            )
          )}
          {showPeriod && (
            <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 block mt-0.5">
              {monthLabel.toUpperCase()} {year}
            </span>
          )}
          {showPayslipSubtitle && (
            interactive && onUpdateConfig ? (
              <input
                type="text"
                value={config.payslipSubtitle}
                onChange={(e) => onUpdateConfig({ payslipSubtitle: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-zinc-400 bg-transparent border-b border-dashed border-current/30 hover:border-current focus:border-current focus:outline-none transition block mt-0.5 italic sm:text-right"
                placeholder="e.g. Strictly Private & Confidential"
                title="Tap to edit Document Subtitle directly"
              />
            ) : (
              <span className="text-[10px] text-zinc-400 block mt-0.5 italic">
                {config.payslipSubtitle}
              </span>
            )
          )}
        </div>
      </div>
    ));
  };

  // Section 2: Pay Period Banner
  const renderPayPeriodBanner = () => {
    const showCycle = isCol('pay_period');
    const showStatus = isCol('banner_status');
    const showCurrency = isCol('banner_currency');
    if (!showCycle && !showStatus && !showCurrency) return null;

    return renderSectionWrapper('pay_period_banner', (
      <div style={themeStyles.accentLightBg} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded border text-xs">
        <div className="flex items-center gap-2">
          {showCycle && (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">Pay Cycle:</span>
              <span className="font-semibold font-mono">
                {monthLabel.toUpperCase()} {year}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showStatus && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium" style={!isSolidTint ? themeStyles.accentText : undefined}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>DISBURSED & VERIFIED</span>
            </div>
          )}
          {showStatus && showCurrency && <span className="opacity-40">|</span>}
          {showCurrency && (
            <span className="text-[11px] font-mono opacity-80">NGN (₦)</span>
          )}
        </div>
      </div>
    ));
  };

  // Section 3: Employee Meta
  const renderEmployeeMeta = () => {
    const metaFields = [
      isCol('employee_name') && (
        <div key="name">
          <span className="text-zinc-400 block text-[10px] uppercase font-medium">Employee Name</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">{item.fullName}</span>
        </div>
      ),
      isCol('staff_code') && (
        <div key="code">
          <span className="text-zinc-400 block text-[10px] uppercase font-medium">Staff ID / Code</span>
          <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100 mt-0.5 block">{item.employeeCode}</span>
        </div>
      ),
      isCol('department') && (
        <div key="dept">
          <span className="text-zinc-400 block text-[10px] uppercase font-medium">Department</span>
          <span className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5 block">{item.department}</span>
        </div>
      ),
      isCol('position') && (
        <div key="role">
          <span className="text-zinc-400 block text-[10px] uppercase font-medium">Designation / Role</span>
          <span className="text-zinc-800 dark:text-zinc-200 mt-0.5 block">{item.position}</span>
        </div>
      ),
      (isCol('bank_name') || isCol('account_number')) && (
        <div key="bank">
          <span className="text-zinc-400 block text-[10px] uppercase font-medium">Bank & Account</span>
          {isCol('bank_name') && <span className="font-medium text-zinc-800 dark:text-zinc-200 mt-0.5 block">{item.bankName}</span>}
          {isCol('account_number') && <span className="font-mono text-[10px] text-zinc-500 block">{item.accountNumber}</span>}
        </div>
      ),
      isCol('tax_id') && (
        <div key="tax">
          <span className="text-zinc-400 block text-[10px] uppercase font-medium">PAYE / Tax ID</span>
          <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200 mt-0.5 block">
            {item.payeNumber || 'N/A'}
          </span>
        </div>
      ),
      isCol('pension_rsa') && (
        <div key="pension">
          <span className="text-zinc-400 block text-[10px] uppercase font-medium">Pension RSA PIN</span>
          <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200 mt-0.5 block">
            {item.pensionNumber || 'N/A'}
          </span>
        </div>
      ),
      isCol('pension_rsa') && (
        <div key="pfa">
          <span className="text-zinc-400 block text-[10px] uppercase font-medium">Pension PFA</span>
          <span className="text-zinc-800 dark:text-zinc-200 text-[11px] mt-0.5 block truncate">
            {item.pfaName || 'Standard RSA'}
          </span>
        </div>
      ),
    ].filter(Boolean);

    if (metaFields.length === 0) return null;

    return renderSectionWrapper('employee_meta', (
      <div className={`grid grid-cols-2 sm:grid-cols-4 ${densityStyles.gridGap} bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded border border-zinc-200 dark:border-zinc-800 text-xs`}>
        {metaFields}
      </div>
    ));
  };

  // Section 4: Earnings
  const renderEarnings = () => {
    const rawEarnings = [
      { id: 'basic_salary', label: 'Basic Salary:', val: formatNaira(item.basic) },
      { id: 'housing', label: 'Housing Allowance:', val: formatNaira(item.housing) },
      { id: 'transport', label: 'Transport Allowance:', val: formatNaira(item.transport) },
      { id: 'other_allowances', label: 'Other Allowances:', val: formatNaira(item.otherAllowances) },
      ...(item.unpaidAbsenceDeduction && item.unpaidAbsenceDeduction > 0 ? [
        { 
          id: 'unpaid_absence', 
          label: `Unpaid Absence (${item.unpaidAbsenceDays || 0} ${item.unpaidAbsenceDays === 1 ? 'day' : 'days'}):`, 
          val: `-${formatNaira(item.unpaidAbsenceDeduction)}` 
        }
      ] : []),
    ];
    const earningsList = rawEarnings.filter(r => isCol(r.id));

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1.5 gap-2">
          {interactive && onUpdateConfig ? (
            <input
              type="text"
              value={config.earningsTitle}
              onChange={(e) => onUpdateConfig({ earningsTitle: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              style={themeStyles.accentText}
              className={`${breakdownClasses.title} font-bold uppercase tracking-wider bg-transparent border-b border-dashed border-current/30 hover:border-current focus:border-current focus:outline-none flex-1 transition`}
              placeholder="EARNINGS BREAKDOWN"
              title="Click to edit Earnings Header directly"
            />
          ) : (
            <h3 style={themeStyles.accentText} className={`${breakdownClasses.title} font-bold uppercase tracking-wider`}>
              {config.earningsTitle}
            </h3>
          )}

          {interactive && onUpdateConfig && (
            <div 
              className="flex items-center gap-0.5 bg-black/5 dark:bg-white/10 rounded px-1.5 py-0.5 shrink-0 select-none shadow-2xs border border-zinc-200/60 dark:border-zinc-700/60"
              onClick={(e) => e.stopPropagation()}
              title="Earnings & Deductions Font Size (A- / A+)"
            >
              <button
                type="button"
                onClick={() => handleStepBreakdownFontSize(-1)}
                disabled={currentBreakdownSizeIdx === 0}
                className="px-1 text-[11px] font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded disabled:opacity-30 cursor-pointer"
                title="Smaller Font"
              >
                A-
              </button>
              <span className="text-[10px] font-mono px-1 uppercase font-semibold text-zinc-600 dark:text-zinc-300">
                {breakdownSize}
              </span>
              <button
                type="button"
                onClick={() => handleStepBreakdownFontSize(1)}
                disabled={currentBreakdownSizeIdx === cycleBreakdownSizes.length - 1}
                className="px-1 text-[11px] font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded disabled:opacity-30 cursor-pointer"
                title="Larger Font"
              >
                A+
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          {earningsList.map((row, idx) => (
            <div 
              key={row.label} 
              style={getRowStripeStyle(idx)}
              className={`flex justify-between text-zinc-600 dark:text-zinc-400 px-1.5 ${breakdownClasses.row} rounded`}
            >
              <span>{row.label}</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{row.val}</span>
            </div>
          ))}
          {isCol('gross_pay') && (
            <div className={`flex justify-between items-center font-bold text-zinc-900 dark:text-zinc-100 ${breakdownClasses.totalRow} border-t border-zinc-200 dark:border-zinc-800 px-1.5`}>
              {interactive && onUpdateConfig ? (
                <input
                  type="text"
                  value={config.grossPayLabel || 'Total Gross Remuneration'}
                  onChange={(e) => onUpdateConfig({ grossPayLabel: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-b border-dashed border-current/30 hover:border-current focus:border-current focus:outline-none transition max-w-[240px] text-xs font-bold text-zinc-900 dark:text-zinc-100"
                  placeholder="Total Gross Remuneration"
                  title="Tap to edit Gross Pay Label directly"
                />
              ) : (
                <span>{config.grossPayLabel || 'Total Gross Remuneration'}:</span>
              )}
              <span className={`font-mono ${breakdownClasses.totalNumber}`}>{formatNaira(item.monthlyGross)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Section 5: Deductions
  const renderDeductions = () => {
    const rawDeductions = [
      { id: 'paye_tax', label: 'PAYE Income Tax:', val: item.monthlyPaye > 0 ? `-${formatNaira(item.monthlyPaye)}` : '₦0.00' },
      { id: 'employee_pension', label: 'Employee Pension (8%):', val: item.employeePension > 0 ? `-${formatNaira(item.employeePension)}` : '₦0.00' },
      ...(item.loanDeduction && item.loanDeduction > 0 ? [
        { id: 'loan_deduction', label: 'Loan / Advance Repayment:', val: `-${formatNaira(item.loanDeduction)}` }
      ] : []),
      ...(item.contributionDetails && item.contributionDetails.length > 0
        ? item.contributionDetails.map((cd, idx) => ({
            id: `contribution_${idx}`,
            label: `${config.welfareFundLabel || cd.schemeName || 'Staff Welfare Fund'}:`,
            val: `-${formatNaira(cd.amount)}`
          }))
        : item.contributionDeduction && item.contributionDeduction > 0
          ? [{ id: 'contribution_deduction', label: `${config.welfareFundLabel || 'Staff Welfare Fund'}:`, val: `-${formatNaira(item.contributionDeduction)}` }]
          : interactive && onUpdateConfig
            ? [{ id: 'contribution_deduction', label: `${config.welfareFundLabel || 'Staff Welfare Fund'}:`, val: '-₦10,000.00' }]
            : []
      ),
    ];
    const deductionsList = rawDeductions.filter(r => isCol(r.id));

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1.5 gap-2">
          {interactive && onUpdateConfig ? (
            <input
              type="text"
              value={config.deductionsTitle}
              onChange={(e) => onUpdateConfig({ deductionsTitle: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              style={themeStyles.accentText}
              className={`${breakdownClasses.title} font-bold uppercase tracking-wider bg-transparent border-b border-dashed border-current/30 hover:border-current focus:border-current focus:outline-none flex-1 transition`}
              placeholder="STATUTORY DEDUCTIONS"
              title="Click to edit Deductions Header directly"
            />
          ) : (
            <h3 style={themeStyles.accentText} className={`${breakdownClasses.title} font-bold uppercase tracking-wider`}>
              {config.deductionsTitle}
            </h3>
          )}

          {interactive && onUpdateConfig && (
            <div 
              className="flex items-center gap-0.5 bg-black/5 dark:bg-white/10 rounded px-1.5 py-0.5 shrink-0 select-none shadow-2xs border border-zinc-200/60 dark:border-zinc-700/60"
              onClick={(e) => e.stopPropagation()}
              title="Earnings & Deductions Font Size (A- / A+)"
            >
              <button
                type="button"
                onClick={() => handleStepBreakdownFontSize(-1)}
                disabled={currentBreakdownSizeIdx === 0}
                className="px-1 text-[11px] font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded disabled:opacity-30 cursor-pointer"
                title="Smaller Font"
              >
                A-
              </button>
              <span className="text-[10px] font-mono px-1 uppercase font-semibold text-zinc-600 dark:text-zinc-300">
                {breakdownSize}
              </span>
              <button
                type="button"
                onClick={() => handleStepBreakdownFontSize(1)}
                disabled={currentBreakdownSizeIdx === cycleBreakdownSizes.length - 1}
                className="px-1 text-[11px] font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded disabled:opacity-30 cursor-pointer"
                title="Larger Font"
              >
                A+
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          {deductionsList.map((row, idx) => {
            const isWelfareRow = row.id.startsWith('contribution_') || row.id === 'contribution_deduction';
            return (
              <div 
                key={row.id || row.label} 
                style={getRowStripeStyle(idx)}
                className={`flex justify-between items-center text-zinc-600 dark:text-zinc-400 px-1.5 ${breakdownClasses.row} rounded`}
              >
                {interactive && onUpdateConfig && isWelfareRow ? (
                  <div className="flex items-center gap-0.5 flex-1 mr-2 min-w-0">
                    <input
                      type="text"
                      value={config.welfareFundLabel || 'Staff Welfare Fund'}
                      onChange={(e) => onUpdateConfig({ welfareFundLabel: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border-b border-dashed border-current/40 hover:border-current focus:border-current focus:outline-none transition text-inherit font-inherit py-0 px-0.5 w-full max-w-[220px]"
                      placeholder="Staff Welfare Fund"
                      title="Click to edit Welfare / Contribution naming on payslip"
                    />
                    <span>:</span>
                  </div>
                ) : (
                  <span>{row.label}</span>
                )}
                <span className="font-mono text-zinc-900 dark:text-zinc-100 shrink-0">{row.val}</span>
              </div>
            );
          })}
          {isCol('total_deductions') && (
            <div className={`flex justify-between items-center font-bold text-zinc-900 dark:text-zinc-100 ${breakdownClasses.totalRow} border-t border-zinc-200 dark:border-zinc-800 px-1.5`}>
              {interactive && onUpdateConfig ? (
                <input
                  type="text"
                  value={config.totalDeductionsLabel || 'Total Deductions'}
                  onChange={(e) => onUpdateConfig({ totalDeductionsLabel: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-b border-dashed border-current/30 hover:border-current focus:border-current focus:outline-none transition max-w-[240px] text-xs font-bold text-zinc-900 dark:text-zinc-100"
                  placeholder="Total Deductions"
                  title="Tap to edit Total Deductions Label directly"
                />
              ) : (
                <span>{config.totalDeductionsLabel || 'Total Deductions'}:</span>
              )}
              <span className={`font-mono text-rose-600 dark:text-rose-400 ${breakdownClasses.totalNumber}`}>-{formatNaira(item.totalDeductions)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Section 6: Net Pay Card
  const renderNetPay = () => {
    if (!isCol('net_pay')) return null;

    const netSize: NetPayFontSize = config.netPayFontSize || 'standard';

    // Title font sizes
    const titleSizeClass = 
      netSize === 'small' ? 'text-xs' :
      netSize === 'large' ? 'text-base sm:text-lg' :
      netSize === 'xl' ? 'text-lg sm:text-xl' :
      'text-sm sm:text-base';

    // Amount font sizes
    const amountSizeClass = 
      netSize === 'small' ? 'text-xl sm:text-2xl' :
      netSize === 'large' ? 'text-3xl sm:text-4xl' :
      netSize === 'xl' ? 'text-4xl sm:text-5xl' :
      'text-2xl sm:text-3xl';

    const cycleSizes: NetPayFontSize[] = ['small', 'standard', 'large', 'xl'];
    const currentSizeIdx = cycleSizes.indexOf(netSize);

    const handleStepFontSize = (delta: number) => {
      if (!onUpdateConfig) return;
      const nextIdx = Math.max(0, Math.min(cycleSizes.length - 1, currentSizeIdx + delta));
      onUpdateConfig({ netPayFontSize: cycleSizes[nextIdx] });
    };

    return renderSectionWrapper('net_pay', (
      <div style={themeStyles.accentLightBg} className="p-4 sm:p-5 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all">
        <div className="flex-1 min-w-0 pr-2">
          {interactive && onUpdateConfig ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.netPayTitle}
                onChange={(e) => onUpdateConfig({ netPayTitle: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className={`${titleSizeClass} font-extrabold uppercase tracking-wider block bg-transparent border-b border-dashed border-current/30 hover:border-current focus:border-current focus:outline-none flex-1 transition`}
                placeholder="NET TAKE-HOME PAY"
                title="Click to edit Net Pay Header directly"
              />
              <div 
                className="flex items-center gap-0.5 bg-black/10 dark:bg-white/10 rounded px-1.5 py-0.5 shrink-0 select-none shadow-2xs"
                onClick={(e) => e.stopPropagation()}
                title="Net Pay Font Size (A- / A+)"
              >
                <button
                  type="button"
                  onClick={() => handleStepFontSize(-1)}
                  disabled={currentSizeIdx === 0}
                  className="px-1 text-[11px] font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded disabled:opacity-30 cursor-pointer"
                  title="Smaller Net Pay Font"
                >
                  A-
                </button>
                <span className="text-[10px] font-mono px-1 uppercase font-semibold">
                  {netSize}
                </span>
                <button
                  type="button"
                  onClick={() => handleStepFontSize(1)}
                  disabled={currentSizeIdx === cycleSizes.length - 1}
                  className="px-1 text-[11px] font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded disabled:opacity-30 cursor-pointer"
                  title="Larger Net Pay Font"
                >
                  A+
                </button>
              </div>
            </div>
          ) : (
            <span style={!isSolidTint ? themeStyles.accentText : undefined} className={`${titleSizeClass} font-extrabold uppercase tracking-wider block`}>
              {config.netPayTitle}
            </span>
          )}
        </div>
        <div className="sm:text-right shrink-0">
          <span style={!isSolidTint ? themeStyles.accentText : undefined} className={`${amountSizeClass} font-black font-mono tracking-tight leading-none`}>
            {formatNaira(item.netTakeHome)}
          </span>
        </div>
      </div>
    ));
  };

  // Section 7: Employer Contributions
  const renderEmployerContributions = () => {
    if (!isCol('employer_pension') && !isCol('employer_cost')) return null;
    return renderSectionWrapper('employer_contributions', (
      <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded p-3 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        {isCol('employer_pension') && (
          <div>
            <span>Employer Statutory Pension (10%): </span>
            <strong className="font-mono text-zinc-800 dark:text-zinc-200">{formatNaira(item.employerPension)}</strong>
          </div>
        )}
        {isCol('employer_cost') && (
          <div>
            {interactive && onUpdateConfig ? (
              <input
                type="text"
                value={config.employerCostLabel || 'Total Monthly Emolument Cost'}
                onChange={(e) => onUpdateConfig({ employerCostLabel: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-dashed border-current/30 hover:border-current focus:border-current focus:outline-none transition text-[11px] text-zinc-500 max-w-[200px]"
                placeholder="Total Monthly Emolument Cost"
                title="Tap to edit Employer Cost Label directly"
              />
            ) : (
              <span>{config.employerCostLabel || 'Total Monthly Emolument Cost'}: </span>
            )}
            <strong className="font-mono text-zinc-900 dark:text-zinc-100">{formatNaira(item.employerTotalCost || (item.monthlyGross + item.employerPension))}</strong>
          </div>
        )}
      </div>
    ));
  };

  // Section 8: Bank Details
  const renderBankDetails = () => {
    if (!isCol('bank_details') && !isCol('bank_name') && !isCol('account_number')) return null;
    return renderSectionWrapper('bank_details', (
      <div className="border border-zinc-200 dark:border-zinc-800 rounded p-3 bg-white dark:bg-zinc-900 text-xs">
        <div className="flex items-center gap-2 mb-2 text-zinc-500 text-[11px] font-semibold uppercase">
          <Landmark className="w-3.5 h-3.5 text-zinc-400" />
          <span>Disbursement Channel</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div>
            <span className="text-zinc-400 block text-[10px]">Bank</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.bankName}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px]">NUBAN Account</span>
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{item.accountNumber}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px]">Account Name</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.fullName}</span>
          </div>
          <div>
            <span className="text-zinc-400 block text-[10px]">Narration</span>
            <span className="text-zinc-600 dark:text-zinc-400 font-mono text-[10px]">
              SALARY {monthLabel.toUpperCase()} {year}
            </span>
          </div>
        </div>
      </div>
    ));
  };

  // Section 9: Signatures
  const renderSignatures = () => {
    if (!isCol('signatures')) return null;
    return renderSectionWrapper('signatures', (
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-3 gap-6 text-[10px] text-zinc-500">
        <div>
          <div className="border-b border-zinc-300 dark:border-zinc-700 h-8 mb-1.5" />
          <span className="font-medium text-zinc-700 dark:text-zinc-300 block">Prepared By</span>
          <span className="text-zinc-400">Payroll Officer / Date</span>
        </div>
        <div>
          <div className="border-b border-zinc-300 dark:border-zinc-700 h-8 mb-1.5" />
          <span className="font-medium text-zinc-700 dark:text-zinc-300 block">Authorized By</span>
          <span className="text-zinc-400">HR / Finance Director</span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="border-b border-zinc-300 dark:border-zinc-700 h-8 mb-1.5" />
          <span className="font-medium text-zinc-700 dark:text-zinc-300 block">Employee Signature</span>
          <span className="text-zinc-400">Acknowledged / Date</span>
        </div>
      </div>
    ));
  };

  // Section 10: Footer Notes
  const renderFooterNotes = () => {
    if (!isCol('footer_notes')) return null;
    return renderSectionWrapper('footer_notes', (
      <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        {interactive && onUpdateConfig ? (
          <input
            type="text"
            value={config.footerNote}
            onChange={(e) => onUpdateConfig({ footerNote: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="italic flex-1 w-full bg-transparent border-b border-dashed border-current/30 hover:border-current focus:border-current focus:outline-none transition text-[10px] text-zinc-400"
            placeholder="Computer-generated payslip footnote..."
            title="Tap to edit Footer Note directly"
          />
        ) : (
          <p className="italic max-w-xl">
            {config.footerNote}
          </p>
        )}
        <span className="font-mono text-[9px] text-zinc-400 shrink-0">
          SECURE PAYSLIP ID: {item.employeeCode}-{year}-{monthLabel.toUpperCase()}
        </span>
      </div>
    ));
  };

  // Watermark text & opacity
  const watermarkText = 
    config.watermark === 'none'
      ? null
      : config.watermark === 'custom'
      ? (config.customWatermarkText?.trim() || 'CONFIDENTIAL')
      : config.watermark === 'confidential'
      ? 'CONFIDENTIAL'
      : config.watermark === 'official'
      ? 'OFFICIAL PAYSLIP'
      : config.watermark === 'paid'
      ? 'PAID & DISBURSED'
      : config.watermark === 'copy'
      ? 'EMPLOYEE COPY'
      : (config.customWatermarkText?.trim() || null);

  const watermarkOpacity = typeof config.watermarkOpacity === 'number' ? config.watermarkOpacity : 0.04;

  // Map section ids to renderer
  const renderSectionById = (id: PayslipSectionId) => {
    switch (id) {
      case 'company_header':
        return renderCompanyHeader();
      case 'pay_period_banner':
        return renderPayPeriodBanner();
      case 'employee_meta':
        return renderEmployeeMeta();
      case 'earnings':
        return renderSectionWrapper('earnings', renderEarnings());
      case 'deductions':
        return renderSectionWrapper('deductions', renderDeductions());
      case 'net_pay':
        return renderNetPay();
      case 'employer_contributions':
        return renderEmployerContributions();
      case 'bank_details':
        return renderBankDetails();
      case 'signatures':
        return renderSignatures();
      case 'footer_notes':
        return renderFooterNotes();
      default:
        return null;
    }
  };

  // Check if both earnings and deductions are enabled in two-column mode
  const enabledSections = config.sectionOrder.filter(s => s.enabled);
  const earningsEnabled = enabledSections.some(s => s.id === 'earnings');
  const deductionsEnabled = enabledSections.some(s => s.id === 'deductions');
  const isTwoColBreakdown = config.breakdownLayout === 'two-column' && earningsEnabled && deductionsEnabled;

  return (
    <div className={`w-full relative bg-white text-zinc-900 ${scaleClass} ${fontClass} ${roundedClass} ${borderClass} ${densityStyles.padding} ${densityStyles.spacing} shadow-sm print:shadow-none print:break-inside-avoid overflow-hidden print:overflow-visible select-none transition-colors duration-150`}>
      {isCustomScaled && (
        <style>{`
          .${scaleClass} { font-size: ${Math.round(13 * fontScaleRatio * 10) / 10}px; }
          .${scaleClass} input { font-size: inherit; }
          .${scaleClass} [class*="text-[10px]"] { font-size: ${Math.round(10 * fontScaleRatio * 10) / 10}px !important; }
          .${scaleClass} [class*="text-[11px]"] { font-size: ${Math.round(11 * fontScaleRatio * 10) / 10}px !important; }
          .${scaleClass} [class*="text-xs"] { font-size: ${Math.round(12 * fontScaleRatio * 10) / 10}px !important; }
          .${scaleClass} [class*="text-sm"] { font-size: ${Math.round(14 * fontScaleRatio * 10) / 10}px !important; }
          .${scaleClass} [class*="text-base"] { font-size: ${Math.round(16 * fontScaleRatio * 10) / 10}px !important; }
          .${scaleClass} [class*="text-lg"] { font-size: ${Math.round(18 * fontScaleRatio * 10) / 10}px !important; }
          .${scaleClass} [class*="text-xl"] { font-size: ${Math.round(20 * fontScaleRatio * 10) / 10}px !important; }
          .${scaleClass} [class*="text-2xl"] { font-size: ${Math.round(24 * fontScaleRatio * 10) / 10}px !important; }
          .${scaleClass} [class*="text-3xl"] { font-size: ${Math.round(30 * fontScaleRatio * 10) / 10}px !important; }
          .${scaleClass} [class*="text-4xl"] { font-size: ${Math.round(36 * fontScaleRatio * 10) / 10}px !important; }
          .${scaleClass} [class*="text-5xl"] { font-size: ${Math.round(48 * fontScaleRatio * 10) / 10}px !important; }
        `}</style>
      )}
      
      {/* Background Watermark */}
      {watermarkText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0">
          <span 
            style={{ 
              color: activeColorHex, 
              opacity: watermarkOpacity 
            }}
            className="text-5xl sm:text-7xl font-black uppercase tracking-widest -rotate-25 whitespace-nowrap"
          >
            {watermarkText}
          </span>
        </div>
      )}

      {/* Render sections in specified custom order */}
      <div className={`relative z-10 ${densityStyles.spacing}`}>
        {enabledSections.map((section, idx) => {
          // In two-column mode, group earnings and deductions side by side when the first one appears
          if (isTwoColBreakdown && (section.id === 'earnings' || section.id === 'deductions')) {
            const firstOfPair = enabledSections.find(s => s.id === 'earnings' || s.id === 'deductions')?.id;
            if (section.id !== firstOfPair) {
              return null; // already rendered in the two-column container
            }
            return (
              <div key="two-col-breakdown" className="grid grid-cols-2 gap-4 sm:gap-6">
                {renderSectionWrapper('earnings', renderEarnings())}
                {renderSectionWrapper('deductions', renderDeductions())}
              </div>
            );
          }

          return (
            <React.Fragment key={section.id}>
              {renderSectionById(section.id)}
            </React.Fragment>
          );
        })}
      </div>

    </div>
  );
};
