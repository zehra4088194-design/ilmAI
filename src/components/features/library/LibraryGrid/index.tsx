'use client';
import { useState, useMemo } from 'react';
import { Search, Globe2, MapPin, LibraryBig } from 'lucide-react';
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
  subjects?: { name: string; color: string } | null;
}

export function LibraryGrid({ resources }: { resources: RawResource[] }) {
  const [tab, setTab] = useState<'local' | 'international'>('local');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return resources
      .filter((r) => r.category === tab)
      .filter((r) => !query || r.title.toLowerCase().includes(query.toLowerCase()));
  }, [resources, tab, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="inline-flex glass rounded-full p-1 border border-border w-fit">
          <button onClick={() => setTab('local')} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all', tab === 'local' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <MapPin className="w-3.5 h-3.5" />Pakistani Books
          </button>
          <button onClick={() => setTab('international')} className={cn('flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all', tab === 'international' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
            <Globe2 className="w-3.5 h-3.5" />International Books
          </button>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search books..." className="w-full bg-muted/30 border border-border rounded-lg pl-9 pr-3 py-2 text-sm" />
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
              title={query ? 'No matching books found' : tab === 'local' ? 'No Pakistani books for this class yet' : 'No international books for this class yet'}
              description={query ? 'Search ko thora broad karo, ya AI Tutor se topic explain karwa lo.' : 'Resources add hotay hi yahan show honge. Tab tak AI Tutor aur notes tools se study continue kar sakte ho.'}
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
