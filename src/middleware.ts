import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { enforceOnboarding } from '@/lib/supabase/enforceOnboarding';
import { updateSession } from '@/lib/supabase/middleware';
import { matchesRoutePrefix } from '@/lib/navigation/route-prefix';
import { resolveSchoolRole, schoolAdminHomeForRole } from '@/lib/school-erp/access';
import { resolveCollegeRole, collegeAdminHomeForRole } from '@/lib/college-erp/access';
import {
  getPublicRequestUrl,
  getRequestHost,
  isPlayConsumptionOnlyHost,
  PLAY_CONSUMPTION_ONLY_HEADER,
} from '@/lib/payments/distribution';
import { getRequestSiteUrl } from '@/lib/utils/siteUrl';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/study',
  '/practice',
  '/ai-tutor',
  '/student-chat',
  '/progress',
  '/leaderboard',
  '/settings',
  '/mcq',
  '/flashcards',
  '/notes',
  '/scan',
  '/results',
  '/subscription',
  '/bookmarks',
  '/doubts',
  '/routine',
  '/guess-paper',
  '/full-test',
  '/parent',
  '/essay-writer',
  '/age-counter',
  '/humanizer',
  '/university',
  '/insights',
  '/planner',
  '/achievements',
  '/avatar',
  '/portfolio',
  '/career',
  '/opportunities',
  '/teacher',
  '/join-class',
  '/college/dashboard',
  '/school',
];
const ADMIN_PREFIXES = ['/admin'];
const COLLEGE_ADMIN_PREFIXES = ['/college-admin'];
const SCHOOL_ADMIN_PREFIXES = ['/school-admin'];

const PDFJS_WORKER_BOOTSTRAP_HASH = "'sha256-PQNBmepyn3corN4iAcIkbTGAzPr+5/ubjCJHc7QNtUU='";

async function resolveInstitutionPortalHome(supabase: SupabaseClient, userId: string) {
  const schoolRole = await resolveSchoolRole(supabase, userId);
  if (schoolRole) {
    if (schoolRole.role === 'student') return '/dashboard';
    return schoolAdminHomeForRole(schoolRole.role);
  }
  const collegeRole = await resolveCollegeRole(supabase, userId);
  if (collegeRole) {
    if (collegeRole.role === 'student') return '/dashboard';
    return collegeAdminHomeForRole(collegeRole.role);
  }
  return null;
}

function buildContentSecurityPolicy(nonce: string) {
  const developmentEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${PDFJS_WORKER_BOOTSTRAP_HASH} https: http:${developmentEval}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https:",
    "media-src 'self' blob: https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

export async function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const secure = <T extends NextResponse>(response: T) => {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    return response;
  };
  const { pathname } = request.nextUrl;
  const requestedPath = `${pathname}${request.nextUrl.search}`;
  const origin = getRequestSiteUrl(request);
  const playConsumptionOnly = isPlayConsumptionOnlyHost(getRequestHost(request.headers));

  if (pathname === '/api/health' || pathname.startsWith('/api/health/')) return NextResponse.next();

  if (pathname.startsWith('/principal-') && pathname.length > '/principal-'.length) {
    const url = request.nextUrl.clone();
    url.pathname = `/principal/${pathname.slice('/principal-'.length)}`;
    return secure(NextResponse.rewrite(url));
  }

  if (playConsumptionOnly && (pathname === '/checkout' || pathname === '/pricing')) {
    return secure(NextResponse.redirect(getPublicRequestUrl(request.headers, request.url, '/subscription')));
  }
  if (
    playConsumptionOnly &&
    request.method === 'POST' &&
    (pathname === '/api/payments/create-session' || pathname === '/api/institution-plan-inquiry')
  ) {
    return secure(
      NextResponse.json(
        { status: 'consumption_only', error: 'External purchases are not available in the Play Store app.' },
        { status: 403 }
      )
    );
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-invoke-path', pathname);
  forwardedHeaders.set('x-nonce', nonce);
  forwardedHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  if (playConsumptionOnly) forwardedHeaders.set(PLAY_CONSUMPTION_ONLY_HEADER, '1');
  else forwardedHeaders.delete(PLAY_CONSUMPTION_ONLY_HEADER);
  const { user, response, supabase } = await updateSession(request, forwardedHeaders);

  if (ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    return secure(response);
  }

  if (matchesRoutePrefix(pathname, '/teacher')) {
    if (!user) return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    const portalHome = await resolveInstitutionPortalHome(supabase, user.id);
    if (portalHome && portalHome !== pathname) return secure(NextResponse.redirect(`${origin}${portalHome}`));
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') return secure(NextResponse.redirect(`${origin}/dashboard`));
    return secure(response);
  }

  if (COLLEGE_ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    const collegeRole = await resolveCollegeRole(supabase, user.id);
    if (collegeRole && (collegeRole.role === 'student' || collegeRole.role === 'parent')) return secure(NextResponse.redirect(`${origin}${collegeAdminHomeForRole(collegeRole.role)}`));
    if (!collegeRole) {
      const schoolRole = await resolveSchoolRole(supabase, user.id);
      if (schoolRole) return secure(NextResponse.redirect(`${origin}${schoolAdminHomeForRole(schoolRole.role)}`));
    }
    return secure(response);
  }

  if (SCHOOL_ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    const schoolRole = await resolveSchoolRole(supabase, user.id);
    if (schoolRole && (schoolRole.role === 'student' || schoolRole.role === 'parent')) return secure(NextResponse.redirect(`${origin}${schoolAdminHomeForRole(schoolRole.role)}`));
    if (!schoolRole) {
      const collegeRole = await resolveCollegeRole(supabase, user.id);
      if (collegeRole) return secure(NextResponse.redirect(`${origin}${collegeAdminHomeForRole(collegeRole.role)}`));
    }
    return secure(response);
  }

  // The old institution root dashboards remain for staff/parents. Students always stay in the
  // normal ilm AI dashboard; their only institution-specific destination is /student-hub.
  if (pathname === '/school' || pathname === '/college') {
    if (!user) return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    const schoolRole = pathname === '/school' ? await resolveSchoolRole(supabase, user.id) : null;
    const collegeRole = pathname === '/college' ? await resolveCollegeRole(supabase, user.id) : null;
    const role = schoolRole?.role || collegeRole?.role;
    if (role === 'student') return secure(NextResponse.redirect(`${origin}/dashboard`));
    return secure(response);
  }

  if (PROTECTED_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    if (pathname === '/dashboard') {
      const portalHome = await resolveInstitutionPortalHome(supabase, user.id);
      if (portalHome && portalHome !== pathname) return secure(NextResponse.redirect(`${origin}${portalHome}`));
    }
    const onboardingRedirect = await enforceOnboarding(request, supabase);
    if (onboardingRedirect) return secure(onboardingRedirect);
    return secure(response);
  }

  if (AUTH_ROUTES.includes(pathname) && user) {
    const portalHome = await resolveInstitutionPortalHome(supabase, user.id);
    return secure(NextResponse.redirect(`${origin}${portalHome || '/dashboard'}`));
  }

  return secure(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)'],
};
