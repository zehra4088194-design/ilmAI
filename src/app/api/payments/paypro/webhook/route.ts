import { NextRequest, NextResponse } from 'next/server';
import { getPaymentProviderById } from '@/lib/payments';
import { createAdminClient } from '@/lib/supabase/server';

// TODO: Once PayPro is fully configured, handle these event types:
//   - order.completed        -> activate subscription, set profiles.subscription_tier
//   - subscription.canceled  -> downgrade profiles.subscription_tier to 'FREE'
//   - subscription.renewed   -> sync tier/period dates into `subscriptions` table
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('paypro-signature');

  const provider = getPaymentProviderById('paypro');
  const result = await provider.verifyWebhook(rawBody, signature);

  if (!result.valid) {
    // Not configured yet / invalid signature — accept the request without
    // erroring so PayPro doesn't disable the endpoint, but do nothing.
    console.warn('[paypro webhook] not verified (provider not configured yet)');
    return NextResponse.json({ received: true, processed: false });
  }

  // TODO: use `result.eventType` and `result.payload` to update Supabase, e.g.:
  // const supabase = await createAdminClient();
  // switch (result.eventType) { ... }

  return NextResponse.json({ received: true });
}
