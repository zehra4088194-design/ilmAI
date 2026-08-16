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
  // Library and past papers have a public, read-only SEO catalog. Their
  // reader endpoint still keeps downloads, AI tools, and college resources gated.
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

// pdfjs-dist (react-pdf's PDF viewer) bootstraps its worker with a tiny fixed
// inline script; workers inherit the page's script-src, so without this hash
// the worker is created but its code is blocked from running — the PDF
// silently never loads. Content is pinned to the installed pdfjs-dist
// version, so re-verify this hash if that dependency is upgraded.
const PDFJS_WORKER_BOOTSTRAP_HASH = "'sha256-PQNBmepyn3corN4iAcIkbTGAzPr+5/ubjCJHc7QNtUU='";

// Any account that's a member of a school or college — owner/principal, admin, teacher, staff,
// parent, or student alike — has no business ever landing on the plain consumer /dashboard. For
// staff roles it's a dead end (no admin tools live there, and the only "school" affordance is a
// decorative branding chip in the sidebar that links to "/" like the logo always does, not to
// their actual portal). For student/parent roles it's the wrong portal too: /school and
// /college/dashboard are the real institutional experience (attendance, fees, homework, PTM,
// report cards) — /dashboard is the generic consumer AI-study app. Whichever role an email is
// actually linked as, that's the only dashboard it should ever see.
async function resolveInstitutionPortalHome(supabase: SupabaseClient, userId: string) {
  const schoolRole = await resolveSchoolRole(supabase, userId);
  if (schoolRole) return schoolAdminHomeForRole(schoolRole.role);
  const collegeRole = await resolveCollegeRole(supabase, userId);
  if (collegeRole) return collegeAdminHomeForRole(collegeRole.role);
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

  if (pathname.startsWith('/principal-') && pathname.length > '/principal-'.length) {
    const url = request.nextUrl.clone();
    url.pathname = `/principal/${pathname.slice('/principal-'.length)}`;
    return secure(NextResponse.rewrite(url));
  }

  // Google Play policy: an app distributed via Play cannot link out to any external
  // (non-Google-Play-billing) payment flow for digital goods — this includes the
  // institutional/manual payment methods (JazzCash/Easypaisa/bank transfer/etc.) from the
  // separate school/college billing work. EVERY checkout-like route, present or future,
  // must be added to both blocks below or the Play Store app risks rejection/suspension.
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
  if (playConsumptionOnly) {
    forwardedHeaders.set(PLAY_CONSUMPTION_ONLY_HEADER, '1');
  } else {
    forwardedHeaders.delete(PLAY_CONSUMPTION_ONLY_HEADER);
  }
  const { user, response, supabase } = await updateSession(request, forwardedHeaders);

  // Admin routes
  if (ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    }
    // Admin check would be done in the page component
    return secure(response);
  }

  if (matchesRoutePrefix(pathname, '/teacher')) {
    if (!user) {
      return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      return secure(NextResponse.redirect(`${origin}/dashboard`));
    }
    return secure(response);
  }

  if (COLLEGE_ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    }
    const collegeRole = await resolveCollegeRole(supabase, user.id);
    if (collegeRole && (collegeRole.role === 'student' || collegeRole.role === 'parent')) {
      console.warn(
        `[middleware] college member ${user.id} (role=${collegeRole.role}) hit ${pathname}; redirecting to own portal`
      );
      return secure(NextResponse.redirect(`${origin}${collegeAdminHomeForRole(collegeRole.role)}`));
    }
    if (!collegeRole) {
      const schoolRole = await resolveSchoolRole(supabase, user.id);
      if (schoolRole) {
        console.warn(
          `[middleware] school member ${user.id} (org=${schoolRole.organizationId}) hit college-admin route ${pathname}; redirecting to own portal`
        );
        return secure(NextResponse.redirect(`${origin}${schoolAdminHomeForRole(schoolRole.role)}`));
      }
    }
    // No college membership resolved (and no school membership to redirect against) — the
    // page component still performs the definitive admin/tenant check per-route.
    return secure(response);
  }

  if (SCHOOL_ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    }
    const schoolRole = await resolveSchoolRole(supabase, user.id);
    if (schoolRole && (schoolRole.role === 'student' || schoolRole.role === 'parent')) {
      console.warn(
        `[middleware] school member ${user.id} (role=${schoolRole.role}) hit ${pathname}; redirecting to own portal`
      );
      return secure(NextResponse.redirect(`${origin}${schoolAdminHomeForRole(schoolRole.role)}`));
    }
    if (!schoolRole) {
      const collegeRole = await resolveCollegeRole(supabase, user.id);
      if (collegeRole) {
        console.warn(
          `[middleware] college member ${user.id} (org=${collegeRole.organizationId}) hit school-admin route ${pathname}; redirecting to own portal`
        );
        return secure(NextResponse.redirect(`${origin}${collegeAdminHomeForRole(collegeRole.role)}`));
      }
    }
    // No school membership resolved (and no college membership to redirect against) — the
    // page component still performs the definitive admin/tenant check per-route.
    return secure(response);
  }

  // Protected dashboard routes
  if (PROTECTED_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return secure(NextResponse.redirect(`${origin}/login?redirect=${encodeURIComponent(requestedPath)}`));
    }
    if (pathname === '/dashboard') {
      const portalHome = await resolveInstitutionPortalHome(supabase, user.id);
      if (portalHome) {
        return secure(NextResponse.redirect(`${origin}${portalHome}`));
      }
    }
    const onboardingRedirect = await enforceOnboarding(request, supabase);
    if (onboardingRedirect) {
      return secure(onboardingRedirect);
    }
    return secure(response);
  }

  // Auth routes - redirect logged in users to their real home. Any school/college member
  // (owner, admin, teacher, staff, parent, student — whatever role the email is linked as)
  // goes straight to its matching portal; only accounts with no institution link land on
  // the generic consumer /dashboard.
  if (AUTH_ROUTES.includes(pathname) && user) {
    const portalHome = await resolveInstitutionPortalHome(supabase, user.id);
    return secure(NextResponse.redirect(`${origin}${portalHome || '/dashboard'}`));
  }

  return secure(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)'],
};
