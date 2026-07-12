'use client';

import { useMemo, useState } from 'react';
import { Download, FileText, Loader2, Presentation, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { printElementById } from '@/lib/utils/printElement';
import { toast } from 'sonner';

type Tool = 'essay' | 'assignment' | 'presentation' | 'viva' | 'research' | 'planner';

type Props = {
  tool: Tool;
  title: string;
  description: string;
  defaultSubject?: string;
  defaultStyle?: string;
};

const TOOL_COPY: Record<Tool, { cta: string; topicLabel: string; topicPlaceholder: string }> = {
  essay: { cta: 'Generate Essay', topicLabel: 'Topic', topicPlaceholder: 'Impact of AI on education' },
  assignment: { cta: 'Generate Assignment', topicLabel: 'Assignment topic', topicPlaceholder: 'Object oriented programming concepts' },
  presentation: { cta: 'Build Presentation', topicLabel: 'Presentation topic', topicPlaceholder: 'Climate change and urban planning' },
  viva: { cta: 'Create Viva Practice', topicLabel: 'Viva topic', topicPlaceholder: 'Database normalization' },
  research: { cta: 'Create Project Draft', topicLabel: 'Research / project topic', topicPlaceholder: 'AI based attendance system' },
  planner: { cta: 'Create Semester Plan', topicLabel: 'Focus / exam goal', topicPlaceholder: 'Prepare for mid term exams' },
};

export function UniversityToolClient({ tool, title, description, defaultSubject = '', defaultStyle = 'simple' }: Props) {
  const copy = TOOL_COPY[tool];
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [wordCount, setWordCount] = useState(900);
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [language, setLanguage] = useState('English');
  const [slideCount, setSlideCount] = useState(8);
  const [tone, setTone] = useState('Professional');
  const [audienceLevel, setAudienceLevel] = useState('University students');
  const [weakAreas, setWeakAreas] = useState('');
  const [availableTime, setAvailableTime] = useState('1-2 hours/day');
  const [outputStyle, setOutputStyle] = useState(defaultStyle);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, any> | null>(null);

  const isPresentation = tool === 'presentation';
  const isPlanner = tool === 'planner';
  const isEssayLike = tool === 'essay' || tool === 'assignment';

  const formReady = topic.trim().length > 2 || isPlanner;

  async function generate(modifier?: string) {
    if (!formReady) {
      toast.error('Topic likho');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/ai/university', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool,
          topic: modifier ? `${topic}\nInstruction: ${modifier}` : topic,
          subject,
          wordCount,
          difficulty,
          language,
          slideCount,
          tone,
          audienceLevel,
          weakAreas,
          availableTime,
          outputStyle,
        }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setResult(json.data.result);
    } catch {
      toast.error('Assistant response generate nahi ho saka');
    } finally {
      setLoading(false);
    }
  }

  const slides = useMemo(() => Array.isArray(result?.slides) ? result?.slides : [], [result]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">University Mode</Badge>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
          Use this as a study draft. Review, personalize, and verify before submission.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Input</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label={copy.topicLabel} value={topic} onChange={setTopic} placeholder={copy.topicPlaceholder} />
            <Field label="Subject / Course" value={subject} onChange={setSubject} placeholder="Course name" />

            {isEssayLike && (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Words" value={wordCount} onChange={setWordCount} min={200} max={3000} />
                <SelectField label="Difficulty" value={difficulty} onChange={setDifficulty} options={['Basic', 'Intermediate', 'Advanced']} />
              </div>
            )}

            {isPresentation && (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Slides" value={slideCount} onChange={setSlideCount} min={4} max={18} />
                <SelectField label="Tone" value={tone} onChange={setTone} options={['Professional', 'Academic', 'Simple', 'Persuasive']} />
                <div className="col-span-2">
                  <Field label="Audience level" value={audienceLevel} onChange={setAudienceLevel} placeholder="University students" />
                </div>
              </div>
            )}

            {isPlanner && (
              <div className="space-y-3">
                <Field label="Weak areas" value={weakAreas} onChange={setWeakAreas} placeholder="Algorithms, derivations, case studies" />
                <Field label="Available time" value={availableTime} onChange={setAvailableTime} placeholder="1-2 hours/day" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Language" value={language} onChange={setLanguage} options={['English', 'Urdu', 'Roman Urdu']} />
              <SelectField label="Style" value={outputStyle} onChange={setOutputStyle} options={['simple', 'academic', 'professional', 'detailed']} />
            </div>

            <Button variant="gradient" className="w-full" onClick={() => generate()} disabled={loading || !formReady}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {copy.cta}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!result && !loading && (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
                <FileText className="mb-4 h-10 w-10 text-violet-400" />
                <h2 className="font-semibold">Your university draft will appear here</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">Generate essays, assignments, presentations, viva questions, research drafts and study plans from one secure AI workflow.</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="min-h-[360px] p-8">
                <BrandLoader label="Assistant university draft bana raha hai..." className="min-h-[300px]" />
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <ResultActions tool={tool} onShorter={() => generate('Make the previous draft shorter and more concise.')} onAcademic={() => generate('Make the previous draft more academic and formal.')} onBullets={() => generate('Convert the previous draft into bullet revision notes.')} />
              <div id="university-export">
                {tool === 'viva' ? (
                  <VivaPracticeResult result={result} />
                ) : isPresentation && slides.length > 0 ? (
                  <SlidePreview result={result} slides={slides} />
                ) : (
                  <GenericResult result={result} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VivaPracticeResult({ result }: { result: Record<string, any> }) {
  const [index, setIndex] = useState(0);
  const questions = [
    ...(Array.isArray(result.basic) ? result.basic.map((item: any) => ({ ...item, level: 'Basic' })) : []),
    ...(Array.isArray(result.intermediate) ? result.intermediate.map((item: any) => ({ ...item, level: 'Intermediate' })) : []),
    ...(Array.isArray(result.difficult) ? result.difficult.map((item: any) => ({ ...item, level: 'Difficult' })) : []),
  ];
  const current = questions[index];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>{result.title || 'Viva Practice'}</span>
            <Badge variant="secondary">{questions.length ? `${index + 1}/${questions.length}` : '0'}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {current ? (
            <>
              <Badge>{current.level}</Badge>
              <h3 className="text-lg font-semibold">{current.q}</h3>
              <div className="rounded-xl border bg-muted/25 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model answer</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.answer}</p>
              </div>
              {current.followUp && <p className="text-sm text-violet-300">Follow-up: {current.followUp}</p>}
              <div className="flex gap-2">
                <Button variant="outline" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>Previous</Button>
                <Button variant="gradient" disabled={index >= questions.length - 1} onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))}>Next question</Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No viva questions generated.</p>
          )}
        </CardContent>
      </Card>
      <GenericResult result={{ quickRevisionNotes: result.quickRevisionNotes, draftNote: result.draftNote }} />
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
    </div>
  );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function ResultActions({ tool, onShorter, onAcademic, onBullets }: { tool: Tool; onShorter: () => void; onAcademic: () => void; onBullets: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(tool === 'essay' || tool === 'assignment') && (
        <>
          <Button variant="outline" size="sm" onClick={onShorter}>Make it shorter</Button>
          <Button variant="outline" size="sm" onClick={onAcademic}>Make it more academic</Button>
          <Button variant="outline" size="sm" onClick={onBullets}>Convert to bullet notes</Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Viva questions are included below when available.')}>Create viva questions</Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Presentation outline is included below when available.')}>Create presentation</Button>
        </>
      )}
      <Button variant="outline" size="sm" onClick={() => {
        const ok = printElementById('university-export', 'ilm AI University Draft');
        if (!ok) toast.error('Export content nahi mila.');
      }}><Download className="h-3.5 w-3.5" /> Export PDF / Print</Button>
      <Button variant="outline" size="sm" onClick={() => toast.info('PPTX export coming soon. PDF/print outline works now.')}><Presentation className="h-3.5 w-3.5" /> PPTX Coming Soon</Button>
    </div>
  );
}

function GenericResult({ result }: { result: Record<string, any> }) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        {Object.entries(result).map(([key, value]) => (
          <section key={key}>
            <h3 className="mb-2 text-sm font-bold capitalize">{key.replace(/([A-Z])/g, ' $1')}</h3>
            <RenderValue value={value} />
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function SlidePreview({ result, slides }: { result: Record<string, any>; slides: any[] }) {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="border-b bg-muted/30 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Presentation</p>
            <h2 className="text-2xl font-bold">{result.title}</h2>
            {result.summary && <p className="mt-2 text-sm text-muted-foreground">{result.summary}</p>}
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {slides.map((slide, index) => (
              <div key={index} className="aspect-[16/10] rounded-xl border bg-background p-5 shadow-sm">
                <p className="text-xs font-semibold text-violet-400">Slide {index + 1}</p>
                <h3 className="mt-2 text-lg font-bold">{slide.title}</h3>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {(slide.keyPoints || []).slice(0, 5).map((point: string, pointIndex: number) => <li key={pointIndex}>• {point}</li>)}
                </ul>
                {slide.speakerNotes && <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">{slide.speakerNotes}</p>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <GenericResult result={{ vivaQuestions: result.vivaQuestions, draftNote: result.draftNote }} />
    </div>
  );
}

function RenderValue({ value }: { value: any }) {
  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-lg border bg-muted/20 p-3 text-sm">
            <RenderValue value={item} />
          </div>
        ))}
      </div>
    );
  }
  if (value && typeof value === 'object') {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([key, nested]) => (
          <div key={key}>
            <span className="text-xs font-semibold capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</span>
            <RenderValue value={nested} />
          </div>
        ))}
      </div>
    );
  }
  return <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{String(value ?? '-')}</p>;
}
