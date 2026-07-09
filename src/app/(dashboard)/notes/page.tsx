import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { NotesGrid } from '@/components/features/notes/NotesGrid';
export const metadata: Metadata = { title: 'Notes' };

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: notes } = await supabase.from('notes').select('*').eq('user_id', user!.id).order('updated_at', { ascending: false });
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">My Notes</h1><p className="text-muted-foreground">Apne notes likho, OCR se scan karo, ya AI se organize karo</p></div>
      <NotesGrid notes={notes || []} userId={user!.id} />
    </div>
  );
}
