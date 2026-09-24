const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (YOUTUBE_ID_REGEX.test(trimmed)) return trimmed;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id && YOUTUBE_ID_REGEX.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const vParam = parsed.searchParams.get('v');
    if (vParam && YOUTUBE_ID_REGEX.test(vParam)) return vParam;

    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length >= 2 && ['embed', 'shorts', 'live'].includes(segments[0]!)) {
      const id = segments[1]!;
      return YOUTUBE_ID_REGEX.test(id) ? id : null;
    }
  }

  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function getYouTubeThumbnailCandidates(videoIdOrUrl: string): string[] {
  const id = extractYouTubeId(videoIdOrUrl);
  if (!id) return [];

  return [
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/0.jpg`,
    `https://img.youtube.com/vi/${id}/0.jpg`,
    `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi_webp/${id}/hqdefault.webp`,
    `https://i.ytimg.com/vi_webp/${id}/sddefault.webp`,
    `https://i.ytimg.com/vi_webp/${id}/maxresdefault.webp`,
    `https://i.ytimg.com/vi/${id}/default.jpg`,
  ];
}

export function deriveThumbnailFromUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? getYouTubeThumbnail(id) : null;
}
