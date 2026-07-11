import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SubscriptionPlans } from '@/components/features/subscription/SubscriptionPlans';
import { getPaymentAvailability } from '@/lib/payments';
import { getPlatformSettings } from '@/lib/platform-settings/server';
export const metadata: Metadata = { title: 'Subscription' };

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('subscription_tier, subscription_expires_at').eq('id', user!.id).single();
  const paymentAvailability = getPaymentAvailability();
  const settings = await getPlatformSettings();
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Subscription</h1><p className="text-muted-foreground">Apna plan manage karo aur upgrade karo</p></div>
      <SubscriptionPlans currentTier={profile?.subscription_tier || 'FREE'} paymentAvailability={paymentAvailability} settings={settings} />
    </div>
  );
}
