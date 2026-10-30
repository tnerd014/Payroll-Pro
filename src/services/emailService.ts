import { 
  EmailSettings, 
  CalculatedPayrollItem, 
  CompanyProfile, 
  PayslipDesignConfig, 
  DEFAULT_PAYSLIP_DESIGN,
  PRESET_HEX_MAP 
} from '../types';
import { formatNaira } from '../engine/payePensionEngine';

export interface EmailDispatchPayload {
  settings: EmailSettings;
  company: CompanyProfile;
  item: CalculatedPayrollItem;
  recipientEmail: string;
  monthLabel: string;
  year: number;
  config?: PayslipDesignConfig;
  subjectTemplate?: string;
  bodyTemplate?: string;
  attachPdf?: boolean;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Common SMTP Provider Presets
 */
export const SMTP_PRESETS = [
  {
    id: 'gmail',
    name: 'Google Workspace / Gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    hint: 'Use a 16-character Google App Password (not your normal Google account password).',
  },
  {
    id: 'outlook',
    name: 'Microsoft 365 / Outlook',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    hint: 'Ensure SMTP AUTH is enabled for this mailbox in Microsoft 365 Admin Center.',
  },
  {
    id: 'zoho',
    name: 'Zoho Mail',
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    hint: 'Generate an Application-Specific Password in Zoho Account Security settings.',
  },
  {
    id: 'custom',
    name: 'Custom Corporate SMTP',
    host: '',
    port: 587,
    secure: false,
    hint: 'Enter your corporate mail server details provided by your IT administrator.',
  },
];

/**
 * Sanitizes user/company strings for safe HTML interpolation in payslips and emails
 */
export function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Replaces {{variable}} placeholders with real payroll values
 */
export function interpolateEmailTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    result = result.replace(regex, value ?? '');
  }
  return result;
}

/**
 * Formats data map for an individual employee payslip email
 */
export function getEmailTemplateData(
  item: CalculatedPayrollItem,
  company: CompanyProfile,
  monthLabel: string,
  year: number
): Record<string, string> {
  return {
    employeeName: item.fullName,
    firstName: item.fullName.split(' ')[0] || item.fullName,
    employeeCode: item.employeeCode,
    department: item.department || 'General',
    month: monthLabel,
    year: String(year),
    companyName: company.name,
    netPay: formatNaira(item.netTakeHome),
    grossPay: formatNaira(item.monthlyGross),
    basicSalary: formatNaira(item.basic),
    housingAllowance: formatNaira(item.housing),
    transportAllowance: formatNaira(item.transport),
    otherAllowances: formatNaira(item.otherAllowances),
    payeTax: formatNaira(item.monthlyPaye),
    employeePension: formatNaira(item.employeePension),
    employerPension: formatNaira(item.employerPension),
    companyEmail: company.email || '',
    companyPhone: company.phone || '',
  };
}

/**
 * Generates an isolated, self-contained, publication-grade HTML document for the payslip
 * Optimized specifically for A4 PDF rendering in Chromium / Electron
 */
