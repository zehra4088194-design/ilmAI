import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkDailyLimit } from '@/lib/rate-limit';
import { sendAdminNotification } from '@/lib/adminMail';

// Manual JazzCash/Easypaisa/bank-transfer payment proof (institution plans, fee vouchers, parent
// plans, the student wallet upgrade flow) — replaces the old "Confirm on WhatsApp" link. Same
// server-side SMTP send as /api/suggestions (src/lib/adminMail.ts), so no phone number or email
// address ever appears in client-bundled JS/HTML; the payer's own name/number and screenshot go
// straight to this env var's inbox for an admin to verify against the JazzCash/Easypaisa
// transaction. Deliberately NOT Brevo — Brevo is reserved for the app's own transactional emails,
// not internal notifications like this one. (JazzCash payments also have an automated fast path —
// see src/app/api/payments/jazzcash/verify — this stays as the manual fallback/audit trail.)
const PAYMENT_PROOF_EMAIL =
  process.env.PAYMENT_PROOF_EMAIL || process.env.MISTAKE_REPORT_EMAIL || process.env.CONTACT_EMAIL || 'ilmai.study1@gmail.com';

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

  try {
    await sendAdminNotification({
      to: PAYMENT_PROOF_EMAIL,
      subject: `[ilm AI] Payment proof: ${context || 'manual payment'}`,
      fields: { 'Name on transaction': name, 'Sender number': phone, Context: context },
      attachments: [
        {
          filename: image.name || 'proof.png',
          content: Buffer.from(await image.arrayBuffer()),
          contentType: image.type,
        },
      ],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Payment proof delivery failed:', error);
    return NextResponse.json({ error: 'Could not send your proof. Please try again.' }, { status: 502 });
  }
}
