'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, FileImage, ListChecks, Loader2, ScanLine, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { toast } from 'sonner';

const SCAN_TYPES = [
  { value: 'textbook_page', label: 'Textbook page' },
  { value: 'handwritten', label: 'Handwritten' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'math', label: 'Math' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
];

export function VisionScanClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanType, setScanType] = useState('textbook_page');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ocr_text: string;
    ai_explanation: string;
    remaining_credits?: number;
    credit_cost?: number;
  } | null>(null);

  // "Make a test from this" — every successfully scanned page's text is kept here so a student
  // who photographed several pages of the same chapter can build one test from all of them, not
  // just the last scan. Cleared once a test is generated.
  const [testPages, setTestPages] = useState<string[]>([]);
  const [buildingTest, setBuildingTest] = useState(false);

  const onFile = (next: File | null) => {
    if (!next) return;
    if (!next.type.startsWith('image/')) {
      toast.error('Upload an image only.');
      return;
    }
    if (next.size > 4 * 1024 * 1024) {
      toast.error('The image must be smaller than 4 MB.');
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setResult(null);
  };

  const scan = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('scan_type', scanType);
      form.append('language', language);
      const res = await fetch('/api/vision/scan', { method: 'POST', body: form });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setResult(json.data);
      if (json.data?.ocr_text?.trim()) setTestPages((prev) => [...prev, json.data.ocr_text]);
    } catch {
      toast.error('The scan could not be processed.');
    } finally {
      setLoading(false);
    }
  };

  // Sends every page scanned so far to the AI test generator, then hands the generated paper to
  // /full-test the same way a resource-based test does — via sessionStorage — so it reuses that
  // page's whole take/grade experience instead of building a second one here.
  const buildTest = async () => {
    if (!testPages.length) return;
    setBuildingTest(true);
    try {
      const res = await fetch('/api/vision/test-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testPages.join('\n\n'),
          title: testPages.length > 1 ? `Scanned Pages Test (${testPages.length} pages)` : 'Scanned Page Test',
        }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      window.sessionStorage.setItem(
        'ilm-ai-resource-test',
        JSON.stringify({ paper: json.data.paper, resourceTitle: json.data.paper.title })
      );
      setTestPages([]);
      toast.success('Test ready — opening it now.');
      router.push('/full-test');
    } catch {
      toast.error('The test could not be generated.');
    } finally {
      setBuildingTest(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">
          AI Vision
        </Badge>
        <h1 className="text-2xl font-bold">Scan & Solve</h1>
        <p className="text-muted-foreground">
          Scan a textbook, handwritten answer, formula, or diagram and get a step-by-step explanation.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <label className="bg-muted/20 hover:bg-muted/30 flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => onFile(event.target.files?.[0] || null)}
              />
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Scan preview" className="max-h-64 rounded-lg object-contain" />
              ) : (
                <>
                  <Camera className="mb-3 h-10 w-10 text-violet-400" />
                  <p className="font-semibold">Take a photo with your camera or upload an image</p>
                  <p className="text-muted-foreground mt-1 text-sm">The camera will open directly on mobile.</p>
                  <p className="text-muted-foreground mt-1 text-xs">Maximum image size 4MB.</p>
                </>
              )}
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">Scan type</label>
                <select
                  value={scanType}
                  onChange={(event) => setScanType(event.target.value)}
                  className="bg-background h-10 w-full rounded-lg border px-3 text-sm"
                >
                  {SCAN_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-muted-foreground mb-1 block text-xs font-bold uppercase">Language</label>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="bg-background h-10 w-full rounded-lg border px-3 text-sm"
                >
                  <option value="en">English</option>
                  <option value="ur">Urdu</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>
            </div>

            <Button variant="gradient" className="w-full" onClick={scan} disabled={!file || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              Process Document
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!result && (
            <Card className="min-h-72">
              <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
                <FileImage className="text-muted-foreground/50 mb-3 h-10 w-10" />
                <p className="font-semibold">Your result will appear here</p>
                <p className="text-muted-foreground mt-1 text-sm">Printed scan uses 1 credit. Handwritten, Math, and formula scans use 3 credits.</p>
              </CardContent>
            </Card>
          )}
          {result && (
            <>
              <Card>
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-violet-400" /> Extracted Text
                  </div>
                  <p className="text-muted-foreground text-sm leading-6 whitespace-pre-wrap">
                    {result.ocr_text || 'Text could not be extracted clearly.'}
                  </p>
                  {typeof result.remaining_credits === 'number' && result.remaining_credits >= 0 && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      {result.credit_cost || 1} credits used. {result.remaining_credits} credits remaining.
                    </p>
                  )}
                </CardContent>
              </Card>
              <AiAnswerRenderer content={result.ai_explanation} label="AI Vision Explanation" />
            </>
          )}

          {testPages.length > 0 && (
            <Card className="border-emerald-500/40 bg-emerald-500/5">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ListChecks className="h-4 w-4 text-emerald-500" />
                    {testPages.length} page{testPages.length > 1 ? 's' : ''} ready for a test
                  </div>
                  <button
                    type="button"
                    onClick={() => setTestPages([])}
                    aria-label="Clear scanned pages"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Scan another page above to add it to this test, or generate an AI test — with MCQs, short and long
                  questions — from what you&apos;ve scanned so far.
                </p>
                <Button variant="gradient" className="w-full" onClick={buildTest} disabled={buildingTest}>
                  {buildingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate test from scan{testPages.length > 1 ? 's' : ''}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
