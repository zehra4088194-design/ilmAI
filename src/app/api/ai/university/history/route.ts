import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

const UNIVERSITY_TOOLS = new Set(['essay', 'assignment', 'presentation', 'viva', 'research', 'planner']);

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ status: 'error', error: 'Login required' }, { status: 401 });

    const id = req.nextUrl.searchParams.get('id');
    const tool = req.nextUrl.searchParams.get('tool');
    const admin = createServiceClient() as any;

    if (id) {
      const { data, error } = await admin
        .from('university_work_history')
        .select('id, user_id, tool, title, input_json, result_json, created_at')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ status: 'error', error: 'Saved work not found.' }, { status: 404 });
      return NextResponse.json({
        status: 'success',
        data: { id: data.id, tool: data.tool, title: data.title, input: data.input_json, result: data.result_json },
      });
    }

    if (!tool || !UNIVERSITY_TOOLS.has(tool)) {
      return NextResponse.json({ status: 'error', error: 'A valid university tool is required.' }, { status: 400 });
    }
    const { data, error } = await admin
      .from('university_work_history')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .eq('tool', tool)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ status: 'success', data: { works: data || [] } });
  } catch (error) {
    console.error('University work history route error:', error);
    return NextResponse.json({ status: 'error', error: 'Could not load saved university work.' }, { status: 500 });
  }
}
