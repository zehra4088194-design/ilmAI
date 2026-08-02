import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';
import { checkDailyLimit } from '@/lib/rate-limit';
import { logRecaptchaFailure, verifyRecaptchaToken } from '@/lib/security/recaptcha-server';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(20).max(4000),
  company: z.string().max(200).optional().default(''),
  recaptchaToken: z.string().max(4096).nullable().optional(),
});

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] || character
  );
}

function requestFingerprint(request: NextRequest) {
  const address =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  return createHash('sha256').update(address).digest('hex').slice(0, 24);
}

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Enter a valid name, email, subject, and message of at least 20 characters.' },
      { status: 400 }
    );
  }

  // A filled honeypot is treated as a successful submission so automated
  // senders do not learn how to bypass it.
  if (parsed.data.company) return NextResponse.json({ ok: true });

  const rateLimit = await checkDailyLimit(requestFingerprint(request), 'erp_mutation:public-contact', 5);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many messages were sent from this connection today. Please email support directly.' },
      { status: 429 }
    );
  }

  const recaptcha = await verifyRecaptchaToken(parsed.data.recaptchaToken, 'contact_submit');
  if (!recaptcha.success) {
    logRecaptchaFailure('contact_submit', recaptcha);
    return NextResponse.json({ error: 'Security verification failed. Please try again.' }, { status: 403 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: 'The contact form is temporarily unavailable. Please email support@ilmai.study.' },
      { status: 503 }
    );
  }

  const { name, email, subject, message } = parsed.data;
  const recipient = process.env.CONTACT_EMAIL || 'support@ilmai.study';
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br />');

  try {
    await sendEmail({
      to: recipient,
      replyTo: email,
      subject: `[ilm AI contact] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>New ilm AI contact message</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <hr style="border:0;border-top:1px solid #e5e7eb" />
          <p>${safeMessage}</p>
        </div>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Public contact delivery failed:', error);
    return NextResponse.json(
      { error: 'The message could not be delivered. Please email support@ilmai.study directly.' },
      { status: 502 }
    );
  }
}
