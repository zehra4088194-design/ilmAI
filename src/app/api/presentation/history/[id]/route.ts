import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

// Loads one saved presentation's full deck (slides, theme, background image
// URLs) so the builder can reopen it exactly as generated. Background images
// keep resolving from B2 automatically — deck_json stores the same
// /api/presentation/backgrounds/<name> URLs the live generator used, and that
// proxy route reads straight from B2, so nothing extra is needed for those to
// keep working on reload.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const admin = createServiceClient() as any;
    const { data, error } = await admin
      .from('presentations')
      .select('id, title, deck_json, created_at, user_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.user_id !== user.id) {
      return NextResponse.json({ status: 'error', error: 'Presentation not found.' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'success',
      data: { id: data.id, title: data.title, deck: data.deck_json, createdAt: data.created_at },
    });
  } catch (error) {
    console.error('Presentation history item route error:', error);
    return NextResponse.json({ status: 'error', error: 'Could not load this presentation.' }, { status: 500 });
  }
}
