import { createAdminClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

function normalizeTier(value: unknown): SubscriptionTier {
  return value === 'PRO' || value === 'ELITE' ? value : 'FREE';
}

export async function getParentLinkAccess(linkId: string, userId: string) {
  const admin = await createAdminClient();
  const { data: link } = await admin
    .from('parent_student_links')
    .select('id, parent_id, student_id, status')
    .eq('id', linkId)
    .maybeSingle();
  if (
    !link ||
    link.status !== 'approved' ||
    !link.student_id ||
    (link.parent_id !== userId && link.student_id !== userId)
  ) {
    return null;
  }

  const { data: student } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', link.student_id)
    .maybeSingle();
  const tier = normalizeTier(student?.subscription_tier);
  const settings = await getPlatformSettings();
  return { admin, link, tier, plan: getPlanFromSettings(settings, tier) };
}
