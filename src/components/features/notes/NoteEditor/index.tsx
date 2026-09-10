'use client';
import { useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ArrowLeft, Save, Sparkles, Camera, Bold, Heading2, List, Folder, PenLine, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { enqueueOfflineItem } from '@/lib/offline/sync-queue';
import { HANDWRITTEN_PALETTE, handwrittenColour, type NoteStyle } from '@/lib/constants/handwriting';

export function NoteEditor({ note }: { note: any }) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState<string>(note.content || '');
  const [starred, setStarred] = useState(note.is_starred || false);
  const [folder, setFolder] = useState<string>(note.folder || '');
  const [editingFolder, setEditingFolder] = useState(false);
  const [style, setStyle] = useState<NoteStyle>(note.style === 'handwritten' ? 'handwritten' : 'typed');
  const [accentColour, setAccentColour] = useState<string>(note.accent_colour || 'violet');
  const [saving, setSaving] = useState(false);
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const canUseAiSummary = (user?.subscriptionTier || 'FREE') !== 'FREE';
  const handwritten = style === 'handwritten';
  const colour = handwrittenColour(accentColour);

  const save = useCallback(async () => {
    setSaving(true);
    const payload = { id: note.id, title, content, is_starred: starred, folder: folder.trim() || null, style, accent_colour: accentColour };

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await enqueueOfflineItem('notes_update', payload);
      toast.info('Internet nahi hai — save queue ho gaya, connect hote hi sync ho jayega.');
      setSaving(false);
      return;
    }

    // `style`/`accent_colour` are new columns (see the notes_handwriting_style migration) not yet
    // in the generated Database types, hence the cast — same as the offline sync route's `db`.
    const { error } = await (supabase as any)
      .from('notes')
      .update({ title, content, is_starred: starred, folder: folder.trim() || null, style, accent_colour: accentColour, updated_at: new Date().toISOString() })
      .eq('id', note.id);
    if (error) {
      // Browser thought it was online but the request itself failed (network dropped mid-flight)
      // — queue it the same way rather than losing the edit.
      await enqueueOfflineItem('notes_update', payload);
      toast.info('Save nahi ho saka, offline queue mein daal diya — connect hote hi sync ho jayega.');
    } else {
      toast.success('Saved');
    }
    setSaving(false);
  }, [title, content, starred, folder, style, accentColour, note.id, supabase]);

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
    if (!canUseAiSummary) {
      toast.info('AI Summary is available on the Pro plan.');
      return;
    }
    if (!content.trim()) { toast.error('Write something first.'); return; }
    setAiSummarizing(true);
    try {
      const res = await fetch('/api/ai/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: content }) });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      setContent(c => `${c}\n\n---\nðŸ“‹ AI Summary:\n${json.data.summary}`);
      toast.success('Summary added.');
    } catch { toast.error('The summary could not be generated.'); }
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
          {canUseAiSummary ? (
            <Button variant="outline" size="sm" onClick={aiSummarize} loading={aiSummarizing}>
              <Sparkles className="w-4 h-4" />AI Summary
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/subscription"><Sparkles className="w-4 h-4" />AI Summary <Badge className="ml-1 text-[10px]">Pro</Badge></Link>
            </Button>
          )}
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
          className={cn(
            'w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50',
            handwritten && 'font-handwritten', handwritten && colour.text
          )} />

        {/* Handwritten vs typed, with a small colour palette for the handwritten look — purely a
            display preference, saved alongside the note so it sticks next time it's opened. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-border p-0.5">
            <button
              onClick={() => setStyle('typed')}
              className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                !handwritten ? 'bg-violet-500 text-white' : 'text-muted-foreground hover:bg-muted')}
            >
              <Type className="h-3 w-3" /> Typed
            </button>
            <button
              onClick={() => setStyle('handwritten')}
              className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors font-handwritten',
                handwritten ? cn(colour.bg, colour.text) : 'text-muted-foreground hover:bg-muted')}
            >
              <PenLine className="h-3 w-3" /> Handwritten
            </button>
          </div>
          {handwritten && (
            <div className="flex items-center gap-1.5">
              {HANDWRITTEN_PALETTE.map((c) => (
                <button
                  key={c.key}
                  title={c.label}
                  onClick={() => setAccentColour(c.key)}
                  className={cn('h-5 w-5 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110', c.dot,
                    accentColour === c.key ? 'ring-foreground/60' : 'ring-transparent')}
                />
              ))}
            </div>
          )}
        </div>

        {editingFolder ? (
          <input
            autoFocus
            value={folder}
            onChange={e => setFolder(e.target.value)}
            onBlur={() => setEditingFolder(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditingFolder(false); }}
            placeholder="Folder name..."
            className="text-xs px-2 py-1 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 outline-none w-40"
          />
        ) : (
          <button
            onClick={() => setEditingFolder(true)}
            className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors flex items-center gap-1 w-fit"
          >
            <Folder className="w-3 h-3" />
            {folder || 'Set a folder'}
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
        <span className="text-[10px] text-muted-foreground ml-2">Markdown supported: **bold**, ## heading, - list</span>
      </div>

      {/* Content */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Start writing here, or use the scan button to scan a textbook page"
        className={cn(
          'w-full min-h-[calc(100vh-22rem)] border-none outline-none resize-none leading-relaxed placeholder:text-muted-foreground/40',
          handwritten
            ? cn('font-handwritten rounded-xl p-4 text-lg', colour.bg, colour.text)
            : 'bg-transparent text-sm'
        )}
      />
    </div>
  );
}
