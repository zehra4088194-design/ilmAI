'use client';
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, StickyNote, Star, Search, Folder, FolderPlus, X } from 'lucide-react';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

// Each folder gets a deterministic colour from this set so the same folder
// name always renders the same way across a session, without needing a
// separate folders table.
const FOLDER_PALETTE = [
  { bg: 'bg-violet-500/15', text: 'text-violet-300', ring: 'ring-violet-500/30', dot: 'bg-violet-400' },
  { bg: 'bg-pink-500/15', text: 'text-pink-300', ring: 'ring-pink-500/30', dot: 'bg-pink-400' },
  { bg: 'bg-amber-500/15', text: 'text-amber-300', ring: 'ring-amber-500/30', dot: 'bg-amber-400' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-300', ring: 'ring-emerald-500/30', dot: 'bg-emerald-400' },
  { bg: 'bg-sky-500/15', text: 'text-sky-300', ring: 'ring-sky-500/30', dot: 'bg-sky-400' },
  { bg: 'bg-orange-500/15', text: 'text-orange-300', ring: 'ring-orange-500/30', dot: 'bg-orange-400' },
];

function folderStyle(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FOLDER_PALETTE[hash % FOLDER_PALETTE.length]!;
}

interface Note {
  id: string;
  title: string;
  content: string;
  is_starred: boolean;
  folder: string | null;
  updated_at: string;
}

export function NotesGrid({ notes, userId }: { notes: Note[]; userId: string }) {
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const folders = useMemo(() => {
    const set = new Set(notes.map(n => n.folder).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    let list = notes;
    if (activeFolder) list = list.filter(n => n.folder === activeFolder);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(n => n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));
    }
    // Pinned (starred) notes always float to the top.
    return [...list].sort((a, b) => Number(b.is_starred) - Number(a.is_starred));
  }, [notes, activeFolder, query]);

  const createNote = async (content = '', title = 'New Note') => {
    setCreating(true);
    // notes.id is `uuid default uuid_generate_v4()` in the schema, so we let
    // Postgres generate it and read it back via .select() â€” don't assign our
    // own id here (nanoid() strings are NOT valid uuids and fail insertion).
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: userId, title, content, is_starred: false, is_public: false, folder: activeFolder })
      .select('id')
      .single();
    if (error || !data) { toast.error('Note create nahi hua'); setCreating(false); return; }
    router.push(`/notes/${data.id}`);
  };

  const togglePin = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    const { error } = await supabase.from('notes').update({ is_starred: !note.is_starred }).eq('id', note.id);
    if (error) toast.error('Pin update nahi hui');
    else router.refresh();
  };

  const confirmNewFolder = () => {
    const name = newFolderName.trim();
    setAddingFolder(false);
    setNewFolderName('');
    if (name) setActiveFolder(name);
  };

  return (
    <div className="space-y-5">
      {/* Top bar: search + actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Notes mein search karo..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="gradient"
            onClick={() => createNote()}
            loading={creating}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400"
          >
            <Plus className="w-4 h-4" />New Note
          </Button>
          <ScanUpload onTextExtracted={(text) => createNote(text, 'Scanned Note')} trigger={<Button variant="outline">ðŸ“· Scan</Button>} />
        </div>
      </div>

      {/* Folder chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveFolder(null)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
            activeFolder === null ? 'bg-violet-500 text-white border-violet-500' : 'border-border text-muted-foreground hover:bg-muted'
          )}
        >
          <StickyNote className="w-3.5 h-3.5" /> Sab Notes
          <span className="opacity-70">{notes.length}</span>
        </button>

        {folders.map(f => {
          const style = folderStyle(f);
          const count = notes.filter(n => n.folder === f).length;
          const isActive = activeFolder === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFolder(isActive ? null : f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
                isActive ? cn(style.bg, style.text, 'border-transparent ring-2', style.ring) : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
              {f}
              <span className="opacity-70">{count}</span>
            </button>
          );
        })}

        {addingFolder ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmNewFolder(); if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName(''); } }}
              placeholder="Folder ka naam..."
              className="h-8 w-36 text-xs"
            />
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={confirmNewFolder}>âœ“</Button>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setAddingFolder(false); setNewFolderName(''); }}><X className="w-3.5 h-3.5" /></Button>
          </div>
        ) : (
          <button
            onClick={() => setAddingFolder(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" /> Nayi Folder
          </button>
        )}
      </div>

      {/* Notes grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(note => {
          const style = note.folder ? folderStyle(note.folder) : null;
          return (
            <Card
              key={note.id}
              className={cn(
                'group relative overflow-hidden border-l-4 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5 transition-all cursor-pointer',
                note.is_starred ? 'border-l-amber-400' : 'border-l-violet-500/40'
              )}
              onClick={() => router.push(`/notes/${note.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                      <StickyNote className="w-4 h-4 text-violet-300" />
                    </div>
                    {note.folder && style && (
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1', style.bg, style.text)}>
                        <Folder className="w-2.5 h-2.5" />{note.folder}
                      </span>
                    )}
                  </div>
                  <button onClick={(e) => togglePin(e, note)} className="opacity-60 hover:opacity-100 transition-opacity">
                    <Star className={cn('w-4 h-4', note.is_starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
                  </button>
                </div>
                <h3 className="font-semibold mb-1 truncate">{note.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 whitespace-pre-wrap">{note.content || 'Empty note'}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(note.updated_at)}</p>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && notes.length > 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
            Is search/folder ke liye koi note nahi mila.
          </div>
        )}

        {notes.length === 0 && (
          <div className="col-span-full flex flex-col items-center text-center py-16 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4">
              <StickyNote className="w-8 h-8 text-violet-300" />
            </div>
            <p className="font-medium text-foreground mb-1">Koi notes nahi hain abhi</p>
            <p className="text-sm">Pehla note banao, ya kisi textbook page ko scan karo</p>
          </div>
        )}
      </div>
    </div>
  );
}
