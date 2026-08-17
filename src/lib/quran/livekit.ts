// Server-only LiveKit integration for the Quran Class module. Requires
// LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET env vars — see
// .env.local.example for where a free account's keys go (livekit.io).
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';

const LIVEKIT_URL = process.env.LIVEKIT_URL || '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

export function isLiveKitConfigured() {
  return Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}

export function getLiveKitClientUrl() {
  return LIVEKIT_URL;
}

/**
 * Mints a room-join token. Teachers get camera + microphone publish grants
 * (the WhatsApp-style self-view + the video every student sees) plus
 * `roomAdmin` (needed for server-side mute of a student to make sense as "the
 * teacher's own action" in the room's activity). Students get microphone-only —
 * no camera track ever leaves a child's device, which is the whole point of
 * "kids show up as voice waves, not video".
 */
export async function createQuranRoomToken(params: {
  roomName: string;
  identity: string;
  name: string;
  role: 'teacher' | 'student';
}): Promise<string> {
  if (!isLiveKitConfigured()) {
    throw new Error('Live class calling is not configured yet. Ask the platform admin to add the LiveKit API keys.');
  }
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: params.identity,
    name: params.name,
    ttl: '4h',
  });
  at.addGrant({
    roomJoin: true,
    room: params.roomName,
    canSubscribe: true,
    canPublishData: true,
    canPublishSources:
      params.role === 'teacher' ? [TrackSource.CAMERA, TrackSource.MICROPHONE] : [TrackSource.MICROPHONE],
    roomAdmin: params.role === 'teacher',
  });
  return at.toJwt();
}

let roomServiceClient: RoomServiceClient | null = null;

/** Server-to-server room moderation client (mute-a-participant, etc). */
export function getRoomServiceClient(): RoomServiceClient {
  if (!isLiveKitConfigured()) {
    throw new Error('Live class calling is not configured yet.');
  }
  if (!roomServiceClient) {
    // RoomServiceClient talks to LiveKit's HTTP API — needs https://, not the
    // wss:// URL the browser client connects with.
    const httpUrl = LIVEKIT_URL.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
    roomServiceClient = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return roomServiceClient;
}
