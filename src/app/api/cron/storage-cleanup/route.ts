import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 200;

function olderThan(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

async function removeFiles(db: any, bucket: string, paths: string[]) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!uniquePaths.length) return;
  const { error } = await db.storage.from(bucket).remove(uniquePaths);
  if (error) console.error(`${bucket} retention storage cleanup failed:`, error);
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = (await createAdminClient()) as any;

    const { data: scans, error: scansError } = await db
      .from('vision_scans')
      .select('id, image_url')
      .lt('created_at', olderThan(7))
      .limit(BATCH_SIZE);
    if (scansError) throw scansError;
    await removeFiles(
      db,
      'vision-scans',
      (scans || []).map((scan: { image_url: string }) => scan.image_url)
    );
    if (scans?.length) {
      await db
        .from('vision_scans')
        .delete()
        .in(
          'id',
          scans.map((scan: { id: string }) => scan.id)
        );
    }

    const { data: audioSessions, error: audioError } = await db
      .from('speaking_practice_sessions')
      .select('id, audio_url')
      .not('audio_url', 'is', null)
      .lt('created_at', olderThan(7))
      .limit(BATCH_SIZE);
    if (audioError) throw audioError;
    await removeFiles(
      db,
      'speaking-practice-audio',
      (audioSessions || []).map((session: { audio_url: string }) => session.audio_url)
    );
    if (audioSessions?.length) {
      await db
        .from('speaking_practice_sessions')
        .update({ audio_url: null })
        .in(
          'id',
          audioSessions.map((session: { id: string }) => session.id)
        );
    }

    const { data: attachments, error: attachmentsError } = await db
      .from('parent_attachments')
      .select('id, file_url')
      .lt('created_at', olderThan(30))
      .limit(BATCH_SIZE);
    if (attachmentsError) throw attachmentsError;
    await removeFiles(
      db,
      'parent-attachments',
      (attachments || []).map((attachment: { file_url: string }) => attachment.file_url)
    );
    if (attachments?.length) {
      await db
        .from('parent_attachments')
        .delete()
        .in(
          'id',
          attachments.map((attachment: { id: string }) => attachment.id)
        );
    }

    return NextResponse.json({
      status: 'success',
      cleaned: {
        visionScans: scans?.length || 0,
        speakingAudio: audioSessions?.length || 0,
        parentAttachments: attachments?.length || 0,
      },
    });
  } catch (error) {
    console.error('Storage retention cron failed:', error);
    return NextResponse.json({ status: 'error', error: 'Storage cleanup failed' }, { status: 500 });
  }
}
