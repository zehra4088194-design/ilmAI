import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkDailyLimit } from '@/lib/rate-limit';

// Manual JazzCash/Easypaisa/bank-transfer payment proof (institution plans, fee vouchers, parent
// plans, the student wallet upgrade flow) — replaces the old "Confirm on WhatsApp" link. Same
// server-side formsubmit.co relay as /api/suggestions, so no phone number or email address ever
// appears in client-bundled JS/HTML; the payer's own name/number and screenshot go straight to
// this env var's inbox for an admin to verify against the JazzCash/Easypaisa transaction.
// Deliberately NOT Brevo — Brevo is reserved for the app's own transactional emails, not
// public-facing forms like this one.
//
// formsubmit.co gotcha: the FIRST submission to a new destination address only triggers an
// activation email from formsubmit.co to that inbox — click the link there once, then every
// submission after that actually delivers.
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
    const relay = new FormData();
    relay.set('_subject', `[ilm AI] Payment proof: ${context || 'manual payment'}`);
    relay.set('Name on transaction', name);
    relay.set('Sender number', phone);
    relay.set('Context', context);
    relay.set('Screenshot', image, image.name || 'proof.png');

    const response = await fetch(`https://formsubmit.co/ajax/${PAYMENT_PROOF_EMAIL}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: relay,
    });
    if (!response.ok) throw new Error(`formsubmit responded ${response.status}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Payment proof delivery failed:', error);
    return NextResponse.json({ error: 'Could not send your proof. Please try again.' }, { status: 502 });
  }
}
