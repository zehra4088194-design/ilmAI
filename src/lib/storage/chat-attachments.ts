import { getChatBucketName, getR2SignedUrl, getR2Uri, isChatStorageConfigured, parseR2Uri, putR2Object } from '@/lib/storage/r2';

// Shared across all three 1:1 chat surfaces (Study Buddies, parent<->student, parent<->teacher/
// principal) so the limits/allow-list/bucket choice live in exactly one place.
export const CHAT_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024;
export const CHAT_ATTACHMENT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/gif',
  'application/pdf',
];
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — plenty for one chat page view/poll cycle

export type ChatAttachmentMeta = {
  url: string;
  name: string;
  type: string;
  sizeKb: number;
};

// Deliberately does NOT fall back to the primary bucket the way most of r2.ts's other helpers do
// (resolveConfig falls back to primary whenever an explicit bucket name isn't configured) — chat
// attachments are personal and must land in the dedicated private CHAT_STORAGE_* bucket or not be
// accepted at all, never silently commingle with the public library bucket.
export async function uploadChatAttachment(file: File, pathPrefix: string): Promise<ChatAttachmentMeta> {
  if (!isChatStorageConfigured()) {
    throw new Error('File attachments are not set up yet. Ask an admin to configure chat storage.');
  }
  if (file.size > CHAT_ATTACHMENT_MAX_BYTES) {
    throw new Error(`The file must not exceed ${Math.round(CHAT_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB.`);
  }
  if (!CHAT_ATTACHMENT_ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only images and PDF files can be sent.');
  }

  const bucket = getChatBucketName()!;
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const key = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await putR2Object(key, buffer, { contentType: file.type, cacheControl: 'private, max-age=0, no-store' }, bucket);

  return {
    url: getR2Uri(key, bucket),
    name: file.name.slice(0, 200),
    type: file.type,
    sizeKb: Math.max(1, Math.round(file.size / 1024)),
  };
}

// Turns a stored r2:// URI into a short-lived signed URL the browser can actually load — called
// right before a message list is returned to the client, the same point where these routes
// already establish the caller is a participant (RLS or an explicit access check above it), so no
// separate authorization is needed here.
export async function resolveAttachmentSignedUrl(attachmentUrl: string | null | undefined): Promise<string | null> {
  if (!attachmentUrl) return null;
  const parsed = parseR2Uri(attachmentUrl);
  if (!parsed) return null;
  try {
    return await getR2SignedUrl(parsed.key, SIGNED_URL_TTL_SECONDS, parsed.bucket);
  } catch (error) {
    console.error('Chat attachment signed URL failed:', error);
    return null;
  }
}
