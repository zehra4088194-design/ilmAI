'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Book = { id: string; title: string; grade_level?: string | null; board?: string | null; curriculum?: string | null; edition?: string | null; publisher?: string | null; language?: string | null; page_count?: number | null; subject?: { name?: string | null; slug?: string | null } | null };
type Node = { id: string; book_id: string; parent_id?: string | null; node_type: string; number?: string | null; title: string; depth: number; path_titles?: string | null; source_page_start?: number | null; source_page_end?: number | null; book?: Book | null };
type Payload = { books: Book[]; nodes: Node[]; pages: any[]; blocks: any[]; examples: any[]; questions: any[]; concepts: any[]; prerequisites: any[]; attempts: any[] };

export default function CurriculumExplorerPage() {
  const [query, setQuery] = useState('');
  const [bookId, setBookId] = useState('');
  const [data, setData] = useState<Payload>({ books: [], nodes: [], pages: [], blocks: [], examples: [], questions: [], concepts: [], prerequisites: [], attempts: [] });
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(async () => {
      setError('');
      try {
        const qs = new URLSearchParams();
        if (query.trim()) qs.set('q', query.trim());
        if (bookId) qs.set('book_id', bookId);
        qs.set('limit', '20');
        const res = await fetch(`/api/curriculum/practice?${qs.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Unable to load curriculum.');
        setData(json);
      } catch (e: any) { setError(e.message || 'Unable to load curriculum.'); }
    }, 180);
    return () => clearTimeout(timer);
  }, [query, bookId]);

  const visibleTopics = useMemo(() => data.nodes.filter((n) => !bookId || n.book_id === bookId).slice(0, 18), [data.nodes, bookId]);
  const selectedNode = useMemo(() => data.nodes.find((n) => n.id === selectedNodeId) || null, [data.nodes, selectedNodeId]);

  async function startTest(nodeId: string, count = 10) {
    setBusy(true); setResult(null); setAnswers({}); setError('');
    try {
      const res = await fetch('/api/curriculum/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ node_id: nodeId, count }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to start test.');
      setSelectedNodeId(nodeId); setTest(json);
    } catch (e: any) { setError(e.message || 'Unable to start test.'); }
    finally { setBusy(false); }
  }

  async function submitTest() {
    if (!test?.attempt_id || !selectedNodeId) return;
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/curriculum/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', node_id: selectedNodeId, attempt_id: test.attempt_id, answers }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to submit test.');
      setResult(json.result); setTest(null);
    } catch (e: any) { setError(e.message || 'Unable to submit test.'); }
    finally { setBusy(false); }
  }

  function practicePage(page: any) {
    const node = data.nodes.find((n) => n.book_id === page.book_id && n.source_page_start && page.page_number >= n.source_page_start && (!n.source_page_end || page.page_number <= n.source_page_end));
    if (node) startTest(node.id);
    else setError('Is page ke exact topic ke saved questions abhi available nahi hain.');
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/15 via-white/[0.04] to-transparent p-6 shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-sky-300">ilm AI · Smart Book Practice</div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Textbook kholo, topic choose karo, practice/test seedha start karo.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">Books, chapters, topics, sub-topics, textbook pages, exact content, examples aur saved questions ek hi jagah. Search karo ya book select karke learning path follow karo.</p>
            </div>
            <Link href="/dashboard" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">← Dashboard</Link>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_280px]">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Search chapter, topic, sub-topic, page text, example or question…" className="w-full rounded-2xl border border-white/10 bg-black/20 px-11 py-4 outline-none placeholder:text-slate-500 focus:border-sky-400" />
            </div>
            <select value={bookId} onChange={(e) => { setBookId(e.target.value); setQuery(''); setSelectedNodeId(''); setTest(null); }} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 text-sm outline-none focus:border-sky-400">
              <option value="">All textbooks</option>
              {data.books.map((book) => <option key={book.id} value={book.id}>{book.title}{book.grade_level ? ` · ${book.grade_level}` : ''}</option>)}
            </select>
          </div>
        </header>

        {error && <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-200">{error}</div>}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.books.slice(0, 4).map((book) => <button key={book.id} onClick={() => setBookId(book.id)} className={`text-left rounded-2xl border p-5 transition ${bookId === book.id ? 'border-sky-400/60 bg-sky-400/10' : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'}`}>
            <div className="text-xs text-sky-300">{book.subject?.name || 'Textbook'}</div>
            <div className="mt-2 font-semibold leading-6">{book.title}</div>
            <div className="mt-2 text-xs text-slate-500">{[book.grade_level, book.board, book.edition].filter(Boolean).join(' · ') || 'Curriculum book'}{book.page_count ? ` · ${book.page_count} pages` : ''}</div>
          </button>)}
          {!data.books.length && <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">No published textbooks found.</div>}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wider text-sky-300">Practice map</div><h2 className="mt-1 text-xl font-semibold">Topics & sub-topics</h2></div><span className="text-xs text-slate-500">{visibleTopics.length} shown</span></div>
            <div className="mt-4 space-y-2">
              {visibleTopics.map((node) => <div key={node.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="rounded-full bg-white/5 px-2 py-1 text-sky-300">{node.node_type.replaceAll('_', ' ')}</span>{node.number && <span>{node.number}</span>}{node.source_page_start && <span>pp. {node.source_page_end && node.source_page_end !== node.source_page_start ? `${node.source_page_start}–${node.source_page_end}` : node.source_page_start}</span>}</div><h3 className="mt-1 truncate font-medium">{node.title}</h3><p className="mt-1 line-clamp-1 text-xs text-slate-500">{node.path_titles || node.book?.title}</p></div>
                <div className="flex shrink-0 gap-2"><Link href={`/curriculum/${node.id}`} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Open</Link><button disabled={busy} onClick={() => startTest(node.id)} className="rounded-lg bg-sky-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">Test</button></div>
              </div>)}
              {!visibleTopics.length && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">Search se topic ya sub-topic dhoondo.</div>}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Book intelligence</div><h2 className="mt-1 text-xl font-semibold">Actual textbook data</h2>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm"><div className="rounded-xl bg-white/5 p-3"><div className="text-2xl font-bold">{data.nodes.length}</div><div className="text-xs text-slate-500">topics</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-2xl font-bold">{data.pages.length}</div><div className="text-xs text-slate-500">page matches</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-2xl font-bold">{data.examples.length}</div><div className="text-xs text-slate-500">examples</div></div><div className="rounded-xl bg-white/5 p-3"><div className="text-2xl font-bold">{data.questions.length}</div><div className="text-xs text-slate-500">questions</div></div></div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"><div className="text-xs font-semibold uppercase tracking-wider text-violet-300">Learning support</div><h2 className="mt-1 text-xl font-semibold">Concepts & prerequisites</h2>{selectedNode ? <div className="mt-3 text-sm text-slate-300">{selectedNode.number ? `${selectedNode.number} · ` : ''}{selectedNode.title}</div> : <div className="mt-3 text-sm text-slate-500">Topic par Open/Test karo; mapped concepts aur prerequisite chain yahan show hogi.</div>}{data.concepts.length > 0 ? <div className="mt-4 space-y-2">{data.concepts.slice(0, 5).map((concept) => <div key={concept.id} className="rounded-xl border border-white/10 p-3"><div className="font-medium">{concept.title}</div><div className="mt-1 text-xs text-slate-500">{concept.difficulty || 'Concept'}{concept.slo_code ? ` · ${concept.slo_code}` : ''}</div>{concept.description && <p className="mt-2 text-xs text-slate-400">{concept.description}</p>}</div>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">Concept mapping ready hai; current import me concepts abhi populate nahi hue.</div>}{data.prerequisites.length > 0 && <div className="mt-3 rounded-xl bg-violet-400/5 p-3 text-xs text-slate-400">{data.prerequisites.length} prerequisite links mapped.</div>}</div>
          </aside>
        </section>

        {(query || bookId) && <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"><div className="text-xs font-semibold uppercase tracking-wider text-amber-300">Textbook pages</div><h2 className="mt-1 text-xl font-semibold">Pages matching your search</h2><div className="mt-4 space-y-2">{data.pages.slice(0, 8).map((page) => <div key={page.id} className="rounded-2xl border border-white/10 p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-xs text-slate-500">Page {page.printed_page_label || page.page_number}</div><p className="mt-1 line-clamp-3 text-sm text-slate-300">{page.extracted_text || 'No extracted text.'}</p></div><button onClick={() => practicePage(page)} className="shrink-0 rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-slate-950">Practice</button></div></div>)}{!data.pages.length && <div className="text-sm text-slate-500">No page-text match. Topic search neeche check karo.</div>}</div></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"><div className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Content blocks & saved material</div><h2 className="mt-1 text-xl font-semibold">Search hits from the actual book</h2><div className="mt-4 space-y-2">{data.blocks.slice(0, 6).map((block) => { const node = data.nodes.find((n) => n.id === block.node_id); return <div key={block.id} className="rounded-2xl border border-white/10 p-4"><div className="text-xs text-slate-500">{block.block_type?.replaceAll('_', ' ')}{block.source_page ? ` · p. ${block.source_page}` : ''}</div><p className="mt-1 line-clamp-3 text-sm text-slate-300">{block.exact_text}</p>{node && <Link href={`/curriculum/${node.id}`} className="mt-2 inline-block text-xs text-sky-300 hover:text-sky-200">Open topic →</Link>}</div>; })}{!data.blocks.length && <div className="text-sm text-slate-500">Search kisi word/topic se start karo.</div>}</div></div>
        </section>}

        {result && <section className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.05] p-6"><div className="text-sm text-emerald-300">Test complete</div><div className="mt-2 text-4xl font-bold">{result.score} / {result.total_marks}</div><div className="mt-1 text-slate-300">{result.percentage}% · {result.correct_count} correct</div><button onClick={() => setResult(null)} className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-sm">Close result</button></section>}

        {test && <section className="mt-8 rounded-3xl border border-sky-400/20 bg-sky-400/[0.04] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs uppercase tracking-wider text-sky-300">Smart Test</div><h2 className="text-2xl font-semibold">{test.node?.number ? `${test.node.number} · ` : ''}{test.node?.title}</h2></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-400">{test.questions.length} questions</span></div><div className="mt-5 space-y-4">{test.questions.map((q: any, index: number) => <div key={q.id} className="rounded-2xl border border-white/10 bg-black/10 p-5"><div className="mb-3 text-xs text-slate-500">Q{index + 1} · {q.question_type}{q.marks ? ` · ${q.marks} marks` : ''}{q.source_page ? ` · p. ${q.source_page}` : ''}</div><div className="whitespace-pre-wrap leading-7">{q.exact_text}</div>{q.options ? <div className="mt-4 space-y-2">{Object.entries(q.options as Record<string, any>).map(([key, value]) => <label key={key} className="flex cursor-pointer gap-3 rounded-xl border border-white/10 p-3 hover:bg-white/[0.05]"><input type="radio" name={q.id} value={String(value)} checked={answers[q.id] === String(value)} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} /><span><b>{key}.</b> {String(value)}</span></label>)}</div> : <textarea value={answers[q.id] || ''} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} placeholder="Write your answer…" className="mt-4 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none" />}</div>)}<button onClick={submitTest} disabled={busy} className="w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit Test'}</button></div></section>}
      </div>
    </main>
  );
}
