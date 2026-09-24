import { NextRequest, NextResponse } from 'next/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * Principal directory search (owner request, additive to Part 4.1's Communication scope): search
 * any OTHER school or college by name so a principal can message its leadership directly. Gated to
 * owner/admin of the caller's own institution — not a public directory endpoint. Returns only
 * public-safe columns (name/slug/logo/campuses), same allowlist as the existing signup-search
 * (PUBLIC_SCHOOL_COLUMNS in school-erp/queries.ts).
 */
export async function GET(req: NextRequest) {
  const { supabase, context: schoolContext } = await requireSchoolContext();
  const { context: collegeContext } = schoolContext ? { context: null } : await requireCollegeContext();
  const caller = schoolContext
    ? { type: 'school' as const, organizationId: schoolContext.organization.id, role: schoolContext.membership.member_role }
    : collegeContext
      ? { type: 'college' as const, organizationId: collegeContext.organization.id, role: collegeContext.membership.member_role }
      : null;

  if (!caller || !['owner', 'admin'].includes(caller.role)) {
    return NextResponse.json({ status: 'error', error: 'Only a principal can search the institution directory.' }, { status: 403 });
  }

  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ status: 'success', data: { results: [] } });

  // school_organizations/college_organizations RLS ("visible to members") deliberately only lets
  // a caller see their OWN institution — correct for every other read in the app, but this search
  // needs to look up OTHER institutions by name, which that policy always blocks regardless of
  // query correctness. Uses the admin client instead, scoped by the owner/admin gate above and by
  // only ever selecting the public-safe allowlist (name/slug/logo/campuses) already used here.
  const db = (await createAdminClient()) as any;
  const [schoolMatches, collegeMatches] = await Promise.all([
    db
      .from('school_organizations')
      .select('id, name, slug, logo_url, school_campuses(id, name)')
      .ilike('name', `%${q}%`)
      .eq('status', 'active')
      .neq('id', caller.type === 'school' ? caller.organizationId : '00000000-0000-0000-0000-000000000000')
      .limit(10),
    db
      .from('college_organizations')
      .select('id, name, slug, logo_url, college_campuses(id, name)')
      .ilike('name', `%${q}%`)
      .eq('status', 'active')
      .neq('id', caller.type === 'college' ? caller.organizationId : '00000000-0000-0000-0000-000000000000')
      .limit(10),
  ]);

  const results = [
    ...((schoolMatches.data || []) as any[]).map((row) => ({
      institutionType: 'school' as const,
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logo_url,
      campuses: (row.school_campuses || []).map((c: any) => ({ id: c.id, name: c.name })),
    })),
    ...((collegeMatches.data || []) as any[]).map((row) => ({
      institutionType: 'college' as const,
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logo_url,
      campuses: (row.college_campuses || []).map((c: any) => ({ id: c.id, name: c.name })),
    })),
  ];

  return NextResponse.json({ status: 'success', data: { results } });
}
