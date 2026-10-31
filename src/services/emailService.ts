import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  EmailSettings, 
  CalculatedPayrollItem, 
  CompanyProfile, 
  PayslipDesignConfig, 
  DEFAULT_PAYSLIP_DESIGN,
  PRESET_HEX_MAP 
} from '../types';
import { formatNaira } from '../engine/payePensionEngine';
import { CustomizablePayslipView } from '../components/payslip/CustomizablePayslipView';

// ──────────────────────────────────────────────────────────
//  Platform detection helpers
// ──────────────────────────────────────────────────────────

/** True when running inside Electron (desktop) */
function getElectronAPI(): any {
  return typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
}

/**
 * True when running as a Capacitor Android APK.
 * The SmtpBridge Java class exposes window.AndroidSMTP via @JavascriptInterface.
 */
function getAndroidSMTP(): any {
  return typeof window !== 'undefined' ? (window as any).AndroidSMTP : undefined;
}

/**
 * Wraps the callback-based AndroidSMTP.testConnection / sendEmail into a Promise.
 * Java calls window.__handleAndroidSmtp(callbackId, success, errorOrNull) when done.
 */
function invokeAndroidSmtp<T>(method: 'testConnection' | 'sendEmail', payload: object): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const callbackId = `smtp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    (window as any).__handleAndroidSmtp = (id: string, success: boolean, error: string | null) => {
      if (id !== callbackId) return;
      delete (window as any).__handleAndroidSmtp;
      if (success) resolve({ success: true });
      else resolve({ success: false, error: error ?? 'Unknown SMTP error' });
    };
    try {
      const bridge = getAndroidSMTP();
      bridge[method](callbackId, JSON.stringify(payload));
    } catch (e: any) {
      delete (window as any).__handleAndroidSmtp;
      resolve({ success: false, error: e?.message ?? 'AndroidSMTP bridge unavailable' });
    }
  });
}

export interface PayslipPeriodItem {
  item: CalculatedPayrollItem;
  monthLabel: string;
  year: number;
}

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
  periods?: PayslipPeriodItem[];
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
  _recipientEmail?: string
): string {
  // 1. Collect all styles loaded in the document (Tailwind CSS, fonts, and theme variables)
  let embeddedStyles = '';
  let externalLinksHtml = '';

  if (typeof document !== 'undefined') {
    try {
      // Collect all inline <style> tags
      const styleTags = document.querySelectorAll('style');
      styleTags.forEach(tag => {
        if (tag.textContent) {
          embeddedStyles += tag.textContent + '\n';
        }
      });

      // Collect all CSS rules from loaded stylesheets
      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          if (sheet.cssRules) {
            for (let j = 0; j < sheet.cssRules.length; j++) {
              embeddedStyles += sheet.cssRules[j].cssText + '\n';
            }
          }
        } catch {
          // Cross-origin stylesheet access restriction fallback
        }
      }

      // Collect external stylesheet links (e.g. fonts, CDN)
      const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
      linkTags.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href.startsWith('http') || href.startsWith('//'))) {
          externalLinksHtml += `<link rel="stylesheet" href="${href}">\n`;
        }
      });
    } catch (e) {
      console.warn('Could not collect document styles for PDF:', e);
    }
  }

  // 2. Render the official app payslip component directly to static HTML
  let renderedPayslipMarkup = '';
  try {
    renderedPayslipMarkup = renderToStaticMarkup(
      React.createElement(CustomizablePayslipView, {
        item,
        company,
        monthLabel,
        year,
        config,
        visibleColumns: config.visibleColumns,
        interactive: false,
      })
    );
  } catch (err) {
    console.error('Failed to render CustomizablePayslipView to static markup:', err);
  }

  const payslipTitle = config.payslipTitle || 'Payslip';
  const safeFullName = escapeHtml(item.fullName);

  // Font family resolution
  const fontStack = 
    config.fontFamily === 'serif'
      ? "Georgia, 'Times New Roman', Cambria, serif"
      : config.fontFamily === 'mono'
      ? "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace"
      : "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(payslipTitle)} - ${safeFullName} - ${escapeHtml(monthLabel)} ${year}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${externalLinksHtml}
  <style>
    ${embeddedStyles}

    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #18181b !important;
      font-family: ${fontStack};
      width: 100%;
    }
    .pdf-payslip-canvas {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff !important;
    }
  </style>
</head>
<body class="bg-white text-zinc-900 font-sans antialiased">
  <div class="pdf-payslip-canvas">
    ${renderedPayslipMarkup}
  </div>
</body>
</html>`;
}

/**
 * Generates an isolated, self-contained multi-page HTML document
 * combining multiple months of payslips for a single employee into a single PDF.
 * Each month's payslip is styled with standard CSS page-breaks so Chromium / Electron
 * compiles all selected months into a single, seamless multi-page PDF document.
 */
