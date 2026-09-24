'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Download,
  Eye,
  FileText,
  Loader2,
  Presentation,
  RotateCcw,
  Sparkles,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { printElementById } from '@/lib/utils/printElement';
import { cn } from '@/lib/utils/cn';
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
  assignment: {
    cta: 'Generate Assignment',
    topicLabel: 'Assignment topic',
    topicPlaceholder: 'Object oriented programming concepts',
  },
  presentation: {
    cta: 'Build Presentation',
    topicLabel: 'Presentation topic',
    topicPlaceholder: 'Climate change and urban planning',
  },
  viva: { cta: 'Create Viva Practice', topicLabel: 'Viva topic', topicPlaceholder: 'Database normalization' },
  research: {
    cta: 'Create Project Draft',
    topicLabel: 'Research / project topic',
    topicPlaceholder: 'AI based attendance system',
  },
  planner: {
    cta: 'Create Semester Plan',
    topicLabel: 'Focus / exam goal',
    topicPlaceholder: 'Prepare for mid term exams',
  },
};

export function UniversityToolClient({
  tool,
  title,
  description,
  defaultSubject = '',
  defaultStyle = 'simple',
}: Props) {
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
      toast.error('Enter a topic.');
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
      window.dispatchEvent(new Event('ilm-ai-credits-changed'));
    } catch {
      toast.error('The assistant response could not be generated.');
    } finally {
      setLoading(false);
    }
  }

  const slides = useMemo(() => (Array.isArray(result?.slides) ? result?.slides : []), [result]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="secondary">University Mode</Badge>
            {tool === 'research' && <Badge variant="outline">5 credits</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-300">
          Use this as a study draft. Review, personalize, and verify before submission.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Input</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label={copy.topicLabel} value={topic} onChange={setTopic} placeholder={copy.topicPlaceholder} />
            <Field label="Subject / Course" value={subject} onChange={setSubject} placeholder="Course name" />

            {isEssayLike && (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Words" value={wordCount} onChange={setWordCount} min={200} max={3000} />
                <SelectField
                  label="Difficulty"
                  value={difficulty}
                  onChange={setDifficulty}
                  options={['Basic', 'Intermediate', 'Advanced']}
                />
              </div>
            )}

            {isPresentation && (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Slides" value={slideCount} onChange={setSlideCount} min={4} max={18} />
                <SelectField
                  label="Tone"
                  value={tone}
                  onChange={setTone}
                  options={['Professional', 'Academic', 'Simple', 'Persuasive']}
                />
                <div className="col-span-2">
                  <Field
                    label="Audience level"
                    value={audienceLevel}
                    onChange={setAudienceLevel}
                    placeholder="University students"
                  />
                </div>
              </div>
            )}

            {isPlanner && (
              <div className="space-y-3">
                <Field
                  label="Weak areas"
                  value={weakAreas}
                  onChange={setWeakAreas}
                  placeholder="Algorithms, derivations, case studies"
                />
                <Field
                  label="Available time"
                  value={availableTime}
                  onChange={setAvailableTime}
                  placeholder="1-2 hours/day"
                />
              </div>
            )}

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
                <p className="text-muted-foreground mt-2 max-w-md text-sm">
                  Generate essays, assignments, presentations, viva questions, research drafts and study plans from one
                  secure AI workflow.
                </p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card>
              <CardContent className="min-h-[360px] p-8">
                <BrandLoader label="The assistant is preparing your university draft..." className="min-h-[300px]" />
              </CardContent>
            </Card>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <ResultActions
                tool={tool}
                onShorter={() => generate('Make the previous draft shorter and more concise.')}
                onAcademic={() => generate('Make the previous draft more academic and formal.')}
                onBullets={() => generate('Convert the previous draft into bullet revision notes.')}
              />
              <div id="university-export" data-print-root="true">
                {tool === 'viva' ? (
                  <VivaPracticeResult result={result} />
                ) : isPresentation && slides.length > 0 ? (
                  <SlidePreview result={result} slides={slides} />
                ) : tool === 'research' ? (
                  <ResearchResult result={result} />
                ) : tool === 'planner' ? (
                  <PlannerResult result={result} />
                ) : isEssayLike ? (
                  <EssayResult result={result} />
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
  const [revealed, setRevealed] = useState(false);
  const [scored, setScored] = useState<Record<number, 'got' | 'review'>>({});
  const questions = [
    ...(Array.isArray(result.basic) ? result.basic.map((item: any) => ({ ...item, level: 'Basic' })) : []),
    ...(Array.isArray(result.intermediate)
      ? result.intermediate.map((item: any) => ({ ...item, level: 'Intermediate' }))
      : []),
    ...(Array.isArray(result.difficult) ? result.difficult.map((item: any) => ({ ...item, level: 'Difficult' })) : []),
  ];
  const current = questions[index];
  const gotCount = Object.values(scored).filter((value) => value === 'got').length;
  const levelStyle: Record<string, string> = {
    Basic: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Intermediate: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    Difficult: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  const goTo = (next: number) => {
    setIndex(Math.max(0, Math.min(questions.length - 1, next)));
    setRevealed(false);
  };

  const mark = (verdict: 'got' | 'review') => {
    setScored((prev) => ({ ...prev, [index]: verdict }));
    if (index < questions.length - 1) goTo(index + 1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>{result.title || 'Viva Practice'}</span>
            <div className="flex items-center gap-2">
              {gotCount > 0 && (
                <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">{gotCount} got it</Badge>
              )}
              <Badge variant="secondary">{questions.length ? `${index + 1}/${questions.length}` : '0'}</Badge>
            </div>
          </CardTitle>
          <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${questions.length ? ((index + 1) / questions.length) * 100 : 0}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {current ? (
            <>
              <Badge variant="outline" className={cn('border', levelStyle[current.level])}>
                {current.level}
              </Badge>
              <h3 className="text-lg font-semibold">{current.q}</h3>

              {!revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="text-muted-foreground flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm transition-colors hover:border-violet-500/40 hover:text-violet-400"
                >
                  <Eye className="h-5 w-5" />
                  Tap to reveal the model answer
                </button>
              ) : (
                <div className="bg-muted/25 animate-in fade-in rounded-xl border p-4">
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Model answer</p>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">{current.answer}</p>
                  {current.followUp && <p className="mt-3 text-sm text-violet-400">Follow-up: {current.followUp}</p>}
                </div>
              )}

              {revealed && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                    onClick={() => mark('got')}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Got it
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                    onClick={() => mark('review')}
                  >
                    <RotateCcw className="h-4 w-4" /> Review again
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" disabled={index === 0} onClick={() => goTo(index - 1)}>
                  Previous
                </Button>
                <Button variant="gradient" disabled={index >= questions.length - 1} onClick={() => goTo(index + 1)}>
                  Skip / Next
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No viva questions generated.</p>
          )}
        </CardContent>
      </Card>
      {Array.isArray(result.quickRevisionNotes) && result.quickRevisionNotes.length > 0 && (
        <ChecklistCard title="Quick revision notes" items={result.quickRevisionNotes} />
      )}
    </div>
  );
}

function ChecklistCard({ title, items }: { title: string; items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggle = (index: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  const progress = items.length ? Math.round((checked.size / items.length) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{title}</span>
          <Badge variant="secondary">
            {checked.size}/{items.length}
          </Badge>
        </CardTitle>
        <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item, index) => {
          const isChecked = checked.has(index);
          return (
            <button
              key={index}
              onClick={() => toggle(index)}
              className="hover:bg-muted/40 flex w-full items-start gap-2.5 rounded-lg p-2 text-left text-sm transition-colors"
            >
              {isChecked ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span className={cn(isChecked && 'text-muted-foreground line-through')}>{item}</span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function QuizAccordion({ title, items }: { title: string; items: { q: string; answer: string }[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (index: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, index) => {
          const isOpen = open.has(index);
          return (
            <div key={index} className="overflow-hidden rounded-lg border">
              <button
                onClick={() => toggle(index)}
                className="hover:bg-muted/30 flex w-full items-center justify-between gap-3 p-3 text-left text-sm font-medium transition-colors"
              >
                <span>{item.q}</span>
                {isOpen ? (
                  <ChevronUp className="text-muted-foreground h-4 w-4 shrink-0" />
                ) : (
                  <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="bg-muted/20 animate-in fade-in text-muted-foreground border-t p-3 text-sm leading-6">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function EssayResult({ result }: { result: Record<string, any> }) {
  const sections = Array.isArray(result.sections) ? result.sections : [];
  const bulletNotes = Array.isArray(result.bulletNotes) ? result.bulletNotes : [];
  const vivaQuestions = Array.isArray(result.vivaQuestions) ? result.vivaQuestions : [];
  const outline = Array.isArray(result.presentationOutline) ? result.presentationOutline : [];
  const wordEstimate = useMemo(() => {
    const text = [result.introduction, ...sections.map((section: any) => section.body), result.conclusion]
      .filter(Boolean)
      .join(' ');
    return text.trim().split(/\s+/).filter(Boolean).length;
  }, [result, sections]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="border-b bg-gradient-to-br from-violet-500/10 via-transparent to-transparent p-6">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            {wordEstimate > 0 && <Badge variant="secondary">~{wordEstimate} words</Badge>}
            {sections.length > 0 && <Badge variant="outline">{sections.length} sections</Badge>}
          </div>
          <h2 className="mt-3 text-2xl font-bold">{result.title}</h2>
        </div>
        <CardContent className="space-y-6 p-6">
          {result.introduction && (
            <p className="text-[15px] leading-7 first-letter:float-left first-letter:mr-2 first-letter:text-4xl first-letter:font-bold first-letter:text-violet-400">
              {result.introduction}
            </p>
          )}
          {sections.map((section: any, index: number) => (
            <div key={index} className="border-l-2 border-violet-500/30 pl-4">
              <h3 className="flex items-center gap-2 font-bold">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs text-violet-400">
                  {index + 1}
                </span>
                {section.heading}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6 whitespace-pre-wrap">{section.body}</p>
              {Array.isArray(section.examples) && section.examples.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {section.examples.map((example: string, exampleIndex: number) => (
                    <span
                      key={exampleIndex}
                      className="text-muted-foreground rounded-full border border-dashed px-3 py-1 text-xs"
                    >
                      💡 {example}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {result.conclusion && (
            <div className="bg-muted/25 rounded-xl p-4">
              <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">Conclusion</p>
              <p className="mt-1.5 text-sm leading-6">{result.conclusion}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {bulletNotes.length > 0 && <ChecklistCard title="Quick revision notes" items={bulletNotes} />}
      {vivaQuestions.length > 0 && <QuizAccordion title="Practice viva questions" items={vivaQuestions} />}
      {outline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Presentation outline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {outline.map((slide: any, index: number) => (
              <div key={index} className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-violet-400">Slide {index + 1}</p>
                <p className="text-sm font-medium">{slide.slide}</p>
                <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
                  {(slide.points || []).slice(0, 4).map((point: string, pointIndex: number) => (
                    <li key={pointIndex}>• {point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResearchResult({ result }: { result: Record<string, any> }) {
  const titleIdeas = Array.isArray(result.titleIdeas) ? result.titleIdeas : [];
  const [selectedTitle, setSelectedTitle] = useState(0);
  const objectives = Array.isArray(result.objectives) ? result.objectives : [];
  const methodology = Array.isArray(result.methodology) ? result.methodology : [];
  const references = Array.isArray(result.referencesPlaceholder) ? result.referencesPlaceholder : [];
  const sections = [
    { label: 'Abstract', value: result.abstract },
    { label: 'Introduction', value: result.introduction },
    { label: 'Problem Statement', value: result.problemStatement },
  ].filter((section) => section.value);

  return (
    <div className="space-y-4">
      {titleIdeas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pick a project title</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {titleIdeas.map((title: string, index: number) => (
              <button
                key={index}
                onClick={() => setSelectedTitle(index)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                  selectedTitle === index
                    ? 'border-violet-500 bg-violet-500/15 font-medium text-violet-400'
                    : 'text-muted-foreground hover:border-violet-500/40'
                )}
              >
                {title}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="text-xl font-bold">{titleIdeas[selectedTitle] || 'Research Project'}</h2>
          {sections.map((section, index) => (
            <div key={section.label}>
              <h3 className="mb-1.5 flex items-center gap-2 text-sm font-bold">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-500/15 text-[10px] text-violet-400">
                  {index + 1}
                </span>
                {section.label}
              </h3>
              <p className="text-muted-foreground text-sm leading-6 whitespace-pre-wrap">{section.value}</p>
            </div>
          ))}
          {objectives.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-bold">Objectives</h3>
              <ol className="text-muted-foreground space-y-1 text-sm">
                {objectives.map((objective: string, index: number) => (
                  <li key={index} className="flex gap-2">
                    <span className="shrink-0 text-violet-400">{index + 1}.</span>
                    {objective}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {methodology.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-sm font-bold">Methodology</h3>
              <ol className="text-muted-foreground space-y-1 text-sm">
                {methodology.map((step: string, index: number) => (
                  <li key={index} className="flex gap-2">
                    <span className="shrink-0 text-violet-400">{index + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {result.conclusion && (
            <div className="bg-muted/25 rounded-xl p-4">
              <p className="text-muted-foreground text-xs font-bold tracking-wide uppercase">Conclusion</p>
              <p className="mt-1.5 text-sm leading-6">{result.conclusion}</p>
            </div>
          )}
        </CardContent>
      </Card>
      {references.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Reference placeholders — verify before submission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {references.map((reference: string, index: number) => (
              <p key={index} className="bg-muted/20 text-muted-foreground rounded-lg p-2.5 text-sm">
                {reference}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlannerResult({ result }: { result: Record<string, any> }) {
  const dailyTasks = Array.isArray(result.dailyTasks) ? result.dailyTasks : [];
  const subjectPlans = Array.isArray(result.subjectPlans) ? result.subjectPlans : [];
  const totalTasks = dailyTasks.reduce(
    (sum: number, day: any) => sum + (Array.isArray(day.tasks) ? day.tasks.length : 0),
    0
  );
  const [done, setDone] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const progress = totalTasks ? Math.round((done.size / totalTasks) * 100) : 0;

  return (
    <div className="space-y-4">
      {result.todayFocus && (
        <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent">
          <CardContent className="p-5">
            <p className="text-xs font-bold tracking-wide text-violet-400 uppercase">Today's focus</p>
            <p className="mt-1 text-lg font-semibold">{result.todayFocus}</p>
          </CardContent>
        </Card>
      )}

      {totalTasks > 0 && (
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="relative h-14 w-14 shrink-0">
              <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${progress} 100`}
                  strokeLinecap="round"
                  className="text-violet-500 transition-all"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{progress}%</span>
            </div>
            <div>
              <p className="text-sm font-semibold">
                {done.size} of {totalTasks} tasks done
              </p>
              <p className="text-muted-foreground text-xs">Tick tasks off as you complete them</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {dailyTasks.map((day: any, dayIndex: number) => (
          <Card key={dayIndex}>
            <CardHeader>
              <CardTitle className="text-sm">{day.day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {(day.tasks || []).map((task: string, taskIndex: number) => {
                const key = `${dayIndex}-${taskIndex}`;
                const isDone = done.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className="hover:bg-muted/40 flex w-full items-start gap-2 rounded-lg p-1.5 text-left text-sm transition-colors"
                  >
                    {isDone ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span className={cn(isDone && 'text-muted-foreground line-through')}>{task}</span>
                  </button>
                );
              })}
              <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
                {day.mcqPractice && (
                  <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] text-blue-500">
                    📝 {day.mcqPractice}
                  </span>
                )}
                {day.flashcards && (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-500">
                    🗂️ {day.flashcards}
                  </span>
                )}
                {day.pastPaper && (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-600">
                    📄 {day.pastPaper}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {subjectPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject-wise plan</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {subjectPlans.map((plan: any, index: number) => (
              <div key={index} className="rounded-xl border p-3">
                <p className="text-sm font-bold text-violet-400">{plan.subject}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{plan.focus}</p>
                <ul className="text-muted-foreground mt-2 space-y-0.5 text-xs">
                  {(plan.actions || []).map((action: string, actionIndex: number) => (
                    <li key={actionIndex}>• {action}</li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {result.recommendedAction && (
        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Target className="h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm">
              <span className="font-semibold">Next action: </span>
              {result.recommendedAction}
            </p>
          </CardContent>
        </Card>
      )}
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
        className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
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
        className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
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
        className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
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

function ResultActions({
  tool,
  onShorter,
  onAcademic,
  onBullets,
}: {
  tool: Tool;
  onShorter: () => void;
  onAcademic: () => void;
  onBullets: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(tool === 'essay' || tool === 'assignment') && (
        <>
          <Button variant="outline" size="sm" onClick={onShorter}>
            Make it shorter
          </Button>
          <Button variant="outline" size="sm" onClick={onAcademic}>
            Make it more academic
          </Button>
          <Button variant="outline" size="sm" onClick={onBullets}>
            Convert to bullet notes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Viva questions are included below when available.')}
          >
            Create viva questions
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Presentation outline is included below when available.')}
          >
            Create presentation
          </Button>
        </>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          const ok = printElementById('university-export', 'ilm AI University Draft');
          if (!ok) toast.error('No export content was found.');
        }}
      >
        <Download className="h-3.5 w-3.5" /> Export PDF / Print
      </Button>
      {tool !== 'presentation' && (
        <Button asChild variant="outline" size="sm">
          <Link href="/university/presentation-builder">
            <Presentation className="h-3.5 w-3.5" /> Create full presentation
          </Link>
        </Button>
      )}
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
          <div className="bg-muted/30 border-b p-5">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Presentation</p>
            <h2 className="text-2xl font-bold">{result.title}</h2>
            {result.summary && <p className="text-muted-foreground mt-2 text-sm">{result.summary}</p>}
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {slides.map((slide, index) => (
              <div key={index} className="bg-background aspect-[16/10] rounded-xl border p-5 shadow-sm">
                <p className="text-xs font-semibold text-violet-400">Slide {index + 1}</p>
                <h3 className="mt-2 text-lg font-bold">{slide.title}</h3>
                <ul className="text-muted-foreground mt-3 space-y-1 text-sm">
                  {(slide.keyPoints || []).slice(0, 5).map((point: string, pointIndex: number) => (
                    <li key={pointIndex}>• {point}</li>
                  ))}
                </ul>
                {slide.speakerNotes && (
                  <p className="text-muted-foreground mt-3 line-clamp-3 text-xs">{slide.speakerNotes}</p>
                )}
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
          <div key={index} className="bg-muted/20 rounded-lg border p-3 text-sm">
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
            <span className="text-muted-foreground text-xs font-semibold capitalize">
              {key.replace(/([A-Z])/g, ' $1')}
            </span>
            <RenderValue value={nested} />
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-muted-foreground text-sm leading-6 whitespace-pre-wrap">{String(value ?? '-')}</p>;
}
