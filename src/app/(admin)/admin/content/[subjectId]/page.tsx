import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { ChapterManager } from '@/components/features/admin/ChapterManager';
import { GRADE_LEVELS } from '@/lib/constants';

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

  const gradeLabels = (subject.grade_levels || [])
    .map((level: string) => GRADE_LEVELS.find((g) => g.value === level)?.label || level)
    .join(', ');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{subject.name} - Chapters</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Subject boards: {(subject.boards || []).join(', ') || 'none'}. Subject classes: {gradeLabels || 'none'}.
          Har chapter ko board aur class dono se tag karo; khaali chhodo to woh subject ke saare selected boards/classes par dikhega.
        </p>
      </div>
      <ChapterManager
        subjectId={subjectId}
        subjectBoards={subject.boards || []}
        subjectGradeLevels={subject.grade_levels || []}
        initialChapters={chapters || []}
      />
    </div>
  );
}
