import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { selectEffectiveSubscription } from '@/lib/payments/subscription-access';
import { activateInstitutionPaymentClaim } from '@/lib/institution-payments/actions';
import {
  billingPeriodEnd,
  expectedIndividualPlanPkr,
  looksLikeInstitutionClaimCode,
  normalizeTid,
  parseJazzcashPlanCode,
} from '@/lib/payments/jazzcash';

/**
 * The actual cross-match: called by the WhatsApp worker (whatsapp-worker/index.js) once it has a
 * transaction ID + plan/claim code from an incoming chat. This is where real money gets turned
 * into real access, so every step is deliberately conservative:
 *  1. The received_jazzcash_sms row for this TID must exist (i.e. JazzCash's own SMS really said
 *     this transaction happened) and be unconsumed.
 *  2. The amount on that real SMS must exactly match what the claimed plan/institution claim
 *     actually costs right now.
 *  3. The SMS row is atomically marked consumed (WHERE consumed_at IS NULL) as part of the same
 *     step that decides to activate — so the same real transaction can never activate two
 *     accounts/claims, even under a race of two requests for the same TID.
 *  4. If activation then fails for any reason, the consumption is rolled back so the TID isn't
 *     burned for nothing and the payer can just try again.
 *
 * Never throws in a way that would crash the caller — every branch returns a 200 with a `verified`
 * boolean and a `message` the worker relays back to WhatsApp as-is.
 */

const WORKER_SECRET = process.env.WHATSAPP_WORKER_SECRET;
const AMOUNT_TOLERANCE = 1; // rupee — guards against float/rounding drift, not a fraud loophole.

function isAuthorized(request: NextRequest) {
  if (!WORKER_SECRET) return false; // never allow an unauthenticated caller to activate a plan.
  return request.headers.get('authorization') === `Bearer ${WORKER_SECRET}`;
}

/** Every plausible way `profiles.phone` might have this number stored — see whatsapp-worker's
 * lib/phone.js candidateStoredFormats(), kept in sync manually (separate runtime, no shared import). */
function candidatePhoneFormats(digits: string): string[] {
  if (!digits) return [];
  const local = digits.startsWith('92') ? `0${digits.slice(2)}` : digits;
  const withCountryCode = digits.startsWith('92') ? digits : `92${digits.replace(/^0/, '')}`;
  return Array.from(new Set([digits, local, withCountryCode, `+${withCountryCode}`]));
}

type VerifyResult = { verified: boolean; message: string };

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ verified: false, message: 'Unauthorized' }, { status: 401 });
  }

  let body: { phoneDigits?: string; tid?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ verified: false, message: 'Invalid request' }, { status: 400 });
  }

  const phoneDigits = String(body.phoneDigits || '').replace(/[^\d]/g, '');
  const tid = normalizeTid(String(body.tid || ''));
  const code = String(body.code || '').trim();
  if (!phoneDigits || !tid || !code) {
    return NextResponse.json<VerifyResult>({
      verified: false,
      message: 'Missing phone, transaction ID, or code — please include both your TID and plan/claim code.',
    });
  }

  try {
    const db = (await createAdminClient()) as any;

    const { data: smsRow } = await db
      .from('received_jazzcash_sms')
      .select('id, tid, amount, consumed_at')
      .eq('tid', tid)
      .maybeSingle();
    if (!smsRow) {
      return NextResponse.json<VerifyResult>({
        verified: false,
        message:
          "We haven't received that transaction yet — SMS forwarding can take a minute or two. Please try again shortly.",
      });
    }
    if (smsRow.consumed_at) {
      return NextResponse.json<VerifyResult>({
        verified: false,
        message: 'This transaction ID has already been used to activate an account.',
      });
    }

    const institutionCode = looksLikeInstitutionClaimCode(code);
    const individualPlan = !institutionCode ? parseJazzcashPlanCode(code) : null;
    if (!institutionCode && !individualPlan) {
      return NextResponse.json<VerifyResult>({
        verified: false,
        message: "That code doesn't look right — double check it on the checkout page and try again.",
      });
    }

    const { data: profile } = await db
      .from('profiles')
      .select('id, full_name')
      .in('phone', candidatePhoneFormats(phoneDigits))
      .limit(1)
      .maybeSingle();

    if (individualPlan) {
      return await handleIndividualPlan(db, { smsRow, tid, plan: individualPlan, profile });
    }
    return await handleInstitutionClaim(db, { smsRow, tid, code, profile });
  } catch (error) {
    console.error('[jazzcash/verify] Unexpected error:', error);
    return NextResponse.json<VerifyResult>({
      verified: false,
      message: 'Something went wrong verifying that payment. Please try again shortly or contact support.',
    });
  }
}

/** Atomically claims the SMS row — returns the updated row, or null if someone else (a race, or a
 * retried request) already consumed it first. Callers must not activate anything if this is null. */
async function consumeSmsRow(db: any, tid: string, consumedBy: string) {
  const { data } = await db
    .from('received_jazzcash_sms')
    .update({ consumed_at: new Date().toISOString(), consumed_by: consumedBy })
    .eq('tid', tid)
    .is('consumed_at', null)
    .select('id')
    .maybeSingle();
  return data || null;
}

async function releaseSmsRow(db: any, tid: string) {
  await db.from('received_jazzcash_sms').update({ consumed_at: null, consumed_by: null }).eq('tid', tid);
}

