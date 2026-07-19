import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Files } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AdSenseBanner } from '@/components/features/ads/AdSenseBanner';

export default async function PastPaperSubjectPage({ params }: { params: Promise<{ subjectSlug: string }> }) {
  const { subjectSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single()
    : { data: null };
  const { data: subject } = subjectSlug === 'general'
    ? { data: null }
    : await supabase.from('subjects').select('id, name, slug, color').eq('slug', subjectSlug).maybeSingle();
  if (subjectSlug !== 'general' && !subject) notFound();
  let papersQuery = (supabase.from('past_papers') as any)
    .select('id, year, paper_type, chapter_id, chapters(id, name, slug)')
    .order('year', { ascending: false });
  if (profile?.board) papersQuery = papersQuery.eq('board', profile.board);
  if (profile?.grade_level) papersQuery = papersQuery.eq('grade_level', profile.grade_level);
  papersQuery = subject ? papersQuery.eq('subject_id', subject.id) : papersQuery.is('subject_id', null);
  const { data: papers } = await papersQuery;
  const groups = new Map<string, { id: string; name: string; slug: string; papers: any[] }>();
  for (const paper of papers || []) {
    const chapter = paper.chapters;
    const key = chapter?.id || 'full-syllabus';
    const group: { id: string; name: string; slug: string; papers: any[] } = groups.get(key) || {
      id: key,
      name: chapter?.name || 'Full Syllabus',
      slug: chapter?.slug || 'full-syllabus',
      papers: [],
    };
    group.papers.push(paper);
    groups.set(key, group);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/past-papers" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium"><ArrowLeft className="h-4 w-4" />Back to subjects</Link>
      <section className="border-border/70 from-primary/15 via-card to-cyan-500/10 rounded-3xl border bg-gradient-to-br p-5 sm:p-7"><Badge>{subject?.name || 'General Papers'}</Badge><h1 className="mt-4 text-3xl font-bold">Choose a chapter or syllabus</h1><p className="text-muted-foreground mt-2">The next page will show paper files from the selected group only.</p></section>
      <AdSenseBanner slot="inline" className="mx-auto max-w-5xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[...groups.values()].map((group) => (
          <Link key={group.id} href={`/past-papers/${subjectSlug}/${group.slug}`} className="group block"><Card className="border-border/70 hover:border-primary/40 h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg"><CardContent className="flex items-center gap-4 p-5"><span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><Files className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold sm:text-lg">{group.name}</h2><p className="text-muted-foreground mt-1 text-sm">{group.papers.length} paper files</p></div><ArrowRight className="text-primary h-4 w-4 transition-transform group-hover:translate-x-1" /></CardContent></Card></Link>
        ))}
      </div>
    </div>
  );
}
