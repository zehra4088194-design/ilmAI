import { NextResponse, type NextRequest } from 'next/server';
import { enforceOnboarding } from '@/lib/supabase/enforceOnboarding';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = ['/', '/about', '/pricing', '/blog', '/contact', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];
const PROTECTED_PREFIXES = ['/dashboard', '/study', '/practice', '/ai-tutor', '/past-papers', '/progress', '/leaderboard', '/settings', '/mcq', '/flashcards', '/notes', '/results', '/subscription', '/bookmarks', '/library', '/doubts', '/routine', '/guess-paper', '/full-test', '/parent', '/essay-writer', '/age-counter'];
const ADMIN_PREFIXES = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { user, response, supabase } = await updateSession(request);

  // Admin routes
  if (ADMIN_PREFIXES.some(p => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname), request.url));
    }
    // Admin check would be done in the page component
    return response;
  }

  // Protected dashboard routes
  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname), request.url));
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
