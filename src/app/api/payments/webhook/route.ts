import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import type Stripe from 'stripe';

type SubscriptionTier = Database['public']['Enums']['subscription_tier'];

function resolveTier(value: unknown): SubscriptionTier | null {
  return value === 'FREE' || value === 'PRO' || value === 'ELITE' ? value : null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.userId;
      const tier = resolveTier(session.metadata?.tier);
      if (userId && tier) {
        await supabase.from('profiles').update({
          subscription_tier: tier,
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', userId);
        await supabase.from('subscriptions').upsert({
          user_id: userId, stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string, tier, status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        });
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await supabase.from('profiles').update({ subscription_tier: 'FREE' }).eq('id', userId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
