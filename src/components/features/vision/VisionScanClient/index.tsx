'use client';

import { useState } from 'react';
import { Camera, FileImage, Loader2, ScanLine, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const SCAN_TYPES = [
  { value: 'textbook_page', label: 'Textbook page' },
  { value: 'handwritten', label: 'Handwritten' },
  { value: 'diagram', label: 'Diagram' },
  { value: 'math', label: 'Math' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
];

export function VisionScanClient() {
  const { user } = useAuth();
  const settings = usePlatformSettings();
  const tier = user?.subscriptionTier || 'FREE';
  const plan = settings.subscriptionPlans[tier];
  const audience = user?.educationLevel || 'school';
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanType, setScanType] = useState('textbook_page');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ocr_text: string;
    ai_explanation: string;
    remaining_scans?: number;
  } | null>(null);

  const onFile = (next: File | null) => {
    if (!next) return;
    if (!next.type.startsWith('image/')) {
      toast.error('Upload an image only.');
      return;
    }
    if (next.size > 4 * 1024 * 1024) {
      toast.error('Image 4MB se choti honi chahiye.');
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
    } catch {
      toast.error('The scan could not be processed.');
    } finally {
      setLoading(false);
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
              Scan this
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!result && (
            <Card className="min-h-72">
              <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
                <FileImage className="text-muted-foreground/50 mb-3 h-10 w-10" />
                <p className="font-semibold">Your result will appear here</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {plan.name}: {plan.limits.ocrPrintedMonthly < 0 ? 'Unlimited' : plan.limits.ocrPrintedMonthly} printed
                  aur{' '}
                  {plan.audienceLimits[audience].ocrHandwrittenMonthly < 0
                    ? 'Unlimited'
                    : plan.audienceLimits[audience].ocrHandwrittenMonthly}{' '}
                  handwritten scans/month.
                </p>
              </CardContent>
            </Card>
          )}
          {result && (
            <>
              <Card>
                <CardContent className="p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-violet-400" /> OCR Text
                  </div>
                  <p className="text-muted-foreground text-sm leading-6 whitespace-pre-wrap">
                    {result.ocr_text || 'Text could not be extracted clearly.'}
                  </p>
                  {typeof result.remaining_scans === 'number' && result.remaining_scans >= 0 && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      {result.remaining_scans} scans remaining this month.
                    </p>
                  )}
                </CardContent>
              </Card>
              <AiAnswerRenderer content={result.ai_explanation} label="AI Vision Explanation" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
