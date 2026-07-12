'use client';

import { useMemo, useState } from 'react';
import { Download, Loader2, Presentation, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { printElementById } from '@/lib/utils/printElement';
import { toast } from 'sonner';

type ProjectContent = Record<string, string>;

const LABELS: Record<string, string> = {
  proposal: 'Proposal',
  executive_summary: 'Executive Summary',
  business_model: 'Business Model',
  timeline: 'Timeline',
  flowchart_mermaid: 'Flowchart',
  architecture: 'Architecture',
  budget_estimation: 'Budget Estimation',
  risk_analysis: 'Risk Analysis',
  report: 'Project Report',
  poster_copy: 'Poster Copy',
  pitch_script: 'Pitch Script',
};

export function ProjectBuilderClient({ isLocked = false }: { isLocked?: boolean }) {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<ProjectContent | null>(null);
  const entries = useMemo(() => Object.entries(content || {}), [content]);

  const generate = async () => {
    if (isLocked) {
      toast.error('AI Project Builder is plan mein locked hai.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/project-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ one_liner: idea }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setContent(json.data.content);
    } catch {
      toast.error('Project pack generate nahi ho saka.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Badge variant={isLocked ? 'secondary' : 'default'} className="mb-3">{isLocked ? 'Pro/Elite Locked' : 'Pro/Elite'}</Badge>
        <h1 className="text-2xl font-bold">AI Project Builder</h1>
        <p className="text-muted-foreground">One-line idea do, AI proposal, report, flowchart, poster copy aur pitch script draft karega.</p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_auto]">
          <input value={idea} onChange={(event) => setIdea(event.target.value)} className="h-11 rounded-lg border bg-background px-3 text-sm" placeholder="Example: AI attendance system for university classrooms" />
          <Button variant="gradient" onClick={generate} disabled={loading || idea.length < 8}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            Generate project
          </Button>
        </CardContent>
      </Card>

      {isLocked && !content && (
        <Card>
          <CardContent className="grid gap-3 p-5 md:grid-cols-3">
            {['Proposal preview', 'Flowchart preview', 'Pitch script preview'].map((item) => (
              <div key={item} className="rounded-xl border bg-muted/20 p-4">
                <p className="font-semibold">{item}</p>
                <p className="mt-2 text-sm text-muted-foreground blur-[2px]">Upgrade to Pro or Elite to unlock generated project content.</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {entries.length > 0 && (
        <>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              const ok = printElementById('project-builder-export', 'ilm AI Project Builder');
              if (!ok) toast.error('Export content nahi mila.');
            }}><Download className="h-4 w-4" />Export PDF / Print</Button>
            <Button variant="outline" onClick={() => toast.info('PPTX export coming soon.')}><Presentation className="h-4 w-4" />PPTX Coming Soon</Button>
          </div>
          <div id="project-builder-export" className="grid gap-4 lg:grid-cols-2">
            {entries.map(([key, value]) => (
              <EditableSection key={key} title={LABELS[key] || key} value={value} onChange={(next) => setContent((prev) => ({ ...(prev || {}), [key]: next }))} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EditableSection({ title, value, onChange }: { title: string; value: string; onChange: (next: string) => void }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} rows={title === 'Flowchart' ? 8 : 10} className="w-full rounded-xl border bg-background p-3 text-sm leading-6" />
      </CardContent>
    </Card>
  );
}
