import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { archiveOldChatRows } from '@/lib/storage/chat-archive';
import { getR2Uri, isR2Configured, putR2Object } from '@/lib/storage/r2';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 200;
const MAX_BATCHES_PER_TABLE = 5;

function olderThan(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

async function removeFiles(db: any, bucket: string, paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!uniquePaths.length) return;
  const { error } = await db.storage.from(bucket).remove(uniquePaths);
  if (error) console.error(`${bucket} retention storage cleanup failed:`, error);
}

async function deleteOldRows(db: any, table: string, timestampColumn: string, cutoff: string) {
  let deleted = 0;
  for (let batch = 0; batch < MAX_BATCHES_PER_TABLE; batch += 1) {
    const { data, error } = await db.from(table).select('id').lt(timestampColumn, cutoff).limit(BATCH_SIZE);
    if (error) throw error;
    const ids = (data || []).map((row: { id: string }) => row.id).filter(Boolean);
    if (!ids.length) break;
    const { error: deleteError } = await db.from(table).delete().in('id', ids);
    if (deleteError) throw deleteError;
    deleted += ids.length;
    if (ids.length < BATCH_SIZE) break;
  }
  return deleted;
}

async function cleanupMediaRows(db: any, table: string, bucket: string, cutoff: string, urlColumn: string) {
  let deleted = 0;
  for (let batch = 0; batch < MAX_BATCHES_PER_TABLE; batch += 1) {
    const { data, error } = await db.from(table).select(`id, ${urlColumn}`).lt('created_at', cutoff).limit(BATCH_SIZE);
    if (error) throw error;
    const rows = (data || []) as Array<{ id: string; [key: string]: string | null }>;
    if (!rows.length) break;
    await removeFiles(db, bucket, rows.map((row) => row[urlColumn] || '').filter(Boolean));
    const { error: deleteError } = await db
      .from(table)
      .delete()
      .in(
        'id',
        rows.map((row) => row.id)
      );
    if (deleteError) throw deleteError;
    deleted += rows.length;
    if (rows.length < BATCH_SIZE) break;
  }
  return deleted;
}

async function migrateParentAttachmentsToR2(db: any, cutoff: string) {
  if (!isR2Configured()) throw new Error('R2 is required before parent attachments can be archived.');

  const { data, error } = await db
    .from('parent_attachments')
    .select('*')
    .lt('created_at', cutoff)
    .not('file_url', 'like', 'r2://%')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);
  if (error) throw error;

  let migrated = 0;
  for (const row of data || []) {
    const { data: file, error: downloadError } = await db.storage.from('parent-attachments').download(row.file_url);
    if (downloadError || !file) throw downloadError || new Error(`Attachment ${row.id} could not be downloaded.`);

    const safeName = String(row.file_name || row.id).replace(/[^a-zA-Z0-9._-]/g, '-');
    const key = `parent-attachments/${row.link_id}/${row.id}-${safeName}`;
    await putR2Object(key, Buffer.from(await file.arrayBuffer()), {
      contentType: row.file_type || 'application/octet-stream',
      cacheControl: 'private, max-age=0, no-store',
    });

    const { error: updateError } = await db
      .from('parent_attachments')
      .update({ file_url: getR2Uri(key) })
      .eq('id', row.id)
      .eq('file_url', row.file_url);
    if (updateError) throw updateError;

    await removeFiles(db, 'parent-attachments', [row.file_url]);
    migrated += 1;
  }
  return migrated;
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = (await createAdminClient()) as any;

    const cutoff = olderThan(2);
    const visionScans = await cleanupMediaRows(db, 'vision_scans', 'vision-scans', cutoff, 'image_url');
    const speakingAudio = await cleanupMediaRows(
      db,
      'speaking_practice_sessions',
      'speaking-practice-audio',
      cutoff,
      'audio_url'
    );
    const parentAttachmentsMigrated = await migrateParentAttachmentsToR2(db, cutoff);
    const studentChat = await archiveOldChatRows(db, {
      type: 'student',
      table: 'student_chat_messages',
      conversationColumn: 'request_id',
      cutoff,
    });
    const parentChat = await archiveOldChatRows(db, {
      type: 'parent',
      table: 'parent_messages',
      conversationColumn: 'link_id',
      cutoff,
    });
    const notifications = await deleteOldRows(db, 'notifications', 'created_at', cutoff);

    return NextResponse.json({
      status: 'success',
      cleaned: {
        retentionWindow: '48 hours',
        visionScans,
        speakingAudio,
        parentAttachmentsMigrated,
        studentChat,
        parentChat,
        notifications,
      },
    });
  } catch (error) {
    console.error('Storage retention cron failed:', error);
    return NextResponse.json({ status: 'error', error: 'Storage cleanup failed' }, { status: 500 });
  }
}
