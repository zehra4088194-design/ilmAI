import { randomUUID } from 'node:crypto';

// Shared between the audio-files presign route and (for the size/format constants) anywhere else
// that needs to validate an admin-uploaded Rest & Audio track before minting a presigned URL for it.
export const MAX_AUDIO_BYTES = 300 * 1024 * 1024; // a full hour of high-quality audio, comfortably

export const ALLOWED_AUDIO: Record<string, { contentType: string; extension: string }> = {
  'audio/mpeg': { contentType: 'audio/mpeg', extension: 'mp3' },
  'audio/mp3': { contentType: 'audio/mpeg', extension: 'mp3' },
  'audio/wav': { contentType: 'audio/wav', extension: 'wav' },
  'audio/x-wav': { contentType: 'audio/wav', extension: 'wav' },
  'audio/mp4': { contentType: 'audio/mp4', extension: 'm4a' },
  'audio/x-m4a': { contentType: 'audio/mp4', extension: 'm4a' },
  'audio/aac': { contentType: 'audio/aac', extension: 'aac' },
  'audio/ogg': { contentType: 'audio/ogg', extension: 'ogg' },
  'audio/webm': { contentType: 'audio/webm', extension: 'webm' },
  'audio/flac': { contentType: 'audio/flac', extension: 'flac' },
};

export function resolveAudioConfig(declaredType: string, filename: string) {
  const declared = (declaredType || '').toLowerCase();
  const byExtension = /\.(mp3|wav|m4a|aac|ogg|webm|flac)$/i.exec(filename)?.[1]?.toLowerCase();
  return (
    ALLOWED_AUDIO[declared] ||
    (byExtension === 'mp3' ? ALLOWED_AUDIO['audio/mpeg'] : undefined) ||
    (byExtension === 'wav' ? ALLOWED_AUDIO['audio/wav'] : undefined) ||
    (byExtension === 'm4a' ? ALLOWED_AUDIO['audio/mp4'] : undefined) ||
    (byExtension ? ALLOWED_AUDIO[`audio/${byExtension}`] : undefined) ||
    null
  );
}

function cleanAudioStem(value: string) {
  return (
    value
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 72) || 'track'
  );
}

function cleanAudioScope(value: string) {
  const text = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '')
    .slice(0, 160);
  return text && !text.includes('..') ? text : 'general';
}

export function buildAudioKey(filename: string, scope: string, extension: string) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `audio/${cleanAudioScope(scope)}/${yyyy}/${mm}/${cleanAudioStem(filename)}-${randomUUID().slice(0, 10)}.${extension}`;
}
