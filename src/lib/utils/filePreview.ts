export function extractGoogleDriveFileId(url?: string | null) {
  if (!url) return null;

  const patterns = [
    /drive\.google\.com\/file\/d\/([^/?#]+)/i,
    /drive\.google\.com\/open\?id=([^&#]+)/i,
    /drive\.google\.com\/uc\?[^#]*id=([^&#]+)/i,
    /docs\.google\.com\/(?:document|presentation|spreadsheets)\/d\/([^/?#]+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get('id');
    return id ? decodeURIComponent(id) : null;
  } catch {
    return null;
  }
}

export function getEmbeddableFilePreviewUrl(url?: string | null, explicitDriveFileId?: string | null) {
  if (!url && !explicitDriveFileId) return null;

  const driveFileId = explicitDriveFileId || extractGoogleDriveFileId(url);
  if (driveFileId) return `https://drive.google.com/file/d/${driveFileId}/preview`;

  if (!url) return null;
  const lower = url.split('?')[0]?.toLowerCase() || '';
  if (lower.endsWith('.pdf')) {
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
  }

  return null;
}
