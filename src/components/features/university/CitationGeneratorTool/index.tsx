'use client';

import { useMemo, useState } from 'react';
import { BookMarked, Copy, Loader2, Plus, Quote, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { printElementById } from '@/lib/utils/printElement';
import { toast } from 'sonner';

const STYLES = ['APA 7th Edition', 'MLA 9th Edition', 'Harvard', 'IEEE', 'Chicago'];

type CitationEntry = { id: string; style: string; in_text: string; full_reference: string };

export function CitationGeneratorTool() {
  const [input, setInput] = useState('');
  const [style, setStyle] = useState<string>(STYLES[0] ?? 'APA 7th Edition');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ in_text: string; full_reference: string } | null>(null);
  const [bibliography, setBibliography] = useState<CitationEntry[]>([]);

  const generate = async () => {
    if (input.trim().length < 3) {
      toast.error('Enter a valid URL, DOI, book title, or author name.');
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
      toast.error('The citation could not be generated.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const addToBibliography = () => {
    if (!result) return;
    setBibliography((prev) => [...prev, { id: `${Date.now()}`, style, ...result }]);
    toast.success('Added to your bibliography');
  };

  const removeFromBibliography = (id: string) => {
    setBibliography((prev) => prev.filter((entry) => entry.id !== id));
  };

  const sortedBibliography = useMemo(
    () => [...bibliography].sort((a, b) => a.full_reference.localeCompare(b.full_reference)),
    [bibliography]
  );

  const copyFullBibliography = async () => {
    if (!sortedBibliography.length) return;
    await navigator.clipboard.writeText(sortedBibliography.map((entry) => entry.full_reference).join('\n\n'));
    toast.success('Full reference list copied');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">University Tool</Badge>
        <h1 className="text-2xl font-bold">AI Citation & Reference Generator</h1>
        <p className="text-muted-foreground">Create citations for study drafts. Always verify source details before final submission.</p>
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
          {!result && !loading && <p className="text-sm text-muted-foreground">The generated in-text citation and full bibliography will appear here.</p>}
          {loading && <div className="h-24 animate-pulse rounded-xl bg-muted/40" />}
          {result && (
            <>
              <ResultBlock title="In-text Citation" value={result.in_text} onCopy={() => copy(result.in_text)} />
              <ResultBlock title="Full Bibliography / Reference Entry" value={result.full_reference} onCopy={() => copy(result.full_reference)} />
              <Button variant="gradient" size="sm" onClick={addToBibliography}>
                <Plus className="h-3.5 w-3.5" /> Add to my bibliography
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {bibliography.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <BookMarked className="h-4 w-4 text-violet-400" /> My Bibliography
                <Badge variant="secondary">{bibliography.length}</Badge>
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyFullBibliography}>
                  <Copy className="h-3.5 w-3.5" /> Copy full list
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ok = printElementById('citation-bibliography-export', 'ilm AI Bibliography');
                    if (!ok) toast.error('No bibliography content was found.');
                  }}
                >
                  Export PDF / Print
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent id="citation-bibliography-export" data-print-root="true" className="space-y-2">
            {sortedBibliography.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 p-3">
                <div className="min-w-0">
                  <Badge variant="outline" className="mb-1.5 text-[10px]">{entry.style}</Badge>
                  <p className="text-sm leading-6 text-muted-foreground">{entry.full_reference}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => copy(entry.full_reference)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-rose-500 hover:text-rose-500"
                    onClick={() => removeFromBibliography(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
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
