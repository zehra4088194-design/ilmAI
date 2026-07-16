'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Quote, RefreshCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const FALLBACK_QUOTES = [
  'Aaj ka chhota focus kal ka strong result banata hai.',
  'Bas 25 minutes honestly parho, momentum khud ban jata hai.',
  'Mistakes weak point nahi, next improvement ka map hoti hain.',
  'Consistency marks ko quietly upgrade karti rehti hai.',
];

export function MotivationClient() {
  const [quotes, setQuotes] = useState(FALLBACK_QUOTES);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const activeQuote = quotes[index % quotes.length] || FALLBACK_QUOTES[0];
  const nextQuote = quotes[(index + 1) % quotes.length] || FALLBACK_QUOTES[1];

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/motivation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'today study focus' }),
      });
      const json = await res.json();
      if (!res.ok || json.status === 'error') throw new Error(json.error || 'Motivation load nahi hui');
      const next = Array.isArray(json.quotes) ? json.quotes.filter(Boolean) : [];
      if (next.length) {
        setQuotes(next);
        setIndex(0);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Motivation load nahi hui');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => current + 1);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);

  const particles = useMemo(() => Array.from({ length: 18 }, (_, i) => i), []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="dashboard-surface relative overflow-hidden rounded-3xl border border-border/70 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,hsl(var(--primary)/0.28),transparent_28%),radial-gradient(circle_at_88%_20%,hsl(var(--brand-accent)/0.18),transparent_30%)]" />
        <div className="relative">
          <Badge className="mb-4 bg-violet-600"><Sparkles className="h-3 w-3" /> Motivation AI</Badge>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Study Motivation</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Short, fresh reminders for focus breaks, exam stress, aur daily consistency.
          </p>
        </div>
      </section>

      <Card className="relative min-h-[420px] overflow-hidden border-violet-500/20 bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--secondary)/0.86))]">
        <CardContent className="relative flex min-h-[420px] flex-col items-center justify-center p-6 text-center">
          {particles.map((particle) => (
            <span
              key={particle}
              className="absolute h-2 w-2 rounded-full bg-primary/35 blur-[1px]"
              style={{
                left: `${8 + ((particle * 23) % 84)}%`,
                top: `${10 + ((particle * 31) % 78)}%`,
                animation: `float ${3 + (particle % 5) * 0.35}s ease-in-out infinite`,
              }}
            />
          ))}

          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-xl shadow-violet-600/25">
            <Quote className="h-8 w-8" />
          </div>

          <div className="max-w-3xl">
            <p key={activeQuote} className="animate-float text-2xl font-black leading-snug sm:text-4xl">
              {activeQuote}
            </p>
            <p className="mx-auto mt-8 max-w-xl rounded-2xl border border-border/70 bg-background/55 p-4 text-sm text-muted-foreground blur-[0.2px]">
              Next: {nextQuote}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="gradient" onClick={() => setIndex((current) => current + 1)}>
              <Sparkles className="h-4 w-4" /> Next quote
            </Button>
            <Button variant="outline" onClick={fetchQuotes} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh AI
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
