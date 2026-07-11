import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ManualUpgradePage } from '@/components/features/subscription/ManualUpgradePage';
import { getPlatformSettings } from '@/lib/platform-settings/server';

export const metadata: Metadata = { title: 'Upgrade Plan' };

export default async function UpgradePlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ tier: string }>;
  searchParams: Promise<{ billing?: string }>;
}) {
  const { tier } = await params;
  const { billing } = await searchParams;
  const normalized = tier.toUpperCase();
  if (normalized !== 'PRO' && normalized !== 'ELITE') notFound();
  const settings = await getPlatformSettings();
  return <ManualUpgradePage tier={normalized} billing={billing === 'annual' ? 'annual' : 'monthly'} settings={settings} />;
}
