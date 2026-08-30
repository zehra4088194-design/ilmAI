'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileDown, History, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { HouseAdBanner } from '@/components/features/ads/HouseAdBanner';
import { TestPaper } from './TestPaper';
import {
  formatGrade,
  type Chapter,
  type DifficultyChoice,
  type Paper,
  type PaperTheme,
  type PlanTier,
  type Subject,
  type TestHistoryRow,
} from './types';

const THEME_OPTIONS: { value: PaperTheme; label: string; blurb: string }[] = [
  { value: 'classic', label: 'Classic exam sheet', blurb: 'Textured background, gold rules — the familiar look.' },
  { value: 'modern', label: 'Modern boxed sections', blurb: 'Clean white paper with bordered section cards.' },
  { value: 'minimal', label: 'Minimal board-style', blurb: 'Ink-friendly, sparse rules — like a board past paper.' },
];

const DIFFICULTY_OPTIONS: { value: DifficultyChoice; label: string }[] = [
  { value: 'MIXED', label: 'Mixed' },
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
  { value: 'EXPERT', label: 'Expert' },
];

export function TeacherTestStudio({
  subjects,
  chapters,
  planTier,
}: {
  subjects: Subject[];
  chapters: Chapter[];
  planTier: PlanTier;
}) {
  const gradeLevels = useMemo(
    () => [...new Set(subjects.flatMap((subject) => subject.grade_levels || []))],
    [subjects]
  );
  const [gradeLevel, setGradeLevel] = useState(gradeLevels[0] || '');
  const filteredSubjects = useMemo(
    () => subjects.filter((subject) => !subject.grade_levels?.length || subject.grade_levels.includes(gradeLevel)),
    [gradeLevel, subjects]
  );
  const [subjectId, setSubjectId] = useState(
    subjects.find((subject) => !subject.grade_levels?.length || subject.grade_levels.includes(gradeLevels[0] || ''))
      ?.id || ''
  );
  const filteredChapters = useMemo(
    () => chapters.filter((chapter) => chapter.subject_id === subjectId),
    [chapters, subjectId]
  );
  const [chapterId, setChapterId] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [title, setTitle] = useState('Chapter Assessment');
  const [mcqCount, setMcqCount] = useState(10);
  const [shortCount, setShortCount] = useState(5);
  const [longCount, setLongCount] = useState(2);
  const [timeAllowed, setTimeAllowed] = useState(45);
  const [theme, setTheme] = useState<PaperTheme>('classic');
  const [difficulty, setDifficulty] = useState<DifficultyChoice>('MIXED');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);

  // FREE plan: a lightweight ad-gate. The banner is shown; the teacher must
  // acknowledge it before each generation. PRO/ELITE never see this.
  const [adAcknowledged, setAdAcknowledged] = useState(false);

  // ELITE-only custom branding.
  const [useCustomBranding, setUseCustomBranding] = useState(false);
  const [customHeader, setCustomHeader] = useState('');
  const [customWatermarkText, setCustomWatermarkText] = useState('');
  const [customWatermarkImageUrl, setCustomWatermarkImageUrl] = useState('');
  const [hidePlatformBranding, setHidePlatformBranding] = useState(false);

  const [loading, setLoading] = useState(false);
  const [paper, setPaper] = useState<Paper | null>(null);

  // Previous tests
  const [history, setHistory] = useState<TestHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loadingTestId, setLoadingTestId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/teacher/tests/history?limit=10');
        const json = await response.json();
        if (!cancelled && response.ok) setHistory(json.data || []);
      } catch {
        // Previous tests are a convenience, not critical — fail silently.
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadPreviousTest(id: string) {
    setLoadingTestId(id);
    try {
      const response = await fetch(`/api/teacher/tests/${id}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Could not load this test paper.');
      setPaper(json.data);
      toast.success('Loaded a previous paper.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load this test paper.');
    } finally {
      setLoadingTestId(null);
    }
  }

  async function generate() {
    if (!subjectId || !chapterId) {
      toast.error('Select a class, subject, and chapter.');
      return;
    }
    if (planTier === 'FREE' && !adAcknowledged) {
      toast.error('Please view the ad below, then tap "Generate test".');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/teacher/tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          chapterId,
          gradeLevel,
          institutionName,
          title,
          mcqCount,
          shortCount,
          longCount,
          timeAllowed,
          theme,
          difficulty,
          includeAnswerKey,
          adAcknowledged: planTier === 'FREE' ? adAcknowledged : undefined,
          customHeader: planTier === 'ELITE' && useCustomBranding ? customHeader : undefined,
          customWatermarkText: planTier === 'ELITE' && useCustomBranding ? customWatermarkText : undefined,
          customWatermarkImageUrl: planTier === 'ELITE' && useCustomBranding ? customWatermarkImageUrl : undefined,
          hidePlatformBranding: planTier === 'ELITE' && useCustomBranding ? hidePlatformBranding : undefined,
        }),
      });
      const json = await response.json();
      if (response.status === 402) {
        toast.error('Please view the ad below to generate your free test paper.');
        setAdAcknowledged(false);
        return;
      }
      if (!response.ok) throw new Error(json.error || 'The test could not be generated.');
      setPaper(json.data);
      if (json.data.testId) {
        setHistory((prev) => [
          {
            id: json.data.testId,
            title: json.data.title,
            institutionName: json.data.institutionName || null,
            subjectName: json.data.subject.name,
            chapterName: json.data.chapter.name,
            gradeLevel: json.data.gradeLevel,
            theme: json.data.theme,
            difficulty: json.data.difficulty,
            counts: {
              mcq: json.data.mcqs.length,
              short: json.data.shortQuestions.length,
              long: json.data.longQuestions.length,
            },
            totalMarks: json.data.totalMarks,
            durationMinutes: json.data.timeAllowed,
            planTier: json.data.planTier,
            createdAt: json.data.generatedAt,
          },
          ...prev,
        ]);
      }
      const actual = json.data.mcqs.length + json.data.shortQuestions.length + json.data.longQuestions.length;
      const requested = mcqCount + shortCount + longCount;
      if (actual < requested)
        toast.warning(`Paper created with ${actual} available unique questions out of ${requested} requested.`);
      else toast.success('A new random paper is ready.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The test could not be generated.');
    } finally {
      setLoading(false);
      // Require a fresh ad view for the next generation on FREE.
      if (planTier === 'FREE') setAdAcknowledged(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="print:hidden">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="flex items-center gap-2 lg:col-span-2">
            <span className="text-muted-foreground text-xs font-semibold uppercase">Your plan</span>
            <Badge variant={planTier === 'ELITE' ? 'success' : planTier === 'PRO' ? 'info' : 'secondary'}>
              {planTier}
            </Badge>
          </div>
          <Field label="Institution name">
            <Input
              value={institutionName}
              onChange={(event) => setInstitutionName(event.target.value)}
              placeholder="School, college, or academy"
              disabled={planTier === 'ELITE' && useCustomBranding && !!customHeader}
            />
          </Field>
          <Field label="Paper title">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Subject">
            <select
              className="border-input bg-card h-10 w-full rounded-lg border px-3 text-sm"
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setChapterId('');
              }}
            >
              {filteredSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Class">
            <select
              className="border-input bg-card h-10 w-full rounded-lg border px-3 text-sm"
              value={gradeLevel}
              onChange={(event) => {
                const nextGrade = event.target.value;
                const nextSubject = subjects.find(
                  (subject) => !subject.grade_levels?.length || subject.grade_levels.includes(nextGrade)
                );
                setGradeLevel(nextGrade);
                setSubjectId(nextSubject?.id || '');
                setChapterId('');
              }}
            >
              {gradeLevels.map((grade) => (
                <option key={grade} value={grade}>
                  {formatGrade(grade)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chapter">
            <select
              className="border-input bg-card h-10 w-full rounded-lg border px-3 text-sm"
              value={chapterId}
              onChange={(event) => setChapterId(event.target.value)}
            >
              <option value="">Select chapter</option>
              {filteredChapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-2">
            <NumberField label="MCQs" value={mcqCount} max={100} onChange={setMcqCount} />
            <NumberField label="Short" value={shortCount} max={50} onChange={setShortCount} />
            <NumberField label="Long" value={longCount} max={20} onChange={setLongCount} />
            <NumberField label="Minutes" value={timeAllowed} max={240} onChange={setTimeAllowed} />
          </div>
          <Field label="Difficulty">
            <select
              className="border-input bg-card h-10 w-full rounded-lg border px-3 text-sm"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as DifficultyChoice)}
            >
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Paper theme">
            <select
              className="border-input bg-card h-10 w-full rounded-lg border px-3 text-sm"
              value={theme}
              onChange={(event) => setTheme(event.target.value as PaperTheme)}
            >
              {THEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="lg:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={includeAnswerKey} onCheckedChange={(v) => setIncludeAnswerKey(v === true)} />
              Include answer key
            </label>
          </div>

          {planTier === 'ELITE' && (
            <div className="space-y-3 rounded-lg border border-amber-400/40 bg-amber-400/5 p-4 lg:col-span-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox checked={useCustomBranding} onCheckedChange={(v) => setUseCustomBranding(v === true)} />
                Use my own name / school branding on this paper
              </label>
              {useCustomBranding && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Custom header (name / school)">
                    <Input
                      value={customHeader}
                      onChange={(event) => setCustomHeader(event.target.value)}
                      placeholder="e.g. Mr. Ahmed Khan — Beaconhouse"
                      maxLength={120}
                    />
                  </Field>
                  <Field label="Watermark text (optional)">
                    <Input
                      value={customWatermarkText}
                      onChange={(event) => setCustomWatermarkText(event.target.value)}
                      placeholder="e.g. Beaconhouse Confidential"
                      maxLength={60}
                    />
                  </Field>
                  <Field label="Watermark image URL (optional)">
                    <Input
                      value={customWatermarkImageUrl}
                      onChange={(event) => setCustomWatermarkImageUrl(event.target.value)}
                      placeholder="https://your-school-logo.png"
                    />
                  </Field>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={hidePlatformBranding}
                        onCheckedChange={(v) => setHidePlatformBranding(v === true)}
                      />
                      Hide the ilm AI watermark
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {planTier === 'FREE' && (
            <div className="space-y-3 rounded-lg border border-dashed p-4 lg:col-span-2">
              <p className="text-sm font-semibold">Free plan: view a quick ad to unlock each paper.</p>
              <HouseAdBanner slot="teacher_test_gate" />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={adAcknowledged} onCheckedChange={(v) => setAdAcknowledged(v === true)} />
                I&apos;ve viewed the ad above — unlock generation
              </label>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
            <Button
              variant="gradient"
              className="ml-auto"
              onClick={generate}
              disabled={loading || (planTier === 'FREE' && !adAcknowledged)}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : paper ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {paper ? 'Generate another random paper' : 'Generate test'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {paper && (
        <>
          <div className="flex items-center justify-between gap-3 print:hidden">
            <p className="text-muted-foreground text-sm">Built from approved chapter materials.</p>
            <Button onClick={() => window.print()}>
              <FileDown className="h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>
          <TestPaper paper={paper} />
        </>
      )}

      {!historyLoading && history.length > 0 && (
        <Card className="print:hidden">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <h3 className="text-sm font-bold">Your previous tests</h3>
            </div>
            <div className="space-y-2">
              {history.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold">{row.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {row.subjectName} &middot; {row.chapterName} &middot; {formatGrade(row.gradeLevel)} &middot;{' '}
                      {row.counts.mcq + row.counts.short + row.counts.long} questions &middot; {row.totalMarks} marks
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => loadPreviousTest(row.id)}
                    disabled={loadingTestId === row.id}
                  >
                    {loadingTestId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Open'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input type="number" min={0} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}