export function renderPayslipToHtml(
  item: CalculatedPayrollItem,
  company: CompanyProfile,
  monthLabel: string,
  year: number,
  config: PayslipDesignConfig = DEFAULT_PAYSLIP_DESIGN,
  recipientEmail?: string
): string {
  const brandColor = 
    config.customColor || 
    (config.themeColor && config.themeColor.startsWith('#')
      ? config.themeColor
      : PRESET_HEX_MAP[config.themeColor] || '#18181b');

  const showLogo = config.showLogo && Boolean(company.logoUrl);
  const showAddress = config.showCompanyAddress && Boolean(company.address);
  const showContact = config.showCompanyPhoneEmail && Boolean(company.phone || company.email);

  const earningsTotal = item.monthlyGross;
  const deductionsTotal = item.totalDeductions;

  const safeFullName = escapeHtml(item.fullName);
  const safeCompanyName = escapeHtml(company.name);
  const safeSubtitle = escapeHtml(company.subtitle);
  const safeAddress = escapeHtml(company.address);
  const safePhone = escapeHtml(company.phone);
  const safeEmail = escapeHtml(company.email);
  const safeEmpCode = escapeHtml(item.employeeCode);
  const safeDept = escapeHtml(item.department || 'General');
  const safeRecipientEmail = escapeHtml(recipientEmail || (item as any).email || 'N/A');
  const safeBankName = escapeHtml(item.bankName || 'Direct Transfer');
  const safeAccountNum = escapeHtml(item.accountNumber ? '••••' + item.accountNumber.slice(-4) : 'N/A');
  const safePayeNum = escapeHtml(item.payeNumber);
  const safePensionNum = escapeHtml(item.pensionNumber);

  // Font family resolution
  const fontStack = 
    config.fontFamily === 'serif'
      ? "Georgia, 'Times New Roman', Cambria, serif"
      : config.fontFamily === 'mono'
      ? "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace"
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  // Radius resolution
  const borderRadius = 
    config.roundedCorners === false || config.cornerRadius === 'none'
      ? '0px'
      : config.cornerRadius === 'lg'
      ? '16px'
      : config.cornerRadius === 'md'
      ? '10px'
      : '6px';

  // Watermark text resolution
  let watermarkText = '';
  if (config.watermark && config.watermark !== 'none') {
    if (config.watermark === 'custom') {
      watermarkText = config.customWatermarkText || '';
    } else {
      watermarkText = String(config.watermark).toUpperCase();
    }
  }

  const payslipTitle = config.payslipTitle || 'Payslip';
  const earningsTitle = config.earningsTitle || 'Earnings & Allowances';
  const deductionsTitle = config.deductionsTitle || 'Statutory & Deductions';
  const grossPayLabel = config.grossPayLabel || 'Total Gross Remuneration';
  const totalDeductionsLabel = config.totalDeductionsLabel || 'Total Deductions';
  const netPayTitle = config.netPayTitle || 'Net Take-Home Pay';
  const footerNote = config.footerNote || `This is an official computer-generated payslip issued by ${company.name || 'the company'}. No signature required.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(payslipTitle)} - ${safeFullName} - ${escapeHtml(monthLabel)} ${year}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: ${fontStack};
      font-size: 11px;
      line-height: 1.45;
      color: #18181b;
      background: #ffffff;
      padding: 10px;
    }
    .payslip-card {
      position: relative;
      border: 1px solid #e4e4e7;
      border-radius: ${borderRadius};
      padding: 24px;
      background: #ffffff;
      max-width: 800px;
      margin: 0 auto;
      overflow: hidden;
    }
    ${watermarkText ? `
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 64px;
      font-weight: 900;
      color: rgba(160, 160, 160, ${config.watermarkOpacity || 0.08});
      text-transform: uppercase;
      letter-spacing: 0.15em;
      pointer-events: none;
      user-select: none;
      z-index: 1;
      white-space: nowrap;
    }
    ` : ''}
    .header {
      position: relative;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid ${brandColor};
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .company-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      max-height: 48px;
      max-width: 140px;
      object-fit: contain;
    }
    .company-title {
      font-size: 16px;
      font-weight: 700;
      color: #09090b;
      letter-spacing: -0.01em;
    }
    .company-subtitle {
      font-size: 10px;
      color: #71717a;
      margin-top: 1px;
    }
    .company-contact {
      font-size: 9px;
      color: #71717a;
      margin-top: 2px;
      line-height: 1.3;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-title {
      font-size: 14px;
      font-weight: 800;
      color: ${brandColor};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .doc-subtitle {
      font-size: 9.5px;
      color: #71717a;
      margin-top: 1px;
    }
    .doc-period {
      font-size: 11px;
      font-weight: 600;
      color: #27272a;
      margin-top: 2px;
    }
    .doc-serial {
      font-size: 9px;
      font-family: monospace;
      color: #a1a1aa;
      margin-top: 2px;
    }
    .grid-2 {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .info-card {
      background: #fafafa;
      border: 1px solid #f4f4f5;
      border-radius: ${borderRadius};
      padding: 10px 14px;
    }
    .info-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #71717a;
      margin-bottom: 8px;
      border-bottom: 1px solid #e4e4e7;
      padding-bottom: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 10px;
    }
    .info-label {
      color: #71717a;
    }
    .info-val {
      font-weight: 600;
      color: #18181b;
    }
    .tables-container {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .table-block {
      border: 1px solid #e4e4e7;
      border-radius: ${borderRadius};
      overflow: hidden;
    }
    .table-header {
      background: #f4f4f5;
      padding: 6px 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #27272a;
      letter-spacing: 0.04em;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #e4e4e7;
    }
    .table-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 10px;
      font-size: 10px;
      border-bottom: 1px solid #f4f4f5;
    }
    .table-row:nth-child(even) {
      background: #fafafa;
    }
    .row-label {
      color: #3f3f46;
    }
    .row-value {
      font-weight: 600;
      font-family: monospace;
      color: #18181b;
    }
    .table-footer {
      display: flex;
      justify-content: space-between;
      padding: 7px 10px;
      font-size: 10px;
      font-weight: 700;
      background: #f4f4f5;
      border-top: 1px solid #e4e4e7;
    }
    .net-banner {
      position: relative;
      z-index: 2;
      background: ${brandColor};
      color: #ffffff;
      border-radius: ${borderRadius};
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .net-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.95;
    }
    .net-sublabel {
      font-size: 9px;
      opacity: 0.85;
      margin-top: 2px;
    }
    .net-amount {
      font-size: 20px;
      font-weight: 800;
      font-family: monospace;
      letter-spacing: -0.02em;
    }
    .pension-card {
      position: relative;
      z-index: 2;
      background: #fdfdfd;
      border: 1px dashed #d4d4d8;
      border-radius: ${borderRadius};
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 9.5px;
      display: flex;
      justify-content: space-between;
      color: #52525b;
    }
    .footer-note {
      position: relative;
      z-index: 2;
      text-align: center;
      font-size: 8.5px;
      color: #a1a1aa;
      border-top: 1px solid #f4f4f5;
      padding-top: 10px;
      margin-top: 12px;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="payslip-card">
    ${watermarkText ? `<div class="watermark">${escapeHtml(watermarkText)}</div>` : ''}

    <!-- Header -->
    <div class="header">
      <div class="company-brand">
        ${showLogo ? `<img src="${company.logoUrl}" class="logo-img" alt="Logo" />` : ''}
        <div>
          <div class="company-title">${safeCompanyName}</div>
          ${company.subtitle ? `<div class="company-subtitle">${safeSubtitle}</div>` : ''}
          ${showAddress ? `<div class="company-contact">${safeAddress}</div>` : ''}
          ${showContact ? `<div class="company-contact">${safePhone ? 'Tel: ' + safePhone : ''} ${safeEmail ? '| ' + safeEmail : ''}</div>` : ''}
        </div>
      </div>
      <div class="doc-badge">
        <div class="doc-title">${escapeHtml(payslipTitle)}</div>
        ${config.payslipSubtitle ? `<div class="doc-subtitle">${escapeHtml(config.payslipSubtitle)}</div>` : ''}
        <div class="doc-period">${escapeHtml(monthLabel)} ${year}</div>
        <div class="doc-serial">Ref: ${safeEmpCode}-${escapeHtml(monthLabel).substring(0, 3).toUpperCase()}${year}</div>
      </div>
    </div>

    <!-- Employee & Banking Info -->
    <div class="grid-2">
      <div class="info-card">
        <div class="info-title">Employee Details</div>
        <div class="info-row"><span class="info-label">Full Name:</span><span class="info-val">${safeFullName}</span></div>
        <div class="info-row"><span class="info-label">Staff Code:</span><span class="info-val">${safeEmpCode}</span></div>
        <div class="info-row"><span class="info-label">Department:</span><span class="info-val">${safeDept}</span></div>
        <div class="info-row"><span class="info-label">Email:</span><span class="info-val">${safeRecipientEmail}</span></div>
      </div>

      <div class="info-card">
        <div class="info-title">Payment & Statutory Info</div>
        <div class="info-row"><span class="info-label">Bank Name:</span><span class="info-val">${safeBankName}</span></div>
        <div class="info-row"><span class="info-label">Account No:</span><span class="info-val">${safeAccountNum}</span></div>
        ${item.payeNumber ? `<div class="info-row"><span class="info-label">Tax ID (PAYE):</span><span class="info-val">${safePayeNum}</span></div>` : ''}
        ${item.pensionNumber ? `<div class="info-row"><span class="info-label">RSA PIN:</span><span class="info-val">${safePensionNum}</span></div>` : ''}
      </div>
    </div>

    <!-- Earnings & Deductions Tables -->
    <div class="tables-container">
      <!-- Earnings -->
      <div class="table-block">
        <div class="table-header">
          <span>${escapeHtml(earningsTitle)}</span>
          <span>Amount (₦)</span>
        </div>
        <div>
          <div class="table-row"><span class="row-label">Basic Salary</span><span class="row-value">${formatNaira(item.basic)}</span></div>
          <div class="table-row"><span class="row-label">Housing Allowance</span><span class="row-value">${formatNaira(item.housing)}</span></div>
          <div class="table-row"><span class="row-label">Transport Allowance</span><span class="row-value">${formatNaira(item.transport)}</span></div>
          <div class="table-row"><span class="row-label">Other Allowances</span><span class="row-value">${formatNaira(item.otherAllowances)}</span></div>
        </div>
        <div class="table-footer">
          <span>${escapeHtml(grossPayLabel)}</span>
          <span>${formatNaira(earningsTotal)}</span>
        </div>
      </div>

      <!-- Deductions -->
      <div class="table-block">
        <div class="table-header">
          <span>${escapeHtml(deductionsTitle)}</span>
          <span>Amount (₦)</span>
        </div>
        <div>
          <div class="table-row"><span class="row-label">PAYE Income Tax</span><span class="row-value">${formatNaira(item.monthlyPaye)}</span></div>
          <div class="table-row"><span class="row-label">Employee Pension (8%)</span><span class="row-value">${formatNaira(item.employeePension)}</span></div>
          ${(item.loanDeduction || 0) > 0 ? ('<div class="table-row"><span class="row-label">Loan / Advance Repayment</span><span class="row-value">' + formatNaira(item.loanDeduction || 0) + '</span></div>') : ''}
        </div>
        <div class="table-footer">
          <span>${escapeHtml(totalDeductionsLabel)}</span>
          <span>${formatNaira(deductionsTotal)}</span>
        </div>
      </div>
    </div>

    <!-- Net Pay Banner -->
    <div class="net-banner">
      <div>
        <div class="net-label">${escapeHtml(netPayTitle)}</div>
        ${config.netPaySubtitle ? `<div class="net-sublabel">${escapeHtml(config.netPaySubtitle)}</div>` : ''}
      </div>
      <div class="net-amount">${formatNaira(item.netTakeHome)}</div>
    </div>

    <!-- Employer Contribution Notice -->
    <div class="pension-card">
      <span><strong>Employer Statutory Pension Contribution (10%):</strong> ${formatNaira(item.employerPension)}</span>
      <span><strong>Total Pension Remitted to PFA:</strong> ${formatNaira(item.employeePension + item.employerPension)}</span>
    </div>

    <!-- Footer -->
    <div class="footer-note">
      ${escapeHtml(footerNote)}<br/>
      Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Tests connection to configured mail service
 */
export async function testEmailServiceConnection(settings: EmailSettings): Promise<{ success: boolean; error?: string }> {
  if (settings.provider === 'smtp') {
    if (!settings.smtp.host || !settings.smtp.user || !settings.smtp.pass) {
      return { success: false, error: 'Please enter SMTP Host, Username/Email, and Password.' };
    }

    const sanitizedSmtp = {
      ...settings.smtp,
      host: (settings.smtp.host || '').trim(),
      user: (settings.smtp.user || '').trim(),
      pass: (settings.smtp.pass || '').trim().replace(/\s+/g, ''),
      fromEmail: (settings.smtp.fromEmail || '').trim(),
    };

    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.testSmtpConnection) {
      return await electronAPI.testSmtpConnection(sanitizedSmtp);
    }

    return { 
      success: false, 
      error: 'Direct SMTP sending requires running inside the Payroll Pro Desktop application. Alternatively, switch provider to Resend API for cloud delivery.' 
    };
  }

  if (settings.provider === 'resend') {
    if (!settings.resend.apiKey) {
      return { success: false, error: 'Please enter a valid Resend API key.' };
    }

    try {
      // Test Resend API key validation
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.resend.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: settings.resend.fromEmail || 'onboarding@resend.dev',
          to: 'delivered@resend.dev',
          subject: 'Payroll Pro Connection Test',
          text: 'Payroll Pro email dispatch verified successfully.',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.message || `Resend error: ${res.statusText}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to reach Resend API.' };
    }
  }

  return { success: false, error: 'Unknown email provider.' };
}

