'use client';

import { useMemo, useState } from 'react';
import {
  Banknote,
  Copy,
  Download,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  Megaphone,
  Mic,
  ShieldAlert,
  Sparkles as SparklesIcon,
  TrendingUp,
  WandSparkles,
} from 'lucide-react';
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

const ICONS: Record<string, typeof FileText> = {
  proposal: FileText,
  executive_summary: SparklesIcon,
  business_model: Layers,
  timeline: TrendingUp,
  flowchart_mermaid: GitBranch,
  architecture: Layers,
  budget_estimation: Banknote,
  risk_analysis: ShieldAlert,
  report: FileText,
  poster_copy: Megaphone,
  pitch_script: Mic,
};

export function ProjectBuilderClient({ isLocked = false }: { isLocked?: boolean }) {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<ProjectContent | null>(null);
  const entries = useMemo(() => Object.entries(content || {}), [content]);

  const generate = async () => {
    if (isLocked) {
      toast.error('AI Project Builder is locked on your current plan.');
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
      if (json.data.saved === false) {
        toast.warning('The project was generated, but it was not saved to history. The content is available here.');
      } else {
        toast.success('Project pack generated.');
      }
    } catch {
      toast.error('The project pack could not be generated.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Badge variant={isLocked ? 'secondary' : 'default'} className="mb-3">{isLocked ? 'Pro/Elite Locked' : 'Pro/Elite'}</Badge>
        <h1 className="text-2xl font-bold">AI Project Builder</h1>
        <p className="text-muted-foreground">Enter a one-line idea and AI will draft a proposal, report, flowchart, poster copy, and pitch script.</p>
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
              if (!ok) toast.error('No export content was found.');
            }}><Download className="h-4 w-4" />Export PDF / Print</Button>
          </div>
          <div id="project-builder-export" data-print-root="true" className="grid gap-4 lg:grid-cols-2">
            {entries.map(([key, value]) => (
              <EditableSection
                key={key}
                icon={ICONS[key] || FileText}
                title={LABELS[key] || key}
                value={value}
                onChange={(next) => setContent((prev) => ({ ...(prev || {}), [key]: next }))}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EditableSection({
  icon: Icon,
  title,
  value,
  onChange,
}: {
  icon: typeof FileText;
  title: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(`${title} copied`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-violet-400" />
            {title}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={copy}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <textarea
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          rows={title === 'Flowchart' ? 8 : 10}
          className="w-full rounded-xl border bg-background p-3 text-sm leading-6"
        />
      </CardContent>
    </Card>
  );
}
