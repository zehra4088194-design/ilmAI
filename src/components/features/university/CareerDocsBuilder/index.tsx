'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Download, FileUser, Loader2, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

type ViewMode = 'resume' | 'cover_letter';

export function CareerDocsBuilder() {
  const [form, setForm] = useState({
    name: '',
    contact: '',
    linkedin: '',
    university: '',
    degree: '',
    cgpa: '',
    skills: '',
    projects: '',
    jobDescription: '',
  });
  const [view, setView] = useState<ViewMode>('resume');
  const [outputs, setOutputs] = useState<Record<ViewMode, string>>({ resume: '', cover_letter: '' });
  const [loading, setLoading] = useState<ViewMode | null>(null);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const generate = async (type: ViewMode) => {
    setLoading(type);
    setView(type);
    try {
      const res = await fetch('/api/ai/career-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, userData: form, jobDescription: form.jobDescription }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setOutputs((current) => ({ ...current, [type]: json.data.markdown }));
      toast.success(type === 'resume' ? 'ATS resume generated' : 'Cover letter generated');
    } catch {
      toast.error('Document generate nahi ho saka.');
    } finally {
      setLoading(null);
    }
  };

  const activeOutput = outputs[view];

  const copy = async () => {
    if (!activeOutput) return;
    await navigator.clipboard.writeText(activeOutput);
    toast.success('Copied text');
  };

  const downloadPdf = () => {
    if (!activeOutput) return;
    window.print();
    toast.success('Print dialog open ho gaya. PDF save kar sakte ho.');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">University Career Tool</Badge>
        <h1 className="text-2xl font-bold">ATS-Friendly Resume & Cover Letter Builder AI</h1>
        <p className="text-muted-foreground">Final-year students ke liye professional ATS resume aur concise cover letter drafts.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Student Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Input label="Name" value={form.name} onChange={(value) => update('name', value)} placeholder="Your full name" />
              <Input label="Contact" value={form.contact} onChange={(value) => update('contact', value)} placeholder="Email / phone" />
              <Input label="LinkedIn" value={form.linkedin} onChange={(value) => update('linkedin', value)} placeholder="linkedin.com/in/..." />
              <Input label="University" value={form.university} onChange={(value) => update('university', value)} placeholder="University name" />
              <Input label="Degree" value={form.degree} onChange={(value) => update('degree', value)} placeholder="BS Computer Science" />
              <Input label="CGPA" value={form.cgpa} onChange={(value) => update('cgpa', value)} placeholder="3.6 / 4.0" />
            </div>
            <Textarea label="Key Skills" value={form.skills} onChange={(value) => update('skills', value)} placeholder="React, Python, SQL, research writing" />
            <Textarea label="Notable Projects" value={form.projects} onChange={(value) => update('projects', value)} placeholder="Final year project, internships, university projects" rows={5} />
            <Textarea label="Target Job Description" value={form.jobDescription} onChange={(value) => update('jobDescription', value)} placeholder="Paste job description here for a stronger cover letter" rows={5} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="gradient" onClick={() => generate('resume')} disabled={loading !== null}>
                {loading === 'resume' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUser className="h-4 w-4" />}
                Generate ATS Resume
              </Button>
              <Button variant="gradient" onClick={() => generate('cover_letter')} disabled={loading !== null}>
                {loading === 'cover_letter' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Generate Cover Letter
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex rounded-lg border bg-muted/20 p-1">
                <button className={cn('rounded-md px-4 py-2 text-sm font-medium', view === 'resume' && 'bg-primary text-primary-foreground')} onClick={() => setView('resume')}>View Resume</button>
                <button className={cn('rounded-md px-4 py-2 text-sm font-medium', view === 'cover_letter' && 'bg-primary text-primary-foreground')} onClick={() => setView('cover_letter')}>View Cover Letter</button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={downloadPdf} disabled={!activeOutput}><Download className="h-3.5 w-3.5" />Download as PDF</Button>
                <Button variant="outline" size="sm" onClick={copy} disabled={!activeOutput}><Copy className="h-3.5 w-3.5" />Copy Text</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div id="career-doc-preview" className="min-h-[620px] rounded-xl border bg-background p-6">
              {activeOutput ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{activeOutput}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                  <Sparkles className="mb-3 h-10 w-10 text-violet-400" />
                  <h2 className="font-semibold">Generated preview yahan show hogi</h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">Left side details fill karo, phir resume ya cover letter generate karo.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; rows?: number }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
    </div>
  );
}
