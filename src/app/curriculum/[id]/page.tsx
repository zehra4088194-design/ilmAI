'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

function Block({ block }: { block: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-300">{String(block.block_type || 'content').replaceAll('_', ' ')}</div>
      <div className="whitespace-pre-wrap text-[16px] leading-8 text-slate-100">{block.exact_text}</div>
      {block.source_page && <div className="mt-3 text-xs text-slate-500">Source page {block.source_page}{block.source_page_end && block.source_page_end !== block.source_page ? `–${block.source_page_end}` : ''}</div>}
    </div>
  );
}

export default function CurriculumReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const [nodeId, setNodeId] = useState('');
  const [node, setNode] = useState<any>(null);
  const [tab, setTab] = useState<'content' | 'questions' | 'test'>('content');
  const [test, setTest] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { params.then((p) => setNodeId(p.id)); }, [params]);
  useEffect(() => {
    if (!nodeId) return;
    fetch(`/api/curriculum/node/${nodeId}`).then((r) => r.json()).then((json) => setNode(json.node || null));
  }, [nodeId]);

  const questionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of node?.questions || []) counts[q.question_type] = (counts[q.question_type] || 0) + 1;
    return counts;
  }, [node]);

  async function startTest() {
    setBusy(true); setResult(null); setAnswers({});
    try {
      const res = await fetch('/api/curriculum/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ node_id: nodeId, count: 10 }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to start test');
      setTest(json); setTab('test');
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function submitTest() {
    if (!test?.attempt_id) return;
    setBusy(true);
    try {
      const res = await fetch('/api/curriculum/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', node_id: nodeId, attempt_id: test.attempt_id, answers }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to submit test');
      setResult(json.result); setTest(null);
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  if (!node) return <main className="min-h-screen bg-slate-950 p-8 text-slate-300">Loading curriculum…</main>;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/curriculum" className="text-sm text-sky-300 hover:text-sky-200">← Curriculum search</Link>
        <header className="mt-5 rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-white/[0.03] to-transparent p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="text-sm text-slate-400">{node.book?.subject || 'Subject'} · {node.book?.title || 'Book'} · {node.book?.grade_level || 'Grade'}</div>
              <div className="mt-2 flex flex-wrap items-center gap-3"><span className="rounded-lg bg-sky-400/10 px-3 py-1 text-sm font-semibold text-sky-300">{node.number || 'Section'}</span><h1 className="text-3xl font-bold">{node.title}</h1></div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{node.path_titles}</p>
              <div className="mt-3 text-xs text-slate-500">Exact source content is preserved below. Source pages are shown wherever available.</div>
            </div>
            <button onClick={startTest} disabled={busy} className="rounded-xl bg-sky-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Starting…' : 'Take Test'}</button>
          </div>
          {!!Object.keys(questionCounts).length && <div className="mt-5 flex flex-wrap gap-2">{Object.entries(questionCounts).map(([type, count]) => <span key={type} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{count} {type.replaceAll('_', ' ')}</span>)}</div>}
        </header>

        <div className="mt-5 flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {(['content', 'questions', 'test'] as const).map((name) => <button key={name} onClick={() => setTab(name)} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === name ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>{name === 'content' ? 'Read Content' : name === 'questions' ? 'Saved Questions' : 'Test'}</button>)}
        </div>

        {tab === 'content' && <section className="mt-5 space-y-4">
          {(node.content || []).map((block: any) => <Block key={block.id} block={block} />)}
          {(node.examples || []).map((example: any) => <div key={example.id} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5"><div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Example {example.ordinal + 1}</div>{example.title && <h3 className="mb-2 text-lg font-semibold">{example.title}</h3>}{example.exact_question && <div className="whitespace-pre-wrap leading-7">{example.exact_question}</div>}{example.exact_solution && <div className="mt-4 whitespace-pre-wrap border-t border-white/10 pt-4 leading-7 text-slate-300">{example.exact_solution}</div>}</div>)}
          {(node.children || []).length > 0 && <div className="rounded-2xl border border-white/10 p-5"><h2 className="font-semibold">Inside this section</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{node.children.map((child: any) => <Link key={child.id} href={`/curriculum/${child.id}`} className="rounded-xl bg-white/[0.04] p-3 hover:bg-white/[0.08]"><span className="text-sky-300">{child.number}</span> <span className="ml-2">{child.title}</span></Link>)}</div></div>}
        </section>}

        {tab === 'questions' && <section className="mt-5 space-y-3">{(node.questions || []).map((q: any, i: number) => <div key={q.id} className="rounded-2xl border border-white/10 p-5"><div className="mb-2 text-xs text-slate-500">{q.question_type.replaceAll('_', ' ')} {q.question_number || i + 1}{q.marks ? ` · ${q.marks} marks` : ''}{q.source_page ? ` · p. ${q.source_page}` : ''}</div><div className="whitespace-pre-wrap leading-7">{q.exact_text}</div>{q.options && <pre className="mt-3 overflow-auto rounded-xl bg-black/20 p-3 text-sm text-slate-300">{JSON.stringify(q.options, null, 2)}</pre>}</div>)}{!(node.questions || []).length && <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500">No saved questions for this topic yet.</div>}</section>}

        {tab === 'test' && <section className="mt-5">{result && <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-6"><div className="text-sm text-emerald-300">Test complete</div><div className="mt-2 text-4xl font-bold">{result.score} / {result.total_marks}</div><div className="mt-1 text-slate-300">{result.percentage}% · {result.correct_count} correct</div></div>}{!test && !result && <div className="rounded-2xl border border-white/10 p-8 text-center text-slate-400">Press “Take Test” to generate a test from this topic’s saved questions.</div>}{test && <div className="space-y-4">{test.questions.map((q: any, i: number) => <div key={q.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="mb-3 text-sm text-slate-400">Question {i + 1} · {q.question_type} · {q.marks || 1} marks</div><div className="whitespace-pre-wrap leading-7">{q.exact_text}</div>{q.options ? <div className="mt-4 space-y-2">{Object.entries(q.options as Record<string, any>).map(([key, value]) => <label key={key} className="flex cursor-pointer gap-3 rounded-xl border border-white/10 p-3 hover:bg-white/[0.05]"><input type="radio" name={q.id} value={String(value)} checked={answers[q.id] === String(value)} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} /> <span><b>{key}.</b> {String(value)}</span></label>)}</div> : <textarea value={answers[q.id] || ''} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))} placeholder="Write your answer…" className="mt-4 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none" />}</div>)}<button onClick={submitTest} disabled={busy} className="w-full rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit Test'}</button></div>}</section>}
      </div>
    </main>
  );
}
