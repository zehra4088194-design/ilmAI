'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function CurriculumExplorer({ scope }: { scope: 'school' | 'college' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [sectionId, setSectionId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      const res = await fetch(`/api/curriculum/search?q=${encodeURIComponent(q)}&limit=40`);
      const json = await res.json(); setResults(json.results || []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    fetch(`/api/institution/curriculum-assignment?scope=${scope}`).then(async (r) => {
      const json = await r.json();
      if (r.ok) { setSections(json.sections || []); setOrganizationId(json.organization_id || ''); }
    });
  }, [scope]);

  async function assign() {
    if (!selected || !sectionId) return;
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/institution/curriculum-assignment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope, organization_id: organizationId, node_id: selected.id, section_id: sectionId }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Unable to assign');
      setMessage(`Assigned “${selected.name}” to ${json.section?.name || 'section'}.`); setSelected(null);
    } catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8"><div className="text-sm text-sky-300">ilm AI · {scope === 'school' ? 'School' : 'College'} Curriculum</div><h1 className="mt-2 text-3xl font-bold">Find the exact topic you want</h1><p className="mt-2 text-slate-400">Search by 1.1, 1.1.1, 1.1.1.1, topic name, exercise, or question wording.</p></div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sub-topic number or title…" className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-lg outline-none focus:border-sky-400" />
        <div className="mt-6 grid gap-3">
          {results.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><div className="flex flex-wrap items-center justify-between gap-4"><Link href={`/curriculum/${item.id}`} className="min-w-0 flex-1"><div className="text-sm text-sky-300">{item.number || item.type} · {item.subject || 'General'}</div><div className="mt-1 text-xl font-semibold">{item.name}</div><div className="mt-1 text-sm text-slate-400">{item.book} · {item.grade_level || 'Grade not set'}{item.path_numbers ? ` · ${item.path_numbers}` : ''}</div></Link><button onClick={() => setSelected(item)} className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10">Assign</button></div></div>)}
          {q && !results.length && <div className="p-8 text-center text-slate-500">No published match found.</div>}
        </div>

        {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"><div className="text-sm text-sky-300">Assign curriculum</div><h2 className="mt-2 text-2xl font-semibold">{selected.number} {selected.name}</h2><p className="mt-1 text-sm text-slate-400">{selected.book}</p><label className="mt-6 block text-sm text-slate-300">Section</label><select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3"><option value="">Select section</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><div className="mt-6 flex gap-3"><button onClick={() => setSelected(null)} className="flex-1 rounded-xl border border-white/10 px-4 py-3">Cancel</button><button onClick={assign} disabled={!sectionId || busy} className="flex-1 rounded-xl bg-sky-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40">{busy ? 'Assigning…' : 'Assign Homework'}</button></div></div></div>}
        {message && <div className="fixed bottom-5 right-5 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm">{message}</div>}
      </div>
    </main>
  );
}
