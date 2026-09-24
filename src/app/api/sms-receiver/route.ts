import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizeTid } from '@/lib/payments/jazzcash';

/**
 * Receives forwarded JazzCash "money received" SMS from a free Android SMS-to-webhook app running
 * on the phone/SIM linked to the merchant JazzCash account, and stores {tid, amount} for the
 * WhatsApp bot's cross-match step (src/app/api/payments/jazzcash/verify/route.ts) to look up
 * later — this endpoint never activates anything itself, it only records what JazzCash's own SMS
 * actually said, which is the anti-fraud anchor the whole pipeline is built on.
 *
 * SECURITY: this endpoint has no other identity check than the shared secret below, and anyone
 * who could POST fake rows here could get a plan activated for free — SMS_WEBHOOK_SECRET is not
 * optional. Configure the exact same value in the Android app's webhook settings and in this
 * app's env (see .env.oracle.example).
 *
 * PAYLOAD SHAPE: most "SMS to webhook" Android apps are template-configurable — this accepts the
 * common field-name variants (text/message/body, from/sender/originatingAddress) so it doesn't
 * need to match one specific app exactly. If your app's payload uses different field names,
 * adjust the destructuring below.
 */

const WEBHOOK_SECRET = process.env.SMS_WEBHOOK_SECRET;
// JazzCash's own SMS shortcode — filters out irrelevant forwarded SMS (OTPs, other banks, spam)
// before we even try to parse them. Override via env if JazzCash sends from a different code in
// your account's region.
const JAZZCASH_SENDER_ALLOWLIST = (process.env.JAZZCASH_SMS_SENDERS || '8558')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

// JazzCash's exact SMS wording drifts by region/campaign — these are deliberately loose but
// anchored to explicit labels ("received", "TID") rather than "the first number in the message",
// so a differently-worded balance/OTP SMS from the same shortcode doesn't get misparsed into a
// fake credit. Tune against a real sample from your account if these ever stop matching — every
// unparsed message is logged (not silently dropped) so that's easy to spot.
const AMOUNT_PATTERN = /received\s+(?:rs\.?|pkr)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i;
const AMOUNT_FALLBACK_PATTERN = /(?:rs\.?|pkr)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)/i;
const TID_PATTERN = /\bT\.?I\.?D\.?[:\-]?\s*([A-Za-z0-9]{6,20})\b/i;

function extractAmount(text: string): number | null {
  const match = AMOUNT_PATTERN.exec(text) || AMOUNT_FALLBACK_PATTERN.exec(text);
  if (!match) return null;
  const amount = Number(match[1]!.replace(/,/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function extractTid(text: string): string | null {
  const match = TID_PATTERN.exec(text);
  if (!match) return null;
  const tid = normalizeTid(match[1]!);
  return tid.length >= 6 ? tid : null;
}

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error('[sms-receiver] SMS_WEBHOOK_SECRET is not configured — refusing all requests.');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  const providedSecret =
    request.headers.get('x-webhook-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    new URL(request.url).searchParams.get('secret'); // some Android apps can only send query params
  if (providedSecret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = String(body.text ?? body.message ?? body.body ?? body.sms ?? '').trim();
  const sender = String(body.from ?? body.sender ?? body.originatingAddress ?? body.number ?? '').trim();
  if (!text) return NextResponse.json({ error: 'No message text in payload' }, { status: 400 });

  if (JAZZCASH_SENDER_ALLOWLIST.length && sender && !JAZZCASH_SENDER_ALLOWLIST.includes(sender)) {
    // Not an error — plenty of other SMS legitimately hit the same forwarder (OTPs, other apps).
    return NextResponse.json({ ok: true, skipped: true, reason: 'Sender not in allowlist' });
  }

  const amount = extractAmount(text);
  const tid = extractTid(text);
  if (!amount || !tid) {
    console.error('[sms-receiver] Could not parse amount/TID from forwarded SMS:', { sender, text });
    return NextResponse.json({ ok: true, skipped: true, reason: 'Could not parse amount/TID — check server logs' });
  }

  try {
    const db = (await createAdminClient()) as any;
    // ON CONFLICT DO NOTHING — a duplicate webhook delivery (the Android app retrying, or the
    // carrier delivering the same SMS twice) must never overwrite an already-consumed row.
    const { error } = await db
      .from('received_jazzcash_sms')
      .insert({ tid, amount, raw_text: text.slice(0, 1000) })
      .select('id')
      .single();
    if (error && error.code !== '23505') {
      console.error('[sms-receiver] Insert failed:', error);
      return NextResponse.json({ error: 'Storage failed' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, tid, amount, duplicate: error?.code === '23505' });
  } catch (error) {
    console.error('[sms-receiver] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
