import { Metadata } from 'next';
import { Bookmark } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
export const metadata: Metadata = { title: 'Bookmarks' };
export default function BookmarksPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Bookmarks</h1><p className="text-muted-foreground">Saved questions and notes in one place</p></div>
      <EmptyState
        icon={Bookmark}
        title="No bookmarks yet"
        description="Your saved questions, notes, and resources will appear here in one place."
        primaryHref="/practice"
        primaryLabel="Practice Questions"
        secondaryHref="/library"
        secondaryLabel="Open Library"
      />
    </div>
  );
}
