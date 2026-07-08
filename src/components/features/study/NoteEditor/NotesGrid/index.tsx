'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, StickyNote, Star } from 'lucide-react';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils/format';

export function NotesGrid({ notes, userId }: { notes: any[]; userId: string }) {
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const createNote = async (content = '', title = 'New Note') => {
    setCreating(true);
    // notes.id is `uuid default uuid_generate_v4()` in the schema, so we let
    // Postgres generate it and read it back via .select() — don't assign our
    // own id here (nanoid() strings are NOT valid uuids and fail insertion).
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: userId, title, content, is_starred: false, is_public: false })
      .select('id')
      .single();
    if (error || !data) { toast.error('Note create nahi hua'); setCreating(false); return; }
    router.push(`/notes/${data.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="gradient" onClick={() => createNote()} loading={creating}><Plus className="w-4 h-4" />New Note</Button>
        <ScanUpload onTextExtracted={(text) => createNote(text, 'Scanned Note')} trigger={<Button variant="outline">📷 Scan Notes</Button>} />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map(note => (
          <Card key={note.id} className="hover:border-violet-500/30 transition-colors cursor-pointer" onClick={() => router.push(`/notes/${note.id}`)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <StickyNote className="w-5 h-5 text-amber-400" />
                {note.is_starred && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
              </div>
              <h3 className="font-semibold mb-1 truncate">{note.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{note.content || 'Empty note'}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(note.updated_at)}</p>
            </CardContent>
          </Card>
        ))}
        {notes.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">Koi notes nahi hain abhi. Naya note banao!</div>}
      </div>
    </div>
  );
}
