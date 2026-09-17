import { createAdminClient } from '@/lib/supabase/server';

export async function ensureSchoolClassGroup(organizationId: string, sectionId: string, createdBy: string) {
  const admin = await createAdminClient();
  const db = admin as any;
  const { data: section } = await db.from('school_sections').select('id, name, school_classes(name)').eq('id', sectionId).eq('organization_id', organizationId).maybeSingle();
  if (!section) return null;
  const klass = Array.isArray(section.school_classes) ? section.school_classes[0] : section.school_classes;
  const name = [klass?.name, section.name].filter(Boolean).join(' - ') || 'Class group';
  let { data: group } = await db.from('school_communication_groups').select('id').eq('organization_id', organizationId).eq('group_type', 'class').eq('section_id', sectionId).maybeSingle();
  if (!group) {
    const created = await db.from('school_communication_groups').insert({ organization_id: organizationId, name, group_type: 'class', section_id: sectionId, created_by: createdBy }).select('id').single();
    group = created.data;
    if (created.error) return null;
  } else if (group) {
    await db.from('school_communication_groups').update({ name, updated_at: new Date().toISOString() }).eq('id', group.id);
  }

  const [{ data: enrollments }, { data: members }, { data: homeroom }] = await Promise.all([
    db.from('school_enrollments').select('student_id').eq('organization_id', organizationId).eq('section_id', sectionId).eq('status', 'active'),
    db.from('school_memberships').select('profile_id, member_role').eq('organization_id', organizationId).eq('status', 'active'),
    db.from('school_sections').select('homeroom_teacher_id').eq('id', sectionId).maybeSingle(),
  ]);
  const ids = new Set<string>((enrollments || []).map((r: any) => r.student_id).filter(Boolean));
  for (const row of members || []) if (['owner','admin'].includes(row.member_role)) ids.add(row.profile_id);
  if (homeroom?.homeroom_teacher_id) ids.add(homeroom.homeroom_teacher_id);
  const rows = [...ids].map((profileId) => ({ group_id: group.id, profile_id: profileId, member_role: ['owner','admin'].includes((members || []).find((m: any) => m.profile_id === profileId)?.member_role) ? 'admin' : 'member' }));
  if (rows.length) await db.from('school_communication_group_members').upsert(rows, { onConflict: 'group_id,profile_id' });
  return group.id;
}
