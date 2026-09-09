import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Replaces formsubmit.co (removed — its "first submission to a new address needs manual
 * activation" behavior kept silently blocking suggestions/mistake-reports/payment-proof until
 * someone remembered to click an activation email) with a direct SMTP send via nodemailer. Free,
 * no third-party form service, no activation step — reuses the same Oracle Email Delivery SMTP_*
 * credentials already configured for Supabase Auth's own emails (see .env.oracle.example).
 *
 * Used only for internal admin-notification emails (a suggestion, a mistake report, a payment
 * screenshot) — the app's own transactional email to USERS (auth OTPs, reminders, etc.) stays on
 * Brevo's API (src/lib/email/send.ts), unrelated to this file.
 */

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST / SMTP_USER / SMTP_PASSWORD are not configured');
  }
  const port = Number(process.env.SMTP_PORT || 587);
  // Defaults match .env.oracle.example's documented Oracle Email Delivery setup (587 + STARTTLS,
  // i.e. secure: false — "secure" in nodemailer means "TLS from the first byte", which is the
  // port 465 convention, not 587's).
  const secure = process.env.SMTP_SECURE === 'true';
  cachedTransporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return cachedTransporter;
}

export function isAdminMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type AdminMailAttachment = { filename: string; content: Buffer; contentType?: string };

/**
 * Sends a plain "here's what came in" notification to an internal admin inbox — `fields` renders
 * as a simple label/value list (blank values are skipped), `attachments` rides along as real MIME
 * attachments (screenshots, etc.), no size-encoding tricks needed since this goes straight over
 * SMTP rather than through a multipart form relay.
 */
export async function sendAdminNotification(params: {
  to: string;
  subject: string;
  fields: Record<string, string>;
  attachments?: AdminMailAttachment[];
}): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;

  const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #222; line-height: 1.5;">
${Object.entries(params.fields)
  .filter(([, value]) => value)
  .map(
    ([label, value]) =>
      `<p style="margin: 0 0 12px;"><strong>${escapeHtml(label)}:</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`
  )
  .join('\n')}
</div>`;

  await transporter.sendMail({
    from: `"ilm AI" <${from}>`,
    to: params.to,
    subject: params.subject,
    html,
    attachments: params.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    })),
  });
}
