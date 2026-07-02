import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { LibraryGrid } from '@/components/features/library/LibraryGrid';
export const metadata: Metadata = { title: 'Library' };

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: resources } = await supabase.from('library_resources').select('*, subjects(name, color)').order('created_at', { ascending: false });
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Library</h1><p className="text-muted-foreground">Books aur notes — Google Drive se direct access, local aur international dono</p></div>
      <LibraryGrid resources={resources || []} />
    </div>
  );
}
