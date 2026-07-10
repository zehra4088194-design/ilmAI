'use client';
import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface RoutineTest {
  id: string;
  subject: string;
  title: string;
  scheduled_at: string;
  status: 'upcoming' | 'completed' | 'missed';
  score: number | null;
}

/**
 * Shows a student's scheduled routine tests. Pass `studentId` when embedding
 * this on the Parent Dashboard; linked parents can also schedule tests.
 * Without props, it manages the logged-in student's own tests.
 */
export function RoutineTestsWidget({ studentId, readOnly = false }: { studentId?: string; readOnly?: boolean }) {
  const [tests, setTests] = useState<RoutineTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = studentId ? `?studentId=${studentId}` : '';
      const res = await fetch(`/api/routine-tests${qs}`);
      const json = await res.json();
      setTests(json.tests || []);
    } catch {
      toast.error('Routine tests load nahi ho sake');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const addTest = async () => {
    if (!subject || !title || !scheduledAt) { toast.error('Sab fields bharo'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/routine-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, title, scheduledAt, studentId }),
      });
      if (!res.ok) throw new Error();
      toast.success('Routine test add ho gaya');
      setSubject(''); setTitle(''); setScheduledAt(''); setShowForm(false);
      load();
    } catch {
      toast.error('Add nahi ho saka');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-violet-400" /> Routine Tests
        </CardTitle>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && !readOnly && (
          <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/30">
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Input placeholder="Test title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input type="datetime-local" className="col-span-2" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            <Button className="col-span-2" variant="gradient" size="sm" loading={saving} onClick={addTest}>Save</Button>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : tests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Koi routine test schedule nahi hai abhi.</p>
        ) : (
          <div className="space-y-2">
            {tests.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 text-sm">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.subject} · {new Date(t.scheduled_at).toLocaleString()}</p>
                </div>
                {t.status === 'upcoming' && <Badge variant="outline">Upcoming</Badge>}
                {t.status === 'completed' && (
                  <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" />{t.score != null ? `${t.score}%` : 'Done'}</Badge>
                )}
                {t.status === 'missed' && <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Missed</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
