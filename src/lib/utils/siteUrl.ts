export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const url = new URL(raw);
    if (url.hostname === '0.0.0.0') url.hostname = 'localhost';
    return url.origin;
  } catch {
    return 'http://localhost:3000';
  }
}

function safeOrigin(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.hostname === '0.0.0.0' || url.hostname === 'host.docker.internal') return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getRequestSiteUrl(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  const forwardedOrigin = safeOrigin(forwardedHost ? `${forwardedProto}://${forwardedHost}` : null);
  if (forwardedOrigin) return forwardedOrigin;

  const requestOrigin = safeOrigin(request.url);
  if (requestOrigin) return requestOrigin;

  return getSiteUrl();
}

export function getBrowserSiteUrl() {
  if (typeof window === 'undefined') return getSiteUrl();

  const current = new URL(window.location.origin);
  if (current.hostname !== '0.0.0.0') return current.origin;

  current.hostname = 'localhost';
  return current.origin;
}
