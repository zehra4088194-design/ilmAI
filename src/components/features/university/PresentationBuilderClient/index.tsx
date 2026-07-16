'use client';

import { useMemo, useState } from 'react';
import { Download, FileText, Loader2, Presentation, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { PresentationSlideRenderer } from '@/components/features/university/PresentationSlideRenderer';
import { printElementById } from '@/lib/utils/printElement';
import type { PresentationDeck, PresentationGenerateMode } from '@/lib/presentation/types';

type Props = {
  defaultSubject?: string;
  defaultStyle?: string;
};

const progressCopy = [
  'Planning university-grade slide flow...',
  'Writing detailed slide content...',
  'Balancing visuals, notes, and viva-ready points...',
  'Preparing colorful PowerPoint preview...',
];

export function PresentationBuilderClient({ defaultSubject = '', defaultStyle = 'professional' }: Props) {
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [slideCount, setSlideCount] = useState(8);
  const [tone, setTone] = useState('Professional');
  const [audienceLevel, setAudienceLevel] = useState('University students');
  const [language, setLanguage] = useState('English');
  const [outputStyle, setOutputStyle] = useState(defaultStyle);
  const [mode, setMode] = useState<PresentationGenerateMode>('per-slide');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deck, setDeck] = useState<PresentationDeck | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);

  const formReady = topic.trim().length > 2;
  const progressLabel = useMemo(() => {
    if (mode === 'per-slide') {
      return `Detailed mode: generating ${slideCount} slides in small AI batches...`;
    }
    return progressCopy[progressIndex % progressCopy.length];
  }, [mode, progressIndex, slideCount]);

  async function generate() {
    if (!formReady) {
      toast.error('Presentation topic likho.');
      return;
    }
    setLoading(true);
    setProgressIndex(0);
    const timer = window.setInterval(() => setProgressIndex((value) => value + 1), 1800);
    try {
      const res = await fetch('/api/presentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject,
          slideCount,
          tone,
          audienceLevel,
          language,
          outputStyle,
          mode,
        }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error || 'Presentation generate nahi ho saki.');
        return;
      }
      setDeck(json.data.deck);
      toast.success('Presentation ready hai.');
    } catch {
      toast.error('Presentation generate nahi ho saki.');
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  async function downloadPptx() {
    if (!deck) return;
    setExporting(true);
    try {
      const res = await fetch('/api/presentation/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error || 'PPTX export nahi ho saka.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${
        deck.topic
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60) || 'ilm-ai-presentation'
      }.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PPTX download ready.');
    } catch {
      toast.error('PPTX export nahi ho saka.');
    } finally {
      setExporting(false);
    }
  }

  async function downloadDocx() {
    if (!deck) return;
    setExporting(true);
    try {
      const res = await fetch('/api/presentation/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error || 'DOCX export nahi ho saka.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${
        deck.topic
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60) || 'ilm-ai-presentation'
      }.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('DOCX download ready.');
    } catch {
      toast.error('DOCX export nahi ho saka.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">
            University Mode
          </Badge>
          <h1 className="text-2xl font-bold">AI Presentation Generator</h1>
          <p className="text-muted-foreground">
            Generate colorful university presentations with web preview, speaker notes, and real PPTX export.
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Use this as a study draft. Review, personalize, and verify before submission.
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Presentation className="h-4 w-4 text-violet-400" />
              Presentation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Topic / prompt"
              value={topic}
              onChange={setTopic}
              placeholder="Photosynthesis for university biology students"
            />
            <Field
              label="Subject / course"
              value={subject}
              onChange={setSubject}
              placeholder="Biology, Computer Science, Economics..."
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Slides" value={slideCount} onChange={setSlideCount} min={4} max={24} />
              <SelectField
                label="Tone"
                value={tone}
                onChange={setTone}
                options={['Professional', 'Academic', 'Simple', 'Persuasive']}
              />
            </div>
            <Field
              label="Audience level"
              value={audienceLevel}
              onChange={setAudienceLevel}
              placeholder="University students"
            />
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Language"
                value={language}
                onChange={setLanguage}
                options={['English', 'Urdu', 'Roman Urdu']}
              />
              <SelectField
                label="Style"
                value={outputStyle}
                onChange={setOutputStyle}
                options={['simple', 'academic', 'professional', 'detailed']}
              />
            </div>
            <SelectField
              label="Generation mode"
              value={mode}
              onChange={(value) => setMode(value as PresentationGenerateMode)}
              options={['bulk', 'per-slide']}
            />
            <div className="bg-muted/25 text-muted-foreground rounded-xl border p-3 text-xs leading-5">
              Per-slide mode har slide ko alag Gemini request se polish karta hai. Bulk mode compact quick draft ke liye
              hai.
            </div>
            <Button variant="gradient" className="w-full" disabled={!formReady || loading} onClick={generate}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Presentation
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!deck && !loading && (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[430px] flex-col items-center justify-center p-8 text-center">
                <FileText className="mb-4 h-11 w-11 text-violet-400" />
                <h2 className="font-semibold">Your slide deck will appear here</h2>
                <p className="text-muted-foreground mt-2 max-w-md text-sm">
                  Topic do, AI content likhega, phir colorful slide preview aur PPTX download dono milenge.
                </p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="min-h-[430px] p-8">
                <BrandLoader label={progressLabel} className="min-h-[330px]" />
              </CardContent>
            </Card>
          )}

          {deck && !loading && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={downloadPptx} disabled={exporting}>
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Presentation className="h-3.5 w-3.5" />
                  )}
                  Download PPTX
                </Button>
                <Button variant="outline" size="sm" onClick={downloadDocx} disabled={exporting}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  Download DOCX
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ok = printElementById('presentation-export-all', deck.topic);
                    if (!ok) toast.error('Presentation export content nahi mila.');
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Export PDF
                </Button>
              </div>
              <PresentationSlideRenderer deck={deck} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Slide outline</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {deck.slides.map((slide, index) => (
                    <div key={index} className="bg-card/80 rounded-xl border p-4">
                      <p className="text-xs font-semibold tracking-wide text-violet-400 uppercase">
                        Slide {index + 1} - {slide.type}
                      </p>
                      <h3 className="mt-1 font-semibold">{slide.title || slide.quote || 'Slide'}</h3>
                      {slide.bullets && (
                        <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{slide.bullets.join(' / ')}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wide uppercase">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="border-input bg-background focus:ring-primary/40 h-10 w-full rounded-lg border px-3 text-sm transition outline-none focus:ring-2"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wide uppercase">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="border-input bg-background focus:ring-primary/40 h-10 w-full rounded-lg border px-3 text-sm transition outline-none focus:ring-2"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1.5 block text-xs font-bold tracking-wide uppercase">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-input bg-background focus:ring-primary/40 h-10 w-full rounded-lg border px-3 text-sm transition outline-none focus:ring-2"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
