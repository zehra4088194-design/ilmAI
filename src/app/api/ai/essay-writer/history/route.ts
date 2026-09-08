import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

// Lists the current user's saved essays (title + id only — the full essay
// text is fetched separately per-item via [id]/route.ts to keep this list
// call cheap). Every essay generated via /api/ai/essay-writer is already
// saved here (see saveEssayHistory in that route) — this is purely a
// read/reload path, no new save logic needed.
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const admin = createServiceClient() as any;
    const { data, error } = await admin
      .from('essays')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    return NextResponse.json({ status: 'success', data: { essays: data || [] } });
  } catch (error) {
    console.error('Essay history route error:', error);
    return NextResponse.json({ status: 'error', error: 'Could not load saved essays.' }, { status: 500 });
  }
}
