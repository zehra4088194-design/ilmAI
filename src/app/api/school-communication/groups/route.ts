import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getSchoolContext } from '@/lib/school-erp/access';

async function ensureClassGroups(adminDb: any, organizationId: string, createdBy: string) {
  const [{ data: sections }, { data: enrollments }, { data: staff }] = await Promise.all([
    adminDb
      .from('school_sections')
      .select('id, name, class_id, school_classes(name)')
      .eq('organization_id', organizationId),
    adminDb
      .from('school_enrollments')
      .select('student_id, section_id')
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
    adminDb
      .from('school_memberships')
      .select('profile_id, member_role')
      .eq('organization_id', organizationId)
      .eq('status', 'active'),
  ]);

  const principalIds = (staff || [])
    .filter((row: any) => ['owner', 'admin'].includes(row.member_role))
    .map((row: any) => row.profile_id);
  const staffById = new Map((staff || []).map((row: any) => [row.profile_id, row.member_role]));
  const enrollmentBySection = new Map<string, string[]>();
  for (const row of enrollments || []) {
    if (!row.section_id || !row.student_id) continue;
    const list = enrollmentBySection.get(row.section_id) || [];
    list.push(row.student_id);
    enrollmentBySection.set(row.section_id, list);
  }

  for (const section of sections || []) {
    const klass = Array.isArray(section.school_classes) ? section.school_classes[0] : section.school_classes;
    const name = [klass?.name, section.name].filter(Boolean).join(' - ') || 'Class group';
    const { data: existing } = await adminDb
      .from('school_communication_groups')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('group_type', 'class')
      .eq('section_id', section.id)
      .maybeSingle();

    let groupId = existing?.id;
    if (!groupId) {
      const { data: created, error } = await adminDb
        .from('school_communication_groups')
        .insert({
          organization_id: organizationId,
          name,
          group_type: 'class',
          section_id: section.id,
          created_by: createdBy,
        })
        .select('id')
        .single();
      if (error) continue;
      groupId = created.id;
    }

    const memberIds = new Set<string>([...(enrollmentBySection.get(section.id) || []), ...principalIds]);
    const { data: homeroom } = await adminDb
      .from('school_sections')
      .select('homeroom_teacher_id')
      .eq('id', section.id)
      .maybeSingle();
    if (homeroom?.homeroom_teacher_id) memberIds.add(homeroom.homeroom_teacher_id);

    const rows = Array.from(memberIds)
      .filter((profileId) => profileId && (staffById.has(profileId) || enrollmentBySection.get(section.id)?.includes(profileId)))
      .map((profileId) => ({
        group_id: groupId,
        profile_id: profileId,
        member_role: principalIds.includes(profileId) ? 'admin' : 'member',
      }));
    if (rows.length) {
      await adminDb.from('school_communication_group_members').upsert(rows, { onConflict: 'group_id,profile_id' });
    }
  }
}

async function getVisibleGroups(adminDb: any, organizationId: string, userId: string) {
  const { data: memberships } = await adminDb
    .from('school_communication_group_members')
    .select('group_id')
    .eq('profile_id', userId);
  const ids = (memberships || []).map((row: any) => row.group_id);
  if (!ids.length) return [];
  const { data: groups } = await adminDb
    .from('school_communication_groups')
    .select('id, organization_id, name, group_type, section_id, created_by, created_at, updated_at')
    .eq('organization_id', organizationId)
    .in('id', ids)
    .order('group_type', { ascending: true })
    .order('name', { ascending: true });
  return groups || [];
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const context = await getSchoolContext(supabase, user.id);
  if (!context) return NextResponse.json({ error: 'School membership required.' }, { status: 403 });
  const admin = await createAdminClient();
  const adminDb = admin as any;
  await ensureClassGroups(adminDb, context.organization.id, context.userId);
  const groups = await getVisibleGroups(adminDb, context.organization.id, context.userId);
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });
  const context = await getSchoolContext(supabase, user.id);
  if (!context) return NextResponse.json({ error: 'School membership required.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 100);
  const requestedMemberIds = Array.isArray(body.memberIds) ? body.memberIds.map(String) : [];
  if (name.length < 2) return NextResponse.json({ error: 'Group name is required.' }, { status: 400 });

  const db = supabase as any;
  const { data: members } = await db
    .from('school_memberships')
    .select('profile_id')
    .eq('organization_id', context.organization.id)
    .eq('status', 'active');
  const activeIds = new Set((members || []).map((row: any) => row.profile_id));
  const memberIds = Array.from(new Set([user.id, ...requestedMemberIds])).filter((id) => activeIds.has(id));

  const admin = await createAdminClient();
  const adminDb = admin as any;
  const { data: group, error } = await adminDb
    .from('school_communication_groups')
    .insert({
      organization_id: context.organization.id,
      name,
      group_type: 'custom',
      created_by: user.id,
    })
    .select('id, organization_id, name, group_type, section_id, created_by, created_at, updated_at')
    .single();
  if (error) return NextResponse.json({ error: error.message || 'Group could not be created.' }, { status: 500 });

  await adminDb.from('school_communication_group_members').insert(
    memberIds.map((profileId) => ({ group_id: group.id, profile_id: profileId, member_role: profileId === user.id ? 'admin' : 'member' }))
  );
  return NextResponse.json({ group });
}
