'use client';

import { useMemo, useState } from 'react';
import { Clipboard, FileUp, Loader2, Network, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

type Summary = { methodology: string; key_findings: string; conclusion: string };
const MAX_PDF_BYTES = 20 * 1024 * 1024;

export function PdfSummarizerMindMapper() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'mindmap'>('summary');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary: Summary; mermaid_code: string } | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [processingStep, setProcessingStep] = useState('');

  const process = async () => {
    if (!file) return;
    if (file.size > MAX_PDF_BYTES) {
      toast.error('Upload a PDF smaller than 20 MB and 30 pages.');
      return;
    }
    setLoading(true);
    setProcessingStep('The PDF is being scanned by the available OCR service...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const ocrRes = await fetch('/api/pdf-extract', { method: 'POST', body: formData });
      const ocrText = await ocrRes.text();
      let ocrJson: { status?: string; error?: string; text?: string; data?: { text?: string } };
      try {
        ocrJson = JSON.parse(ocrText);
      } catch {
      toast.error('The PDF extractor returned an invalid response. Try a smaller, clearer file.');
        return;
      }
      if (!ocrRes.ok || ocrJson.status === 'error') {
      toast.error(ocrJson.error || 'Text could not be extracted from the PDF.');
        return;
      }
      const pdfText = String(ocrJson.text || ocrJson.data?.text || '').trim();
      if (pdfText.length < 20) {
      toast.error('No readable text was found in this PDF. Upload a clear scan or text-based PDF.');
        return;
      }
      setExtractedText(pdfText);
      setProcessingStep('Groq is preparing a detailed summary and mind map...');
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
      toast.error('The PDF could not be processed.');
    } finally {
      setLoading(false);
      setProcessingStep('');
    }
  };

  const onFile = (next: File | null) => {
    if (!next) return;
    if (next.type !== 'application/pdf' && !next.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Upload a PDF file only.');
      return;
    }
    setFile(next);
    setResult(null);
    setExtractedText('');
  };

  const copyExtractedText = async () => {
    if (!extractedText) return;
    await navigator.clipboard.writeText(extractedText);
    toast.success('Extracted text copied.');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">
          University Tool
        </Badge>
        <h1 className="text-2xl font-bold">PDF Summarizer & Mind-Mapper AI</h1>
        <p className="text-muted-foreground">
          Break research papers into methodology, findings, conclusions, and a concept map.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <label
            className={cn(
              'flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-colors',
              dragging ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-muted/20 hover:bg-muted/30'
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              onFile(event.dataTransfer.files?.[0] || null);
            }}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => onFile(event.target.files?.[0] || null)}
            />
            <UploadCloud className="mb-3 h-10 w-10 text-violet-400" />
            <p className="font-semibold">Upload Research Paper (Max 20 MB / 30 pages)</p>
            <p className="text-muted-foreground mt-2 text-sm">
              {file ? file.name : 'Drag and drop PDF here, or click to browse.'}
            </p>
          </label>
          <Button variant="gradient" onClick={process} disabled={!file || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Process Document
          </Button>
          {loading && (
            <div className="bg-muted/20 text-muted-foreground flex items-center gap-3 rounded-xl border p-4 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
              {processingStep || 'The PDF is being processed...'}
            </div>
          )}
        </CardContent>
      </Card>

      {extractedText && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Extracted PDF Text</h2>
                <p className="text-muted-foreground text-xs">This text was extracted by the available OCR service.</p>
              </div>
              <Button variant="outline" size="sm" onClick={copyExtractedText}>
                <Clipboard className="h-3.5 w-3.5" /> Copy to Clipboard
              </Button>
            </div>
            <pre className="bg-muted/20 text-muted-foreground max-h-72 overflow-auto rounded-xl border p-4 text-xs leading-5 whitespace-pre-wrap">
              {extractedText}
            </pre>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardContent className="p-5">
            <div className="bg-muted/20 mb-5 inline-flex rounded-lg border p-1">
              <button
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  activeTab === 'summary' && 'bg-primary text-primary-foreground'
                )}
                onClick={() => setActiveTab('summary')}
              >
                Summary
              </button>
              <button
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium',
                  activeTab === 'mindmap' && 'bg-primary text-primary-foreground'
                )}
                onClick={() => setActiveTab('mindmap')}
              >
                Mind Map
              </button>
            </div>
            {activeTab === 'summary' ? (
              <SummaryView summary={result.summary} />
            ) : (
              <MindMapView code={result.mermaid_code} />
            )}
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
    <div className="bg-muted/20 rounded-xl border p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6">{text}</p>
    </div>
  );
}

function MindMapView({ code }: { code: string }) {
  const nodes = useMemo(() => {
    return code
      .split('\n')
      .filter((line) => line.includes('-->'))
      .map((line) =>
        line
          .replace(/^[A-Z]+\s*/, '')
          .split('-->')
          .map((part) => part.replace(/[A-Z]\[|\]/g, '').trim())
      )
      .flat()
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 10);
  }, [code]);

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {nodes.map((node, index) => (
            <div key={node} className="flex items-center gap-3">
              <div className="rounded-xl border bg-violet-500/10 px-4 py-3 text-sm font-medium text-violet-700 dark:text-violet-200">
                {node}
              </div>
              {index < nodes.length - 1 && <Network className="text-muted-foreground h-4 w-4" />}
            </div>
          ))}
        </div>
      </div>
      <pre className="bg-muted/30 text-muted-foreground overflow-auto rounded-xl border p-4 text-xs">{code}</pre>
    </div>
  );
}
