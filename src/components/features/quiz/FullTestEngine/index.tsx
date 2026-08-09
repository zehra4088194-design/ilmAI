'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, Camera, ChevronDown, ChevronUp, Clock, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { AIProviderSelector } from '@/components/features/ai-selector/AIProviderSelector';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { compressImageForOcr } from '@/lib/utils/image-compress';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import type { SubscriptionTier } from '@/types';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

const BOARD_PATTERNS: Record<string, { mcq: number; short: number; long: number; marks: number; time: number }> = {
  GRADE_9: { mcq: 15, short: 6, long: 3, marks: 75, time: 180 },
  GRADE_10: { mcq: 15, short: 6, long: 3, marks: 75, time: 180 },
  GRADE_11: { mcq: 20, short: 8, long: 4, marks: 100, time: 195 },
  GRADE_12: { mcq: 20, short: 8, long: 4, marks: 100, time: 195 },
};

type TestState = 'setup' | 'loading' | 'paper' | 'grading' | 'result';

export function FullTestSetup({
  subjects,
  defaultBoard,
  defaultGrade,
  userTier,
}: {
  subjects: any[];
  defaultBoard: string;
  defaultGrade: string;
  userTier: SubscriptionTier;
}) {
  const [state, setState] = useState<TestState>('setup');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('Full Book');
  const [board, setBoard] = useState(defaultBoard);
  const [grade, setGrade] = useState(defaultGrade);
  const [pattern, setPattern] = useState<'board' | 'custom'>('board');
  const [custom, setCustom] = useState({ mcq: 10, short: 4, long: 2 });
  const [provider, setProvider] = useState<AiProviderId>('groq');
  const [aiTier, setAiTier] = useState<ModelTier>('medium');
  const [paper, setPaper] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [gradeResults, setGradeResults] = useState<any[]>([]);
  const [scanningWhole, setScanningWhole] = useState(false);
  const [resourceSourceTitle, setResourceSourceTitle] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number } | null>(null);
  const [wholeScanConfigOpen, setWholeScanConfigOpen] = useState(false);
  const [wholeScanKind, setWholeScanKind] = useState<'diagram' | 'handwritten' | 'printed'>('handwritten');
  const [wholeScanLanguage, setWholeScanLanguage] = useState<'en' | 'ur' | 'other'>('en');
  const wholeTestFileRef = useRef<HTMLInputElement>(null);
  const isFreeTier = userTier === 'FREE';

  const bp = BOARD_PATTERNS[grade] || BOARD_PATTERNS['GRADE_10']!;
  const counts = pattern === 'board' ? { mcq: bp.mcq, short: bp.short, long: bp.long } : custom;
  const selectedSubject = subjects.find((s) => s.id === subject);

  useEffect(() => {
    const raw = window.sessionStorage.getItem('ilm-ai-resource-test');
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as { paper?: any; resourceTitle?: string };
      if (!stored.paper) return;
      const nextPaper = {
        ...stored.paper,
        shortQs: (stored.paper.shortQs || []).map((question: any) => ({ ...question, id: nanoid() })),
        longQs: (stored.paper.longQs || []).map((question: any) => ({ ...question, id: nanoid() })),
      };
      setPaper(nextPaper);
      setResourceSourceTitle(stored.resourceTitle || nextPaper.title || 'Resource file');
      setAnswers({});
      setState('paper');
      window.sessionStorage.removeItem('ilm-ai-resource-test');
    } catch {
      window.sessionStorage.removeItem('ilm-ai-resource-test');
    }
  }, []);

  const generate = async () => {
    if (!subject) {
      toast.error('Select a subject.');
      return;
    }
    setState('loading');
    try {
      const res = await fetch('/api/ai/full-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: selectedSubject?.name || 'Subject',
          chapterName: chapter,
          className: grade.replace('GRADE_', 'Class ').replace('_', '-'),
          boardName: BOARDS.find((b) => b.value === board)?.label || board,
          mcqCount: counts.mcq,
          shortCount: counts.short,
          longCount: counts.long,
          provider,
          aiTier,
        }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        setState('setup');
        return;
      }
      // Tag questions with IDs for grading
      const p = json.data;
      p.shortQs = (p.shortQs || []).map((q: any) => ({ ...q, id: nanoid() }));
      p.longQs = (p.longQs || []).map((q: any) => ({ ...q, id: nanoid() }));
      setPaper(p);
      setAnswers({});
      setState('paper');
    } catch {
      toast.error('The test could not be generated.');
      setState('setup');
    }
  };

  const handleScanWholeTest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const writeQuestions = [...(paper.shortQs || []), ...(paper.longQs || [])];
    const emptyQuestions = writeQuestions.filter((q: any) => !(answers[q.id] || '').trim());
    if (emptyQuestions.length === 0) {
      toast.error('All written answers are already filled.');
      if (wholeTestFileRef.current) wholeTestFileRef.current.value = '';
      return;
    }

    setScanningWhole(true);
    const recognizedTexts: string[] = [];
    let hitLimit = false;

    for (let i = 0; i < files.length; i++) {
      setScanProgress({ current: i + 1, total: files.length });
      try {
        const compressed = await compressImageForOcr(files[i]!);
        const formData = new FormData();
        formData.append('file', new File([compressed.blob], `page-${i + 1}.jpg`, { type: 'image/jpeg' }));
        formData.append('kind', wholeScanKind);
        formData.append('language', wholeScanLanguage);
        const res = await fetch('/api/ocr', { method: 'POST', body: formData });
        if (res.status === 429) {
          hitLimit = true;
          const json = await res.json().catch(() => null);
          toast.error(
            `${json?.error || 'The daily scan limit has been reached'} — ${recognizedTexts.length} page(s) were scanned.`
          );
          break;
        }
        const json = await res.json();
        if (json.data?.text) recognizedTexts.push(json.data.text);
      } catch {
        // Best effort — skip a page that fails and keep going with the rest
      }
    }

    if (recognizedTexts.length > 0) {
      setAnswers((a) => {
        const updated = { ...a };
        let ti = 0;
        for (const q of emptyQuestions) {
          if (ti >= recognizedTexts.length) break;
          updated[q.id] = recognizedTexts[ti];
          ti++;
        }
        return updated;
      });
      if (!hitLimit) toast.success('Scan complete. Review the answers and edit them if needed.');
    } else if (!hitLimit) {
      toast.error('No text could be scanned.');
    }

    setScanningWhole(false);
    setScanProgress(null);
    if (wholeTestFileRef.current) wholeTestFileRef.current.value = '';
  };

  const submitTest = async () => {
    const mcqResults = (paper.mcqs || []).map((q: any, i: number) => ({
      correct: answers[`mcq_${i}`] === q.correct,
      userAns: answers[`mcq_${i}`],
      correctAns: q.correct,
      explanation: q.exp || 'The correct option is shown above.',
    }));

    const writeQuestions = [
      ...(paper.shortQs || []).map((q: any) => ({ ...q, section: 'short' })),
      ...(paper.longQs || []).map((q: any) => ({ ...q, section: 'long' })),
    ];
    const writeAnswers: Record<string, string> = {};
    writeQuestions.forEach((q) => {
      writeAnswers[q.id] = answers[q.id] || '';
    });

    setState('grading');
    try {
      const res = await fetch('/api/ai/grade-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: writeQuestions,
          answers: writeAnswers,
          mcqs: (paper.mcqs || []).map((q: any, i: number) => ({
            q: q.q,
            opts: q.opts || [],
            correct: q.correct,
            userAns: answers[`mcq_${i}`],
          })),
          subjectName: selectedSubject?.name || resourceSourceTitle || 'Resource file',
          className: grade.replace('GRADE_', 'Class '),
          provider,
          aiTier,
        }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error || 'Grading failed.');
        setState('paper');
        return;
      }
      const writeEvals = Array.isArray(json.data)
        ? json.data
        : json.data?.written || writeQuestions.map(() => ({ score: 0, grade: '?', feedback: 'Grading pending' }));
      const explanationByIndex = new Map(
        (json.data?.mcqExplanations || []).map((item: any) => [Number(item.index), String(item.explanation || '')])
      );
      setGradeResults([
        ...mcqResults.map((r: any, index: number) => ({
          type: 'mcq',
          ...r,
          explanation: explanationByIndex.get(index) || r.explanation,
        })),
        ...writeEvals.map((e: any, i: number) => ({ type: writeQuestions[i]?.section, ...e })),
      ]);
      setState('result');
    } catch {
      toast.error('Grading failed.');
      setState('paper');
    }
  };

  return (
    <AnimatePresence mode="wait">
      {state === 'setup' && (
        <motion.div
          key="setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-4"
        >
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-muted-foreground mb-2 block text-xs font-bold tracking-wide uppercase">
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground mb-2 block text-xs font-bold tracking-wide uppercase">
                    Board
                  </label>
                  <select
                    value={board}
                    onChange={(e) => setBoard(e.target.value)}
                    disabled
                    className="border-input bg-muted/40 text-muted-foreground h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    {BOARDS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground mb-2 block text-xs font-bold tracking-wide uppercase">
                    Grade Level
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    disabled
                    className="border-input bg-muted/40 text-muted-foreground h-10 w-full rounded-lg border px-3 text-sm"
                  >
                    {GRADE_LEVELS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground mb-2 block text-xs font-bold tracking-wide uppercase">
                    Chapter
                  </label>
                  <input
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="e.g. Chapter 5 or Full Book"
                    className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
                  />
                </div>
              </div>

              {/* Pattern toggle */}
              <div>
                <label className="text-muted-foreground mb-2 block text-xs font-bold tracking-wide uppercase">
                  Pattern
                </label>
                <div className="flex gap-2">
                  {(['board', 'custom'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPattern(p)}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all',
                        pattern === p
                          ? 'bg-primary/20 border-primary text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      {p === 'board' ? '🏫 Board Pattern' : '⚙️ Custom'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern details */}
              {pattern === 'board' ? (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['MCQs', bp.mcq, 'text-violet-400'],
                    ['Short Q', bp.short, 'text-blue-400'],
                    ['Long Q', bp.long, 'text-amber-400'],
                  ].map(([label, count, color]) => (
                    <div key={label as string} className="bg-muted/30 rounded-xl p-3 text-center">
                      <p className={`text-2xl font-bold ${color}`}>{count}</p>
                      <p className="text-muted-foreground text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {(['mcq', 'short', 'long'] as const).map((key) => (
                    <div key={key}>
                      <label className="text-muted-foreground mb-1 block text-xs capitalize">
                        {key === 'mcq' ? 'MCQs' : `${key === 'short' ? 'Short' : 'Long'} Qs`}
                      </label>
                      <div className="flex gap-1">
                        {[0, 5, 10, 15, 20].map((n) => (
                          <button
                            key={n}
                            onClick={() => setCustom((c) => ({ ...c, [key]: n }))}
                            className={cn(
                              'flex-1 rounded py-1.5 text-xs font-medium transition-all',
                              custom[key] === n
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted/30 text-muted-foreground hover:bg-muted/60'
                            )}
                          >
                            {n || '—'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <AIProviderSelector
              provider={provider}
              tier={aiTier}
              onChange={(p, t) => {
                setProvider(p);
                setAiTier(t);
              }}
              isFreeTier={isFreeTier}
            />
            <Button variant="gradient" size="lg" onClick={generate}>
              <Sparkles className="h-5 w-5" />
              Generate Test
            </Button>
          </div>
        </motion.div>
      )}

      {state === 'loading' && (
        <motion.div key="loading" className="py-20 text-center">
          <BrandLoader label="AI is generating the full paper..." />
        </motion.div>
      )}

      {state === 'grading' && (
        <motion.div key="grading" className="py-20 text-center">
          <BrandLoader label="AI is checking your answers..." />
        </motion.div>
      )}

      {state === 'paper' && paper && (
        <motion.div key="paper" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{paper.title}</h2>
              {resourceSourceTitle && (
                <Badge variant="secondary" className="mt-2">
                  Generated only from: {resourceSourceTitle}
                </Badge>
              )}
              <p className="text-muted-foreground mt-1 flex items-center gap-3 text-sm">
                {paper.totalMarks && <span>📊 {paper.totalMarks} marks</span>}
                {paper.timeAllowed && (
                  <span>
                    <Clock className="inline h-3.5 w-3.5" /> {paper.timeAllowed} min
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={wholeTestFileRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={handleScanWholeTest}
              />
              <Button variant="outline" onClick={() => setWholeScanConfigOpen(true)} disabled={scanningWhole}>
                <Camera className="h-4 w-4" />
                {scanningWhole
                  ? `Scanning page ${scanProgress?.current} of ${scanProgress?.total}...`
                  : 'Scan the full test'}
              </Button>
              <Button variant="gradient" onClick={submitTest}>
                <FileCheck className="h-4 w-4" />
                Submit Test
              </Button>
            </div>
          </div>

          {wholeScanConfigOpen && (
            <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4">
              <div className="bg-background w-full max-w-sm space-y-4 rounded-xl border p-5">
                <div>
                  <h3 className="font-semibold">What are you uploading?</h3>
                  <p className="text-muted-foreground mt-1 text-xs">Choose the scan type before selecting images.</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['diagram', 'handwritten', 'printed'] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setWholeScanKind(kind)}
                      className={cn(
                        'rounded-lg border px-2 py-3 text-xs font-semibold capitalize',
                        wholeScanKind === kind
                          ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                          : 'text-muted-foreground'
                      )}
                    >
                      {kind}
                    </button>
                  ))}
                </div>
                <select
                  value={wholeScanLanguage}
                  onChange={(event) => setWholeScanLanguage(event.target.value as 'en' | 'ur' | 'other')}
                  className="bg-background h-10 w-full rounded-lg border px-3 text-sm"
                >
                  <option value="en">English / non-Urdu</option>
                  <option value="ur">Urdu</option>
                  <option value="other">Other language</option>
                </select>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setWholeScanConfigOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="gradient"
                    className="flex-1"
                    onClick={() => {
                      setWholeScanConfigOpen(false);
                      wholeTestFileRef.current?.click();
                    }}
                  >
                    Choose images
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* MCQ Section */}
          {paper.mcqs?.length > 0 && (
            <TestSection title="Section A — MCQs (1 mark each)" count={paper.mcqs.length}>
              <div className="space-y-5">
                {paper.mcqs.map((q: any, i: number) => (
                  <MCQQuestion
                    key={i}
                    index={i}
                    question={q}
                    selected={answers[`mcq_${i}`]}
                    onSelect={(idx) => setAnswers((a) => ({ ...a, [`mcq_${i}`]: idx }))}
                  />
                ))}
              </div>
            </TestSection>
          )}

          {/* Short Questions */}
          {paper.shortQs?.length > 0 && (
            <TestSection title="Section B — Short Questions" count={paper.shortQs.length}>
              <div className="space-y-5">
                {paper.shortQs.map((q: any, i: number) => (
                  <WrittenQuestion
                    key={q.id}
                    index={i}
                    question={q}
                    value={answers[q.id] || ''}
                    onChange={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
                    rows={4}
                  />
                ))}
              </div>
            </TestSection>
          )}

          {/* Long Questions */}
          {paper.longQs?.length > 0 && (
            <TestSection title="Section C — Long Questions" count={paper.longQs.length}>
              <div className="space-y-5">
                {paper.longQs.map((q: any, i: number) => (
                  <WrittenQuestion
                    key={q.id}
                    index={i}
                    question={q}
                    value={answers[q.id] || ''}
                    onChange={(val) => setAnswers((a) => ({ ...a, [q.id]: val }))}
                    rows={8}
                  />
                ))}
              </div>
            </TestSection>
          )}

          <Button variant="gradient" size="xl" className="w-full" onClick={submitTest}>
            <FileCheck className="h-5 w-5" />
            Submit Test
          </Button>
        </motion.div>
      )}

      {state === 'result' && paper && (
        <TestResult paper={paper} gradeResults={gradeResults} answers={answers} onRetry={() => setState('setup')} />
      )}
    </AnimatePresence>
  );
}

function TestSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      <div
        className="border-border flex cursor-pointer items-center justify-between border-b p-4"
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-sm font-bold">
          {title} <span className="text-muted-foreground font-normal">({count})</span>
        </h3>
        {open ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        )}
      </div>
      {open && <CardContent className="p-4">{children}</CardContent>}
    </Card>
  );
}

function MCQQuestion({
  index,
  question,
  selected,
  onSelect,
}: {
  index: number;
  question: any;
  selected?: number;
  onSelect: (i: number) => void;
}) {
  const L = ['A', 'B', 'C', 'D'];
  return (
    <div className="min-w-0">
      <p className="mb-3 text-sm font-medium break-words">
        <span className="text-muted-foreground">Q{index + 1}. </span>
        {question.q}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(question.opts || []).map((opt: string, i: number) => (
          <label
            key={i}
            className={cn(
              'flex min-h-12 min-w-0 cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition-all',
              selected === i
                ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                : 'border-border bg-muted/20 hover:border-violet-500/40'
            )}
          >
            <input
              type="radio"
              name={`mcq_${index}`}
              className="accent-violet-500"
              checked={selected === i}
              onChange={() => onSelect(i)}
            />
            <span className="shrink-0 text-xs font-semibold">{L[i]}.</span>
            <span className="min-w-0 break-words">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function WrittenQuestion({
  index,
  question,
  value,
  onChange,
  rows,
}: {
  index: number;
  question: any;
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="flex-1 text-sm font-medium">
          <span className="text-muted-foreground">Q{index + 1}. </span>
          {question.q}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant="outline" className="text-xs">
            {question.marks} marks
          </Badge>
        </div>
      </div>
      {question.guide && <p className="mb-2 text-xs text-violet-400">💡 {question.guide}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder="Write your answer here..."
        className="border-input bg-background w-full resize-y rounded-lg border px-3 py-2 text-sm"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <ScanUpload
          onTextExtracted={(text) => onChange((value ? `${value}\n\n` : '') + text)}
          trigger={
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Camera className="h-3 w-3" /> Scan answer
            </Button>
          }
        />
        <span className="text-muted-foreground ml-auto text-xs">
          {value.trim().split(/\s+/).filter(Boolean).length} words
        </span>
      </div>
    </div>
  );
}

function TestResult({
  paper,
  gradeResults,
  answers,
  onRetry,
}: {
  paper: any;
  gradeResults: any[];
  answers: any;
  onRetry: () => void;
}) {
  const mcqResults = gradeResults.filter((r) => r.type === 'mcq');
  const writeResults = gradeResults.filter((r) => r.type !== 'mcq');
  const mcqScore = mcqResults.filter((r) => r.correct).length;
  const writeScore = writeResults.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0);
  const total = mcqScore + writeScore;
  const maxMarks =
    paper.totalMarks ||
    mcqResults.length +
      writeResults.reduce((sum: number, _: any, i: number) => {
        const allWrites = [...(paper.shortQs || []), ...(paper.longQs || [])];
        return sum + (allWrites[i]?.marks || 0);
      }, 0);
  const pct = maxMarks > 0 ? Math.round((total / maxMarks) * 100) : 0;
  const L = ['A', 'B', 'C', 'D'];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Score summary */}
      <div className="glass border-border/50 rounded-2xl border p-8 text-center">
        <p className="gradient-text text-6xl font-bold">{pct}%</p>
        <p className="text-muted-foreground mt-2">
          {total.toFixed(1)} / {maxMarks} marks
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <Badge
            variant={pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'destructive'}
            className="px-4 py-1.5 text-base"
          >
            Grade: {pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F'}
          </Badge>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xl font-bold text-violet-400">
              {mcqScore}/{mcqResults.length}
            </p>
            <p className="text-muted-foreground text-xs">MCQs</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xl font-bold text-blue-400">
              {writeResults
                .filter((_, i) => i < (paper.shortQs?.length || 0))
                .reduce((s, r) => s + (parseFloat(r.score) || 0), 0)
                .toFixed(1)}
            </p>
            <p className="text-muted-foreground text-xs">Short Qs</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xl font-bold text-green-400">
              {writeResults
                .filter((_, i) => i >= (paper.shortQs?.length || 0))
                .reduce((s, r) => s + (parseFloat(r.score) || 0), 0)
                .toFixed(1)}
            </p>
            <p className="text-muted-foreground text-xs">Long Qs</p>
          </div>
        </div>
      </div>

      {/* MCQ review */}
      {paper.mcqs?.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="mb-3 text-sm font-bold">MCQ Review</h3>
            {paper.mcqs.map((q: any, i: number) => {
              const r = mcqResults[i];
              return (
                <div
                  key={i}
                  className={cn(
                    'rounded-lg border p-3 text-xs',
                    r?.correct ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                  )}
                >
                  <p className="mb-1 font-medium">
                    {r?.correct ? '✅' : '❌'} Q{i + 1}. {q.q}
                  </p>
                  <p>
                    Your answer: <strong>{r?.userAns !== undefined ? L[r.userAns] : '—'}</strong> · Correct answer:{' '}
                    <strong className="text-green-400">{L[q.correct]}</strong>
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Explanation: {r?.explanation || q.exp || 'The correct option is shown above.'}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Written Q review */}
      {writeResults.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <h3 className="mb-3 text-sm font-bold">Written Questions Review</h3>
            {[...(paper.shortQs || []), ...(paper.longQs || [])].map((q: any, i: number) => {
              const r = writeResults[i];
              return (
                <div key={q.id} className="border-border/50 bg-muted/20 space-y-1 rounded-lg border p-3 text-xs">
                  <p className="font-medium">
                    Q{i + 1}. {q.q}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Grade: {r?.grade || '?'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {parseFloat(r?.score || '0').toFixed(1)}/{q.marks}
                    </Badge>
                  </div>
                  {r?.feedback && <p className="text-muted-foreground">{r.feedback}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onRetry}>
          New test
        </Button>
        <Button variant="gradient" className="flex-1" onClick={() => (window.location.href = '/dashboard')}>
          <CheckCircle2 className="h-4 w-4" />
          Dashboard
        </Button>
      </div>
    </motion.div>
  );
}
