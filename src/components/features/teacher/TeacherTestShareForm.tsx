'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export function TeacherTestShareForm({ tests, classes }: { tests: any[]; classes: any[] }) {
  const [testId, setTestId] = useState(tests[0]?.id || '');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [loading, setLoading] = useState(false);

  async function share() {
    if (!testId || !classId) return toast.error('Select a test and class.');
    setLoading(true);
    try {
      const response = await fetch('/api/teacher/tests/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testId, classId }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Could not share the test.');
      toast.success('Test shared with the class.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not share the test.');
    } finally {
      setLoading(false);
    }
  }

  if (!tests.length) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Generate a test first, then you can share it here.</CardContent></Card>;
  if (!classes.length) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Create a class first, then you can share generated tests with its students.</CardContent></Card>;

  return (
    <Card><CardContent className="grid gap-4 p-5">
      <label className="space-y-1 text-xs font-semibold text-muted-foreground"><span>Generated test</span><select className="h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground" value={testId} onChange={(e) => setTestId(e.target.value)}>{tests.map((test) => <option key={test.id} value={test.id}>{test.title} · {test.total_marks} marks</option>)}</select></label>
      <label className="space-y-1 text-xs font-semibold text-muted-foreground"><span>Your class</span><select className="h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground" value={classId} onChange={(e) => setClassId(e.target.value)}>{classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}</select></label>
      <Button variant="gradient" onClick={share} loading={loading}><Share2 className="h-4 w-4" /> Share with students</Button>
    </CardContent></Card>
  );
}
