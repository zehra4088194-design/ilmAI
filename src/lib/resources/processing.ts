import { createAdminClient } from '@/lib/supabase/server';
import {
  fetchResourceContext,
  getResourceForProcessing,
  type ProtectedResourceKind,
} from '@/lib/resources/server';
import { buildResourceSourceTest } from '@/lib/resources/source-fallback';

async function persistResourceMcqs(admin: any, kind: ProtectedResourceKind, resourceId: string, title: string, context: string) {
  const paper = buildResourceSourceTest(title, context, { mcq: 30, short: 15, long: 8 });
  const questions = paper.mcqs.slice(0, 30);
  if (!questions.length) throw new Error('The source did not contain enough material to prepare a question bank.');
  const { error } = await admin.from('resource_mcq_sets').upsert(
    {
      resource_kind: kind,
      resource_id: resourceId,
      questions,
      short_questions: paper.shortQs.slice(0, 15),
      long_questions: paper.longQs.slice(0, 8),
      status: 'ready',
      error_message: null,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'resource_kind,resource_id' }
  );
  if (error) throw new Error(`Resource MCQs could not be saved: ${error.message}`);
}

function splitIntoSourceChunks(context: string) {
  const normalized = context.replace(/\r\n/g, '\n').trim();
  const explicitPages = normalized
    .split(/\n\s*(?:page|p\.?)\s*[:#-]?\s*\d+\s*\n/gi)
    .map((value) => value.trim())
    .filter((value) => value.length >= 80);

  const chunks = explicitPages.length > 1 ? explicitPages : [];
  if (!chunks.length) {
    const targetSize = 2200;
    for (let index = 0; index < normalized.length; index += targetSize) {
      const chunk = normalized.slice(index, index + targetSize).trim();
      if (chunk.length >= 80) chunks.push(chunk);
    }
  }

  return chunks.slice(0, 400).map((content, index) => ({
    chunk_index: index,
    page_number: index + 1,
    content,
    metadata: {
      source: explicitPages.length > 1 ? 'page_marker' : 'text_window',
      char_count: content.length,
    },
  }));
}

async function persistResourceChunks(admin: any, kind: ProtectedResourceKind, resourceId: string, context: string) {
  const chunks = splitIntoSourceChunks(context);
  if (!chunks.length) return 0;

  await admin.from('resource_source_chunks').delete().eq('resource_kind', kind).eq('resource_id', resourceId);
  const { error } = await admin.from('resource_source_chunks').insert(
    chunks.map((chunk) => ({
      resource_kind: kind,
      resource_id: resourceId,
      ...chunk,
    }))
  );
  if (error) throw new Error(`Resource source chunks could not be saved: ${error.message}`);
  return chunks.length;
}

async function markImporterStatus(
  admin: any,
  kind: ProtectedResourceKind,
  resourceId: string,
  status: 'queued' | 'processing' | 'ready' | 'failed',
  notes?: string,
  chunkCount?: number
) {
  const table =
    kind === 'library' ? 'library_resources' : kind === 'past-paper' ? 'past_papers' : 'college_resources';
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (kind === 'past-paper') {
    payload.extraction_status = status;
    if (typeof chunkCount === 'number') payload.extracted_question_count = chunkCount;
  } else {
    payload.importer_status = status;
    payload.importer_notes = notes || null;
    if (typeof chunkCount === 'number') payload.extracted_chunk_count = chunkCount;
  }

  await admin.from(table).update(payload).eq('id', resourceId);
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
  if (error) throw new Error(`The resource could not be added to the OCR queue: ${error.message}`);
  await markImporterStatus(admin, kind, resourceId, 'queued', 'Waiting for OCR and source extraction.');
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
  if (error) throw new Error(`Resource OCR jobs could not be loaded: ${error.message}`);

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
      await markImporterStatus(admin, kind, job.resource_id, 'processing', 'Extracting readable text and building the chapter question bank.');
      const resource = await getResourceForProcessing(kind, job.resource_id);
      if (!resource) throw new Error('Resource no longer exists.');
      const context = await fetchResourceContext(resource);
      const chunkCount = await persistResourceChunks(admin, kind, job.resource_id, context);
      await persistResourceMcqs(admin, kind, job.resource_id, resource.title, context);
      await markImporterStatus(admin, kind, job.resource_id, 'ready', 'OCR, source chunks, MCQs, short questions, and long questions are ready.', chunkCount);
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
      await markImporterStatus(
        admin,
        job.resource_kind as ProtectedResourceKind,
        job.resource_id,
        'failed',
        message.slice(0, 1000)
      );
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
