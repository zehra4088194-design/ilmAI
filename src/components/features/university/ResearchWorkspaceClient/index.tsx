'use client';

import { useState } from 'react';
import { Copy, FileSearch, Loader2, Network, Plus, Quote, Route, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { toast } from 'sonner';

export function ResearchWorkspaceClient({ projectId, title, topic }: { projectId: string; title: string; topic?: string | null }) {
  const [sourceInput, setSourceInput] = useState('');
  const [summary, setSummary] = useState('');
  const [citation, setCitation] = useState<{ apa?: string; mla?: string } | null>(null);
  const [loadingCitation, setLoadingCitation] = useState(false);

  const generateCitation = async () => {
    if (sourceInput.trim().length < 3) {
      toast.error('Source URL, DOI ya title enter karo.');
      return;
    }
    setLoadingCitation(true);
    try {
      const [apaRes, mlaRes] = await Promise.all([
        fetch('/api/ai/citation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: sourceInput, style: 'APA 7th Edition' }) }),
        fetch('/api/ai/citation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: sourceInput, style: 'MLA 9th Edition' }) }),
      ]);
      const apa = await apaRes.json();
      const mla = await mlaRes.json();
      const next = { apa: apa.data?.full_reference, mla: mla.data?.full_reference };
      setCitation(next);
      await fetch('/api/research/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, title: sourceInput, source_url: sourceInput.startsWith('http') ? sourceInput : null, citation_apa: next.apa, citation_mla: next.mla, summary }),
      });
      toast.success('Source saved to research workspace');
    } catch {
      toast.error('Citation save nahi ho saki.');
    } finally {
      setLoadingCitation(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">Research Assistant</Badge>
        <h1 className="text-2xl font-bold">{title}</h1>
        {topic && <p className="text-muted-foreground">{topic}</p>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileSearch className="h-5 w-5 text-violet-400" />Find related sources</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <AiAnswerRenderer
                card={false}
                content={`### Search strategy\n\nUse these search directions instead of fake citations:\n\n1. Search Google Scholar, university library, IEEE/ACM/Springer/ResearchGate where appropriate.\n2. Try keywords: **${topic || title}**, methodology, case study, review paper, Pakistan, latest trends.\n3. Prefer recent peer-reviewed sources and official reports.\n4. Save every real source here after you verify it.`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Network className="h-5 w-5 text-violet-400" />PDF summary / mind map notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={7} className="w-full rounded-xl border bg-background p-3 text-sm" placeholder="PDF Summarizer ka output yahan paste/save karo..." />
              <p className="text-xs text-muted-foreground">Existing PDF Summarizer & Mind Mapper reuse karo, phir useful summary yahan source ke saath save ho sakti hai.</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Quote className="h-5 w-5 text-violet-400" />Generate & save citation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input value={sourceInput} onChange={(event) => setSourceInput(event.target.value)} className="h-11 w-full rounded-lg border bg-background px-3 text-sm" placeholder="Article URL, DOI, book title..." />
              <Button variant="gradient" className="w-full" onClick={generateCitation} disabled={loadingCitation}>
                {loadingCitation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save source
              </Button>
              {citation?.apa && <CitationLine label="APA" text={citation.apa} onCopy={() => copy(citation.apa!)} />}
              {citation?.mla && <CitationLine label="MLA" text={citation.mla} onCopy={() => copy(citation.mla!)} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Route className="h-5 w-5 text-violet-400" />Research roadmap</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li>1. Define problem statement and scope.</li>
                <li>2. Collect verified sources and summarize them.</li>
                <li>3. Build outline, methodology and expected results.</li>
                <li>4. Draft, revise, cite and check facts.</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-400" />Plagiarism guidance</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">Ye plagiarism detector nahi hai. Ye sirf citation, paraphrasing aur source hygiene ki guidance deta hai. Final submission se pehle facts aur references manually verify karo.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CitationLine({ label, text, onCopy }: { label: string; text: string; onCopy: () => void }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
        <Button variant="ghost" size="icon-sm" onClick={onCopy}><Copy className="h-3.5 w-3.5" /></Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
