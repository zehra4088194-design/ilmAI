'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileDown, History, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils/cn';
import { AdGateComplete, AdGateSequence } from './AdGateSequence';
import { TestPaper } from './TestPaper';
import {
  formatGrade,
  EXTRA_TYPES_BY_PROFILE,
  type Chapter,
  type DifficultyChoice,
  type Paper,
  type PaperTheme,
  type PlanTier,
  type Subject,
  type TestHistoryRow,
} from './types';

// "Custom" builder mode — a teacher types their own questions for a section instead of letting
// the AI pick N at random from the chapter bank. Each section (MCQs, Short, Long, and whichever
// extra types apply to this subject) can independently stay Auto or switch to Manual once Custom
// mode is on — see builderMode/sectionMode below.
type SectionKey = 'mcq' | 'short' | 'long' | 'letter' | 'vocab' | 'grammar' | 'numerical';
type SectionMode = 'auto' | 'manual';
type ManualMcq = { q: string; opts: [string, string, string, string]; correct: number; exp: string };
type ManualQuestion = { q: string; marks: number; modelAnswer: string };
// Vocab is edited as word/meaning pairs (see ManualVocabEditor) and joined into ManualQuestion.q
// ("word — meaning") only when sent to the server — kept as pairs in the UI so the intent stays
// obvious while typing.
type ManualVocabPair = { word: string; meaning: string };

