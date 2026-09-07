import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';
import { checkDailyLimit } from '@/lib/rate-limit';

// Manual JazzCash/bank-transfer payment proof (institution plans, fee vouchers, parent
// plans, the student wallet upgrade flow) — replaces the old "Confirm on WhatsApp" link. Sent
// straight through Brevo, same as /api/suggestions and /api/resource-feedback, so no phone
// number or email address ever appears in client-bundled JS/HTML; the payer's own name/number
// and screenshot go straight to this env var's inbox for an admin to verify against the
// JazzCash transaction.
const PAYMENT_PROOF_EMAIL = process.env.PAYMENT_PROOF_EMAIL || 'ilmai.study1@gmail.com';

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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

  const name = String(form.get('name') || '').trim().slice(0, 120);
  const phone = String(form.get('phone') || '').trim().slice(0, 30);
  const context = String(form.get('context') || '').trim().slice(0, 300);
  const image = form.get('image');

  if (!name || !phone) {
    return NextResponse.json({ error: 'Enter the name and number the transaction was made from.' }, { status: 400 });
  }
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: 'Attach a screenshot of the transaction.' }, { status: 400 });
  }
  if (!image.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image attachments are supported.' }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image is too large (max 5MB).' }, { status: 400 });
  }

  const rateLimit = await checkDailyLimit(requestFingerprint(request), 'erp_mutation:payment-proof', 15);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many submissions from this connection today.' }, { status: 429 });
  }

  if (!isEmailConfigured()) {
    console.error('Payment proof delivery failed: BREVO_API_KEY/EMAIL_FROM not configured');
    return NextResponse.json({ error: 'Could not send your proof. Please try again later.' }, { status: 503 });
  }

  try {
    const safeName = escapeHtml(name);
    const safePhone = escapeHtml(phone);
    const safeContext = escapeHtml(context);

    await sendEmail({
      to: PAYMENT_PROOF_EMAIL,
      subject: `[ilm AI] Payment proof: ${context || 'manual payment'}`,
      text: `Name on transaction: ${name}\nSender number: ${phone}\nContext: ${context}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>ilm AI — payment proof</h2>
          <p><strong>Name on transaction:</strong> ${safeName}</p>
          <p><strong>Sender number:</strong> ${safePhone}</p>
          ${safeContext ? `<p><strong>Context:</strong> ${safeContext}</p>` : ''}
        </div>
      `,
      attachments: [
        {
          filename: image.name || 'proof.png',
          content: Buffer.from(await image.arrayBuffer()),
          contentType: image.type || undefined,
        },
      ],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Payment proof delivery failed:', error);
    return NextResponse.json({ error: 'Could not send your proof. Please try again.' }, { status: 502 });
  }
}
