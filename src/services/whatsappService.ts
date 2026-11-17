import { 
  CalculatedPayrollItem, 
  CompanyProfile, 
  PayslipDesignConfig, 
  WhatsAppSettings, 
  DEFAULT_WHATSAPP_SETTINGS 
} from '../types';
import { formatNaira } from '../engine/payePensionEngine';
import { renderPayslipToHtml } from './emailService';

/**
 * Standardizes phone numbers into international E.164 format for WhatsApp.
 * Handles Nigerian local prefixes (080..., 070..., 090..., 081...) -> 23480...
 * Leaves international numbers with + intact.
 */
export function formatPhoneNumberForWhatsApp(phone?: string | null): string {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Nigerian local phone format: 080..., 070..., 090..., 081..., 01...
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Converts a base64 string to a standard binary Blob (for multipart uploads)
 */
function base64ToBlob(base64: string, mimeType = 'application/pdf'): Blob {
  const cleanBase64 = base64.replace(/\s+/g, '');
  const binaryString = atob(cleanBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Replaces placeholders in the WhatsApp template with employee payroll data
 */
export function interpolateWhatsAppTemplate(
  template: string,
  data: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    result = result.replace(regex, value ?? '');
  }
  return result;
}

export interface WhatsAppMessagePayload {
  item: CalculatedPayrollItem;
  company: CompanyProfile;
  monthLabel: string;
  year: number;
  phone?: string;
  settings?: WhatsAppSettings;
  config?: PayslipDesignConfig;
}

/**
 * Builds the text and direct wa.me link for an employee payslip
 */
export function buildWhatsAppPayslipData(payload: WhatsAppMessagePayload) {
  const {
    item,
    company,
    monthLabel,
    year,
    phone,
    settings = DEFAULT_WHATSAPP_SETTINGS,
  } = payload;

  const targetPhone = formatPhoneNumberForWhatsApp(phone || item.employeeCode);

  const templateData: Record<string, string> = {
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

  const messageText = interpolateWhatsAppTemplate(
    settings.defaultMessageTemplate || DEFAULT_WHATSAPP_SETTINGS.defaultMessageTemplate,
    templateData
  );

  const encodedMessage = encodeURIComponent(messageText);
  const webLink = targetPhone
    ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedMessage}`
    : `https://api.whatsapp.com/send?text=${encodedMessage}`;

  return {
    phone: targetPhone,
    hasValidPhone: Boolean(targetPhone && targetPhone.length >= 10),
    messageText,
    webLink,
  };
}

/**
 * Generates an offline downloadable HTML payslip file
 */
export function downloadPayslipHtmlFile(
  item: CalculatedPayrollItem,
  company: CompanyProfile,
  monthLabel: string,
  year: number,
  config?: PayslipDesignConfig
) {
  const html = renderPayslipToHtml(item, company, monthLabel, year, config);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (item.fullName || 'Employee').replace(/\s+/g, '_');
  link.href = url;
  link.download = `Payslip_${safeName}_${monthLabel}_${year}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Dispatches WhatsApp message via configured provider or direct chat link
 */
export async function sendWhatsAppPayslip(
  payload: WhatsAppMessagePayload,
  triggerDocumentDownload = true
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const settings = payload.settings || DEFAULT_WHATSAPP_SETTINGS;
  const { webLink, targetPhone, messageText, hasValidPhone } = {
    ...buildWhatsAppPayslipData(payload),
    targetPhone: formatPhoneNumberForWhatsApp(payload.phone || payload.item.employeeCode),
  };

  if (!hasValidPhone) {
    return { success: false, error: 'Recipient employee does not have a valid phone number.' };
  }

  // 1. Meta / WhatsApp Cloud API
  if (settings.provider === 'cloud_api') {
    const { phoneNumberId, accessToken, apiVersion = 'v20.0' } = settings.cloudApi;
    if (!phoneNumberId || !accessToken) {
      return { success: false, error: 'Please enter WhatsApp Phone Number ID and Access Token in Settings.' };
    }

    try {
      const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
      const safeName = (payload.item.fullName || 'Employee').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
      const fileName = `Payslip_${safeName}_${payload.monthLabel}_${payload.year}.pdf`;
      let mediaId: string | undefined;

      // 1. Try rendering the official publication PDF via Electron
      if (electronAPI?.renderPayslipPdf) {
        try {
          const htmlContent = renderPayslipToHtml(
            payload.item,
            payload.company,
            payload.monthLabel,
            payload.year,
            payload.config
          );
          const pdfRes = await electronAPI.renderPayslipPdf(htmlContent);
          if (pdfRes?.success && pdfRes?.base64) {
            const pdfBlob = base64ToBlob(pdfRes.base64, 'application/pdf');
            const formData = new FormData();
            formData.append('messaging_product', 'whatsapp');
            formData.append('file', pdfBlob, fileName);
            formData.append('type', 'application/pdf');

            const uploadRes = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
              body: formData,
            });

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              if (uploadData?.id) {
                mediaId = uploadData.id;
              }
            } else {
              const errData = await uploadRes.json().catch(() => null);
              console.warn('Meta media upload returned non-OK:', errData);
            }
          }
        } catch (pdfErr) {
          console.warn('Could not generate or upload PDF for WhatsApp:', pdfErr);
        }
      }

      // 2. Dispatch via Document (with PDF) or fallback to Text
      let messagePayload: any;
      if (mediaId) {
        // WhatsApp document captions support up to 1024 characters
        const caption = messageText.length > 1000 ? messageText.substring(0, 995) + '...' : messageText;
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: targetPhone,
          type: 'document',
          document: {
            id: mediaId,
            caption,
            filename: fileName,
          },
        };
      } else {
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: targetPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        };
      }

      const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error?.message || `WhatsApp Cloud API error (${res.status})` };
      }
      return { success: true, messageId: data?.messages?.[0]?.id };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reach WhatsApp Cloud API' };
    }
  }

  // 2. UltraMsg WhatsApp Gateway
  if (settings.provider === 'ultramsg') {
    const { instanceId, token } = settings.ultramsg;
    if (!instanceId || !token) {
      return { success: false, error: 'Please enter UltraMsg Instance ID and Security Token in Settings.' };
    }

    try {
      const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
      const safeName = (payload.item.fullName || 'Employee').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
      const fileName = `Payslip_${safeName}_${payload.monthLabel}_${payload.year}.pdf`;
      let pdfBase64: string | undefined;

      if (electronAPI?.renderPayslipPdf) {
        try {
          const htmlContent = renderPayslipToHtml(
            payload.item,
            payload.company,
            payload.monthLabel,
            payload.year,
            payload.config
          );
          const pdfRes = await electronAPI.renderPayslipPdf(htmlContent);
          if (pdfRes?.success && pdfRes?.base64) {
            pdfBase64 = pdfRes.base64;
          }
        } catch (pdfErr) {
          console.warn('Could not generate PDF for UltraMsg:', pdfErr);
        }
      }

      let res: Response;
      if (pdfBase64) {
        res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token,
            to: targetPhone,
            filename: fileName,
            document: `data:application/pdf;base64,${pdfBase64}`,
            caption: messageText,
          }).toString(),
        });
      } else {
        res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token,
            to: targetPhone,
            body: messageText,
          }).toString(),
        });
      }

      const data = await res.json();
      if (data?.error) {
        return { success: false, error: data.error };
      }
      return { success: true, messageId: String(data?.id || '') };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reach UltraMsg Gateway' };
    }
  }

  // 3. Termii WhatsApp Service
  if (settings.provider === 'termii') {
    const { apiKey, deviceId } = settings.termii;
    if (!apiKey || !deviceId) {
      return { success: false, error: 'Please enter Termii API Key and Device ID in Settings.' };
    }

    try {
      const res = await fetch('https://api.ng.termii.com/api/send/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          device_id: deviceId,
          phone_number: targetPhone,
          template_id: settings.termii.templateId || undefined,
          data: {
            employeeName: payload.item.fullName,
            netPay: formatNaira(payload.item.netTakeHome),
            month: payload.monthLabel,
            year: String(payload.year),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || (data?.code && data?.code !== 'ok')) {
        return { success: false, error: data?.message || 'Termii WhatsApp delivery failed' };
      }
      return { success: true, messageId: data?.message_id };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to reach Termii API' };
    }
  }

  // 4. Default: Direct WhatsApp Web / Mobile Link
  if (triggerDocumentDownload) {
    try {
      downloadPayslipHtmlFile(
        payload.item,
        payload.company,
        payload.monthLabel,
        payload.year,
        payload.config
      );
    } catch (err) {
      console.warn('Could not auto-download payslip voucher:', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.open(webLink, '_blank', 'noopener,noreferrer');
  }

  return { success: true };
}

/**
 * Tests connection / credential validity for the chosen WhatsApp API
 */
export async function testWhatsAppConnection(
  settings: WhatsAppSettings
): Promise<{ success: boolean; message: string; error?: string }> {
  if (settings.provider === 'direct') {
    return {
      success: true,
      message: 'Direct wa.me configuration is active. Ready to dispatch payslips via WhatsApp.',
    };
  }

  if (settings.provider === 'cloud_api') {
    const { phoneNumberId, accessToken, apiVersion = 'v20.0' } = settings.cloudApi;
    if (!phoneNumberId || !accessToken) {
      return { success: false, message: 'Phone Number ID and Access Token are required.', error: 'Missing credentials' };
    }

    try {
      const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data?.error?.message || `Meta API Error (${res.status})`, error: data?.error?.message };
      }
      return { 
        success: true, 
        message: `Verified Meta WhatsApp sender: ${data.display_phone_number || data.verified_name || phoneNumberId}` 
      };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Connection to Meta Graph API failed', error: e?.message };
    }
  }

  if (settings.provider === 'ultramsg') {
    const ultramsgConfig = settings.ultramsg || settings.ultraMsg;
    const { instanceId, token } = ultramsgConfig || {};
    if (!instanceId || !token) {
      return { success: false, message: 'Instance ID and Token are required.', error: 'Missing credentials' };
    }

    try {
      const res = await fetch(`https://api.ultramsg.com/${instanceId}/instance/status?token=${token}`);
      const data = await res.json();
      if (data?.error) {
        return { success: false, message: data.error, error: data.error };
      }
      return { success: true, message: `Connected to UltraMsg instance ${instanceId} successfully!` };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Connection to UltraMsg failed', error: e?.message };
    }
  }

  if (settings.provider === 'termii') {
    const { apiKey } = settings.termii || {};
    if (!apiKey) {
      return { success: false, message: 'Termii API Key is required.', error: 'Missing API key' };
    }

    try {
      const res = await fetch(`https://api.ng.termii.com/api/get-balance?api_key=${apiKey}`);
      const data = await res.json();
      if (data?.balance !== undefined) {
        return { success: true, message: `Connected to Termii successfully! Available balance: ₦${data.balance}` };
      }
      return { success: false, message: data?.message || 'Invalid Termii API Key', error: data?.message };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Connection to Termii API failed', error: e?.message };
    }
  }

  return { success: false, message: 'Unsupported WhatsApp Provider', error: 'Invalid provider' };
}

/**
 * Backwards compatibility alias for components dispatching payslips
 */
export const openWhatsAppPayslipChat = sendWhatsAppPayslip;
