import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

// Loads one saved full test's full paper so it can be reopened (viewed/retaken) exactly as generated.
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
      .from('full_tests')
      .select('id, title, paper_json, created_at, user_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.user_id !== user.id) {
      return NextResponse.json({ status: 'error', error: 'Test not found.' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'success',
      data: { id: data.id, title: data.title, paper: data.paper_json, createdAt: data.created_at },
    });
  } catch (error) {
    console.error('Full test history item route error:', error);
    return NextResponse.json({ status: 'error', error: 'Could not load this test.' }, { status: 500 });
  }
}
