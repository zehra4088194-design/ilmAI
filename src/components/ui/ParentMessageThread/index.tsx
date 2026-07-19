'use client';
import { useEffect, useRef, useState } from 'react';
import { CheckCheck, Send, MessageCircle } from 'lucide-react';
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
  read_at?: string | null;
}

/**
 * Live chat between a parent and their linked student, used on both the
 * Parent Dashboard (per student card) and the student's Settings > Parent
 * Link tab. Realtime via Supabase — no polling needed.
 */
export function ParentMessageThread({
  linkId,
  currentUserId,
  autoOpen = false,
}: {
  linkId: string;
  currentUserId: string;
  autoOpen?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(autoOpen);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  const markRead = async () => {
    await fetch('/api/parent/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId }),
    }).catch(() => {});
  };

  useEffect(() => {
    if (!open) return;

    let active = true;
    fetch(`/api/parent/messages?linkId=${linkId}`)
      .then((r) => r.json())
      .then((json) => {
        if (active) setMessages(json.messages || []);
      });

    const channel = supabase
      .channel(`parent_messages:${linkId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'parent_messages', filter: `link_id=eq.${linkId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => (prev.some((item) => item.id === incoming.id) ? prev : [...prev, incoming]));
          if (incoming.sender_id !== currentUserId) markRead();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'parent_messages', filter: `link_id=eq.${linkId}` },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        }
      )
      .subscribe();

    markRead();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [open, linkId, currentUserId, supabase]);

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
      toast.error('The message could not be sent.');
      setText(content);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageCircle className="h-3.5 w-3.5" /> Message
      </Button>
    );
  }

  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <div className="border-border bg-muted/30 flex items-center justify-between border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <MessageCircle className="h-3.5 w-3.5" /> Live Chat
        </span>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-xs">
          Close
        </button>
      </div>
      <div className="bg-background/50 h-56 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-muted-foreground mt-4 text-center text-xs">
            No messages yet. Say hello to start.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={cn(
                'max-w-[80%] rounded-xl px-3 py-1.5 text-sm',
                mine ? 'ml-auto bg-violet-600 text-white' : 'bg-muted'
              )}
            >
              {m.content}
              {mine && (
                <div
                  className={cn(
                    'mt-1 flex items-center justify-end gap-1 text-[10px]',
                    m.read_at ? 'text-sky-200' : 'text-white/65'
                  )}
                >
                  <CheckCheck className="h-3 w-3" />
                  {m.read_at ? 'Seen' : 'Sent'}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="border-border flex gap-2 border-t p-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !sending && send()}
          placeholder="Write a message..."
          className="text-sm"
        />
        <Button size="icon" variant="gradient" onClick={send} disabled={sending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
