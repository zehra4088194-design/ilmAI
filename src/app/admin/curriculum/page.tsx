'use client';

import { useState } from 'react';

const example = `{
  "extraction_version": "deepseek-structured-v1",
  "source_file_name": "Class 9 Biology.pdf",
  "book": {
    "title": "Biology",
    "subject_id": null,
    "grade_level": "9",
    "board": "",
    "curriculum": "",
    "edition": "",
    "publisher": "",
    "language": "English",
    "status": "published"
  },
  "nodes": [
    {
      "number": "1",
      "title": "Introduction",
      "node_type": "chapter",
      "content": [{"block_type":"paragraph","exact_text":"Paste the exact book wording here.","source_page":1}],
      "children": [
        {
          "number": "1.1",
          "title": "A sub-topic",
          "node_type": "topic",
          "content": [{"block_type":"paragraph","exact_text":"Exact text…","source_page":2}],
          "questions": [{"question_type":"short","question_number":"1","exact_text":"Exact question wording…","marks":2,"source_page":2}],
          "children": [
            {"number":"1.1.1","title":"Nested sub-topic","node_type":"subtopic","content":[]}
          ]
        }
      ]
    }
  ],
  "pages": [{"page_number":1,"printed_page_label":"1","extracted_text":"Exact page text"}]
}`;

export default function AdminCurriculumPage() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function importJson() {
    setBusy(true); setResult(null);
    try {
      const payload = JSON.parse(text);
      const res = await fetch('/api/admin/curriculum/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      setResult({ ok: res.ok, ...json });
    } catch (e: any) { setResult({ ok: false, error: e.message }); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl">
      <div className="mb-6"><div className="text-sm text-sky-300">ilm AI · Admin</div><h1 className="mt-2 text-3xl font-bold">Curriculum Book Import</h1><p className="mt-2 text-slate-400">Paste the structured JSON returned by DeepSeek. The importer preserves the exact wording, hierarchy, page references and question types.</p></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} placeholder="Paste DeepSeek JSON here…" className="min-h-[600px] w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-sm leading-6 outline-none focus:border-sky-400" /><div className="mt-3 flex gap-2"><button onClick={() => setText(example)} className="rounded-xl border border-white/10 px-4 py-2 text-sm">Load Example</button><button onClick={importJson} disabled={!text.trim() || busy} className="rounded-xl bg-sky-400 px-5 py-2 font-semibold text-slate-950 disabled:opacity-40">{busy ? 'Importing…' : 'Import Book'}</button></div></section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h2 className="font-semibold">Import result</h2>{!result ? <p className="mt-3 text-sm text-slate-500">Nothing imported in this session yet.</p> : <pre className="mt-3 max-h-[600px] overflow-auto whitespace-pre-wrap text-sm text-slate-300">{JSON.stringify(result, null, 2)}</pre>}<div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4 text-sm leading-6 text-amber-100">Before publishing a real book, review OCR/extraction against the PDF—especially equations, tables, diagrams and question numbering. The system is designed to never silently invent missing source text.</div></section>
      </div>
    </div></main>
  );
}
