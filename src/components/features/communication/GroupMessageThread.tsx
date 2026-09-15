'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type GroupMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  profiles?: { id?: string; full_name?: string | null; avatar_url?: string | null } | { id?: string; full_name?: string | null; avatar_url?: string | null }[] | null;
};

function profileName(value: GroupMessage['profiles']) {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.full_name || 'Member';
}

export function GroupMessageThread({ groupId, currentUserId, groupName }: { groupId: string; currentUserId: string; groupName: string }) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/school-communication/groups/${groupId}/messages`, { cache: 'no-store' });
    const json = await res.json();
    if (res.ok) setMessages(json.messages || []);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const res = await fetch(`/api/school-communication/groups/${groupId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
    });
    const json = await res.json();
    if (res.ok && json.message) {
      setMessages((prev) => [...prev, json.message]);
      setText('');
    }
    setSending(false);
  }

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border bg-card/60">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400"><Users className="h-5 w-5" /></div>
        <div><p className="font-semibold">{groupName}</p><p className="text-muted-foreground text-xs">School group</p></div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground"><Users className="mb-3 h-10 w-10 opacity-30" /><p className="text-sm font-medium">No messages yet.</p><p className="mt-1 text-xs">Say hello to the group.</p></div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => {
              const mine = message.sender_id === currentUserId;
              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-violet-600 text-white' : 'bg-muted'}`}>
                    {!mine && <p className="mb-1 text-[11px] font-semibold opacity-70">{profileName(message.profiles)}</p>}
                    <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-muted-foreground'}`}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Message group…" />
          <Button size="icon" onClick={send} disabled={!text.trim() || sending}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </div>
      </div>
    </div>
  );
}
