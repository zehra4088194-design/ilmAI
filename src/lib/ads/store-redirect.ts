const STORE_ORIGIN = process.env.AD_STORE_ORIGIN || 'https://ilmai.store';

/**
 * Builds the ilmai.store URL a click redirects to, always appending/overwriting `?ref=<clickId>`
 * — even when the banner's target_url already carries its own query string. Only the
 * path+query+hash of target_url is ever kept; any host baked into it (or none, for a bare path)
 * is discarded and rebuilt against ilmai.store, so a banner's target_url can never redirect
 * anywhere else.
 */
export function buildStoreRedirectUrl(targetUrl: string, clickId: string) {
  let path = targetUrl.trim();
  try {
    const parsed = new URL(targetUrl);
    path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    // Not an absolute URL — treat as a bare path already.
  }
  if (!path.startsWith('/')) path = `/${path}`;
  // Collapse a leading "//" (or more) to a single slash — WHATWG URL resolution treats a path
  // starting with "//" as protocol-relative, so `new URL('//evil.com/x', STORE_ORIGIN)` would
  // otherwise resolve to https://evil.com/x instead of staying on ilmai.store.
  path = path.replace(/^\/+/, '/');
  const url = new URL(path, STORE_ORIGIN);
  url.searchParams.set('ref', clickId);
  return url.toString();
}
