'use client';

import { useMemo, useState } from 'react';
import { Camera, FileText, Loader2, Plus, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function TeacherPhotoTestClient({ classes, planTier }: { classes: { id: string; name: string }[]; planTier: string }) {
  const [pages, setPages] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('Scanned Pages Test');
  const [mcqCount, setMcqCount] = useState(8);
  const [shortCount, setShortCount] = useState(4);
  const [longCount, setLongCount] = useState(2);
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [scanning, setScanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [savedTestId, setSavedTestId] = useState<string | null>(null);

  const totalRequested = useMemo(() => mcqCount + shortCount + longCount, [mcqCount, shortCount, longCount]);

  async function scanFiles(files: FileList | null) {
    if (!files?.length) return;
    setScanning(true);
    try {
      const texts: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/') || file.size > 4 * 1024 * 1024) {
          toast.error(`${file.name} is not a valid image under 4MB.`);
          continue;
        }
        setPreview(URL.createObjectURL(file));
        const form = new FormData();
        form.append('file', file);
        form.append('scan_type', 'textbook_page');
        form.append('language', 'en');
        const response = await fetch('/api/vision/scan', { method: 'POST', body: form });
        const json = await response.json();
        if (!response.ok || json.status === 'error') throw new Error(json.error || `Could not scan ${file.name}`);
        if (json.data?.ocr_text?.trim()) texts.push(json.data.ocr_text.trim());
      }
      if (texts.length) setPages((current) => [...current, ...texts]);
      toast.success(`${texts.length} page(s) added.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Scanning failed.');
    } finally {
      setScanning(false);
    }
  }

  async function generateAndSave() {
    if (!pages.length) return toast.error('Add at least one textbook page first.');
    setGenerating(true);
    try {
      const response = await fetch('/api/vision/test-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pages.join('\n\n'), title, mcqCount, shortCount, longCount }),
      });
      const json = await response.json();
      if (!response.ok || json.status === 'error') throw new Error(json.error || 'Test generation failed.');
      const saveResponse = await fetch('/api/teacher/tests/from-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper: json.data.paper, title, planTier }),
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error || 'Could not save the teacher test.');
      setSavedTestId(saved.testId);
      toast.success(`Test saved with ${totalRequested} requested questions.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Test generation failed.');
    } finally {
      setGenerating(false);
    }
  }

  async function share() {
    if (!savedTestId || !classId) return toast.error('Select a class first.');
    setSharing(true);
    try {
      const response = await fetch('/api/teacher/tests/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: savedTestId, classId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Could not share the test.');
      toast.success(`Test shared with ${json.count} students.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not share the test.');
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="border-violet-500/30">
        <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-violet-500" />Photo → AI Test</CardTitle><p className="text-muted-foreground text-sm">Photograph textbook pages, let ilm AI read them, generate a test from those pages, save it, and share it with your class.</p></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-5 text-center">
            <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => void scanFiles(e.target.files)} />
            {preview ? <img src={preview} alt="Last scanned page" className="max-h-36 rounded-lg object-contain" /> : <><Camera className="mb-2 h-8 w-8 text-violet-500" /><p className="font-semibold">Take or upload pages</p><p className="text-muted-foreground text-xs">Multiple pages can be added in one test.</p></>}
          </label>
          <div className="flex flex-wrap gap-2">{pages.map((page, i) => <Badge key={`${i}-${page.slice(0,20)}`} variant="secondary">Page {i + 1}</Badge>)}{!pages.length && <span className="text-muted-foreground text-xs">No pages scanned yet.</span>}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">Paper title<Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></label>
            <label className="text-xs font-semibold">Share with class<select value={classId} onChange={(e) => setClassId(e.target.value)} className="bg-background mt-1 h-10 w-full rounded-lg border px-3 text-sm"><option value="">Select class</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className="text-xs font-semibold">MCQs<Input type="number" min={0} max={30} value={mcqCount} onChange={(e) => setMcqCount(Number(e.target.value))} className="mt-1" /></label>
            <label className="text-xs font-semibold">Short questions<Input type="number" min={0} max={15} value={shortCount} onChange={(e) => setShortCount(Number(e.target.value))} className="mt-1" /></label>
            <label className="text-xs font-semibold">Long questions<Input type="number" min={0} max={8} value={longCount} onChange={(e) => setLongCount(Number(e.target.value))} className="mt-1" /></label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void generateAndSave()} disabled={scanning || generating || !pages.length} variant="gradient"><Sparkles className="h-4 w-4" />{generating ? 'Generating...' : 'Generate & Save Test'}</Button>
            {savedTestId && <Button onClick={() => void share()} disabled={sharing || !classId} variant="outline">{sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Share with class</Button>}
          </div>
          {savedTestId && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs"><FileText className="mr-1 inline h-3.5 w-3.5" />Saved test: {savedTestId}. Select a class and share it with all enrolled students.</div>}
          <Textarea className="hidden" value="" readOnly />
        </CardContent>
      </Card>
    </div>
  );
}
