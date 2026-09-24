import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

// Lists the current user's saved guess papers (title + id only — the full
// result_json is fetched separately per-item via [id]/route.ts to keep this
// list call cheap). Every guess paper generated via /api/ai/guess-paper is
// already saved here (see saveGuessPaperHistory in that route) — this is
// purely a read/reload path, no new save logic needed.
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const admin = createServiceClient() as any;
    const { data, error } = await admin
      .from('guess_papers')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    return NextResponse.json({ status: 'success', data: { guessPapers: data || [] } });
  } catch (error) {
    console.error('Guess paper history route error:', error);
    return NextResponse.json({ status: 'error', error: 'Could not load saved guess papers.' }, { status: 500 });
  }
}
