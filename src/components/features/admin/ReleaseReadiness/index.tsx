'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type Health = { status: string; version: string; checks: Record<string, string> };

export function ReleaseReadiness() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/health/ready', { cache: 'no-store' }).then((response) => response.json()).then(setHealth).finally(() => setLoading(false));
  }, []);
  if (loading) return <Loader2 className="text-primary h-6 w-6 animate-spin" />;
  return <div className="grid gap-4 md:grid-cols-2"><Card><CardContent className="space-y-3 p-5"><p className="text-sm font-semibold">Release readiness</p>{Object.entries(health?.checks || {}).map(([name, value]) => <div key={name} className="flex items-center justify-between rounded-lg border p-3 text-sm"><span className="capitalize">{name.replace(/_/g, ' ')}</span>{value === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <CircleAlert className="h-4 w-4 text-amber-500" />}</div>)}<p className="text-muted-foreground text-xs">Version: {health?.version || 'unknown'}</p></CardContent></Card><Card><CardContent className="space-y-3 p-5 text-sm"><p className="font-semibold">Before every release</p><p className="text-muted-foreground">Run <code className="rounded bg-muted px-1">supabase db push --dry-run</code>, then <code className="rounded bg-muted px-1">npm run check:release</code>, focused tests and a staging smoke test.</p><p className="text-muted-foreground">PDF protection is access-controlled and watermarked, not an impossible-download guarantee.</p></CardContent></Card></div>;
}
