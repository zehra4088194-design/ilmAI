import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { buildStoreRedirectUrl } from '@/lib/ads/store-redirect';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Every house-ad banner links here first (never straight to ilmai.store): mints an unguessable
// click_id, logs the click, then 302s to ilmai.store with ?ref=<click_id> so a later conversion
// callback (POST /api/ads/conversion) can be attributed back to this click.
export async function GET(req: NextRequest, { params }: { params: Promise<{ bannerId: string }> }) {
  const { bannerId } = await params;
  if (!UUID_RE.test(bannerId)) {
    return NextResponse.json({ error: 'Invalid banner.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: banner } = await service.from('ad_banners').select('id, target_url').eq('id', bannerId).maybeSingle();
  if (!banner) return NextResponse.json({ error: 'Banner not found.' }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const clickId = `clk_${nanoid(24)}`;
  const { error } = await service.from('ad_clicks').insert({
    click_id: clickId,
    banner_id: banner.id,
    user_id: user?.id || null,
  });
  if (error) {
    return NextResponse.json({ error: 'Click could not be recorded.' }, { status: 500 });
  }

  return NextResponse.redirect(buildStoreRedirectUrl(banner.target_url, clickId), { status: 302 });
}
