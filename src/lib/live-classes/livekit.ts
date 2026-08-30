// Server-only LiveKit integration for regular-subject Live Classes (PW-style:
// teacher broadcasts camera+mic, students are view-only + text chat). Uses the
// SAME LiveKit project/env vars as the Quran Class module
// (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET) — it's one infra
// account, just a different room per feature — but implemented independently
// from src/lib/quran/livekit.ts (not imported from there) so the two domains
// stay decoupled, matching this codebase's school/college-erp-style separation
// convention: shared config, never shared code across unrelated domains.
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';

const LIVEKIT_URL = process.env.LIVEKIT_URL || '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

export function isLiveClassConfigured() {
  return Boolean(LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}

export function getLiveClassClientUrl() {
  return LIVEKIT_URL;
}

/**
 * Mints a room-join token. The teacher is the sole broadcaster (camera +
 * microphone + roomAdmin, needed to forcibly end the class for everyone).
 * Students get NO publish grant at all — not even microphone — because at
 * class scale (a teacher's class can have far more students than a small
 * Quran group) two-way audio doesn't work anyway; participation instead
 * happens entirely through the shared text chat (see /api/live-class/chat),
 * which every student and the teacher can see live.
 */
export async function createLiveClassToken(params: {
  roomName: string;
  identity: string;
  name: string;
  role: 'teacher' | 'student';
}): Promise<string> {
  if (!isLiveClassConfigured()) {
    throw new Error('Live classes are not configured yet. Ask the platform admin to add the LiveKit API keys.');
  }
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: params.identity,
    name: params.name,
    ttl: '4h',
  });
  const isTeacher = params.role === 'teacher';
  at.addGrant({
    roomJoin: true,
    room: params.roomName,
    canSubscribe: true,
    canPublish: isTeacher,
    canPublishData: false,
    canPublishSources: isTeacher ? [TrackSource.CAMERA, TrackSource.MICROPHONE] : [],
    roomAdmin: isTeacher,
  });
  return at.toJwt();
}

/**
 * Grants or revokes a student's microphone live, without reissuing their
 * token — LiveKit pushes the new permission to an already-connected client
 * immediately. Used by the "raise hand" flow: the teacher taps "Allow to
 * speak", the student's mic control appears, and it disappears again the
 * moment the teacher revokes it (or the student lowers their hand).
 */
export async function setStudentMicPermission(roomName: string, studentIdentity: string, canSpeak: boolean) {
  await getLiveClassRoomServiceClient().updateParticipant(roomName, studentIdentity, {
    permission: {
      canSubscribe: true,
      canPublish: canSpeak,
      canPublishData: false,
      canPublishSources: canSpeak ? [TrackSource.MICROPHONE] : [],
    },
  });
}

let roomServiceClient: RoomServiceClient | null = null;

/** Server-to-server room control (force-end a class for everyone). */
export function getLiveClassRoomServiceClient(): RoomServiceClient {
  if (!isLiveClassConfigured()) {
    throw new Error('Live classes are not configured yet.');
  }
  if (!roomServiceClient) {
    const httpUrl = LIVEKIT_URL.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
    roomServiceClient = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
  }
  return roomServiceClient;
}
