import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { selectEffectiveSubscription, type SubscriptionAccessCandidate } from '@/lib/payments/subscription-access';

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
    .limit(200);

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

  const [
    schoolMemberships,
    collegeMemberships,
    schoolEnrollments,
    collegeEnrollments,
    schoolGuardians,
    collegeGuardians,
    parentStudentLinks,
    subscriptionRows,
  ] = await Promise.all([
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
    userIds.length
      ? db.from('parent_student_links').select('parent_id, student_id, status').in('parent_id', userIds).eq('status', 'approved')
      : Promise.resolve({ data: [] }),
    userIds.length
      ? db
          .from('subscriptions')
          .select('user_id, tier, status, provider, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at, provider_subscription_id')
          .in('user_id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const schoolRows = (schoolMemberships.data || []) as any[];
  const collegeRows = (collegeMemberships.data || []) as any[];
  const schoolEnrollmentRows = (schoolEnrollments.data || []) as any[];
  const collegeEnrollmentRows = (collegeEnrollments.data || []) as any[];
  const schoolGuardianRows = (schoolGuardians.data || []) as any[];
  const collegeGuardianRows = (collegeGuardians.data || []) as any[];
  const parentStudentLinkRows = (parentStudentLinks.data || []) as any[];
  const allSubscriptions = (subscriptionRows.data || []) as any[];

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

  const schoolEnrollmentByStudent = new Map<string, string[]>();
  const collegeEnrollmentByStudent = new Map<string, string[]>();
  for (const row of schoolEnrollmentRows) {
    const name = row.school_organizations?.name;
    if (typeof name === 'string' && name.trim()) {
      const list = schoolEnrollmentByStudent.get(row.student_id) || [];
      if (!list.includes(name.trim())) list.push(name.trim());
      schoolEnrollmentByStudent.set(row.student_id, list);
    }
  }
  for (const row of collegeEnrollmentRows) {
    const name = row.college_organizations?.name;
    if (typeof name === 'string' && name.trim()) {
      const list = collegeEnrollmentByStudent.get(row.student_id) || [];
      if (!list.includes(name.trim())) list.push(name.trim());
      collegeEnrollmentByStudent.set(row.student_id, list);
    }
  }
  for (const row of parentStudentLinkRows) {
    for (const name of schoolEnrollmentByStudent.get(row.student_id) || []) addInstitution(institutionByUser, row.parent_id, name);
    for (const name of collegeEnrollmentByStudent.get(row.student_id) || []) addInstitution(institutionByUser, row.parent_id, name);
  }

  const subscriptionsByUser = new Map<string, any[]>();
  for (const row of allSubscriptions) {
    const list = subscriptionsByUser.get(row.user_id) || [];
    list.push(row);
    subscriptionsByUser.set(row.user_id, list);
  }

  const toCandidate = (row: any): SubscriptionAccessCandidate => ({
    tier: row.tier,
    status: row.status,
    current_period_end: row.current_period_end,
  });

  const sortSubscriptions = (rows: any[]) =>
    [...rows].sort((a, b) => {
      const aTime = new Date(a.created_at || a.current_period_start || 0).getTime();
      const bTime = new Date(b.created_at || b.current_period_start || 0).getTime();
      return bTime - aTime;
    });

  const enrichedUsers = users.map((user) => {
    const userSubscriptions = sortSubscriptions(subscriptionsByUser.get(user.id) || []);
    const latestSubscription = userSubscriptions[0] || null;
    const effectiveFromSubscriptions = userSubscriptions.length
      ? selectEffectiveSubscription(userSubscriptions.map(toCandidate))
      : null;

    // Parent-role plans historically use profiles.subscription_tier without a row in
    // subscriptions. Keep that legacy path as a fallback only when there is no subscription
    // record at all; any real subscription row is evaluated by its actual period/status.
    const fallbackTier =
      user.subscription_tier === 'PRO' || user.subscription_tier === 'ELITE' ? user.subscription_tier : 'FREE';
    const effectiveTier = effectiveFromSubscriptions?.tier || fallbackTier;
    const effectiveExpiry = effectiveFromSubscriptions?.expiresAt || (effectiveFromSubscriptions ? null : user.subscription_expires_at);
    const effectiveCandidate =
      effectiveFromSubscriptions && effectiveFromSubscriptions.tier !== 'FREE'
        ? userSubscriptions.find(
            (row) =>
              row.tier === effectiveFromSubscriptions.tier &&
              row.current_period_end === effectiveFromSubscriptions.expiresAt &&
              ['active', 'trialing', 'past_due'].includes(row.status)
          )
        : null;

    const subscriptionStatus = effectiveFromSubscriptions
      ? effectiveFromSubscriptions.tier === 'FREE'
        ? latestSubscription?.current_period_end && new Date(latestSubscription.current_period_end).getTime() <= Date.now()
          ? 'expired'
          : 'free'
        : effectiveCandidate?.status || 'active'
      : fallbackTier === 'FREE'
        ? 'free'
        : user.subscription_expires_at && new Date(user.subscription_expires_at).getTime() <= Date.now()
          ? 'expired'
          : 'active';

    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      username: user.username,
      role: user.role,
      institution_names: institutionByUser.get(user.id) || [],
      institution_display:
        (institutionByUser.get(user.id) || []).length > 0
          ? (institutionByUser.get(user.id) || []).join(' · ')
          : 'Independent (no institution)',
      sponsored_institution_name: user.sponsored_institution_name,
      sponsored_institution_type: user.sponsored_institution_type,
      subscription_tier: effectiveTier,
      subscription_expires_at: effectiveExpiry,
      subscription_started_at: effectiveCandidate?.current_period_start || null,
      subscription_status: subscriptionStatus,
      latest_subscription: latestSubscription
        ? {
            tier: latestSubscription.tier,
            status: latestSubscription.status,
            provider: latestSubscription.provider,
            current_period_start: latestSubscription.current_period_start,
            current_period_end: latestSubscription.current_period_end,
            cancel_at_period_end: latestSubscription.cancel_at_period_end,
            provider_subscription_id: latestSubscription.provider_subscription_id,
          }
        : null,
      xp: user.xp,
      created_at: user.created_at,
    };
  });

  return NextResponse.json({ users: enrichedUsers });
}
