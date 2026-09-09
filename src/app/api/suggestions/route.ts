import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkDailyLimit } from '@/lib/rate-limit';
import { sendAdminNotification } from '@/lib/adminMail';

// General "have a suggestion?" box (e.g. the Support dialog) — takes a message plus an optional
// screenshot (a pricing page, a bug, anything) and sends it server-side via SMTP
// (src/lib/adminMail.ts), the same pattern as /api/resource-feedback. The destination email is a
// server-only env var, never NEXT_PUBLIC_*, so it never appears in client-bundled JS/HTML.
// Deliberately NOT Brevo — Brevo is reserved for the app's own transactional emails, not internal
// notifications like this one.
const SUGGESTION_EMAIL =
  process.env.SUGGESTION_EMAIL || process.env.MISTAKE_REPORT_EMAIL || process.env.CONTACT_EMAIL || 'ilmai.study1@gmail.com';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // keep email attachments small/deliverable

function requestFingerprint(request: NextRequest) {
  const address =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  return createHash('sha256').update(address).digest('hex').slice(0, 24);
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const message = String(form.get('message') || '').trim();
  const page = String(form.get('page') || '').trim().slice(0, 500);
  const image = form.get('image');

  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Enter a message before sending.' }, { status: 400 });
  }
  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image attachments are supported.' }, { status: 400 });
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large (max 5MB).' }, { status: 400 });
    }
  }

  const rateLimit = await checkDailyLimit(requestFingerprint(request), 'erp_mutation:suggestion', 15);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many suggestions sent from this connection today.' }, { status: 429 });
  }

  try {
    const attachments = [];
    if (image instanceof File && image.size > 0) {
      attachments.push({
        filename: image.name || 'screenshot.png',
        content: Buffer.from(await image.arrayBuffer()),
        contentType: image.type,
      });
    }

    await sendAdminNotification({
      to: SUGGESTION_EMAIL,
      subject: '[ilm AI] New suggestion',
      fields: { Message: message, 'Page URL': page },
      attachments,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Suggestion delivery failed:', error);
    return NextResponse.json({ error: 'Could not deliver the suggestion. Please try again.' }, { status: 502 });
  }
}
