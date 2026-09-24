import { Metadata } from 'next';
import { DownloadsClient } from '@/components/features/offline/DownloadsClient';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import { redirect } from 'next/navigation';
import type { SubscriptionTier } from '@/types';

export const metadata: Metadata = { title: 'Downloads' };

export default async function DownloadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
  const settings = await getPlatformSettings();
  if (!getPlanFromSettings(settings, (profile?.subscription_tier as SubscriptionTier) || 'FREE').access.downloadPDF) {
    redirect('/subscription?feature=downloads');
  }
  return <DownloadsClient />;
}
