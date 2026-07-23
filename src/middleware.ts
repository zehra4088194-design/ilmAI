import { NextResponse, type NextRequest } from 'next/server';
import { enforceOnboarding } from '@/lib/supabase/enforceOnboarding';
import { updateSession } from '@/lib/supabase/middleware';
import { matchesRoutePrefix } from '@/lib/navigation/route-prefix';
import {
  getPublicRequestUrl,
  getRequestHost,
  isPlayConsumptionOnlyHost,
  PLAY_CONSUMPTION_ONLY_HEADER,
} from '@/lib/payments/distribution';

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
];
const ADMIN_PREFIXES = ['/admin'];
const COLLEGE_ADMIN_PREFIXES = ['/college-admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestedPath = `${pathname}${request.nextUrl.search}`;
  const playConsumptionOnly = isPlayConsumptionOnlyHost(getRequestHost(request.headers));

  if (playConsumptionOnly && (pathname === '/checkout' || pathname === '/pricing')) {
    return NextResponse.redirect(getPublicRequestUrl(request.headers, request.url, '/subscription'));
  }
  if (
    playConsumptionOnly &&
    request.method === 'POST' &&
    (pathname === '/api/payments/create-session' || pathname === '/api/institution-plan-inquiry')
  ) {
    return NextResponse.json(
      { status: 'consumption_only', error: 'External purchases are not available in the Play Store app.' },
      { status: 403 }
    );
  }

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-invoke-path', pathname);
  if (playConsumptionOnly) {
    forwardedHeaders.set(PLAY_CONSUMPTION_ONLY_HEADER, '1');
  } else {
    forwardedHeaders.delete(PLAY_CONSUMPTION_ONLY_HEADER);
  }
  const { user, response, supabase } = await updateSession(request, forwardedHeaders);

  // Admin routes
  if (ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(requestedPath), request.url));
    }
    // Admin check would be done in the page component
    return response;
  }

  if (matchesRoutePrefix(pathname, '/teacher')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(requestedPath), request.url));
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  if (COLLEGE_ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(requestedPath), request.url));
    }
    return response;
  }

  // Protected dashboard routes
  if (PROTECTED_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(requestedPath), request.url));
    }
    const onboardingRedirect = await enforceOnboarding(request, supabase);
    if (onboardingRedirect) {
      return onboardingRedirect;
    }
    return response;
  }

  // Auth routes - redirect logged in users to dashboard
  if (AUTH_ROUTES.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)'],
};
