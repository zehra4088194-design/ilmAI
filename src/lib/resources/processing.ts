import { createAdminClient } from '@/lib/supabase/server';
import {
  fetchResourceContext,
  getResourceForProcessing,
  type ProtectedResourceKind,
} from '@/lib/resources/server';
import { buildResourceSourceTest } from '@/lib/resources/source-fallback';

async function persistResourceMcqs(admin: any, kind: ProtectedResourceKind, resourceId: string, title: string, context: string) {
  const paper = buildResourceSourceTest(title, context, { mcq: 30, short: 0, long: 0 });
  const questions = paper.mcqs.slice(0, 30);
  if (questions.length < 30) throw new Error('Source se 30 MCQs prepare nahi ho sake.');
  const { error } = await admin.from('resource_mcq_sets').upsert(
    {
      resource_kind: kind,
      resource_id: resourceId,
      questions,
      status: 'ready',
      error_message: null,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'resource_kind,resource_id' }
  );
  if (error) throw new Error(`Resource MCQs save nahi huay: ${error.message}`);
}

export async function queueResourceContextProcessing(kind: ProtectedResourceKind, resourceId: string) {
  const admin = (await createAdminClient()) as any;
  const { error } = await admin.from('resource_processing_jobs').upsert(
    {
      resource_kind: kind,
      resource_id: resourceId,
      status: 'queued',
      attempts: 0,
      last_error: null,
      locked_at: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'resource_kind,resource_id' }
  );
  if (error) throw new Error(`Resource OCR queue nahi hui: ${error.message}`);
}

export async function processQueuedResourceContexts(maxJobs = 1) {
  const admin = (await createAdminClient()) as any;
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { error: recoveryError } = await admin
    .from('resource_processing_jobs')
    .update({ status: 'failed', locked_at: null, last_error: 'Worker lock expired; retry queued.' })
    .eq('status', 'processing')
    .lt('locked_at', staleBefore);
  if (recoveryError) console.error('Stale resource OCR lock recovery failed:', recoveryError);

  const { data: jobs, error } = await admin
    .from('resource_processing_jobs')
    .select('id, resource_kind, resource_id, attempts, max_attempts')
    .in('status', ['queued', 'failed'])
    .order('created_at', { ascending: true })
    .limit(Math.max(1, Math.min(5, maxJobs)));
  if (error) throw new Error(`Resource OCR jobs load nahi huay: ${error.message}`);

  const results: Array<{ id: string; status: 'completed' | 'failed'; error?: string }> = [];
  for (const job of jobs || []) {
    if (Number(job.attempts) >= Number(job.max_attempts)) continue;
    const lockedAt = new Date().toISOString();
    const { data: locked } = await admin
      .from('resource_processing_jobs')
      .update({ status: 'processing', locked_at: lockedAt, updated_at: lockedAt })
      .eq('id', job.id)
      .in('status', ['queued', 'failed'])
      .select('id')
      .maybeSingle();
    if (!locked) continue;

    try {
      const kind = job.resource_kind as ProtectedResourceKind;
      const resource = await getResourceForProcessing(kind, job.resource_id);
      if (!resource) throw new Error('Resource no longer exists.');
      const context = await fetchResourceContext(resource);
      await persistResourceMcqs(admin, kind, job.resource_id, resource.title, context);
      await admin
        .from('resource_processing_jobs')
        .update({
          status: 'completed',
          attempts: Number(job.attempts) + 1,
          last_error: null,
          locked_at: null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      results.push({ id: job.id, status: 'completed' });
    } catch (processingError) {
      const message = processingError instanceof Error ? processingError.message : 'Unknown OCR processing error';
      await admin
        .from('resource_processing_jobs')
        .update({
          status: 'failed',
          attempts: Number(job.attempts) + 1,
          last_error: message.slice(0, 1000),
          locked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      results.push({ id: job.id, status: 'failed', error: message });
    }
  }
  return results;
}
