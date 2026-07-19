import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, FileCheck2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AdSenseBanner } from '@/components/features/ads/AdSenseBanner';

export default async function PastPaperChapterPage({ params }: { params: Promise<{ subjectSlug: string; chapterSlug: string }> }) {
  const { subjectSlug, chapterSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single()
    : { data: null };
  const { data: subject } = subjectSlug === 'general' ? { data: null } : await supabase.from('subjects').select('id, name, slug').eq('slug', subjectSlug).maybeSingle();
  if (subjectSlug !== 'general' && !subject) notFound();
  const { data: chapter } = chapterSlug === 'full-syllabus' || !subject ? { data: null } : await supabase.from('chapters').select('id, name, slug').eq('subject_id', subject.id).eq('slug', chapterSlug).maybeSingle();
  if (chapterSlug !== 'full-syllabus' && !chapter) notFound();
  let papersQuery = (supabase.from('past_papers') as any).select('id, year, paper_type, total_questions, duration, is_verified').order('year', { ascending: false });
  if (profile?.board) papersQuery = papersQuery.eq('board', profile.board);
  if (profile?.grade_level) papersQuery = papersQuery.eq('grade_level', profile.grade_level);
  papersQuery = subject ? papersQuery.eq('subject_id', subject.id) : papersQuery.is('subject_id', null);
  papersQuery = chapter ? papersQuery.eq('chapter_id', chapter.id) : papersQuery.is('chapter_id', null);
  const { data: papers } = await papersQuery;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href={`/past-papers/${subjectSlug}`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"><ArrowLeft className="h-4 w-4" />Back to chapter groups</Link>
      <div className="border-border/70 bg-card/80 rounded-3xl border p-5 sm:p-7"><div className="flex flex-wrap gap-2"><Badge>{subject?.name || 'General Papers'}</Badge><Badge variant="outline">{chapter?.name || 'Full Syllabus'}</Badge></div><h1 className="mt-4 text-2xl font-bold sm:text-3xl">Select a paper</h1><p className="text-muted-foreground mt-2">The reader page will load only the selected PDF.</p></div>
      <AdSenseBanner slot="inline" className="mx-auto max-w-5xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {(papers || []).map((paper: any) => (
          <Link key={paper.id} href={`/past-papers/${subjectSlug}/${chapterSlug}/${paper.id}`} className="group block"><Card className="border-border/70 hover:border-primary/40 h-full transition-all group-hover:shadow-lg"><CardContent className="flex items-center gap-4 p-5"><span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><FileCheck2 className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{paper.year} {paper.paper_type}</h2><p className="text-muted-foreground mt-1 text-xs">{paper.total_questions} questions | {paper.duration} min</p></div>{paper.is_verified && <Badge variant="success" className="hidden sm:inline-flex">Verified</Badge>}<ArrowRight className="text-primary h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" /></CardContent></Card></Link>
        ))}
      </div>
    </div>
  );
}
