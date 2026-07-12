'use client';

import { useMemo, useState } from 'react';
import { FileUp, Loader2, Network, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

type Summary = { methodology: string; key_findings: string; conclusion: string };

async function extractPdfText(file: File) {
  const buffer = await file.arrayBuffer();
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableFontFace: true }).promise;
  const pages: string[] = [];
  const maxPages = Math.min(pdf.numPages, 40);

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }

  return pages.join('\n\n').replace(/\s+/g, ' ').trim().slice(0, 25000);
}

export function PdfSummarizerMindMapper() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'mindmap'>('summary');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary: Summary; mermaid_code: string } | null>(null);

  const process = async () => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('PDF max 10MB hona chahiye.');
      return;
    }
    setLoading(true);
    try {
      const pdfText = await extractPdfText(file);
      const res = await fetch('/api/ai/pdf-summarizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfText, fileName: file.name }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setResult(json.data);
      setActiveTab('summary');
    } catch {
      toast.error('PDF process nahi ho saka.');
    } finally {
      setLoading(false);
    }
  };

  const onFile = (next: File | null) => {
    if (!next) return;
    if (next.type !== 'application/pdf' && !next.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Sirf PDF file upload karo.');
      return;
    }
    setFile(next);
    setResult(null);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">University Tool</Badge>
        <h1 className="text-2xl font-bold">PDF Summarizer & Mind-Mapper AI</h1>
        <p className="text-muted-foreground">Research papers ko methodology, findings, conclusion aur concept map mein break karo.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <label
            className={cn('flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors', dragging ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-muted/20 hover:bg-muted/30')}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              onFile(event.dataTransfer.files?.[0] || null);
            }}
          >
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => onFile(event.target.files?.[0] || null)} />
            <UploadCloud className="mb-3 h-10 w-10 text-violet-400" />
            <p className="font-semibold">Upload Research Paper or Document (Max 10MB)</p>
            <p className="mt-2 text-sm text-muted-foreground">{file ? file.name : 'Drag and drop PDF here, or click to browse.'}</p>
          </label>
          <Button variant="gradient" onClick={process} disabled={!file || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Process Document
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-5 inline-flex rounded-lg border bg-muted/20 p-1">
              <button className={cn('rounded-md px-4 py-2 text-sm font-medium', activeTab === 'summary' && 'bg-primary text-primary-foreground')} onClick={() => setActiveTab('summary')}>Summary</button>
              <button className={cn('rounded-md px-4 py-2 text-sm font-medium', activeTab === 'mindmap' && 'bg-primary text-primary-foreground')} onClick={() => setActiveTab('mindmap')}>Mind Map</button>
            </div>
            {activeTab === 'summary' ? <SummaryView summary={result.summary} /> : <MindMapView code={result.mermaid_code} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryView({ summary }: { summary: Summary }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <SummaryCard title="Methodology" text={summary.methodology} />
      <SummaryCard title="Key Findings" text={summary.key_findings} />
      <SummaryCard title="Conclusion" text={summary.conclusion} />
    </div>
  );
}

function SummaryCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function MindMapView({ code }: { code: string }) {
  const nodes = useMemo(() => {
    return code.split('\n')
      .filter((line) => line.includes('-->'))
      .map((line) => line.replace(/^[A-Z]+\s*/, '').split('-->').map((part) => part.replace(/[A-Z]\[|\]/g, '').trim()))
      .flat()
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 10);
  }, [code]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-background p-5">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {nodes.map((node, index) => (
            <div key={node} className="flex items-center gap-3">
              <div className="rounded-xl border bg-violet-500/10 px-4 py-3 text-sm font-medium text-violet-700 dark:text-violet-200">
                {node}
              </div>
              {index < nodes.length - 1 && <Network className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>
      <pre className="overflow-auto rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">{code}</pre>
    </div>
  );
}
