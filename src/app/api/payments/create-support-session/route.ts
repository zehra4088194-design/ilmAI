import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupportCheckout, PaddleRequestError } from '@/lib/payments/paddle';
import { getPaymentAvailability } from '@/lib/payments';
import { getSiteUrl } from '@/lib/utils/siteUrl';

// Public — unlike /api/payments/create-session, a donation needs no account. Same non-catalog
// Paddle transaction pattern as create-institution-session (see createSupportCheckout).
export async function POST(req: NextRequest) {
  try {
    if (getPaymentAvailability(req.headers).consumptionOnly) {
      return NextResponse.json(
        { status: 'error', error: 'External checkout is not available in the Play Store app.' },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      amountUsd?: number;
      cycle?: string;
      returnTo?: string;
    };
    const amountUsd = Number(body.amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 5000) {
      return NextResponse.json({ status: 'error', error: 'Invalid donation amount' }, { status: 400 });
    }
    const cycle = body.cycle === 'monthly' || body.cycle === 'annual' ? body.cycle : 'one_time';

    // Best-effort — a donation still works for a signed-out visitor.
    let userId: string | null = null;
    let userEmail: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id || null;
      userEmail = user?.email || null;
    } catch {
      // Not signed in — fine.
    }

    const appUrl = getSiteUrl();
    const returnTo = body.returnTo && body.returnTo.startsWith('/') ? body.returnTo : '/';

    const session = await createSupportCheckout({
      amountUsd,
      cycle,
      userId,
      userEmail,
      successUrl: `${appUrl}${returnTo}${returnTo.includes('?') ? '&' : '?'}support=success`,
      cancelUrl: `${appUrl}${returnTo}${returnTo.includes('?') ? '&' : '?'}support=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const isPaddleError = error instanceof PaddleRequestError;
    const message = error instanceof Error ? error.message : 'Unknown checkout error';
    console.error('Support checkout session error:', {
      message,
      provider: isPaddleError ? 'paddle' : undefined,
      providerStatus: isPaddleError ? error.status : undefined,
    });
    const errorMessage =
      process.env.NODE_ENV === 'production'
        ? 'The checkout session could not be created.'
        : `The checkout session could not be created: ${message}`;
    return NextResponse.json({ status: 'error', error: errorMessage }, { status: 500 });
  }
}
