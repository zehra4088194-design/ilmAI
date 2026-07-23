import { gunzipSync, gzipSync } from 'node:zlib';
import { getR2Object, putR2Object } from '@/lib/storage/r2';

export type ChatArchiveType = 'student' | 'parent';

type ChatRow = {
  id: string;
  created_at: string;
  [key: string]: unknown;
};

type ArchiveIndexRow = {
  object_key: string;
};

type ChatArchivePayload = {
  version: 1;
  type: ChatArchiveType;
  conversationId: string;
  archivedAt: string;
  messages: ChatRow[];
};

const ARCHIVE_BATCH_SIZE = 200;
const MAX_ARCHIVES_PER_CHAT = 1000;

function safeKeyPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 160);
}

export function encodeChatArchive(payload: ChatArchivePayload) {
  return gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'), { level: 9 });
}

export function decodeChatArchive(bytes: ArrayBuffer | Uint8Array): ChatArchivePayload {
  const compressed = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  return JSON.parse(gunzipSync(compressed).toString('utf8')) as ChatArchivePayload;
}

export function mergeChatMessages<T extends { id: string; created_at: string }>(...groups: T[][]) {
  const unique = new Map<string, T>();
  for (const message of groups.flat()) unique.set(message.id, message);
  return [...unique.values()].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}

export async function archiveOldChatRows(
  db: any,
  options: {
    type: ChatArchiveType;
    table: 'student_chat_messages' | 'parent_messages';
    conversationColumn: 'request_id' | 'link_id';
    cutoff: string;
  }
) {
  let archivedMessages = 0;
  let archivesCreated = 0;
  for (let batch = 0; batch < 5; batch += 1) {
    const { data, error } = await db
      .from(options.table)
      .select('*')
      .lt('created_at', options.cutoff)
      .order('created_at', { ascending: true })
      .limit(ARCHIVE_BATCH_SIZE);
    if (error) throw error;

    const rows = (data || []) as ChatRow[];
    if (!rows.length) break;
    const groups = new Map<string, ChatRow[]>();
    for (const row of rows) {
      const conversationId = String(row[options.conversationColumn] || '');
      if (!conversationId) continue;
      groups.set(conversationId, [...(groups.get(conversationId) || []), row]);
    }

    for (const [conversationId, messages] of groups) {
      const first = messages[0];
      const last = messages.at(-1);
      if (!first || !last) continue;

      const objectKey = [
        'chat-archives',
        options.type,
        safeKeyPart(conversationId),
        `${safeKeyPart(first.created_at)}_${safeKeyPart(last.created_at)}_${safeKeyPart(first.id)}.json.gz`,
      ].join('/');
      const payload: ChatArchivePayload = {
        version: 1,
        type: options.type,
        conversationId,
        archivedAt: new Date().toISOString(),
        messages,
      };
      const compressed = encodeChatArchive(payload);

      await putR2Object(objectKey, compressed, {
        contentType: 'application/json',
        contentEncoding: 'gzip',
        cacheControl: 'private, max-age=0, no-store',
      });

      const { error: indexError } = await db.from('chat_archives').upsert(
        {
          archive_type: options.type,
          conversation_id: conversationId,
          object_key: objectKey,
          message_count: messages.length,
          first_message_at: first.created_at,
          last_message_at: last.created_at,
          compressed_size_bytes: compressed.byteLength,
        },
        { onConflict: 'object_key' }
      );
      if (indexError) throw indexError;

      const ids = messages.map((message) => message.id);
      const { error: deleteError } = await db.from(options.table).delete().in('id', ids);
      if (deleteError) throw deleteError;

      archivedMessages += messages.length;
      archivesCreated += 1;
    }
    if (rows.length < ARCHIVE_BATCH_SIZE) break;
  }

  return { archivedMessages, archivesCreated };
}

export async function loadArchivedChatMessages<T extends { id: string; created_at: string }>(
  db: any,
  type: ChatArchiveType,
  conversationId: string
): Promise<T[]> {
  const { data, error } = await db
    .from('chat_archives')
    .select('object_key')
    .eq('archive_type', type)
    .eq('conversation_id', conversationId)
    .order('first_message_at', { ascending: true })
    .limit(MAX_ARCHIVES_PER_CHAT);

  // Keep chat available before the migration is applied; the cron will not
  // remove live rows until this index exists.
  if (error) {
    console.warn('Archived chat index is unavailable:', error.message || error);
    return [];
  }

  const archives = await Promise.all(
    ((data || []) as ArchiveIndexRow[]).map(async ({ object_key: objectKey }) => {
      try {
        const object = await getR2Object(objectKey);
        return object ? (decodeChatArchive(object.body).messages as T[]) : [];
      } catch (archiveError) {
        console.error(`Chat archive could not be read (${objectKey}):`, archiveError);
        return [];
      }
    })
  );
  return mergeChatMessages(...archives);
}
