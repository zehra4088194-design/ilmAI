import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { selectActiveBanner } from '@/lib/ads/queries';
import { isAdPlacement } from '@/lib/ads/constants';

export const runtime = 'nodejs';

// Public — <HouseAdBanner> calls this from both logged-out pages (library/past-papers/blog)
// and logged-in ones, so it must work without a session.
export async function GET(req: NextRequest) {
  const slot = req.nextUrl.searchParams.get('slot');
  if (!isAdPlacement(slot)) {
    return NextResponse.json({ error: 'Unknown ad placement.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let audience: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    audience = profile?.role || null;
  }

  const banner = await selectActiveBanner(slot, audience);
  if (!banner) return NextResponse.json({ banner: null });

  // Only the fields the banner needs to render — target_url stays server-side; the client
  // always links through /api/ads/click/[id] so a click_id can be minted before redirecting.
  return NextResponse.json({
    banner: {
      id: banner.id,
      title: banner.title,
      imageUrl: banner.imageUrl,
      clickHref: `/api/ads/click/${banner.id}`,
    },
  });
}
