'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

interface Message {
  id: string;
  link_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

/**
 * Live chat between a parent and their linked student, used on both the
 * Parent Dashboard (per student card) and the student's Settings > Parent
 * Link tab. Realtime via Supabase — no polling needed.
 */
export function ParentMessageThread({ linkId, currentUserId }: { linkId: string; currentUserId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!open) return;

    let active = true;
    fetch(`/api/parent/messages?linkId=${linkId}`)
      .then((r) => r.json())
      .then((json) => { if (active) setMessages(json.messages || []); });

    const channel = supabase
      .channel(`parent_messages:${linkId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parent_messages', filter: `link_id=eq.${linkId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [open, linkId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const res = await fetch('/api/parent/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId, content }),
      });
      if (!res.ok) throw new Error();
      // Realtime subscription above will append it — but add optimistically
      // in case the realtime event lags.
    } catch {
      toast.error('Message send nahi hua');
      setText(content);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageCircle className="w-3.5 h-3.5" /> Message
      </Button>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-semibold flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" /> Live Chat</span>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
      </div>
      <div className="h-56 overflow-y-auto p-3 space-y-2 bg-background/50">
        {messages.length === 0 && <p className="text-xs text-muted-foreground text-center mt-4">Koi message nahi abhi - Hi bol ke shuru karo!</p>}
        {messages.map((m) => (
          <div key={m.id} className={cn('max-w-[80%] px-3 py-1.5 rounded-xl text-sm', m.sender_id === currentUserId ? 'ml-auto bg-violet-600 text-white' : 'bg-muted')}>
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-2 border-t border-border">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !sending && send()}
          placeholder="Message likho..."
          className="text-sm"
        />
        <Button size="icon" variant="gradient" onClick={send} disabled={sending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
