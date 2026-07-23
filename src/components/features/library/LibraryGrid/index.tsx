'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, BookCopy, BookOpen, LibraryBig, NotebookTabs, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

export type LibraryCatalogResource = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_type: string | null;
  resource_type?: 'text_book' | 'notes' | 'other';
  book_title?: string | null;
  content_section?: 'reading' | 'mcq' | 'short' | 'long';
  has_context_text?: boolean;
  drive_url?: string | null;
  light_file_url?: string | null;
  dark_file_url?: string | null;
  subjects?: { id: string; name: string; slug: string; color: string } | null;
  chapters?: { id: string; name: string; slug: string; order_index: number } | null;
};

type BookGroup = {
  key: string;
  title: string;
  subjectId: string;
  subjectName: string;
  subjectSlug: string;
  subjectColor: string;
  resources: LibraryCatalogResource[];
};

export function LibraryGrid({ resources }: { resources: LibraryCatalogResource[] }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'text_book' | 'notes'>(() =>
    searchParams.get('type') === 'notes' ? 'notes' : 'text_book'
  );
  const [query, setQuery] = useState(() => searchParams.get('search') || '');

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return resources.filter((resource) => {
      if ((resource.resource_type || 'text_book') !== tab) return false;
      if (!normalizedQuery) return true;
      return [
        resource.title,
        resource.description,
        resource.book_title,
        resource.subjects?.name,
        resource.chapters?.name,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [query, resources, tab]);

  const books = useMemo(() => {
    const groups = new Map<string, BookGroup>();
    for (const resource of filtered) {
      const subjectId = resource.subjects?.id || 'general';
      const subjectName = resource.subjects?.name || 'General';
      const subjectSlug = resource.subjects?.slug || 'general';
      const title = resource.book_title || (tab === 'text_book' ? `${subjectName} Text Book` : `${subjectName} Notes`);
      const key = `${subjectId}:${title.toLowerCase()}`;
      const group = groups.get(key) || {
        key,
        title,
        subjectId,
        subjectName,
        subjectSlug,
        subjectColor: resource.subjects?.color || '#7c3aed',
        resources: [],
      };
      group.resources.push(resource);
      groups.set(key, group);
    }
    return [...groups.values()].sort((left, right) =>
      `${left.subjectName}:${left.title}`.localeCompare(`${right.subjectName}:${right.title}`)
    );
  }, [filtered, tab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-full overflow-x-auto pb-1">
          <div className="glass border-border inline-flex w-max rounded-full border p-1">
            <button
              type="button"
              onClick={() => setTab('text_book')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all',
                tab === 'text_book' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Text Books
            </button>
            <button
              type="button"
              onClick={() => setTab('notes')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all',
                tab === 'notes' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              <NotebookTabs className="h-3.5 w-3.5" />
              Notes
            </button>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search books, subjects..."
            className="border-border bg-muted/30 focus:border-primary/50 w-full rounded-xl border py-2.5 pr-3 pl-9 text-sm outline-none"
          />
        </div>
      </div>

      {books.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {books.map((book) => {
            const chapters = [...new Set(book.resources.map((resource) => resource.chapters?.name).filter(Boolean))];
            const contextFiles = book.resources.filter((resource) => resource.has_context_text).length;
            const href = `/library/${book.subjectSlug}?type=${tab}&book=${encodeURIComponent(book.title)}`;
            return (
              <Link key={book.key} href={href} className="group block min-w-0">
                <Card className="border-border/70 bg-card/85 hover:border-primary/40 h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-xl">
                  <div
                    className="h-1.5 w-full"
                    style={{ background: `linear-gradient(90deg, ${book.subjectColor}, transparent)` }}
                  />
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                        <BookCopy className="h-6 w-6" />
                      </span>
                      <Badge variant="outline">{book.resources.length} files</Badge>
                    </div>
                    <Badge variant="secondary" className="mb-2 w-fit">
                      {book.subjectName}
                    </Badge>
                    <h2 className="text-lg leading-snug font-bold">{book.title}</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {chapters.length} chapter{chapters.length === 1 ? '' : 's'} organized by file type
                    </p>
                    <div className="text-muted-foreground mt-4 flex-1 space-y-1.5 text-xs">
                      {chapters.slice(0, 3).map((chapter) => (
                        <p key={chapter} className="truncate">
                          - {chapter}
                        </p>
                      ))}
                      {chapters.length > 3 && <p>+ {chapters.length - 3} more chapters</p>}
                    </div>
                    <div className="border-border/70 mt-5 flex items-center justify-between border-t pt-4 text-sm font-semibold">
                      <span>{contextFiles ? `${contextFiles} AI text ready` : 'Open chapters'}</span>
                      <ArrowRight className="text-primary h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={LibraryBig}
          title={query ? 'No matching books found' : tab === 'text_book' ? 'No text books yet' : 'No notes yet'}
          description={
            query
              ? 'Try a broader book, subject, or chapter search.'
              : 'Subject, book, and chapter-tagged files will appear here as soon as they are added.'
          }
          primaryHref="/ai-tutor"
          primaryLabel="Ask AI Tutor"
          secondaryHref="/study"
          secondaryLabel="Open Subjects"
        />
      )}
    </div>
  );
}
