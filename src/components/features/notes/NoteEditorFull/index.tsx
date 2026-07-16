'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ArrowLeft, Save, Sparkles, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';

export function NoteEditor({ note }: { note: any }) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState<string>(note.content || '');
  const [starred, setStarred] = useState(note.is_starred || false);
  const [saving, setSaving] = useState(false);
  const [aiSummarizing, setAiSummarizing] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const canUseAiSummary = (user?.subscriptionTier || 'FREE') !== 'FREE';

  const save = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase.from('notes').update({ title, content, is_starred: starred, updated_at: new Date().toISOString() }).eq('id', note.id);
    if (error) toast.error('Save nahi hua'); else toast.success('Saved ✓');
    setSaving(false);
  }, [title, content, starred, note.id, supabase]);

  const aiSummarize = async () => {
    if (!canUseAiSummary) {
      toast.info('AI Summary Pro mein unlock hoti hai.');
      return;
    }
    if (!content.trim()) { toast.error('Pehle kuch likho'); return; }
    setAiSummarizing(true);
    try {
      const res = await fetch('/api/ai/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: content }) });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      setContent(c => `${c}\n\n---\n📋 AI Summary:\n${json.data.summary}`);
      toast.success('Summary add ho gayi!');
    } catch { toast.error('Summary generate nahi ho saki'); }
    finally { setAiSummarizing(false); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" />Back</Button>
        <div className="flex items-center gap-2">
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
          <Button variant="ghost" size="sm" onClick={() => setStarred(!starred)}>
            <Star className={cn('w-4 h-4', starred && 'fill-amber-400 text-amber-400')} />
          </Button>
          <Button variant="gradient" size="sm" onClick={save} loading={saving}>
            <Save className="w-4 h-4" />Save
          </Button>
        </div>
      </div>

      {/* Title */}
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Note title..."
        className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50" />

      {/* Content */}
      <textarea value={content} onChange={e => setContent(e.target.value)}
        placeholder="Yahan likhna shuru karo... ya 📷 scan button se textbook page scan karo"
        className="w-full min-h-[calc(100vh-18rem)] bg-transparent border-none outline-none resize-none text-sm leading-relaxed placeholder:text-muted-foreground/40" />
    </div>
  );
}
