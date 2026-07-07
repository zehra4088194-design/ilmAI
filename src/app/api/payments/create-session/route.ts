import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPaymentProvider, type PaymentRegion } from '@/lib/payments';
import { getCurrencyForBoard } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });
    }

    const { tier, billingCycle, region } = (await req.json()) as {
      tier: 'PRO' | 'ELITE';
      billingCycle?: 'monthly' | 'annual';
      region: PaymentRegion;
    };

    if (tier !== 'PRO' && tier !== 'ELITE') {
      return NextResponse.json({ status: 'error', error: 'Invalid plan selected' }, { status: 400 });
    }
    if (region !== 'INTERNATIONAL' && region !== 'PAKISTAN') {
      return NextResponse.json({ status: 'error', error: 'Invalid payment region' }, { status: 400 });
    }

    // Currency is resolved server-side from the user's own profile — never
    // trusted from the client — same board->country logic the pricing page
    // uses for anonymous visitors (see lib/constants.ts).
    const { data: profile } = await supabase.from('profiles').select('board').eq('id', user.id).single();
    const currency = getCurrencyForBoard(profile?.board);

    const provider = getPaymentProvider(region);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

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
