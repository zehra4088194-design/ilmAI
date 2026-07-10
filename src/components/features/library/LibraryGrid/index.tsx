'use client';
import { useState, useMemo } from 'react';
import { BookOpen, NotebookTabs, Search, LibraryBig } from 'lucide-react';
import { GoogleDriveResourceCard } from '@/components/features/library/GoogleDriveResourceCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils/cn';

interface RawResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  drive_url: string;
  drive_file_id: string | null;
  file_type: string | null;
  resource_type?: 'text_book' | 'notes' | 'other';
  subjects?: { name: string; color: string } | null;
  chapters?: { name: string } | null;
}

export function LibraryGrid({ resources }: { resources: RawResource[] }) {
  const [tab, setTab] = useState<'text_book' | 'notes'>('text_book');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return resources
      .filter((r) => (r.resource_type || 'text_book') === tab)
      .filter((r) => !query || r.title.toLowerCase().includes(query.toLowerCase()));
  }, [resources, tab, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="max-w-full overflow-x-auto pb-1">
          <div className="inline-flex glass rounded-full p-1 border border-border w-max">
          <button onClick={() => setTab('text_book')} className={cn('flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all', tab === 'text_book' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <BookOpen className="w-3.5 h-3.5" />Text Books
          </button>
          <button onClick={() => setTab('notes')} className={cn('flex items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all', tab === 'notes' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <NotebookTabs className="w-3.5 h-3.5" />Notes
          </button>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resources..." className="w-full bg-muted/30 border border-border rounded-lg pl-9 pr-3 py-2 text-sm" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => (
          <GoogleDriveResourceCard
            key={r.id}
            resource={{
              id: r.id, title: r.title, description: r.description, driveUrl: r.drive_url,
              driveFileId: r.drive_file_id, fileType: r.file_type, subjectName: r.subjects?.name,
              subjectColor: r.subjects?.color,
            }}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={LibraryBig}
              title={query ? 'No matching resources found' : tab === 'text_book' ? 'No text books for your class yet' : 'No notes for your class yet'}
              description={query ? 'Search ko thora broad karo, ya AI Tutor se topic explain karwa lo.' : 'Admin se class-tagged resources add hote hi yahan show honge. Baaki classes ka content yahan nahi dikhega.'}
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
