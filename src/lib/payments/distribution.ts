function normalizeHost(value: string | null | undefined) {
  if (!value) return '';

  const firstHost = value.split(',')[0]?.trim().toLowerCase() || '';
  if (!firstHost) return '';

  try {
    const parsed = new URL(firstHost.includes('://') ? firstHost : `https://${firstHost}`);
    return parsed.hostname.replace(/\.$/, '');
  } catch {
    return firstHost.replace(/:\d+$/, '').replace(/\.$/, '');
  }
}

export const PLAY_CONSUMPTION_ONLY_HEADER = 'x-ilm-play-consumption-only';

export function getRequestHost(headers: Pick<Headers, 'get'>) {
  return headers.get('x-forwarded-host') || headers.get('host');
}

export function getPublicRequestUrl(headers: Pick<Headers, 'get'>, fallbackUrl: string, pathname: string) {
  const url = new URL(fallbackUrl);
  const publicHost = normalizeHost(getRequestHost(headers));
  const forwardedProtocol = headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();

  if (publicHost) {
    url.hostname = publicHost;
    url.port = '';
  }
  if (forwardedProtocol === 'http' || forwardedProtocol === 'https') {
    url.protocol = `${forwardedProtocol}:`;
  }

  url.pathname = pathname;
  url.search = '';
  url.hash = '';
  return url;
}

export function isPlayConsumptionOnlyHost(
  requestHost: string | null | undefined,
  configuredHosts = process.env.PLAY_CONSUMPTION_ONLY_HOSTS || ''
) {
  const host = normalizeHost(requestHost);
  if (!host) return false;

  return configuredHosts.split(',').map(normalizeHost).filter(Boolean).includes(host);
}

export function isPlayConsumptionOnlyRequest(headers: Pick<Headers, 'get'>) {
  return headers.get(PLAY_CONSUMPTION_ONLY_HEADER) === '1' || isPlayConsumptionOnlyHost(getRequestHost(headers));
}
