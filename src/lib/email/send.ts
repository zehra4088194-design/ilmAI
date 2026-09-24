/**
 * Transactional email — sent through Brevo's HTTP API (https://api.brevo.com/v3/smtp/email)
 * instead of a raw SMTP transport. Same public shape (isEmailConfigured / sendEmail) as before,
 * so every call site (auth OTP emails, school/college notification cron, report-card delivery,
 * etc.) needed zero changes — only the transport underneath moved from nodemailer+SMTP_* to the
 * Brevo API + BREVO_API_KEY.
 */

export function isEmailConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

/** "ilm AI <noreply@ilmai.study>" -> { name: 'ilm AI', email: 'noreply@ilmai.study' } */
function parseFromAddress(raw: string) {
  const match = raw.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (match) return { name: (match[1] ?? '').replace(/^"|"$/g, '') || undefined, email: match[2] ?? raw };
  return { email: raw.trim() };
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  // Phase 6b — lets a report card PDF (or any future generated file) ride along on an existing
  // email, instead of a separate attachment-sending code path.
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) throw new Error('BREVO_API_KEY is not configured');
  if (!from) throw new Error('EMAIL_FROM is not configured');

  const body: Record<string, unknown> = {
    sender: parseFromAddress(from),
    to: [{ email: params.to }],
    subject: params.subject,
    htmlContent: params.html,
  };
  if (params.text) body.textContent = params.text;
  if (params.replyTo) body.replyTo = { email: params.replyTo };
  if (params.attachments?.length) {
    body.attachment = params.attachments.map((attachment) => ({
      name: attachment.filename,
      content: attachment.content.toString('base64'),
    }));
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  const result = await response.json().catch(() => ({}) as Record<string, unknown>);
  if (!response.ok) {
    const message = (result as { message?: string })?.message || `Brevo email send failed (${response.status})`;
    throw new Error(message);
  }
  return { messageId: String((result as { messageId?: string }).messageId || '') };
}