async function handleIndividualPlan(
  db: any,
  params: {
    smsRow: { tid: string; amount: number };
    tid: string;
    plan: NonNullable<ReturnType<typeof parseJazzcashPlanCode>>;
    profile: { id: string; full_name: string | null } | null;
  }
): Promise<NextResponse> {
  const { smsRow, tid, plan, profile } = params;
  if (!profile) {
    return NextResponse.json<VerifyResult>({
      verified: false,
      message:
        "We couldn't find an ilm AI account with this WhatsApp number. Add this number to your profile in Settings, then message us again.",
    });
  }

  const settings = await getPlatformSettings();
  const expectedPkr = expectedIndividualPlanPkr(settings, plan);
  if (Math.abs(Number(smsRow.amount) - expectedPkr) > AMOUNT_TOLERANCE) {
    return NextResponse.json<VerifyResult>({
      verified: false,
      message: `The amount doesn't match this plan's current price (expected Rs. ${expectedPkr.toLocaleString()}, this transaction was Rs. ${Number(smsRow.amount).toLocaleString()}). Please contact support.`,
    });
  }

  const claimed = await consumeSmsRow(db, tid, `individual:${profile.id}`);
  if (!claimed) {
    return NextResponse.json<VerifyResult>({
      verified: false,
      message: 'This transaction ID has already been used to activate an account.',
    });
  }

  try {
    const now = new Date();
    const periodEnd = billingPeriodEnd(now, plan.billingCycle);
    const { error: subscriptionError } = await db.from('subscriptions').upsert(
      {
        user_id: profile.id,
        provider: 'jazzcash_auto',
        // The TID is already globally unique (received_jazzcash_sms.tid has its own unique
        // constraint) — reusing it here makes this upsert naturally idempotent if the worker ever
        // retries the same request.
        provider_subscription_id: tid,
        tier: plan.tier,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd,
        cancel_at_period_end: false,
        updated_at: now.toISOString(),
      },
      { onConflict: 'provider_subscription_id' }
    );
    if (subscriptionError) throw new Error(subscriptionError.message);

    const { data: allSubscriptions } = await db
      .from('subscriptions')
      .select('tier, status, current_period_end')
      .eq('user_id', profile.id);
    const access = selectEffectiveSubscription(allSubscriptions || []);
    const { error: profileError } = await db
      .from('profiles')
      .update({ subscription_tier: access.tier, subscription_expires_at: access.expiresAt })
      .eq('id', profile.id);
    if (profileError) throw new Error(profileError.message);

    return NextResponse.json<VerifyResult>({
      verified: true,
      message: `Payment verified! ✅ Your ${plan.tier} plan is now active until ${new Date(periodEnd).toDateString()}. Enjoy ilm AI!`,
    });
  } catch (error) {
    // Activation failed after the TID was marked spent — release it so the payer can retry
    // instead of a real payment being stuck unusable.
    await releaseSmsRow(db, tid);
    console.error('[jazzcash/verify] Individual plan activation failed, released TID:', error);
    return NextResponse.json<VerifyResult>({
      verified: false,
      message: 'We found your payment but activation failed. Please try again in a minute, or contact support.',
    });
  }
}

async function handleInstitutionClaim(
  db: any,
  params: {
    smsRow: { tid: string; amount: number };
    tid: string;
    code: string;
    profile: { id: string; full_name: string | null } | null;
  }
): Promise<NextResponse> {
  const { smsRow, tid, code, profile } = params;

  const { data: claim } = await db
    .from('institution_payment_verifications')
    .select('id, amount_pkr, submitted_by, status')
    .eq('claim_code', code)
    .maybeSingle();
  if (!claim) {
    return NextResponse.json<VerifyResult>({
      verified: false,
      message: 'No pending claim found for that code. Double check it on your settings page or contact support.',
    });
  }
  if (claim.status !== 'pending_review') {
    return NextResponse.json<VerifyResult>({
      verified: false,
      message: 'This claim was already reviewed.',
    });
  }
  // Only the person who filed the claim from the app can confirm it over WhatsApp — otherwise
  // anyone who saw/guessed the code (it's shown on a settings page other org staff may see) could
  // activate someone else's institution.
  if (!profile || profile.id !== claim.submitted_by) {
    return NextResponse.json<VerifyResult>({
      verified: false,
      message:
        'This claim can only be confirmed by the account that submitted it. Please message us from the WhatsApp number linked to that ilm AI profile.',
    });
  }

  if (Math.abs(Number(smsRow.amount) - Number(claim.amount_pkr)) > AMOUNT_TOLERANCE) {
    return NextResponse.json<VerifyResult>({
      verified: false,
      message: `The amount doesn't match this claim (expected Rs. ${Number(claim.amount_pkr).toLocaleString()}, this transaction was Rs. ${Number(smsRow.amount).toLocaleString()}). Please contact support.`,
    });
  }

  const claimed = await consumeSmsRow(db, tid, `institution:${claim.id}`);
  if (!claimed) {
    return NextResponse.json<VerifyResult>({
      verified: false,
      message: 'This transaction ID has already been used to activate an account.',
    });
  }

  const outcome = await activateInstitutionPaymentClaim(claim.id, 'verified', {
    reviewedBy: null,
    reviewNotes: `Auto-verified via JazzCash SMS match (TID ${tid}).`,
  });
  if (!outcome.success) {
    await releaseSmsRow(db, tid);
    console.error('[jazzcash/verify] Institution claim activation failed, released TID:', outcome.message);
    return NextResponse.json<VerifyResult>({
      verified: false,
      message: 'We found your payment but activation failed. Please try again in a minute, or contact support.',
    });
  }

  return NextResponse.json<VerifyResult>({
    verified: true,
    message: 'Payment verified! ✅ Your institution plan is now active.',
  });
}
