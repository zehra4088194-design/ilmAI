'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Search, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DirectMessageThread } from '@/components/ui/DirectMessageThread';
import { toast } from 'sonner';

type Person = { id: string; name: string; avatar_url: string | null; role: string };

export function UniversalMessagesClient({ currentUserId }: { currentUserId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Person | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/messages/contacts', { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'People could not be loaded.');
        setPeople(json.people || []);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'People could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => people.filter((person) => `${person.name} ${person.role}`.toLowerCase().includes(search.toLowerCase())),
    [people, search]
  );

  const openChat = async (person: Person) => {
    setSelected(person);
    setConversationId(null);
    try {
      const res = await fetch('/api/messages/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherProfileId: person.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Conversation could not be opened.');
      setConversationId(json.conversation?.id || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Conversation could not be opened.');
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border bg-card/70 shadow-sm">
      <div className="border-b bg-background/60 px-4 py-3 sm:px-5">
        <p className="text-lg font-bold">Messages</p>
        <p className="text-muted-foreground text-xs">Chat with other ilm AI users.</p>
      </div>
      <div className="grid min-h-[calc(100dvh-13rem)] md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b bg-background/70 p-3 md:border-b-0 md:border-r">
          <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people…" className="pl-9" /></div>
          <div className="max-h-[calc(100dvh-17rem)] space-y-1 overflow-y-auto">
            {loading ? <p className="py-6 text-center text-xs text-muted-foreground">Loading people…</p> : filtered.length ? filtered.map((person) => (
              <button key={person.id} type="button" onClick={() => openChat(person)} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${selected?.id === person.id ? 'bg-primary/10' : 'hover:bg-muted/60'}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">{person.avatar_url ? <img src={person.avatar_url} alt={person.name} className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{person.name}</p><Badge variant="outline" className="mt-0.5 px-1.5 py-0 text-[9px] capitalize">{person.role}</Badge></div>
              </button>
            )) : <p className="py-6 text-center text-xs text-muted-foreground">No other users found.</p>}
          </div>
        </aside>
        <section className="min-w-0 p-3 sm:p-4">
          {selected && conversationId ? (
            <div className="h-[calc(100dvh-15rem)] min-h-[420px] overflow-hidden rounded-2xl border bg-card">
              <div className="flex items-center gap-3 border-b px-4 py-3"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-muted">{selected.avatar_url ? <img src={selected.avatar_url} alt={selected.name} className="h-full w-full object-cover" /> : <UserRound className="h-4 w-4 text-muted-foreground" />}</div><div><p className="font-semibold">{selected.name}</p><p className="text-muted-foreground text-xs capitalize">{selected.role}</p></div></div>
              <div className="p-2"><DirectMessageThread conversationId={conversationId} currentUserId={currentUserId} onDeleted={() => { setSelected(null); setConversationId(null); }} /></div>
            </div>
          ) : <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-center"><MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/40" /><p className="font-semibold">Select a person</p><p className="text-muted-foreground mt-1 text-sm">Your conversation opens here.</p></div>}
        </section>
      </div>
    </div>
  );
}
