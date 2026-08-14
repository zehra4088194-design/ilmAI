'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, BookCopy, BookOpen, FileQuestion, LibraryBig, Network, NotebookTabs, Search } from 'lucide-react';
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
  resource_type?: CatalogResourceType | 'other';
  book_title?: string | null;
  content_section?: 'reading' | 'mcq' | 'short' | 'long' | 'numericals';
  has_context_text?: boolean;
  drive_url?: string | null;
  light_file_url?: string | null;
  dark_file_url?: string | null;
  subjects?: { id: string; name: string; slug: string; color: string } | null;
  chapters?: { id: string; name: string; slug: string; order_index: number } | null;
};

export type CatalogResourceType = 'text_book' | 'notes' | 'pairing_scheme' | 'guess_paper';

const RESOURCE_TABS: Array<{
  value: CatalogResourceType;
  label: string;
  emptyLabel: string;
  collectionLabel: string;
  icon: typeof BookOpen;
}> = [
  { value: 'text_book', label: 'Text Books', emptyLabel: 'text books', collectionLabel: 'Text Book', icon: BookOpen },
  { value: 'notes', label: 'Notes', emptyLabel: 'notes', collectionLabel: 'Notes', icon: NotebookTabs },
  {
    value: 'pairing_scheme',
    label: 'Pairing Schemes',
    emptyLabel: 'pairing schemes',
    collectionLabel: 'Pairing Scheme',
    icon: Network,
  },
  {
    value: 'guess_paper',
    label: 'Guess Papers',
    emptyLabel: 'guess papers',
    collectionLabel: 'Guess Papers',
    icon: FileQuestion,
  },
];

function requestedResourceType(value: string | null): CatalogResourceType {
  return RESOURCE_TABS.some((tab) => tab.value === value) ? (value as CatalogResourceType) : 'text_book';
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<CatalogResourceType>(() => requestedResourceType(searchParams.get('type')));
  const [query, setQuery] = useState(() => searchParams.get('search') || '');

  useEffect(() => {
    setTab(requestedResourceType(searchParams.get('type')));
  }, [searchParams]);

  function selectTab(value: CatalogResourceType) {
    setTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', value);
    router.replace(`/library?${params.toString()}`, { scroll: false });
  }

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
      const collectionLabel = RESOURCE_TABS.find((item) => item.value === tab)?.collectionLabel || 'Resources';
      const title = resource.book_title || `${subjectName} ${collectionLabel}`;
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
            {RESOURCE_TABS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => selectTab(item.value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all',
                    tab === item.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
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
                      <Badge variant="outline">{book.resources.length} resources</Badge>
                    </div>
                    <Badge variant="secondary" className="mb-2 w-fit">
                      {book.subjectName}
                    </Badge>
                    <h2 className="text-lg leading-snug font-bold">{book.title}</h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {chapters.length} chapter{chapters.length === 1 ? '' : 's'} organized by resource type
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
                      <span>{contextFiles ? 'Study tools ready' : 'Open chapters'}</span>
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
          title={
            query
              ? 'No matching resources found'
              : `No ${RESOURCE_TABS.find((item) => item.value === tab)?.emptyLabel || 'resources'} yet`
          }
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