export function renderConsolidatedPayslipsToHtml(
  periods: PayslipPeriodItem[],
  company: CompanyProfile,
  config: PayslipDesignConfig = DEFAULT_PAYSLIP_DESIGN,
  _recipientEmail?: string
): string {
  // 1. Collect all styles loaded in the document
  let embeddedStyles = '';
  let externalLinksHtml = '';

  if (typeof document !== 'undefined') {
    try {
      const styleTags = document.querySelectorAll('style');
      styleTags.forEach(tag => {
        if (tag.textContent) {
          embeddedStyles += tag.textContent + '\n';
        }
      });

      for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
          if (sheet.cssRules) {
            for (let j = 0; j < sheet.cssRules.length; j++) {
              embeddedStyles += sheet.cssRules[j].cssText + '\n';
            }
          }
        } catch {
          // Cross-origin fallback
        }
      }

      const linkTags = document.querySelectorAll('link[rel="stylesheet"]');
      linkTags.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href.startsWith('http') || href.startsWith('//'))) {
          externalLinksHtml += `<link rel="stylesheet" href="${href}">\n`;
        }
      });
    } catch (e) {
      console.warn('Could not collect document styles for consolidated PDF:', e);
    }
  }

  // 2. Render each period's payslip directly to static markup
  const pagesHtml = periods.map((p, idx) => {
    let markup = '';
    try {
      markup = renderToStaticMarkup(
        React.createElement(CustomizablePayslipView, {
          item: p.item,
          company,
          monthLabel: p.monthLabel,
          year: p.year,
          config,
          visibleColumns: config.visibleColumns,
          interactive: false,
        })
      );
    } catch (err) {
      console.error(`Failed to render payslip markup for ${p.monthLabel} ${p.year}:`, err);
    }

    const isLast = idx === periods.length - 1;
    return `
    <div class="pdf-payslip-canvas pdf-payslip-page ${isLast ? 'last-page' : ''}">
      ${markup}
    </div>`;
  }).join('\n');

  const firstItem = periods[0]?.item;
  const safeFullName = escapeHtml(firstItem?.fullName || 'Employee');
  const payslipTitle = config.payslipTitle || 'Payslips';

  const fontStack = 
    config.fontFamily === 'serif'
      ? "Georgia, 'Times New Roman', Cambria, serif"
      : config.fontFamily === 'mono'
      ? "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace"
      : "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(payslipTitle)} - ${safeFullName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  ${externalLinksHtml}
  <style>
    ${embeddedStyles}

    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
      color: #18181b !important;
      font-family: ${fontStack};
      width: 100%;
    }
    .pdf-payslip-canvas {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff !important;
    }
    .pdf-payslip-page {
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-bottom: 24px;
    }
    .pdf-payslip-page.last-page,
    .pdf-payslip-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
      margin-bottom: 0 !important;
    }
  </style>
</head>
<body class="bg-white text-zinc-900 font-sans antialiased">
  ${pagesHtml}
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

    // Desktop (Electron): use native Node.js nodemailer
    const electronAPI = getElectronAPI();
    if (electronAPI?.testSmtpConnection) {
      return await electronAPI.testSmtpConnection(sanitizedSmtp);
    }

    // Mobile (Capacitor Android APK): use native JavaMail bridge
    const androidSMTP = getAndroidSMTP();
    if (androidSMTP?.testConnection) {
      return await invokeAndroidSmtp('testConnection', sanitizedSmtp);
    }

    return { 
      success: false, 
      error: 'Direct SMTP requires the Payroll Pro Desktop app or Android APK. In a browser, switch to Resend API instead.' 
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
 * Dispatches an individual employee's payslip (single month or multi-month consolidated PDF)
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
    attachPdf = true,
    periods = [] 
  } = payload;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return { success: false, error: 'Invalid or missing recipient email address.' };
  }

  const isMultiPeriod = Boolean(periods && periods.length > 1);
  const templateData = getEmailTemplateData(item, company, monthLabel, year);
  const subject = interpolateEmailTemplate(subjectTemplate || settings.defaultSubjectTemplate, templateData);
  const bodyText = interpolateEmailTemplate(bodyTemplate || settings.defaultBodyTemplate, templateData);

  // If multiple months selected, compile all into a single multi-page HTML document
  const htmlPayslip = isMultiPeriod
    ? renderConsolidatedPayslipsToHtml(periods, company, config, recipientEmail)
    : renderPayslipToHtml(item, company, monthLabel, year, config, recipientEmail);

  const cleanFullName = item.fullName.replace(/\s+/g, '_');
  const cleanMonth = monthLabel.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const fileName = isMultiPeriod
    ? `Payslips_${cleanFullName}_${cleanMonth}_${year}.pdf`
    : `Payslip_${cleanFullName}_${cleanMonth}_${year}.pdf`;

  // 1. Desktop SMTP delivery via Electron
  if (settings.provider === 'smtp') {
    const sanitizedSmtp = {
      ...settings.smtp,
      host: (settings.smtp.host || '').trim(),
      user: (settings.smtp.user || '').trim(),
      pass: (settings.smtp.pass || '').trim().replace(/\s+/g, ''),
      fromEmail: (settings.smtp.fromEmail || '').trim(),
    };

    // Desktop (Electron): use native nodemailer
    const electronAPI = getElectronAPI();
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

    // Mobile (Capacitor Android APK): use native JavaMail bridge
    // PDF generation is not supported on Android yet — send HTML body only
    const androidSMTP = getAndroidSMTP();
    if (androidSMTP?.sendEmail) {
      return await invokeAndroidSmtp('sendEmail', {
        smtp: sanitizedSmtp,
        recipient: recipientEmail,
        subject,
        body: bodyText,
        htmlContent: htmlPayslip,
        attachPdf: false, // PDF rendering requires Electron; HTML payslip is embedded instead
        fileName,
        fromName: settings.smtp.fromName || '',
      });
    }

    return { 
      success: false, 
      error: 'SMTP sending requires the Payroll Pro Desktop app or Android APK. In a browser, switch to Resend API.' 
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
