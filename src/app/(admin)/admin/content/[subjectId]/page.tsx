import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { ChapterManager } from '@/components/features/admin/ChapterManager';
export const metadata: Metadata = { title: 'Admin - Chapters' };

export default async function AdminSubjectChaptersPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const supabase = await createAdminClient();
  const { data: subject } = await supabase.from('subjects').select('*').eq('id', subjectId).single();
  if (!subject) notFound();

  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .order('order_index', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{subject.name} — Chapters</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Subject boards: {(subject.boards || []).join(', ') || 'none'}. Har chapter ko specific boards se tag karo
          (e.g. sirf Pakistan ya sirf India) taake dono curriculum alag rahein — khaali chhodo to woh chapter subject
          ke saare boards par dikhega.
        </p>
      </div>
      <ChapterManager subjectId={subjectId} subjectBoards={subject.boards || []} initialChapters={chapters || []} />
    </div>
  );
}
