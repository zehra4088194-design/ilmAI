'use client';
import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star, ArrowLeft, Save, Sparkles, Camera, Bold, Heading2, List, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

export function NoteEditor({ note }: { note: any }) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState<string>(note.content || '');
  const [starred, setStarred] = useState(note.is_starred || false);
  const [folder, setFolder] = useState<string>(note.folder || '');
  const [editingFolder, setEditingFolder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const save = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase
      .from('notes')
      .update({ title, content, is_starred: starred, folder: folder.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', note.id);
    if (error) toast.error('Save nahi hua'); else toast.success('Saved âœ“');
    setSaving(false);
  }, [title, content, starred, folder, note.id, supabase]);

  // Lightweight markdown-style formatting: wraps or prefixes the current
  // selection so notes stay plain-text/markdown (no heavy editor dependency)
  // while still giving bold / heading / list quick-actions.
  const applyFormat = (type: 'bold' | 'heading' | 'list') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    const selected = content.slice(start, end) || 'text';
    let inserted = selected;
    let cursorOffset = 0;

    if (type === 'bold') {
      inserted = `**${selected}**`;
      cursorOffset = inserted.length;
    } else if (type === 'heading') {
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const before = content.slice(0, lineStart);
      const after = content.slice(lineStart);
      const newContent = `${before}## ${after}`;
      setContent(newContent);
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + 3, end + 3); });
      return;
    } else if (type === 'list') {
      inserted = selected.split('\n').map(line => `- ${line}`).join('\n');
      cursorOffset = inserted.length;
    }

    const newContent = content.slice(0, start) + inserted + content.slice(end);
    setContent(newContent);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + cursorOffset, start + cursorOffset); });
  };

  const aiSummarize = async () => {
    if (!content.trim()) { toast.error('Pehle kuch likho'); return; }
    setAiSummarizing(true);
    try {
      const res = await fetch('/api/ai/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: content }) });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      setContent(c => `${c}\n\n---\nðŸ“‹ AI Summary:\n${json.data.summary}`);
      toast.success('Summary add ho gayi!');
    } catch { toast.error('Summary generate nahi ho saki'); }
    finally { setAiSummarizing(false); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
        <div className="flex items-center gap-2 flex-wrap">
          <ScanUpload onTextExtracted={(text) => setContent(c => c ? `${c}\n\n${text}` : text)}
            trigger={<Button variant="outline" size="sm"><Camera className="w-4 h-4" />Scan</Button>} />
          <Button variant="outline" size="sm" onClick={aiSummarize} loading={aiSummarizing}>
            <Sparkles className="w-4 h-4" />AI Summary
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStarred(!starred)} title={starred ? 'Unpin note' : 'Pin note'}>
            <Star className={cn('w-4 h-4', starred && 'fill-amber-400 text-amber-400')} />
          </Button>
          <Button variant="gradient" size="sm" onClick={save} loading={saving} className="bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400">
            <Save className="w-4 h-4" />Save
          </Button>
        </div>
      </div>

      {/* Title + folder row */}
      <div className="space-y-2">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title..."
          className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50" />

        {editingFolder ? (
          <input
            autoFocus
            value={folder}
            onChange={e => setFolder(e.target.value)}
            onBlur={() => setEditingFolder(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditingFolder(false); }}
            placeholder="Folder ka naam..."
            className="text-xs px-2 py-1 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 outline-none w-40"
          />
        ) : (
          <button
            onClick={() => setEditingFolder(true)}
            className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors flex items-center gap-1 w-fit"
          >
            <Folder className="w-3 h-3" />
            {folder || 'Folder set karo'}
          </button>
        )}
      </div>

      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 pb-2 border-b border-border">
        <button onClick={() => applyFormat('bold')} title="Bold" className="p-2 rounded-md hover:bg-muted transition-colors">
          <Bold className="w-4 h-4" />
        </button>
        <button onClick={() => applyFormat('heading')} title="Heading" className="p-2 rounded-md hover:bg-muted transition-colors">
          <Heading2 className="w-4 h-4" />
        </button>
        <button onClick={() => applyFormat('list')} title="Bullet list" className="p-2 rounded-md hover:bg-muted transition-colors">
          <List className="w-4 h-4" />
        </button>
        <span className="text-[10px] text-muted-foreground ml-2">Markdown supported â€” **bold**, ## heading, - list</span>
      </div>

      {/* Content */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Yahan likhna shuru karo... ya ðŸ“· scan button se textbook page scan karo"
        className="w-full min-h-[calc(100vh-22rem)] bg-transparent border-none outline-none resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40"
      />
    </div>
  );
}
