import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { LectureGrid, type StudyLecture } from '@/components/features/study/LectureGrid';

export default async function LectureChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectSlug: string; chapterSlug: string }>;
  searchParams: Promise<{ lecture?: string }>;
}) {
  const [{ subjectSlug, chapterSlug }, queryParams] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single();
  const { data: subject } = await supabase
    .from('subjects')
    .select('id, name, slug, boards, grade_levels')
    .eq('slug', subjectSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!subject) notFound();
  if (
    (subject.boards?.length && profile?.board && !subject.boards.includes(profile.board)) ||
    (subject.grade_levels?.length && profile?.grade_level && !subject.grade_levels.includes(profile.grade_level))
  ) {
    notFound();
  }
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, slug, description, boards, grade_levels')
    .eq('subject_id', subject.id)
    .eq('slug', chapterSlug)
    .eq('is_active', true)
    .maybeSingle();
  if (!chapter) notFound();
  if (
    (chapter.boards?.length && profile?.board && !chapter.boards.includes(profile.board)) ||
    (chapter.grade_levels?.length && profile?.grade_level && !chapter.grade_levels.includes(profile.grade_level))
  ) {
    notFound();
  }
  const { data: lectures } = await supabase
    .from('lectures')
    .select('id, title, youtube_url, thumbnail_url, kind, exercise_number, duration_seconds')
    .eq('chapter_id', chapter.id)
    .order('order_index')
    .order('created_at');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/lectures/${subject.slug}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {subject.name} chapters
      </Link>
      <section className="border-border/70 bg-card/80 rounded-3xl border p-5 sm:p-7">
        <div className="flex flex-wrap gap-2">
          <Badge>{subject.name}</Badge>
          <Badge variant="outline" className="gap-1">
            <Video className="h-3.5 w-3.5" />
            {lectures?.length || 0} lectures
          </Badge>
        </div>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{chapter.name}</h1>
        <p className="text-muted-foreground mt-2">
          {chapter.description || 'Only lectures for this chapter are shown below.'}
        </p>
      </section>
      <LectureGrid lectures={(lectures || []) as StudyLecture[]} autoOpenId={queryParams.lecture} />
    </div>
  );
}
