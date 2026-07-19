'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';

export type PastPaperCatalogItem = {
  id: string;
  board: string;
  grade_level?: string | null;
  year: number;
  paper_type: string;
  total_questions: number;
  duration: number;
  is_verified: boolean;
  subjects?: { id: string; name: string; slug: string; color: string } | null;
  chapters?: { id: string; name: string; slug: string } | null;
};

export function PastPapersGrid({
  papers,
  board,
  gradeLevel,
}: {
  papers: PastPaperCatalogItem[];
  board?: string;
  gradeLevel?: string;
}) {
  const [query, setQuery] = useState('');
  const grouped = useMemo(() => {
    const value = query.toLowerCase().trim();
    const groups = new Map<
      string,
      { subject: NonNullable<PastPaperCatalogItem['subjects']> | null; papers: PastPaperCatalogItem[] }
    >();
    for (const paper of papers) {
      if (
        value &&
        ![paper.subjects?.name, paper.chapters?.name, String(paper.year), paper.paper_type].some((item) =>
          item?.toLowerCase().includes(value)
        )
      ) {
        continue;
      }
      const key = paper.subjects?.id || 'general';
      const group = groups.get(key) || { subject: paper.subjects || null, papers: [] };
      group.papers.push(paper);
      groups.set(key, group);
    }
    return [...groups.values()].sort((left, right) =>
      (left.subject?.name || 'General').localeCompare(right.subject?.name || 'General')
    );
  }, [papers, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge>{BOARDS.find((item) => item.value === board)?.label || 'Your board'}</Badge>
          <Badge variant="outline">{GRADE_LEVELS.find((item) => item.value === gradeLevel)?.label || 'Your class'}</Badge>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subjects, years..." className="border-border bg-muted/30 w-full rounded-xl border py-2.5 pr-3 pl-9 text-sm outline-none" />
        </div>
      </div>

      {grouped.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {grouped.map(({ subject, papers: subjectPapers }) => {
            const chapterNames = [...new Set(subjectPapers.map((paper) => paper.chapters?.name || 'Full syllabus'))];
            const years = subjectPapers.map((paper) => paper.year);
            const slug = subject?.slug || 'general';
            return (
              <Link key={subject?.id || 'general'} href={`/past-papers/${slug}`} className="group block">
                <Card className="border-border/70 bg-card/85 hover:border-primary/40 h-full overflow-hidden transition-all group-hover:-translate-y-1 group-hover:shadow-xl">
                  <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${subject?.color || '#7c3aed'}, transparent)` }} />
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-2xl"><FileText className="h-6 w-6" /></span>
                      <Badge variant="outline">{subjectPapers.length} papers</Badge>
                    </div>
                    <h2 className="mt-4 text-xl font-bold">{subject?.name || 'General Papers'}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{chapterNames.length} chapter group{chapterNames.length === 1 ? '' : 's'}</p>
                    <div className="text-muted-foreground mt-4 flex-1 space-y-1.5 text-xs">
                      {chapterNames.slice(0, 3).map((chapter) => <p key={chapter} className="truncate">- {chapter}</p>)}
                    </div>
                    <div className="border-border/70 mt-5 flex items-center justify-between border-t pt-4 text-sm font-semibold">
                      <span>{Math.min(...years)} - {Math.max(...years)}</span>
                      <ArrowRight className="text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={FileText} title={query ? 'No matching papers found' : 'No past papers for your class yet'} description="Admin class, subject aur chapter tagged papers add kare to yahan show honge." primaryHref="/ai-tutor" primaryLabel="Ask AI Tutor" secondaryHref="/practice" secondaryLabel="AI Testing" />
      )}
    </div>
  );
}
