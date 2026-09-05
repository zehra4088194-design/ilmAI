/**
 * Real WhatsApp delivery through Brevo's WhatsApp Campaign API, replacing the earlier "wa.me
 * click-to-chat link" approach (src/lib/utils/whatsapp.ts, still used for the odd manual-share
 * button) with an actual server-sent message. Requires, in the Brevo dashboard:
 *   1. A WhatsApp Business sender number connected under Brevo > WhatsApp > Senders.
 *   2. One approved (Meta-reviewed) message template per notification kind below — templates are
 *      how WhatsApp's Business API allows businesses to message a parent who hasn't messaged the
 *      school first. Create them in Brevo > WhatsApp > Templates, then paste each template's name
 *      into the matching env var.
 *
 * Env vars (see .env.local.example):
 *   BREVO_API_KEY                        — same key used for email (src/lib/email/send.ts)
 *   BREVO_WHATSAPP_SENDER                 — the approved sender number, digits only with country code
 *   BREVO_WHATSAPP_TEMPLATE_FEE_REMINDER
 *   BREVO_WHATSAPP_TEMPLATE_ABSENCE_ALERT
 *   BREVO_WHATSAPP_TEMPLATE_WEEKLY_REPORT
 *   BREVO_WHATSAPP_TEMPLATE_LEAVE_UPDATE
 *   BREVO_WHATSAPP_TEMPLATE_ANNOUNCEMENT       — the WhatsApp Center's broadcast composer
 *
 * Each template is expected to declare its body variables as {{1}}, {{2}}, ... in Brevo/Meta —
 * `params` below fills those in order. If a template for a given kind isn't configured yet,
 * sendBrevoWhatsApp() returns { skipped: true } so callers degrade gracefully instead of throwing.
 */

export type WhatsAppTemplateKind = 'fee_reminder' | 'absence_alert' | 'weekly_report' | 'leave_update' | 'announcement';

const TEMPLATE_ENV_KEY: Record<WhatsAppTemplateKind, string> = {
  fee_reminder: 'BREVO_WHATSAPP_TEMPLATE_FEE_REMINDER',
  absence_alert: 'BREVO_WHATSAPP_TEMPLATE_ABSENCE_ALERT',
  weekly_report: 'BREVO_WHATSAPP_TEMPLATE_WEEKLY_REPORT',
  leave_update: 'BREVO_WHATSAPP_TEMPLATE_LEAVE_UPDATE',
  announcement: 'BREVO_WHATSAPP_TEMPLATE_ANNOUNCEMENT',
};

export function isWhatsAppConfigured(kind?: WhatsAppTemplateKind) {
  if (!process.env.BREVO_API_KEY || !process.env.BREVO_WHATSAPP_SENDER) return false;
  if (!kind) return true;
  return Boolean(process.env[TEMPLATE_ENV_KEY[kind]]);
}

/** Pakistani-friendly normalizer, mirrors buildWhatsAppLink()'s digit handling. */
function normalizePhone(phone: string) {
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
  return digits;
}

export async function sendBrevoWhatsApp(params: {
  to: string;
  kind: WhatsAppTemplateKind;
  /** Fills the template's {{1}}, {{2}}, ... placeholders in order. */
  templateParams?: string[];
}): Promise<{ skipped: true; reason: string } | { messageId: string | null }> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderNumber = process.env.BREVO_WHATSAPP_SENDER;
  const templateId = process.env[TEMPLATE_ENV_KEY[params.kind]];
  if (!apiKey || !senderNumber || !templateId) {
    return { skipped: true, reason: 'Brevo WhatsApp sender or template is not configured for this message kind' };
  }
  const contactNumber = normalizePhone(params.to);
  if (!contactNumber) return { skipped: true, reason: 'Recipient has no usable phone number' };

  const response = await fetch('https://api.brevo.com/v3/whatsapp/sendMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      senderNumber,
      contactNumbers: [contactNumber],
      templateId,
      ...(params.templateParams?.length ? { params: params.templateParams } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const result = await response.json().catch(() => ({}) as Record<string, unknown>);
  if (!response.ok) {
    const message = (result as { message?: string })?.message || `Brevo WhatsApp send failed (${response.status})`;
    throw new Error(message);
  }
  return { messageId: String((result as { messageId?: string }).messageId || '') || null };
}
