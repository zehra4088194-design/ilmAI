'use client';

import { useEffect, useState } from 'react';
import { Check, Eye, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

function pretty(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function InstitutionApplicationsInbox() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseNote, setResponseNote] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/student-applications/inbox', { cache: 'no-store' });
    const json = await res.json();
    if (res.ok) setApplications(json.applications || []);
    else setError(json.error || 'Applications load nahi hui.');
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const update = async (id: string, status: string) => {
    setBusyId(id); setError('');
    try {
      const res = await fetch(`/api/student-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, responseNote: responseNote[id] || '' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Status update nahi hua.');
      setApplications((items) => items.map((item) => item.id === id ? { ...item, ...json.application } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update nahi hua.');
    } finally {
      setBusyId(null);
    }
  };

  const pending = applications.filter((item) => ['submitted', 'seen', 'needs_changes'].includes(item.status));

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Student applications</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm">{error}</div>}
        {loading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div> : pending.length === 0 ? <p className="text-muted-foreground text-sm">No pending student applications.</p> : pending.map((item) => (
          <div key={item.id} className="rounded-xl border p-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-semibold">{item.subject}</p>
                <p className="text-muted-foreground text-xs">{item.studentName} · {item.institutionName} · {pretty(item.application_type)} · {pretty(item.recipient_type)}</p>
                {(item.starts_on || item.ends_on) && <p className="text-muted-foreground mt-1 text-xs">Dates: {item.starts_on || '—'} {item.ends_on ? `to ${item.ends_on}` : ''}</p>}
              </div>
              <span className="rounded-full border px-2.5 py-1 text-xs">{pretty(item.status)}</span>
            </div>
            <div className="bg-muted/20 mt-4 rounded-lg p-4 whitespace-pre-wrap text-sm">{item.body}</div>
            <Textarea value={responseNote[item.id] || ''} onChange={(e) => setResponseNote((current) => ({ ...current, [item.id]: e.target.value }))} className="mt-3 min-h-20" placeholder="Optional response / note for the student" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => update(item.id, 'seen')} disabled={busyId === item.id}><Eye className="h-4 w-4" /> Mark seen</Button>
              <Button size="sm" onClick={() => update(item.id, 'approved')} disabled={busyId === item.id}><Check className="h-4 w-4" /> Approve</Button>
              <Button size="sm" variant="outline" onClick={() => update(item.id, 'needs_changes')} disabled={busyId === item.id}>Needs changes</Button>
              <Button size="sm" variant="outline" onClick={() => update(item.id, 'rejected')} disabled={busyId === item.id}><X className="h-4 w-4" /> Reject</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
