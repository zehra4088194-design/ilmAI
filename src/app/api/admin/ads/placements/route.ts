import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/service';
import { AD_PLACEMENTS, isAdPlacement } from '@/lib/ads/constants';

export const runtime = 'nodejs';

// A placement with no row is enabled by default — see isPlacementEnabled in lib/ads/queries.ts.
export async function GET() {
  if (!(await requireAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createServiceClient();
  const { data } = await supabase.from('ad_placement_settings').select('placement, is_enabled');
  const rows = (data || []) as { placement: string; is_enabled: boolean }[];
  const enabledByPlacement = new Map(rows.map((row) => [row.placement, row.is_enabled]));

  return NextResponse.json({
    placements: AD_PLACEMENTS.map((placement) => ({
      placement,
      isEnabled: enabledByPlacement.has(placement) ? enabledByPlacement.get(placement) !== false : true,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { placement?: unknown; isEnabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!isAdPlacement(body.placement)) {
    return NextResponse.json({ error: `Placement must be one of: ${AD_PLACEMENTS.join(', ')}.` }, { status: 400 });
  }
  if (typeof body.isEnabled !== 'boolean') {
    return NextResponse.json({ error: 'isEnabled must be a boolean.' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('ad_placement_settings')
    .upsert(
      { placement: body.placement, is_enabled: body.isEnabled, updated_at: new Date().toISOString() },
      { onConflict: 'placement' }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
