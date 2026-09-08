import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

// Loads one saved guess paper's full result so it can be reopened exactly as generated.
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
      .from('guess_papers')
      .select('id, title, result_json, created_at, user_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.user_id !== user.id) {
      return NextResponse.json({ status: 'error', error: 'Guess paper not found.' }, { status: 404 });
    }

    return NextResponse.json({
      status: 'success',
      data: { id: data.id, title: data.title, result: data.result_json, createdAt: data.created_at },
    });
  } catch (error) {
    console.error('Guess paper history item route error:', error);
    return NextResponse.json({ status: 'error', error: 'Could not load this guess paper.' }, { status: 500 });
  }
}
