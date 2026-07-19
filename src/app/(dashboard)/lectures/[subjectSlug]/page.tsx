import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, PlayCircle, Video } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default async function LectureSubjectPage({ params }: { params: Promise<{ subjectSlug: string }> }) {
  const { subjectSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single();
  const { data: subject } = await supabase
    .from('subjects')
    .select('id, name, slug, color, boards, grade_levels')
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

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, name, slug, description, order_index, boards, grade_levels')
    .eq('subject_id', subject.id)
    .eq('is_active', true)
    .order('order_index');
  const scopedChapters = (chapters || []).filter(
    (chapter) =>
      (!chapter.boards?.length || !profile?.board || chapter.boards.includes(profile.board)) &&
      (!chapter.grade_levels?.length || !profile?.grade_level || chapter.grade_levels.includes(profile.grade_level))
  );
  const { data: lectures } = scopedChapters.length
    ? await supabase.from('lectures').select('id, chapter_id').in('chapter_id', scopedChapters.map((chapter) => chapter.id))
    : { data: [] as Array<{ id: string; chapter_id: string }> };
  const counts = new Map<string, number>();
  for (const lecture of lectures || []) counts.set(lecture.chapter_id, (counts.get(lecture.chapter_id) || 0) + 1);
  const visibleChapters = scopedChapters.filter((chapter) => (counts.get(chapter.id) || 0) > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/lectures" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"><ArrowLeft className="h-4 w-4" />Back to lecture subjects</Link>
      <section className="border-border/70 from-primary/15 via-card to-cyan-500/10 rounded-3xl border bg-gradient-to-br p-5 sm:p-7">
        <Badge className="gap-1"><Video className="h-3.5 w-3.5" />{subject.name}</Badge>
        <h1 className="mt-4 text-3xl font-bold">Choose a chapter</h1>
        <p className="text-muted-foreground mt-2">Each chapter has its own page and lecture player.</p>
      </section>
      <div className="space-y-3">
        {visibleChapters.map((chapter, index) => (
          <Link key={chapter.id} href={`/lectures/${subject.slug}/${chapter.slug}`} className="group block">
            <Card className="border-border/70 hover:border-primary/40 transition-all group-hover:shadow-lg"><CardContent className="flex items-center gap-4 p-5"><span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold">{index + 1}</span><div className="min-w-0 flex-1"><h2 className="font-semibold sm:text-lg">{chapter.name}</h2><p className="text-muted-foreground mt-1 line-clamp-1 text-sm">{chapter.description || `${counts.get(chapter.id) || 0} video lectures`}</p></div><Badge variant="outline" className="hidden sm:inline-flex">{counts.get(chapter.id) || 0} videos</Badge><ArrowRight className="text-primary h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" /></CardContent></Card>
          </Link>
        ))}
        {!visibleChapters.length && <Card className="border-dashed"><CardContent className="flex min-h-64 flex-col items-center justify-center text-center"><PlayCircle className="text-primary mb-3 h-9 w-9" /><p className="font-semibold">No lectures have been added for this subject yet.</p></CardContent></Card>}
      </div>
    </div>
  );
}
