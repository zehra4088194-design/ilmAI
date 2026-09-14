'use client';

import { useState } from 'react';
import { CheckCircle2, FileUp, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function InstitutionAssignmentSubmit({ kind, assignmentId, title, instructions, dueAt, existing }: {
  kind: 'school' | 'college';
  assignmentId: string;
  title: string;
  instructions?: string | null;
  dueAt?: string | null;
  existing?: { id: string; submission_url: string | null; submission_text: string | null; submitted_at: string | null; marks_awarded: number | null; feedback: string | null } | null;
}) {
  const [text, setText] = useState(existing?.submission_text || '');
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(Boolean(existing?.submitted_at));

  async function submit() {
    if (!text.trim() && !file) return toast.error('Write an answer or upload a file.');
    setSending(true);
    try {
      const form = new FormData();
      form.append('kind', kind); form.append('assignmentId', assignmentId); form.append('text', text);
      if (file) form.append('file', file);
      const response = await fetch('/api/institution/assignment-submit', { method: 'POST', body: form });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Submission failed.');
      setSubmitted(true);
      toast.success('Assignment submitted successfully.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Submission failed.'); }
    finally { setSending(false); }
  }

  return <Card>
    <CardHeader><CardTitle className="text-xl">{title}</CardTitle>{dueAt && <p className="text-muted-foreground text-sm">Due {new Date(dueAt).toLocaleString()}</p>}</CardHeader>
    <CardContent className="space-y-5">
      {instructions && <div className="rounded-xl border bg-muted/20 p-4 text-sm whitespace-pre-wrap">{instructions}</div>}
      {submitted && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Submitted{existing?.marks_awarded != null ? ` · ${existing.marks_awarded} marks` : ''}{existing?.feedback ? ` · ${existing.feedback}` : ''}</div>}
      <label className="space-y-2 block"><span className="text-sm font-semibold">Your answer</span><Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your answer here..." /></label>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} /><FileUp className="h-5 w-5 text-violet-500" /><span className="text-sm font-semibold">{file ? file.name : 'Upload PDF / photo'}</span><Badge variant="outline" className="ml-auto">Max 10 MB</Badge></label>
      <Button onClick={() => void submit()} disabled={sending}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{submitted ? 'Update submission' : 'Submit assignment'}</Button>
    </CardContent>
  </Card>;
}
