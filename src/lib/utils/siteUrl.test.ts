import { afterEach, describe, expect, it } from 'vitest';
import { getRequestSiteUrl, getSiteUrl } from './siteUrl';

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
});

describe('site URL resolution', () => {
  it('never exposes the Docker bind address as a browser destination', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://0.0.0.0:3000';
    expect(getSiteUrl()).toBe('http://localhost:3000');
  });

  it('uses the reverse proxy public host for auth redirects', () => {
    const request = new Request('http://0.0.0.0:3000/api/auth/callback', {
      headers: {
        'x-forwarded-host': 'ilmai.study',
        'x-forwarded-proto': 'https',
      },
    });

    expect(getRequestSiteUrl(request)).toBe('https://ilmai.study');
  });

  it('falls back to localhost during direct local development', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://0.0.0.0:3000';
    const request = new Request('http://0.0.0.0:3000/api/auth/callback');
    expect(getRequestSiteUrl(request)).toBe('http://localhost:3000');
  });
});