const SECTION_KEYS: SectionKey[] = ['mcq', 'short', 'long', 'letter', 'vocab', 'grammar', 'numerical'];
const EMPTY_SECTION_MODE: Record<SectionKey, SectionMode> = {
  mcq: 'auto',
  short: 'auto',
  long: 'auto',
  letter: 'auto',
  vocab: 'auto',
  grammar: 'auto',
  numerical: 'auto',
};

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
  initialInstitutionName,
  initialLogoUrl,
}: {
  subjects: Subject[];
  chapters: Chapter[];
  planTier: PlanTier;
  /** School/college admins already have a registered institution — prefill instead of asking. */
  initialInstitutionName?: string;
  /** The institution's own uploaded logo, prefilled as the default watermark image (still editable). */
  initialLogoUrl?: string;
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
    () =>
      chapters.filter(
        (chapter) =>
          chapter.subject_id === subjectId &&
          (!chapter.grade_levels?.length || chapter.grade_levels.includes(gradeLevel))
      ),
    [chapters, subjectId, gradeLevel]
  );
  const selectedSubject = useMemo(
    () => filteredSubjects.find((s) => s.id === subjectId),
    [filteredSubjects, subjectId]
  );
  const extraTypes = useMemo(
    () => EXTRA_TYPES_BY_PROFILE[selectedSubject?.content_profile || 'general'],
    [selectedSubject?.content_profile]
  );
  const [chapterId, setChapterId] = useState('');
  const [institutionName, setInstitutionName] = useState(initialInstitutionName || '');
  const [title, setTitle] = useState('Chapter Assessment');
  const [mcqCount, setMcqCount] = useState(5);
  const [shortCount, setShortCount] = useState(5);
  const [longCount, setLongCount] = useState(2);
  const [letterCount, setLetterCount] = useState(3);
  const [vocabCount, setVocabCount] = useState(5);
  const [grammarCount, setGrammarCount] = useState(3);
  const [numericalCount, setNumericalCount] = useState(5);
  const [timeAllowed, setTimeAllowed] = useState(45);
  const [theme, setTheme] = useState<PaperTheme>('classic');
  const [difficulty, setDifficulty] = useState<DifficultyChoice>('MIXED');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);

  // "Custom" builder — see the SectionKey/SectionMode comment above.
  const [builderMode, setBuilderMode] = useState<'auto' | 'custom'>('auto');
  const [sectionMode, setSectionMode] = useState<Record<SectionKey, SectionMode>>(EMPTY_SECTION_MODE);
  const [manualMcqs, setManualMcqs] = useState<ManualMcq[]>([]);
  const [manualShorts, setManualShorts] = useState<ManualQuestion[]>([]);
  const [manualLongs, setManualLongs] = useState<ManualQuestion[]>([]);
  const [manualLetters, setManualLetters] = useState<ManualQuestion[]>([]);
  const [manualVocab, setManualVocab] = useState<ManualVocabPair[]>([]);
  const [manualGrammar, setManualGrammar] = useState<ManualQuestion[]>([]);
  const [manualNumericals, setManualNumericals] = useState<ManualQuestion[]>([]);

  // FREE plan: a lightweight ad-gate. The banner is shown; the teacher must
  // acknowledge it before each generation. PRO/ELITE never see this.
  const [adAcknowledged, setAdAcknowledged] = useState(false);

  // PRO/ELITE custom branding — auto-applied whenever there's a saved institution name/logo to
  // use (school-admin's org, or a plain teacher's own profile), so a PRO/ELITE user never has to
  // manually opt in just to get their own name and logo on the paper. Still fully editable/
  // toggleable below. hidePlatformBranding (fully removing ilm AI's own mark) stays ELITE-only.
  const canUseCustomBranding = planTier === 'PRO' || planTier === 'ELITE';
  // A school/college admin (or a teacher with a saved profile photo) already HAS a name/logo to
  // brand with — asking them to opt in and fill out a form for something we can already apply
  // automatically is pure friction. Only someone with nothing saved yet sees the manual fields
  // below, to type their own name/logo in by hand.
  const hasAutoBranding = canUseCustomBranding && Boolean(initialInstitutionName || initialLogoUrl);
  const [useCustomBranding, setUseCustomBranding] = useState(hasAutoBranding);
  const [customHeader, setCustomHeader] = useState('');
  const [customWatermarkText, setCustomWatermarkText] = useState('');
  const [customWatermarkImageUrl, setCustomWatermarkImageUrl] = useState(initialLogoUrl || '');
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

  const isManualSection = (key: SectionKey) => builderMode === 'custom' && sectionMode[key] === 'manual';
  const manualListLength: Record<SectionKey, number> = {
    mcq: manualMcqs.length,
    short: manualShorts.length,
    long: manualLongs.length,
    letter: manualLetters.length,
    vocab: manualVocab.length,
    grammar: manualGrammar.length,
    numerical: manualNumericals.length,
  };
  const SECTION_LABELS: Record<SectionKey, string> = {
    mcq: 'MCQ',
    short: 'short',
    long: 'long',
    letter: 'application/letter',
    vocab: 'vocabulary',
    grammar: 'grammar',
    numerical: 'numerical',
  };

  async function generate() {
    if (!subjectId || !chapterId) {
      toast.error('Select a class, subject, and chapter.');
      return;
    }
    if (planTier === 'FREE' && !adAcknowledged) {
      toast.error('Please watch all 5 ads below, then tap "Generate test".');
      return;
    }
    const emptyManualSection = SECTION_KEYS.find((key) => isManualSection(key) && manualListLength[key] === 0);
    if (emptyManualSection) {
      toast.error(`Add at least one ${SECTION_LABELS[emptyManualSection]} question, or switch that section back to Auto.`);
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
          letterCount,
          vocabCount,
          grammarCount,
          numericalCount,
          timeAllowed,
          theme,
          difficulty,
          includeAnswerKey,
          adAcknowledged: planTier === 'FREE' ? adAcknowledged : undefined,
          customHeader: canUseCustomBranding && useCustomBranding ? customHeader : undefined,
          customWatermarkText: canUseCustomBranding && useCustomBranding ? customWatermarkText : undefined,
          customWatermarkImageUrl: canUseCustomBranding && useCustomBranding ? customWatermarkImageUrl : undefined,
          hidePlatformBranding: planTier === 'ELITE' && useCustomBranding ? hidePlatformBranding : undefined,
          manualMcqs: isManualSection('mcq') ? manualMcqs : undefined,
          manualShortQuestions: isManualSection('short') ? manualShorts : undefined,
          manualLongQuestions: isManualSection('long') ? manualLongs : undefined,
          manualLetterQuestions: isManualSection('letter') ? manualLetters : undefined,
          manualVocabQuestions: isManualSection('vocab')
            ? manualVocab.map((pair) => ({
                q: `${pair.word.trim()} — ${pair.meaning.trim()}`,
                marks: 1,
                modelAnswer: pair.meaning.trim(),
              }))
            : undefined,
          manualGrammarQuestions: isManualSection('grammar') ? manualGrammar : undefined,
          manualNumericalQuestions: isManualSection('numerical') ? manualNumericals : undefined,
        }),
      });
      const json = await response.json();
      if (response.status === 402) {
        toast.error('Please watch all 5 ads below to generate your free test paper.');
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
      const actual =
        json.data.mcqs.length +
        json.data.shortQuestions.length +
        json.data.longQuestions.length +
        (json.data.letterQuestions?.length || 0) +
        (json.data.vocabQuestions?.length || 0) +
        (json.data.grammarQuestions?.length || 0) +
        (json.data.numericalQuestions?.length || 0);
      const requested = mcqCount + shortCount + longCount + letterCount + vocabCount + grammarCount + numericalCount;
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
              disabled={canUseCustomBranding && useCustomBranding && !!customHeader}
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
          <div className="lg:col-span-2">
            <NumberField label="Minutes" value={timeAllowed} max={240} onChange={setTimeAllowed} />
          </div>

          <div className="flex items-center justify-between lg:col-span-2">
            <Label>Questions</Label>
            <div className="bg-muted flex rounded-lg p-0.5 text-xs font-semibold">
              {(['auto', 'custom'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBuilderMode(m)}
                  className={cn(
                    'rounded-md px-3 py-1.5 transition-colors',
                    builderMode === m ? 'bg-card shadow-sm' : 'text-muted-foreground'
                  )}
                >
                  {m === 'auto' ? 'Auto' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          {builderMode === 'auto' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-2">
              <NumberField label="MCQs" value={mcqCount} max={100} onChange={setMcqCount} />
              <NumberField label="Short" value={shortCount} max={50} onChange={setShortCount} />
              <NumberField label="Long" value={longCount} max={20} onChange={setLongCount} />
              {extraTypes.map((type) => {
                const stateMap = {
                  letter: [letterCount, setLetterCount, 20] as const,
                  vocab: [vocabCount, setVocabCount, 30] as const,
                  grammar: [grammarCount, setGrammarCount, 20] as const,
                  numerical: [numericalCount, setNumericalCount, 20] as const,
                };
                const [value, setter, max] = stateMap[type.key];
                return <NumberField key={type.key} label={type.label} value={value} max={max} onChange={setter} />;
              })}
            </div>
          ) : (
            <div className="space-y-3 lg:col-span-2">
              <p className="text-muted-foreground text-xs">
                Each section can stay Auto (the AI picks from the chapter bank) or switch to Manual to write your own
                questions — pick as many as you want per section.
              </p>
              <SectionBuilder
                label="MCQs"
                mode={sectionMode.mcq}
                onModeChange={(m) => setSectionMode((s) => ({ ...s, mcq: m }))}
                autoValue={mcqCount}
                autoMax={100}
                onAutoChange={setMcqCount}
              >
                <ManualMcqEditor items={manualMcqs} onChange={setManualMcqs} />
              </SectionBuilder>
              <SectionBuilder
                label="Short questions"
                mode={sectionMode.short}
                onModeChange={(m) => setSectionMode((s) => ({ ...s, short: m }))}
                autoValue={shortCount}
                autoMax={50}
                onAutoChange={setShortCount}
              >
                <ManualQuestionEditor items={manualShorts} onChange={setManualShorts} defaultMarks={3} />
              </SectionBuilder>
              <SectionBuilder
                label="Long questions"
                mode={sectionMode.long}
                onModeChange={(m) => setSectionMode((s) => ({ ...s, long: m }))}
                autoValue={longCount}
                autoMax={20}
                onAutoChange={setLongCount}
              >
                <ManualQuestionEditor items={manualLongs} onChange={setManualLongs} defaultMarks={8} allowSubParts />
              </SectionBuilder>
              {extraTypes.map((type) => {
                if (type.key === 'letter')
                  return (
                    <SectionBuilder
                      key="letter"
                      label={type.label}
                      mode={sectionMode.letter}
                      onModeChange={(m) => setSectionMode((s) => ({ ...s, letter: m }))}
                      autoValue={letterCount}
                      autoMax={20}
                      onAutoChange={setLetterCount}
                    >
                      <ManualQuestionEditor items={manualLetters} onChange={setManualLetters} defaultMarks={3} allowSubParts />
                    </SectionBuilder>
                  );
                if (type.key === 'vocab')
                  return (
                    <SectionBuilder
                      key="vocab"
                      label={type.label}
                      mode={sectionMode.vocab}
                      onModeChange={(m) => setSectionMode((s) => ({ ...s, vocab: m }))}
                      autoValue={vocabCount}
                      autoMax={30}
                      onAutoChange={setVocabCount}
                    >
                      <ManualVocabEditor items={manualVocab} onChange={setManualVocab} />
                    </SectionBuilder>
                  );
                if (type.key === 'grammar')
                  return (
                    <SectionBuilder
                      key="grammar"
                      label={type.label}
                      mode={sectionMode.grammar}
                      onModeChange={(m) => setSectionMode((s) => ({ ...s, grammar: m }))}
                      autoValue={grammarCount}
                      autoMax={20}
                      onAutoChange={setGrammarCount}
                    >
                      <ManualQuestionEditor items={manualGrammar} onChange={setManualGrammar} defaultMarks={3} />
                    </SectionBuilder>
                  );
                return (
                  <SectionBuilder
                    key="numerical"
                    label={type.label}
                    mode={sectionMode.numerical}
                    onModeChange={(m) => setSectionMode((s) => ({ ...s, numerical: m }))}
                    autoValue={numericalCount}
                    autoMax={20}
                    onAutoChange={setNumericalCount}
                  >
                    <ManualQuestionEditor items={manualNumericals} onChange={setManualNumericals} defaultMarks={5} allowSubParts />
                  </SectionBuilder>
                );
              })}
            </div>
          )}
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

          {canUseCustomBranding && hasAutoBranding && (
            // Nothing to configure — your school/name and logo are already known, so they're
            // just applied. No opt-in checkbox, no form to fill out.
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 lg:col-span-2">
              <p className="text-sm">
                Your {initialLogoUrl ? 'logo and ' : ''}name are applied on this paper automatically — &quot;Powered by
                ilmai.study&quot; shows as a small credit.
              </p>
              {planTier === 'ELITE' && (
                <label className="flex shrink-0 items-center gap-2 text-xs font-medium">
                  <Checkbox
                    checked={hidePlatformBranding}
                    onCheckedChange={(v) => setHidePlatformBranding(v === true)}
                  />
                  Hide that credit too
                </label>
              )}
            </div>
          )}

          {canUseCustomBranding && !hasAutoBranding && (
            <div className="space-y-3 rounded-lg border border-amber-400/40 bg-amber-400/5 p-4 lg:col-span-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox checked={useCustomBranding} onCheckedChange={(v) => setUseCustomBranding(v === true)} />
                Use my own name / school logo on this paper
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
                  <Field label="Logo / watermark image URL">
                    <Input
                      value={customWatermarkImageUrl}
                      onChange={(event) => setCustomWatermarkImageUrl(event.target.value)}
                      placeholder="https://your-school-logo.png"
                    />
                  </Field>
                  {planTier === 'ELITE' && (
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={hidePlatformBranding}
                          onCheckedChange={(v) => setHidePlatformBranding(v === true)}
                        />
                        Hide the ilm AI watermark entirely
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {planTier === 'FREE' && (
            <div className="lg:col-span-2">
              {adAcknowledged ? (
                <AdGateComplete />
              ) : (
                <AdGateSequence slot="teacher_test_gate" onComplete={() => setAdAcknowledged(true)} />
              )}
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

function SectionBuilder({
  label,
  mode,
  onModeChange,
  autoValue,
  autoMax,
  onAutoChange,
  children,
}: {
  label: string;
  mode: SectionMode;
  onModeChange: (mode: SectionMode) => void;
  autoValue: number;
  autoMax: number;
  onAutoChange: (value: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <div className="bg-muted flex rounded-lg p-0.5 text-xs font-semibold">
          {(['auto', 'manual'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={cn(
                'rounded-md px-2.5 py-1 transition-colors',
                mode === m ? 'bg-card shadow-sm' : 'text-muted-foreground'
              )}
            >
              {m === 'auto' ? 'Auto' : 'Manual'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'auto' ? (
        <div className="max-w-[10rem]">
          <NumberField label="How many" value={autoValue} max={autoMax} onChange={onAutoChange} />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function ManualMcqEditor({ items, onChange }: { items: ManualMcq[]; onChange: (items: ManualMcq[]) => void }) {
  function update(index: number, patch: Partial<ManualMcq>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  function updateOption(index: number, optionIndex: number, value: string) {
    const current = items[index];
    if (!current) return;
    const opts = [...current.opts] as ManualMcq['opts'];
    opts[optionIndex] = value;
    update(index, { opts });
  }
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground mt-2 shrink-0 text-xs font-bold">{index + 1}.</span>
            <Textarea
              value={item.q}
              onChange={(event) => update(index, { q: event.target.value })}
              placeholder="Question text"
              rows={2}
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(items.filter((_, i) => i !== index))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2">
            {item.opts.map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`mcq-correct-${index}`}
                  checked={item.correct === optionIndex}
                  onChange={() => update(index, { correct: optionIndex })}
                  title="Mark as the correct option"
                />
                <Input
                  value={option}
                  onChange={(event) => updateOption(index, optionIndex, event.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                  className="h-8 text-sm"
                />
              </label>
            ))}
          </div>
          <Input
            value={item.exp}
            onChange={(event) => update(index, { exp: event.target.value })}
            placeholder="Explanation (optional)"
            className="ml-6 h-8 text-sm"
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { q: '', opts: ['', '', '', ''], correct: 0, exp: '' }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add MCQ
      </Button>
    </div>
  );
}

function ManualQuestionEditor({
  items,
  onChange,
  defaultMarks,
  allowSubParts,
}: {
  items: ManualQuestion[];
  onChange: (items: ManualQuestion[]) => void;
  defaultMarks: number;
  allowSubParts?: boolean;
}) {
  function update(index: number, patch: Partial<ManualQuestion>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground mt-2 shrink-0 text-xs font-bold">{index + 1}.</span>
            <Textarea
              value={item.q}
              onChange={(event) => update(index, { q: event.target.value })}
              placeholder={
                allowSubParts
                  ? 'Question text — for a multi-part question, write each part on its own line, e.g. (i) ...\n(ii) ...'
                  : 'Question text'
              }
              rows={allowSubParts ? 3 : 2}
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(items.filter((_, i) => i !== index))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 pl-6">
            <Label className="text-xs">Marks</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={item.marks}
              onChange={(event) => update(index, { marks: Number(event.target.value) || defaultMarks })}
              className="h-8 w-20 text-sm"
            />
          </div>
          <Textarea
            value={item.modelAnswer}
            onChange={(event) => update(index, { modelAnswer: event.target.value })}
            placeholder="Model answer (optional — shown on the answer key)"
            rows={2}
            className="ml-6"
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { q: '', marks: defaultMarks, modelAnswer: '' }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add question
      </Button>
    </div>
  );
}

function ManualVocabEditor({
  items,
  onChange,
}: {
  items: ManualVocabPair[];
  onChange: (items: ManualVocabPair[]) => void;
}) {
  function update(index: number, patch: Partial<ManualVocabPair>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-muted-foreground w-5 shrink-0 text-xs font-bold">{index + 1}.</span>
          <Input value={item.word} onChange={(event) => update(index, { word: event.target.value })} placeholder="Word" className="h-9" />
          <Input
            value={item.meaning}
            onChange={(event) => update(index, { meaning: event.target.value })}
            placeholder="Meaning / pair word"
            className="h-9"
          />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(items.filter((_, i) => i !== index))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { word: '', meaning: '' }])}>
        <Plus className="h-3.5 w-3.5" /> Add word pair
      </Button>
    </div>
  );
}
