import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });
  const body = await req.json();
  const projectId = String(body.project_id || '').trim();
  if (!projectId) return NextResponse.json({ status: 'error', error: 'A project is required.' }, { status: 400 });
  const payload = {
    project_id: projectId,
    title: body.title || null,
    authors: body.authors || null,
    source_url: body.source_url || null,
    summary: body.summary || null,
    citation_apa: body.citation_apa || null,
    citation_mla: body.citation_mla || null,
  };
  const { data, error } = await db.from('research_sources').insert(payload).select('*').single();
  if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success', data });
}
