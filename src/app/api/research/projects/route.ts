import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });
  const { data, error } = await db.from('research_projects').select('*').eq('student_id', user.id).order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success', data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });
  const body = await req.json();
  const title = String(body.title || '').trim();
  const topic = String(body.topic || '').trim();
  if (!title) return NextResponse.json({ status: 'error', error: 'A project title is required.' }, { status: 400 });
  const { data, error } = await db.from('research_projects').insert({ student_id: user.id, title, topic }).select('*').single();
  if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'success', data });
}
