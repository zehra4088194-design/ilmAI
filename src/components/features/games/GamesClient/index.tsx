'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Crown, Gamepad2, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { GameCardData } from '@/lib/games/defaultGames';
import type { SubscriptionTier } from '@/types';

type Props = {
  games: GameCardData[];
  tier: SubscriptionTier;
  canPlay: boolean;
  remainingSeconds: number;
  limitSeconds: number;
};

function minutes(seconds: number) {
  return Math.max(0, Math.ceil(seconds / 60));
}

export function GamesClient({ games, tier, canPlay, remainingSeconds, limitSeconds }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const categories = useMemo(() => ['All', ...Array.from(new Set(games.map((game) => game.category)))], [games]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return games
      .filter((game) => category === 'All' || game.category === category)
      .filter((game) => !q || `${game.title} ${game.description} ${game.category}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [category, games, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="dashboard-surface rounded-2xl border border-border/70 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="mb-3 bg-violet-600">Cognitive break room</Badge>
            <h1 className="text-2xl font-bold">Games Zone</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Short, timed games for memory, logic, and focused breaks. Daily limit: {minutes(limitSeconds)} minutes.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/35 px-4 py-3 text-sm">
            <p className="font-semibold">{tier} plan</p>
            <p className="text-muted-foreground">{minutes(remainingSeconds)} min left today</p>
          </div>
        </div>
      </section>

      {!canPlay && (
        <Card className="border-violet-500/30 bg-violet-500/10">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Live games are available on Pro and Elite</p>
              <p className="text-sm text-muted-foreground">Free users can preview the games catalog. Upgrade to unlock playable rooms.</p>
            </div>
            <Button asChild variant="gradient"><Link href="/subscription"><Crown className="h-4 w-4" /> Upgrade Pro</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search games..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${category === item ? 'border-violet-500 bg-violet-500/25 text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((game) => (
          <Card key={game.slug} className="overflow-hidden">
            <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-violet-600 via-indigo-700 to-cyan-600 text-white">
              {game.thumbnail_url ? <img src={game.thumbnail_url} alt="" className="h-full w-full object-cover" /> : <Gamepad2 className="h-14 w-14" />}
              {game.featured && <Badge className="absolute left-3 top-3 bg-amber-500 text-black"><Sparkles className="h-3 w-3" /> Featured</Badge>}
            </div>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{game.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{game.description}</p>
                </div>
                <Badge variant="outline">{game.category}</Badge>
              </div>
              <Button asChild variant={canPlay ? 'gradient' : 'outline'} className="w-full">
                <Link href={canPlay ? `/games/${game.slug}` : '/subscription'}>{canPlay ? 'Start game' : 'Upgrade to unlock'}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
