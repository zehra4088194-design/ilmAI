import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationIfEnabled } from '@/lib/notifications/preferences';
import type { ProtectedResourceKind } from '@/lib/resources/server';

const KINDS = new Set<ProtectedResourceKind>(['library', 'past-paper', 'college-resource']);

const RESOURCE_TABLES: Record<ProtectedResourceKind, string> = {
  library: 'library_resources',
  'past-paper': 'past_papers',
  'college-resource': 'college_resources',
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: 'error', error: 'Authentication is required' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind as ProtectedResourceKind;
  const resourceId = String(body.resourceId || '').trim();
  if (!KINDS.has(kind) || !resourceId) {
    return NextResponse.json({ status: 'error', error: 'The resource reference is invalid' }, { status: 400 });
  }

  const admin = createServiceClient() as any;
  const table = RESOURCE_TABLES[kind];
  // Column shape differs per kind: college_resources has no subject_id/chapter_id
  // (scoped by stream/degree/semester instead), past_papers has no title.
  const selectColumns =
    kind === 'past-paper'
      ? 'id, subject_id, chapter_id, subjects(name)'
      : kind === 'college-resource'
        ? 'id, title'
        : 'id, title, subject_id, chapter_id';
  const { data: resource } = await admin.from(table).select(selectColumns).eq('id', resourceId).maybeSingle();
  if (!resource) return NextResponse.json({ status: 'error', error: 'The resource was not found.' }, { status: 404 });

  const title = kind === 'past-paper' ? resource.subjects?.name || 'Past paper' : resource.title || 'this file';
  const subjectId = kind === 'college-resource' ? null : resource.subject_id || null;
  const chapterId = kind === 'college-resource' ? null : resource.chapter_id || null;

  const { data: existing } = await admin
    .from('resource_reads')
    .select('id, notified_test_prompt')
    .eq('user_id', user.id)
    .eq('resource_kind', kind)
    .eq('resource_id', resourceId)
    .maybeSingle();

  const alreadyNotified = Boolean(existing?.notified_test_prompt);

  const { error } = await admin.from('resource_reads').upsert(
    {
      user_id: user.id,
      resource_kind: kind,
      resource_id: resourceId,
      subject_id: subjectId,
      chapter_id: chapterId,
      completed: true,
      completed_at: new Date().toISOString(),
      notified_test_prompt: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,resource_kind,resource_id' }
  );
  if (error) return NextResponse.json({ status: 'error', error: 'Could not save your reading progress.' }, { status: 500 });

  if (!alreadyNotified) {
    const params = new URLSearchParams();
    if (subjectId) params.set('subject', subjectId);
    if (chapterId) params.set('chapter', chapterId);
    await createNotificationIfEnabled(admin, 'routineTestAlerts', {
      user_id: user.id,
      type: 'REMINDER',
      title: 'Ready for a quick test?',
      message: `You finished "${title}". Want to test yourself on it?`,
      link: `/practice${params.toString() ? `?${params.toString()}` : ''}`,
    });
  }

  return NextResponse.json({ status: 'success' });
}
