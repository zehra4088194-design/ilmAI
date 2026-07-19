import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { PastPaperDetailClient } from '@/components/features/past-papers/PastPaperDetailClient';

export default async function PastPaperFilePage({ params }: { params: Promise<{ subjectSlug: string; chapterSlug: string; paperId: string }> }) {
  const { subjectSlug, chapterSlug, paperId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single()
    : { data: null };
  const { data: paper } = await (supabase.from('past_papers') as any).select('id, subject_id, chapter_id, board, grade_level, year, paper_type, total_questions, duration, is_verified, subjects(name, slug), chapters(name, slug)').eq('id', paperId).maybeSingle();
  if (!paper || (profile?.board && paper.board !== profile.board) || (profile?.grade_level && paper.grade_level !== profile.grade_level)) notFound();
  if ((paper.subjects?.slug || 'general') !== subjectSlug || (paper.chapters?.slug || 'full-syllabus') !== chapterSlug) notFound();
  const title = `${paper.subjects?.name || 'Past Paper'} - ${paper.year} ${paper.paper_type}`;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href={`/past-papers/${subjectSlug}/${chapterSlug}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"><ArrowLeft className="h-4 w-4" />Back to paper list</Link>
      <div className="border-border/70 bg-card/80 rounded-3xl border p-5 sm:p-7"><div className="flex flex-wrap gap-2"><Badge>{paper.subjects?.name || 'Past Paper'}</Badge><Badge variant="outline">{paper.chapters?.name || 'Full Syllabus'}</Badge></div><h1 className="mt-4 text-2xl font-bold sm:text-3xl">{paper.year} {paper.paper_type}</h1><p className="text-muted-foreground mt-2">{paper.total_questions} questions | {paper.duration} minutes</p></div>
      <PastPaperDetailClient paper={{ id: paper.id, title, isVerified: paper.is_verified }} />
    </div>
  );
}
