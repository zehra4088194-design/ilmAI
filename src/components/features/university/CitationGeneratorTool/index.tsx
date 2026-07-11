'use client';

import { useState } from 'react';
import { Copy, Loader2, Quote, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const STYLES = ['APA 7th Edition', 'MLA 9th Edition', 'Harvard', 'IEEE', 'Chicago'];

export function CitationGeneratorTool() {
  const [input, setInput] = useState('');
  const [style, setStyle] = useState(STYLES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ in_text: string; full_reference: string } | null>(null);

  const generate = async () => {
    if (input.trim().length < 3) {
      toast.error('Valid URL, DOI, book title ya author name enter karo.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/citation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, style }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setResult(json.data);
    } catch {
      toast.error('Citation generate nahi ho saki.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">University Tool</Badge>
        <h1 className="text-2xl font-bold">AI Citation & Reference Generator</h1>
        <p className="text-muted-foreground">Study drafts ke liye citations banao. Final submission se pehle source details verify zaroor karo.</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Source input</label>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Enter Article URL, DOI, Book Title, or Author Name"
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">Citation Style</label>
            <select value={style} onChange={(event) => setStyle(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
              {STYLES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <Button variant="gradient" className="h-11" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Citation
          </Button>
        </CardContent>
      </Card>

      <Card className="min-h-72">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Quote className="h-4 w-4 text-violet-400" /> Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result && !loading && <p className="text-sm text-muted-foreground">Generated in-text citation aur full bibliography yahan show hogi.</p>}
          {loading && <div className="h-24 animate-pulse rounded-xl bg-muted/40" />}
          {result && (
            <>
              <ResultBlock title="In-text Citation" value={result.in_text} onCopy={() => copy(result.in_text)} />
              <ResultBlock title="Full Bibliography / Reference Entry" value={result.full_reference} onCopy={() => copy(result.full_reference)} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultBlock({ title, value, onCopy }: { title: string; value: string; onCopy: () => void }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button variant="outline" size="sm" onClick={onCopy}><Copy className="h-3.5 w-3.5" />Copy to Clipboard</Button>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{value}</p>
    </div>
  );
}
