import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fired once per banner render, not awaited by the caller — a day-bucketed counter bump, never
// a per-view row, so this stays cheap even at high traffic. Public: guests render banners too.
export async function POST(req: NextRequest) {
  let bannerId: unknown;
  try {
    ({ bannerId } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (typeof bannerId !== 'string' || !UUID_RE.test(bannerId)) {
    return NextResponse.json({ error: 'Invalid bannerId.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  // Best-effort analytics — a deleted/unknown banner id just no-ops (FK violation error is
  // swallowed here), never surfaced to the caller since nothing downstream depends on this
  // succeeding. A network-level throw (not a Postgres error) is swallowed too, same reason.
  try {
    await supabase.rpc('increment_ad_impression', { p_banner_id: bannerId });
  } catch {
    // ignored — see comment above
  }


  return new NextResponse(null, { status: 204 });
}
