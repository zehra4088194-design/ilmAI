import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
    const { data, error } = await db
      .from(table)
      .select('id')
      .lt(timestampColumn, cutoff)
      .limit(BATCH_SIZE);
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
    const { data, error } = await db
      .from(table)
      .select(`id, ${urlColumn}`)
      .lt('created_at', cutoff)
      .limit(BATCH_SIZE);
    if (error) throw error;
    const rows = (data || []) as Array<{ id: string; [key: string]: string | null }>;
    if (!rows.length) break;
    await removeFiles(db, bucket, rows.map((row) => row[urlColumn] || '').filter(Boolean));
    const { error: deleteError } = await db
      .from(table)
      .delete()
      .in('id', rows.map((row) => row.id));
    if (deleteError) throw deleteError;
    deleted += rows.length;
    if (rows.length < BATCH_SIZE) break;
  }
  return deleted;
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
    const parentAttachments = await cleanupMediaRows(db, 'parent_attachments', 'parent-attachments', cutoff, 'file_url');
    const conversations = await deleteOldRows(db, 'conversations', 'updated_at', cutoff);
    const studentChatMessages = await deleteOldRows(db, 'student_chat_messages', 'created_at', cutoff);
    const parentMessages = await deleteOldRows(db, 'parent_messages', 'created_at', cutoff);
    const notifications = await deleteOldRows(db, 'notifications', 'created_at', cutoff);

    return NextResponse.json({
      status: 'success',
      cleaned: {
        retentionWindow: '48 hours',
        visionScans,
        speakingAudio,
        parentAttachments,
        conversations,
        studentChatMessages,
        parentMessages,
        notifications,
      },
    });
  } catch (error) {
    console.error('Storage retention cron failed:', error);
    return NextResponse.json({ status: 'error', error: 'Storage cleanup failed' }, { status: 500 });
  }
}
