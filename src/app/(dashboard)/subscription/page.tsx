import { Metadata } from 'next';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionPlans } from '@/components/features/subscription/SubscriptionPlans';
import { getPaymentAvailability } from '@/lib/payments';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getCurrencyForBoard, getCurrencyForCountry } from '@/lib/constants';
export const metadata: Metadata = { title: 'Subscription' };

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_expires_at, board')
    .eq('id', user!.id)
    .single();
  const requestHeaders = await headers();
  const paymentAvailability = getPaymentAvailability(requestHeaders);
  const requestCountry = requestHeaders.get('cf-ipcountry') || requestHeaders.get('x-country-code');
  const currency = profile?.board ? getCurrencyForBoard(profile.board) : getCurrencyForCountry(requestCountry || 'PK');
  const settings = await getPlatformSettings();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground">Manage your plan and upgrade your account.</p>
      </div>
      <SubscriptionPlans
        currentTier={profile?.subscription_tier || 'FREE'}
        paymentAvailability={paymentAvailability}
        currency={currency}
        settings={settings}
      />
    </div>
  );
}
