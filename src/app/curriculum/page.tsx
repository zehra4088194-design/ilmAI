'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function CurriculumExplorerPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      setLoading(true);
      try {
        const res = await fetch(`/api/curriculum/search?q=${encodeURIComponent(query)}&limit=40`);
        const json = await res.json();
        setResults(json.results || []);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-2 text-sm font-medium text-sky-300">ilm AI · Curriculum Library</div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Search every book, chapter & sub-topic</h1>
          <p className="mt-2 max-w-2xl text-slate-400">Search numbers like 2.2.2.1 or names like Photosynthesis, Organic Chemistry, Data Structures, Trigonometry and more.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl">
          <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Search sub-topic number or title…" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-4 text-lg outline-none placeholder:text-slate-500 focus:border-sky-400" />
        </div>
        <div className="mt-6 space-y-3">
          {loading && <div className="text-slate-400">Searching…</div>}
          {!loading && query && !results.length && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">No published curriculum match found.</div>}
          {results.map((item) => (
            <Link key={item.id} href={item.href} className="block rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-sky-400/40 hover:bg-white/[0.07]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-sky-300"><span>{item.number || item.type}</span><span>·</span><span>{item.subject || 'General'}</span></div>
                  <h2 className="mt-1 text-xl font-semibold">{item.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{item.book} · {item.grade_level || 'Grade not set'}{item.board ? ` · ${item.board}` : ''}</p>
                  {item.path_numbers && <p className="mt-2 text-xs text-slate-500">{item.path_numbers}</p>}
                </div>
                {item.pages && <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">p. {item.pages}</div>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
