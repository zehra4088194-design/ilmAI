import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_SCHOOL_COOKIE } from '@/lib/school-erp/access';
import { getRequestSiteUrl } from '@/lib/utils/siteUrl';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const origin = getRequestSiteUrl(request);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const redirectTarget = `/principal-${encodeURIComponent(slug)}`;
  if (!user) {
    return NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }

  const db = supabase as any;
  const { data: link } = await db
    .from('school_principal_links')
    .select('organization_id, slug, school_organizations(id, slug, status)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  const organizationId =
    link?.organization_id ||
    (
      await db
        .from('school_organizations')
        .select('id')
        .eq('slug', slug)
        .in('status', ['trial', 'active'])
        .maybeSingle()
    ).data?.id;

  if (!organizationId) return NextResponse.redirect(`${origin}/dashboard`);

  const { data: membership } = await db
    .from('school_memberships')
    .select('id, member_role')
    .eq('organization_id', organizationId)
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .in('member_role', ['owner', 'admin', 'admissions', 'teacher', 'staff', 'accountant'])
    .maybeSingle();
  if (!membership) return NextResponse.redirect(`${origin}/dashboard`);

  const response = NextResponse.redirect(`${origin}/school-admin`);
  response.cookies.set(ACTIVE_SCHOOL_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
  return response;
}
