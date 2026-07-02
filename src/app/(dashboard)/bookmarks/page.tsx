import { Metadata } from 'next';
import { Bookmark } from 'lucide-react';
export const metadata: Metadata = { title: 'Bookmarks' };
export default function BookmarksPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Bookmarks</h1><p className="text-muted-foreground">Saved questions aur notes ek jagah</p></div>
      <div className="text-center py-16 text-muted-foreground">
        <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Koi bookmark nahi hai abhi.</p>
        <p className="text-sm">Quiz ya study materials se bookmark icon click karo.</p>
      </div>
    </div>
  );
}
