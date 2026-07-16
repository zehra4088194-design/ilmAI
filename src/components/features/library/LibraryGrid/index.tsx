'use client';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, NotebookTabs, Search, LibraryBig } from 'lucide-react';
import { GoogleDriveResourceCard } from '@/components/features/library/GoogleDriveResourceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils/cn';

interface RawResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_type: string | null;
  resource_type?: 'text_book' | 'notes' | 'other';
  subjects?: { name: string; color: string } | null;
  chapters?: { name: string } | null;
}

export function LibraryGrid({ resources }: { resources: RawResource[] }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'text_book' | 'notes'>(() =>
    searchParams.get('type') === 'notes' ? 'notes' : 'text_book'
  );
  const [query, setQuery] = useState(() => searchParams.get('search') || '');

  const filtered = useMemo(() => {
    return resources
      .filter((r) => (r.resource_type || 'text_book') === tab)
      .filter((r) => !query || r.title.toLowerCase().includes(query.toLowerCase()));
  }, [resources, tab, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-full overflow-x-auto pb-1">
          <div className="glass border-border inline-flex w-max rounded-full border p-1">
            <button
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
        <div className="relative w-full sm:w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources..."
            className="bg-muted/30 border-border w-full rounded-lg border py-2 pr-3 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <GoogleDriveResourceCard
            key={r.id}
            resource={{
              id: r.id,
              title: r.title,
              description: r.description,
              fileType: r.file_type,
              subjectName: r.subjects?.name,
              subjectColor: r.subjects?.color,
              chapterName: r.chapters?.name,
            }}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={LibraryBig}
              title={
                query
                  ? 'No matching resources found'
                  : tab === 'text_book'
                    ? 'No text books for your class yet'
                    : 'No notes for your class yet'
              }
              description={
                query
                  ? 'Search ko thora broad karo, ya AI Tutor se topic explain karwa lo.'
                  : 'Admin se class-tagged resources add hote hi yahan show honge. Baaki classes ka content yahan nahi dikhega.'
              }
              primaryHref="/ai-tutor"
              primaryLabel="Ask AI Tutor"
              secondaryHref="/notes"
              secondaryLabel="Open Notes"
            />
          </div>
        )}
      </div>
    </div>
  );
}
