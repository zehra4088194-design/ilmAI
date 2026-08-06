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
  '/school',
];
const ADMIN_PREFIXES = ['/admin'];
const COLLEGE_ADMIN_PREFIXES = ['/college-admin'];
const SCHOOL_ADMIN_PREFIXES = ['/school-admin'];

function buildContentSecurityPolicy(nonce: string) {
  const developmentEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http:${developmentEval}`,
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
  const playConsumptionOnly = isPlayConsumptionOnlyHost(getRequestHost(request.headers));

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
  if (playConsumptionOnly) {
    forwardedHeaders.set(PLAY_CONSUMPTION_ONLY_HEADER, '1');
  } else {
    forwardedHeaders.delete(PLAY_CONSUMPTION_ONLY_HEADER);
  }
  const { user, response, supabase } = await updateSession(request, forwardedHeaders);

  // Admin routes
  if (ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return secure(
        NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(requestedPath), request.url))
      );
    }
    // Admin check would be done in the page component
    return secure(response);
  }

  if (matchesRoutePrefix(pathname, '/teacher')) {
    if (!user) {
      return secure(
        NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(requestedPath), request.url))
      );
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
      return secure(NextResponse.redirect(new URL('/dashboard', request.url)));
    }
    return secure(response);
  }

  if (COLLEGE_ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return secure(
        NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(requestedPath), request.url))
      );
    }
    return secure(response);
  }

  if (SCHOOL_ADMIN_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return secure(
        NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(requestedPath), request.url))
      );
    }
    return secure(response);
  }

  // Protected dashboard routes
  if (PROTECTED_PREFIXES.some((p) => matchesRoutePrefix(pathname, p))) {
    if (!user) {
      return secure(
        NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(requestedPath), request.url))
      );
    }
    const onboardingRedirect = await enforceOnboarding(request, supabase);
    if (onboardingRedirect) {
      return secure(onboardingRedirect);
    }
    return secure(response);
  }

  // Auth routes - redirect logged in users to dashboard
  if (AUTH_ROUTES.includes(pathname) && user) {
    return secure(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  return secure(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)'],
};
