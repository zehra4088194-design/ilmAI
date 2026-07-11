import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getPlanFromSettings } from '@/lib/platform-settings/shared';
import type { SubscriptionTier } from '@/types';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Login required hai' }, { status: 401 });
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
  const tier = ((profile as any)?.subscription_tier as SubscriptionTier) || 'FREE';
  const settings = await getPlatformSettings();
  const plan = getPlanFromSettings(settings, tier);
  if (!plan.access.downloadPDF) {
    return NextResponse.json({ status: 'error', error: 'Downloads is plan mein locked hain. In-app reader use karo.' }, { status: 403 });
  }
  const body = await req.json();
  const resourceType = String(body.resource_type || 'note');
  const resourceId = String(body.resource_id || '').trim();
  if (!resourceId) return NextResponse.json({ status: 'error', error: 'Resource id required hai.' }, { status: 400 });
  const { error } = await db.from('offline_download_log').insert({
    student_id: user.id,
    resource_type: resourceType,
    resource_id: resourceId,
    device_hint: body.device_hint || null,
  });
  if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success' });
}
