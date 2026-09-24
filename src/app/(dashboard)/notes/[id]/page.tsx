import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { NoteEditor } from '@/components/features/notes/NoteEditor';

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: note } = await supabase.from('notes').select('*').eq('id', id).eq('user_id', user!.id).single();
  if (!note) notFound();
  return (
    <div className="max-w-4xl mx-auto">
      <NoteEditor note={note} />
    </div>
  );
}
