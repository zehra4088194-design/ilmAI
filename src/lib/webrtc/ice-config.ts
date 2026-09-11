/**
 * WebRTC ICE Configuration Utility
 *
 * Fetches dynamic TURN credentials from our local API route,
 * combines with Google STUN servers, and returns iceServers array
 * ready for new RTCPeerConnection().
 */

export interface IceServerConfig {
  urls: string;
  username?: string;
  credential?: string;
}

/**
 * Pre-configured Google STUN servers (free, no credentials needed).
 * These work for most same-network scenarios.
 */
const GOOGLE_STUN_SERVERS: IceServerConfig[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Fetches TURN credentials from our local API route and merges
 * with Google STUN servers. Caches result in memory for 10 minutes
 * to avoid excessive API calls.
 */
let cachedIceServers: IceServerConfig[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getIceServers(): Promise<IceServerConfig[]> {
  const now = Date.now();

  // Return cached if still valid
  if (cachedIceServers && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedIceServers;
  }

  try {
    const res = await fetch('/api/turn-credentials', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      console.warn('TURN credentials fetch failed, using STUN only');
      cachedIceServers = GOOGLE_STUN_SERVERS;
      cacheTimestamp = now;
      return GOOGLE_STUN_SERVERS;
    }

    const data = await res.json();
    const turnServers: IceServerConfig[] = data.iceServers || [];

    // Merge: STUN first, then TURN (STUN is tried first, TURN as fallback)
    cachedIceServers = [...GOOGLE_STUN_SERVERS, ...turnServers];
    cacheTimestamp = now;

    return cachedIceServers;
  } catch (error) {
    console.error('Failed to fetch TURN credentials:', error);
    cachedIceServers = GOOGLE_STUN_SERVERS;
    cacheTimestamp = now;
    return GOOGLE_STUN_SERVERS;
  }
}

/**
 * Creates a new RTCPeerConnection with proper ICE configuration.
 * Automatically fetches TURN credentials if not cached.
 */
export async function createPeerConnection(
  config?: RTCConfiguration
): Promise<RTCPeerConnection> {
  const iceServers = await getIceServers();

  const peerConfig: RTCConfiguration = {
    iceServers,
    ...config,
  };

  return new RTCPeerConnection(peerConfig);
}
