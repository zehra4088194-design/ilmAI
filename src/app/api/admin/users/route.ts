import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';

// GET /api/admin/users?q=search-email-name-or-username
export async function GET(req: NextRequest) {
  const admin = await requireAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const q = req.nextUrl.searchParams.get('q')?.trim() || '';
  const safeQuery = q.replace(/[,%()]/g, ' ');
  let adminClient;
  try {
    adminClient = await createAdminClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Supabase admin client missing' },
      { status: 500 }
    );
  }

  let query = adminClient
    .from('profiles')
    .select(
      'id, full_name, email, username, role, sponsored_institution_name, sponsored_institution_type, subscription_tier, subscription_expires_at, xp, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (safeQuery) {
    query = query.or(
      `email.ilike.%${safeQuery}%,full_name.ilike.%${safeQuery}%,username.ilike.%${safeQuery}%,sponsored_institution_name.ilike.%${safeQuery}%,academic_institution_name.ilike.%${safeQuery}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: `Users could not be loaded: ${error.message}` }, { status: 500 });
  }

  const users = (data || []) as any[];
  const userIds = users.map((user) => user.id);
  const db = adminClient as any;

  const [schoolMemberships, collegeMemberships, schoolEnrollments, collegeEnrollments, schoolGuardians, collegeGuardians] = await Promise.all([
    userIds.length
      ? db
          .from('school_memberships')
          .select('profile_id, organization_id, school_organizations(name)')
          .in('profile_id', userIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
    userIds.length
      ? db
          .from('college_memberships')
          .select('profile_id, organization_id, college_organizations(name)')
          .in('profile_id', userIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
    userIds.length
      ? db
          .from('school_enrollments')
          .select('student_id, organization_id, school_organizations(name)')
          .in('student_id', userIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
    userIds.length
      ? db
          .from('college_enrollments')
          .select('student_id, organization_id, college_organizations(name)')
          .in('student_id', userIds)
          .eq('status', 'active')
      : Promise.resolve({ data: [] }),
    userIds.length
      ? db
          .from('school_guardians')
          .select('guardian_id, student_id, organization_id, school_organizations(name)')
          .in('guardian_id', userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? db
          .from('college_guardians')
          .select('guardian_id, student_id, organization_id, college_organizations(name)')
          .in('guardian_id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const schoolRows = (schoolMemberships.data || []) as any[];
  const collegeRows = (collegeMemberships.data || []) as any[];
  const schoolEnrollmentRows = (schoolEnrollments.data || []) as any[];
  const collegeEnrollmentRows = (collegeEnrollments.data || []) as any[];
  const schoolGuardianRows = (schoolGuardians.data || []) as any[];
  const collegeGuardianRows = (collegeGuardians.data || []) as any[];

  const addInstitution = (map: Map<string, string[]>, userId: string, name: unknown) => {
    const normalized = typeof name === 'string' ? name.trim() : '';
    if (!normalized) return;
    const current = map.get(userId) || [];
    if (!current.includes(normalized)) current.push(normalized);
    map.set(userId, current);
  };

  const institutionByUser = new Map<string, string[]>();
  for (const row of schoolRows) addInstitution(institutionByUser, row.profile_id, row.school_organizations?.name);
  for (const row of collegeRows) addInstitution(institutionByUser, row.profile_id, row.college_organizations?.name);
  for (const row of schoolEnrollmentRows) addInstitution(institutionByUser, row.student_id, row.school_organizations?.name);
  for (const row of collegeEnrollmentRows) addInstitution(institutionByUser, row.student_id, row.college_organizations?.name);
  for (const row of schoolGuardianRows) addInstitution(institutionByUser, row.guardian_id, row.school_organizations?.name);
  for (const row of collegeGuardianRows) addInstitution(institutionByUser, row.guardian_id, row.college_organizations?.name);

  const enrichedUsers = users.map((user) => ({
    ...user,
    institution_names: institutionByUser.get(user.id) || [],
    institution_display:
      (institutionByUser.get(user.id) || []).length > 0
        ? (institutionByUser.get(user.id) || []).join(' · ')
        : 'Independent (no institution)',
  }));

  return NextResponse.json({ users: enrichedUsers });
}
