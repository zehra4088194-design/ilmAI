import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';

export async function GET() {
  const adminUser = await requireAdminUser();
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const db = (await createAdminClient()) as any;
  const { data, error } = await db
    .from('institution_plan_inquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: `Inquiries load nahi hui: ${error.message}` }, { status: 500 });
  return NextResponse.json({ inquiries: data || [] });
}

export async function PATCH(req: NextRequest) {
  const adminUser = await requireAdminUser();
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, status } = (await req.json()) as { id?: string; status?: string };
  if (!id || !['new', 'contacted', 'closed'].includes(status || '')) {
    return NextResponse.json({ error: 'Valid inquiry id/status required hai' }, { status: 400 });
  }
  const db = (await createAdminClient()) as any;
  const { data, error } = await db
    .from('institution_plan_inquiries')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: `Status update nahi hui: ${error.message}` }, { status: 500 });
  return NextResponse.json({ inquiry: data });
}
