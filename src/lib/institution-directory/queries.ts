import type { SupabaseClient } from '@supabase/supabase-js';

export type InstitutionDirectoryMessage = {
  id: string;
  direction: 'received' | 'sent';
  counterpartName: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
};

/**
 * Sent + received cross-institution messages for one org, resolving the "other side"'s name via a
 * second lookup (sender_organization_id/recipient_organization_id aren't real FKs — see the
 * migration's header comment for why — so PostgREST can't embed them automatically).
 */
export async function getInstitutionDirectoryMessages(
  supabase: SupabaseClient,
  institutionType: 'school' | 'college',
  organizationId: string
): Promise<InstitutionDirectoryMessage[]> {
  const db = supabase as any;
  const { data, error } = await db
    .from('institution_directory_messages')
    .select('*')
    .or(
      `and(sender_institution_type.eq.${institutionType},sender_organization_id.eq.${organizationId}),and(recipient_institution_type.eq.${institutionType},recipient_organization_id.eq.${organizationId})`
    )
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const rows = data || [];
  if (!rows.length) return [];

  const schoolIds = new Set<string>();
  const collegeIds = new Set<string>();
  for (const row of rows) {
    const isSender = row.sender_institution_type === institutionType && row.sender_organization_id === organizationId;
    const otherType = isSender ? row.recipient_institution_type : row.sender_institution_type;
    const otherId = isSender ? row.recipient_organization_id : row.sender_organization_id;
    if (otherType === 'school') schoolIds.add(otherId);
    else collegeIds.add(otherId);
  }

  const [schoolNames, collegeNames] = await Promise.all([
    schoolIds.size
      ? db.from('school_organizations').select('id, name').in('id', Array.from(schoolIds))
      : Promise.resolve({ data: [] }),
    collegeIds.size
      ? db.from('college_organizations').select('id, name').in('id', Array.from(collegeIds))
      : Promise.resolve({ data: [] }),
  ]);
  const nameById = new Map<string, string>();
  for (const row of schoolNames.data || []) nameById.set(`school:${row.id}`, row.name);
  for (const row of collegeNames.data || []) nameById.set(`college:${row.id}`, row.name);

  return rows.map((row: any) => {
    const isSender = row.sender_institution_type === institutionType && row.sender_organization_id === organizationId;
    const otherType = isSender ? row.recipient_institution_type : row.sender_institution_type;
    const otherId = isSender ? row.recipient_organization_id : row.sender_organization_id;
    return {
      id: row.id,
      direction: isSender ? 'sent' : 'received',
      counterpartName: nameById.get(`${otherType}:${otherId}`) || 'Unknown institution',
      subject: row.subject,
      body: row.body,
      status: row.status,
      createdAt: row.created_at,
    };
  });
}
