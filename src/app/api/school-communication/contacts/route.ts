import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSchoolContext } from '@/lib/school-erp/access';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const context = await getSchoolContext(supabase, user.id);
  if (!context) return NextResponse.json({ error: 'School membership required' }, { status: 403 });
  const db = supabase as any;
  const role = context.membership.member_role;

  const { data: members, error } = await db
    .from('school_memberships')
    .select('profile_id, member_role, profiles(id, full_name, avatar_url, email)')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');
  if (error) return NextResponse.json({ error: 'Contacts could not be loaded.' }, { status: 500 });

  const base = (members || []).filter((row: any) => row.profile_id !== user.id);
  let allowedIds = new Set(base.map((row: any) => row.profile_id));
  if (role === 'parent') {
    allowedIds = new Set(
      base
        .filter((row: any) => ['owner', 'admin', 'coordinator', 'teacher', 'staff', 'admissions'].includes(row.member_role))
        .map((row: any) => row.profile_id)
    );
    const { data: children } = await db
      .from('school_guardians')
      .select('student_id')
      .eq('organization_id', context.organization.id)
      .eq('guardian_id', user.id);
    for (const child of children || []) allowedIds.add(child.student_id);
  } else if (role === 'student') {
    allowedIds = new Set(
      base
        .filter((row: any) => ['owner', 'admin', 'coordinator', 'teacher', 'staff', 'student'].includes(row.member_role))
        .map((row: any) => row.profile_id)
    );
    const { data: guardians } = await db
      .from('school_guardians')
      .select('guardian_id')
      .eq('organization_id', context.organization.id)
      .eq('student_id', user.id);
    for (const guardian of guardians || []) allowedIds.add(guardian.guardian_id);
  }

  const contacts = base
    .filter((row: any) => allowedIds.has(row.profile_id))
    .map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.profile_id,
        name: profile?.full_name || 'School member',
        avatarUrl: profile?.avatar_url || null,
        email: profile?.email || null,
        role: row.member_role,
      };
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return NextResponse.json({ contacts, currentRole: role, organization: { id: context.organization.id, name: context.organization.name } });
}
