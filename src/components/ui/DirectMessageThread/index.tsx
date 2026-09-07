'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCheck, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmojiPickerButton } from '@/components/ui/EmojiPickerButton';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
}

/**
 * Generic direct_conversations thread view (Phase 2c) — the relationship-agnostic counterpart to
 * ParentMessageThread (which is specific to the older parent_messages table). Used first for
 * parent<->teacher messaging; reusable as-is for any future relationship built on the same
 * direct_conversations/direct_messages tables (see the Phase 1a migration).
 */
export function DirectMessageThread({
  conversationId,
  currentUserId,
  onDeleted,
}: {
  conversationId: string;
  currentUserId: string;
  // Lets the caller (e.g. ParentTeacherMessenger) clear its own "selected contact" state once
  // this conversation is gone, instead of leaving a dead thread selected with nothing to show.
  onDeleted?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch(`/api/messages/${conversationId}`)
        .then((r) => r.json())
        .then((json) => {
          if (active) setMessages(json.messages || []);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('The message could not be sent.');
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const deleteChat = async () => {
    if (!window.confirm('Delete this chat? This removes every message and cannot be undone.')) return;
    try {
      const res = await fetch(`/api/messages/${conversationId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Chat deleted.');
      onDeleted?.();
    } catch {
      toast.error('The chat could not be deleted.');
    }
  };

  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <div className="border-border bg-muted/30 flex items-center justify-end border-b px-3 py-1.5">
        <button
          onClick={deleteChat}
          aria-label="Delete chat"
          title="Delete chat"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="bg-background/50 h-64 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-muted-foreground mt-4 text-center text-xs">No messages yet. Say hello to start.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={cn('max-w-[80%] rounded-xl px-3 py-1.5 text-sm', mine ? 'ml-auto bg-violet-600 text-white' : 'bg-muted')}
            >
              {m.content}
              {mine && (
                <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10px]', m.read_at ? 'text-sky-200' : 'text-white/65')}>
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
        <EmojiPickerButton onSelect={(emoji) => setText((current) => current + emoji)} />
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
