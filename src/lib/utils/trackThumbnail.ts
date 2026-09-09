// Deterministic, cute placeholder artwork for a track that has neither an uploaded thumbnail nor
// a YouTube video id to derive one from (a directly-uploaded audio file, most commonly). Picks
// from a small palette of pastel gradients + a music-themed emoji, seeded by the track's own id
// so the same track always gets the same placeholder instead of a new random one on every render.
const PLACEHOLDER_PALETTE: Array<{ from: string; to: string; emoji: string }> = [
  { from: '#f9a8d4', to: '#a78bfa', emoji: '🎵' },
  { from: '#fca5a5', to: '#fcd34d', emoji: '🎶' },
  { from: '#93c5fd', to: '#c4b5fd', emoji: '🎧' },
  { from: '#86efac', to: '#5eead4', emoji: '🎹' },
  { from: '#fdba74', to: '#f9a8d4', emoji: '🎤' },
  { from: '#a5b4fc', to: '#f0abfc', emoji: '🌙' },
  { from: '#67e8f9', to: '#93c5fd', emoji: '✨' },
  { from: '#fde68a', to: '#fca5a5', emoji: '🎼' },
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/** A small inline SVG (pastel gradient + music emoji) usable anywhere a normal <img src> is expected. */
export function getTrackPlaceholderThumbnail(seed: string): string {
  const pick = PLACEHOLDER_PALETTE[hashSeed(seed) % PLACEHOLDER_PALETTE.length]!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${pick.from}"/>
        <stop offset="100%" stop-color="${pick.to}"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="16" fill="url(#g)"/>
    <text x="50%" y="54%" font-size="66" text-anchor="middle" dominant-baseline="middle">${pick.emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Picks thumbnail_url, then a YouTube-derived thumbnail, then the cute generated placeholder. */
export function resolveTrackThumbnail(
  track: { id: string; thumbnail_url?: string | null; youtube_video_id?: string | null },
  fallback?: string | null,
  youtubeQuality: 'mqdefault' | 'hqdefault' = 'mqdefault'
): string {
  return (
    track.thumbnail_url ||
    (track.youtube_video_id ? `https://img.youtube.com/vi/${track.youtube_video_id}/${youtubeQuality}.jpg` : null) ||
    fallback ||
    getTrackPlaceholderThumbnail(track.id)
  );
}
