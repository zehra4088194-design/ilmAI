'use client';

import { useEffect, useState } from 'react';
import { Flame, Copy, Send, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Buddy = { linkId: string; buddyId: string; fullName: string; avatarUrl: string | null; streak: number };

/**
 * Phase 5 — study buddy card: link a buddy via invite code (5a), show their streak next to yours
 * (5b), and poke them (5c). Self-contained fetch-on-mount client component, same shape as the
 * other small dashboard widget cards on this page.
 */
export function StudyBuddyCard({ myStreak }: { myStreak: number }) {
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [pokedToday, setPokedToday] = useState<Record<string, boolean>>({});

  const load = () => {
    fetch('/api/study-buddy')
      .then((r) => r.json())
      .then((json) => {
        if (json.status === 'success') {
          setBuddies(json.data.buddies || []);
          setPendingCode(json.data.pendingInvite?.code || null);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const generateInvite = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/study-buddy/generate-invite', { method: 'POST' });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      setPendingCode(json.data.code);
    } finally { setBusy(false); }
  };

  const acceptInvite = async () => {
    if (!joinCode.trim()) { toast.error('Enter an invite code.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/study-buddy/accept-invite', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      toast.success(json.message || 'Study buddy linked!');
      setJoinCode('');
      load();
    } finally { setBusy(false); }
  };

  const poke = async (linkId: string) => {
    try {
      const res = await fetch(`/api/study-buddy/${linkId}/poke`, { method: 'POST' });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      toast.success('Poked!');
      setPokedToday((current) => ({ ...current, [linkId]: true }));
    } catch { toast.error('Something went wrong.'); }
  };

  if (loading) return null;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-sm font-semibold">Study Buddies</p>
        {buddies.map((buddy) => (
          <div key={buddy.linkId} className="border-border flex items-center gap-3 rounded-lg border p-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-600 text-xs font-bold text-white">
              {buddy.fullName?.[0] || '?'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{buddy.fullName}</p>
              <p className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-orange-500"><Flame className="h-3 w-3" />{buddy.streak} day streak</span>
                <span className="opacity-50">vs</span>
                <span className="flex items-center gap-1"><Flame className="h-3 w-3" />you: {myStreak}</span>
              </p>
            </div>
            <Button size="sm" variant="outline" disabled={pokedToday[buddy.linkId]} onClick={() => poke(buddy.linkId)}>
              <Send className="h-3.5 w-3.5" />{pokedToday[buddy.linkId] ? 'Poked' : 'Poke'}
            </Button>
          </div>
        ))}
        {!buddies.length && <p className="text-muted-foreground text-xs">No study buddies linked yet.</p>}

        <div className="border-border space-y-2 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Enter a buddy's invite code" className="h-8 max-w-[200px] text-xs" />
            <Button size="sm" variant="outline" disabled={busy} onClick={acceptInvite}><UserPlus className="h-3.5 w-3.5" />Join</Button>
          </div>
          {pendingCode ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Your invite code:</span>
              <code className="bg-muted rounded px-2 py-0.5 font-mono">{pendingCode}</code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(pendingCode); toast.success('Copied!'); }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={generateInvite} className="h-7 text-xs">
              Generate an invite code
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
