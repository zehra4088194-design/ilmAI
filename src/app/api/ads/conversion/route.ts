import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

// Called BY ilmai.store's server (not by any browser) once an order tied to a ?ref=<click_id>
// completes. Same bearer-secret convention as every /api/cron/* route in this app, just with its
// own secret since this is a cross-app caller rather than our own scheduler.
function isAuthorized(req: NextRequest) {
  const secret = process.env.AD_TRACKING_SECRET;
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { click_id?: unknown; order_id?: unknown; order_value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const clickId = typeof body.click_id === 'string' ? body.click_id.trim() : '';
  if (!clickId) return NextResponse.json({ error: 'click_id is required.' }, { status: 400 });

  const orderId = typeof body.order_id === 'string' ? body.order_id.trim().slice(0, 200) || null : null;
  const orderValue =
    typeof body.order_value === 'number' && Number.isFinite(body.order_value) ? body.order_value : null;

  const supabase = createServiceClient();
  const { data: click, error: lookupError } = await supabase
    .from('ad_clicks')
    .select('id, converted')
    .eq('click_id', clickId)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 });
  // Expired/invalid click_id — a clean 404, not a thrown error, since ilmai.store may legitimately
  // call this for a ref it generated against a since-deleted or never-tracked click.
  if (!click) return NextResponse.json({ error: 'Unknown click_id.' }, { status: 404 });

  // Idempotent: a retried callback for an already-converted click just acknowledges success
  // rather than double-counting the order.
  if (click.converted) return NextResponse.json({ success: true, alreadyConverted: true });

  const { error: updateError } = await supabase
    .from('ad_clicks')
    .update({
      converted: true,
      order_value: orderValue,
      converted_at: new Date().toISOString(),
      order_id: orderId,
    })
    .eq('id', click.id);
  if (updateError) return NextResponse.json({ error: 'Conversion could not be recorded.' }, { status: 500 });

  return NextResponse.json({ success: true });
}