/**
 * Dispatches an individual employee's payslip
 */
export async function sendIndividualPayslipEmail(payload: EmailDispatchPayload): Promise<EmailDispatchResult> {
  const { 
    settings, 
    company, 
    item, 
    recipientEmail, 
    monthLabel, 
    year, 
    config, 
    subjectTemplate, 
    bodyTemplate, 
    attachPdf = true 
  } = payload;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return { success: false, error: 'Invalid or missing recipient email address.' };
  }

  const templateData = getEmailTemplateData(item, company, monthLabel, year);
  const subject = interpolateEmailTemplate(subjectTemplate || settings.defaultSubjectTemplate, templateData);
  const bodyText = interpolateEmailTemplate(bodyTemplate || settings.defaultBodyTemplate, templateData);
  const htmlPayslip = renderPayslipToHtml(item, company, monthLabel, year, config, recipientEmail);
  const fileName = `Payslip_${item.fullName.replace(/\s+/g, '_')}_${monthLabel}_${year}.pdf`;

  // 1. Desktop SMTP delivery via Electron
  if (settings.provider === 'smtp') {
    const sanitizedSmtp = {
      ...settings.smtp,
      host: (settings.smtp.host || '').trim(),
      user: (settings.smtp.user || '').trim(),
      pass: (settings.smtp.pass || '').trim().replace(/\s+/g, ''),
      fromEmail: (settings.smtp.fromEmail || '').trim(),
    };

    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.sendPayslipEmail) {
      return await electronAPI.sendPayslipEmail({
        smtp: sanitizedSmtp,
        recipient: recipientEmail,
        subject,
        body: bodyText,
        htmlContent: htmlPayslip,
        attachPdf,
        fileName,
      });
    }

    return { 
      success: false, 
      error: 'Desktop environment not detected. Running inside browser requires Resend API provider.' 
    };
  }

  // 2. Resend API delivery (Web & Electron compatible)
  if (settings.provider === 'resend') {
    try {
      const electronAPI = (window as any).electronAPI;
      let pdfBase64: string | undefined;

      if (attachPdf && electronAPI?.renderPayslipPdf) {
        const renderRes = await electronAPI.renderPayslipPdf(htmlPayslip);
        if (renderRes.success && renderRes.base64) {
          pdfBase64 = renderRes.base64;
        }
      }

      const attachments: any[] = [];
      if (attachPdf && pdfBase64) {
        attachments.push({
          filename: fileName,
          content: pdfBase64,
        });
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.resend.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${settings.resend.fromName || company.name} <${settings.resend.fromEmail}>`,
          to: recipientEmail,
          subject,
          text: bodyText,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937; white-space: pre-wrap;">${bodyText}</div>`,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.message || `Resend error: ${res.statusText}` };
      }

      return { success: true, messageId: data?.id };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to dispatch via Resend.' };
    }
  }

  return { success: false, error: 'Unsupported email provider.' };
}
