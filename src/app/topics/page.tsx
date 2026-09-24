import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Search } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/service';

export const metadata: Metadata = {
  title: 'Study Topics | ilm AI',
  description: 'Browse public chapter study topics by subject. Find notes, MCQs, questions, and past-paper resources on ilm AI.',
  alternates: { canonical: '/topics' },
};

export default async function TopicsIndexPage() {
  const db = createServiceClient();
  const [{ data: subjects }, { data: chapters }, { data: resources }, { data: questions }] = await Promise.all([
    db.from('subjects').select('id,name,slug').eq('is_active', true).order('name'),
    db.from('chapters').select('id,name,slug,subject_id,order_index').eq('is_active', true).order('order_index').order('name'),
    (db.from('library_resources') as any).select('chapter_id').eq('importer_status', 'approved').not('chapter_id', 'is', null),
    (db.from('questions') as any).select('chapter_id').eq('is_verified', true).not('correct_answer', 'is', null).not('chapter_id', 'is', null),
  ]);

  const supportedChapterIds = new Set<string>([
    ...(resources || []).map((row: { chapter_id: string | null }) => row.chapter_id).filter(Boolean) as string[],
    ...(questions || []).map((row: { chapter_id: string | null }) => row.chapter_id).filter(Boolean) as string[],
  ]);

  const chapterGroups = new Map<string, Array<{ id: string; name: string; slug: string }>>();
  for (const chapter of chapters || []) {
    if (!chapter.slug || !supportedChapterIds.has(chapter.id)) continue;
    const list = chapterGroups.get(chapter.subject_id) || [];
    list.push({ id: chapter.id, name: chapter.name, slug: chapter.slug });
    chapterGroups.set(chapter.subject_id, list);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-border/70 bg-card/70 p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Search className="h-5 w-5" /> Public study topics
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Study Topics, Notes, MCQs & Past Papers</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Open a chapter topic page to see the available public study resources, verified practice questions, indexed excerpts, and past-paper links for that subject.
          </p>
        </header>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {(subjects || []).map((subject) => {
            const subjectChapters = chapterGroups.get(subject.id) || [];
            if (!subjectChapters.length) return null;
            return (
              <section key={subject.id} className="rounded-3xl border border-border/70 bg-card/40 p-5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">{subject.name}</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{subjectChapters.length} public chapter topics</p>
                <div className="mt-4 space-y-2">
                  {subjectChapters.map((chapter) => (
                    <Link
                      key={chapter.id}
                      href={`/topics/${subject.slug}/${chapter.slug}`}
                      className="block rounded-xl border border-border/60 px-3 py-2.5 text-sm font-medium hover:border-primary/40 hover:text-primary"
                    >
                      {chapter.name}
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
