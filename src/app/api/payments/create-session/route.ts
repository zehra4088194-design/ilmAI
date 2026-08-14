import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPaymentAvailability,
  getPaymentProvider,
  isPaymentRegionConfigured,
  PaddleRequestError,
  type PaymentRegion,
} from '@/lib/payments';
import { getSiteUrl } from '@/lib/utils/siteUrl';

export async function POST(req: NextRequest) {
  let checkoutContext: { tier?: string; billingCycle?: string; region?: PaymentRegion } = {};

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    }

    if (getPaymentAvailability(req.headers).consumptionOnly) {
      return NextResponse.json(
        { status: 'consumption_only', error: 'External checkout is not available in the Play Store app.' },
        { status: 403 }
      );
    }

    const { data: activeSubscriptions, error: subscriptionError } = await (supabase.from('subscriptions') as any)
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .gt('current_period_end', new Date().toISOString())
      .limit(1);
    if (subscriptionError) {
      throw new Error(`Subscription lookup failed: ${subscriptionError.message}`);
    }
    if (activeSubscriptions?.length) {
      return NextResponse.json(
        {
          status: 'active_subscription',
          error:
            'A paid plan is already active. Contact support to change plans and avoid duplicate billing.',
        },
        { status: 409 }
      );
    }

    const body = (await req.json()) as {
      tier: 'PRO' | 'ELITE';
      billingCycle?: 'monthly' | 'annual';
      provider?: 'paddle' | 'paypro';
    };
    const { tier } = body;
    const billingCycle = body.billingCycle === 'annual' ? 'annual' : body.billingCycle === 'monthly' ? 'monthly' : null;
    // PayPro currently does not support automatic recurring subscriptions for
    // the local wallet flow. Keep automated checkout on Paddle; Easypaisa and
    // JazzCash remain manual verification flows from the upgrade page.
    const region: PaymentRegion = 'GLOBAL';
    const currency = 'USD';
    checkoutContext = { tier, billingCycle: billingCycle || undefined, region };

    if (tier !== 'PRO' && tier !== 'ELITE') {
      return NextResponse.json({ status: 'error', error: 'Invalid plan selected' }, { status: 400 });
    }
    if (!billingCycle) {
      return NextResponse.json({ status: 'error', error: 'Invalid billing cycle selected' }, { status: 400 });
    }
    if (!isPaymentRegionConfigured(region, req.headers)) {
      return NextResponse.json(
        {
          status: 'checkout_unavailable',
          error: 'Paddle checkout is not configured yet.',
        },
        { status: 400 }
      );
    }

    const provider = getPaymentProvider(region);
    const appUrl = getSiteUrl();

    const session = await provider.createCheckout({
      userId: user.id,
      userEmail: user.email || '',
      tier,
      billingCycle,
      region,
      currency,
      successUrl: `${appUrl}/subscription?success=true`,
      cancelUrl: `${appUrl}/subscription?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const isPaddleError = error instanceof PaddleRequestError;
    const message = error instanceof Error ? error.message : 'Unknown checkout error';
    console.error('Checkout session error:', {
      message,
      ...checkoutContext,
      provider: isPaddleError ? 'paddle' : undefined,
      providerStatus: isPaddleError ? error.status : undefined,
      providerRequestId: isPaddleError ? error.requestId : undefined,
    });

    const errorMessage =
      process.env.NODE_ENV === 'production'
        ? 'The checkout session could not be created.'
        : `The checkout session could not be created: ${message}`;

    return NextResponse.json({ status: 'error', error: errorMessage }, { status: 500 });
  }
}
