import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getPaymentAvailability,
  getPaymentProvider,
  isPaymentRegionConfigured,
  type PaymentRegion,
} from '@/lib/payments';
import { getSiteUrl } from '@/lib/utils/siteUrl';

export async function POST(req: NextRequest) {
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
        { status: 'consumption_only', error: 'Play Store app mein external checkout available nahi hai.' },
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
            'Aap ka paid plan pehle se active hai. Duplicate billing se bachne ke liye plan change support se karein.',
        },
        { status: 409 }
      );
    }

    const body = (await req.json()) as {
      tier: 'PRO' | 'ELITE';
      billingCycle?: 'monthly' | 'annual';
      provider?: 'paddle' | 'paypro';
    };
    const { tier, billingCycle } = body;
    const providerId = body.provider === 'paypro' ? 'paypro' : 'paddle';
    const region: PaymentRegion = providerId === 'paypro' ? 'PK' : 'GLOBAL';
    const currency = providerId === 'paypro' ? 'PKR' : 'USD';

    if (tier !== 'PRO' && tier !== 'ELITE') {
      return NextResponse.json({ status: 'error', error: 'Invalid plan selected' }, { status: 400 });
    }
    if (!isPaymentRegionConfigured(region, req.headers)) {
      const providerLabel = providerId === 'paypro' ? 'PayPro' : 'Paddle';
      return NextResponse.json(
        {
          status: 'checkout_unavailable',
          error: `${providerLabel} checkout abhi configure nahi hua.`,
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
      billingCycle: billingCycle || 'monthly',
      region,
      currency,
      successUrl: `${appUrl}/subscription?success=true`,
      cancelUrl: `${appUrl}/subscription?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session error:', error);
    return NextResponse.json({ status: 'error', error: 'Checkout session create nahi hua' }, { status: 500 });
  }
}
