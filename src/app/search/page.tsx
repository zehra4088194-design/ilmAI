'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setResults(Array.isArray(json.results) ? json.results : []);
      } finally { setLoading(false); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  return <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
    <div><p className="text-sm font-semibold text-violet-500">ilm AI</p><h1 className="text-3xl font-black">Search anything</h1><p className="text-muted-foreground mt-1 text-sm">Find subjects, chapters, notes, lectures, past papers and institution resources.</p></div>
    <div className="relative"><Search className="text-muted-foreground absolute left-3 top-3 h-5 w-5" /><Input autoFocus className="h-12 pl-10 pr-10 text-base" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Physics chapter 4, my assignments, attendance..." />{loading && <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin" />}</div>
    {!query.trim() ? <Card><CardContent className="text-muted-foreground p-8 text-center text-sm">Start typing to search across ilm AI.</CardContent></Card> : results.length ? <div className="space-y-2">{results.map((item,index) => <Link key={`${item.id || item.name}-${index}`} href={item.href || '/'} className="block rounded-xl border p-4 transition hover:bg-muted/40"><div className="flex items-center gap-2"><Badge variant="secondary">{item.type || 'Result'}</Badge><p className="font-semibold">{item.name || item.title}</p></div>{item.subtitle && <p className="text-muted-foreground mt-1 text-xs">{item.subtitle}</p>}</Link>)}</div> : <Card><CardContent className="text-muted-foreground p-8 text-center text-sm">No results found for “{query}”.</CardContent></Card>}
  </main>;
}
