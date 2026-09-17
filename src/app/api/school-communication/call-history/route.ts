import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getSchoolContext } from '@/lib/school-erp/access';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const context = await getSchoolContext(supabase, user.id);
  if (!context) return NextResponse.json({ error: 'School membership required.' }, { status: 403 });
  const admin = await createAdminClient();
  const db = admin as any;
  let query = db
    .from('school_call_logs')
    .select('id, caller_id, callee_id, status, started_at, ended_at')
    .eq('organization_id', context.organization.id)
    .order('started_at', { ascending: false })
    .limit(100);
  if (!['owner', 'admin'].includes(context.membership.member_role)) {
    query = query.or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`);
  }
  const { data: logs } = await query;
  const ids = Array.from(new Set((logs || []).flatMap((row: any) => [row.caller_id, row.callee_id])));
  const { data: profiles } = ids.length ? await db.from('profiles').select('id, full_name, avatar_url').in('id', ids) : { data: [] };
  const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
  return NextResponse.json({ calls: (logs || []).map((row: any) => ({ ...row, caller: byId.get(row.caller_id) || null, callee: byId.get(row.callee_id) || null })) });
}
