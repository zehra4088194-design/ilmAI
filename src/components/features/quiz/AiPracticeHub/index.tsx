'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Camera, CheckCircle2, FileQuestion, ListChecks, Loader2, PenLine, Sparkles, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScanUpload } from '@/components/features/ocr/ScanUpload';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils/cn';

type Subject = {
  id: string;
  name: string;
  color: string;
};

type Chapter = {
  id: string;
  name: string;
};

type ChapterResource = {
  id: string;
  title: string;
};

type PracticeMode = 'mcq' | 'short' | 'long';

type SubjectiveQuestion = {
  id: string;
  q: string;
  marks: number;
  keyPoints: string[];
  modelAnswer: string;
  guide?: string;
};

type Evaluation = {
  score: number;
  maxScore: number;
  feedback: string;
  improvements: string[];
};

interface AiPracticeHubProps {
  subjects: Subject[];
  chaptersBySubject: Record<string, Chapter[]>;
  resourcesByChapter: Record<string, ChapterResource[]>;
}

const MCQ_COUNTS = [5, 10, 15, 20];
const SHORT_COUNTS = [3, 5, 8, 10];
const LONG_COUNTS = [1, 2, 3, 5];

export function AiPracticeHub({ subjects, chaptersBySubject, resourcesByChapter }: AiPracticeHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateUser = useAuthStore((state) => state.updateUser);
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [mode, setMode] = useState<PracticeMode>('mcq');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [subjective, setSubjective] = useState<{
    type: 'short' | 'long';
    subjectName: string;
    chapterName: string;
    questions: SubjectiveQuestion[];
  } | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [checking, setChecking] = useState(false);

  const selectedSubject = subjects.find((subject) => subject.id === openSubjectId) ?? null;
  const chapters = openSubjectId ? chaptersBySubject[openSubjectId] || [] : [];
  const selectedChapter = chapters.find((chapter) => chapter.id === chapterId) ?? null;
  const chapterResources = chapterId ? resourcesByChapter[chapterId] || [] : [];
  const currentSubjectiveQuestion = subjective?.questions[questionIndex] ?? null;

  useEffect(() => {
    const subjectId = searchParams.get('subject');
    const nextChapterId = searchParams.get('chapter');
    if (!subjectId || !subjects.some((subject) => subject.id === subjectId)) return;
    setOpenSubjectId(subjectId);
    if ((chaptersBySubject[subjectId] || []).some((chapter) => chapter.id === nextChapterId)) {
      setChapterId(nextChapterId);
    }
  }, [chaptersBySubject, searchParams, subjects]);

  const countOptions = useMemo(() => {
    if (mode === 'short') return SHORT_COUNTS;
    if (mode === 'long') return LONG_COUNTS;
    return MCQ_COUNTS;
  }, [mode]);

  function openChapters(subjectId: string) {
    setOpenSubjectId(subjectId);
    setChapterId(null);
    setResourceId(null);
    setMode('mcq');
    setCount(10);
  }

  function resetSubjectiveAnswer() {
    setAnswer('');
    setEvaluation(null);
  }

  async function awardXp(amount: number) {
    if (amount <= 0) return;
    const res = await fetch('/api/xp/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    const json = await res.json();
    if (json.status === 'success' && json.data?.xp !== undefined) {
      updateUser({ xp: json.data.xp, level: json.data.level });
    }
  }

  async function startMcq() {
    if (!resourceId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, count }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      sessionStorage.setItem('current-quiz', JSON.stringify(json.data));
      router.push('/mcq/session');
    } catch {
      toast.error('The saved file MCQs could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  async function startSubjective(nextMode: 'short' | 'long') {
    if (!openSubjectId || !chapterId || !selectedSubject || !selectedChapter) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/practice-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: nextMode, subjectId: openSubjectId, chapterId, count }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setSubjective({
        type: nextMode,
        subjectName: selectedSubject.name,
        chapterName: selectedChapter.name,
        questions: json.data.questions,
      });
      setQuestionIndex(0);
      resetSubjectiveAnswer();
      setOpenSubjectId(null);
    } catch {
      toast.error('Questions could not be generated.');
    } finally {
      setLoading(false);
    }
  }

  async function startPractice() {
    await startMcq();
  }

  async function checkAnswer() {
    if (!currentSubjectiveQuestion || !answer.trim()) {
      toast.error('Write or scan your answer first.');
      return;
    }
    setChecking(true);
    try {
      const res = await fetch('/api/ai/grade-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentSubjectiveQuestion.q,
          studentAnswer: answer,
          modelAnswer: currentSubjectiveQuestion.modelAnswer || currentSubjectiveQuestion.keyPoints.join('; '),
          marks: currentSubjectiveQuestion.marks,
        }),
      });
      const json = await res.json();
      if (json.status === 'error') {
        toast.error(json.error);
        return;
      }
      setEvaluation(json.data);
      const earned = Math.max(0, Math.floor(Number(json.data.score) || 0));
      await awardXp(earned);
      if (earned > 0) toast.success(`+${earned} XP`);
    } catch {
      toast.error('The answer could not be checked.');
    } finally {
      setChecking(false);
    }
  }

  function nextSubjectiveQuestion() {
    if (!subjective) return;
    if (questionIndex >= subjective.questions.length - 1) {
      setSubjective(null);
      return;
    }
    setQuestionIndex((index) => index + 1);
    resetSubjectiveAnswer();
  }

  return (
    <>
      {subjective && currentSubjectiveQuestion ? (
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-violet-400">
                {subjective.type === 'short' ? 'Short Questions' : 'Long Questions'}
              </p>
              <h2 className="text-xl font-bold">{subjective.subjectName} - {subjective.chapterName}</h2>
              <p className="text-sm text-muted-foreground">
                Question {questionIndex + 1} of {subjective.questions.length}
              </p>
            </div>
            <Button variant="outline" onClick={() => setSubjective(null)}>Back to Practice</Button>
          </div>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{currentSubjectiveQuestion.marks} marks</Badge>
                {currentSubjectiveQuestion.guide && <Badge variant="secondary">{currentSubjectiveQuestion.guide}</Badge>}
              </div>
              <h3 className="text-lg font-semibold leading-relaxed">{currentSubjectiveQuestion.q}</h3>
              <div className="relative">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Write your answer here..."
                  className={cn('min-h-36 pr-12', subjective.type === 'long' && 'min-h-56')}
                />
                <div className="absolute right-2 top-2">
                  <ScanUpload
                    onTextExtracted={(text) => setAnswer((prev) => (prev ? `${prev}\n\n${text}` : text))}
                    trigger={
                      <Button variant="ghost" size="icon-sm" title="Scan answer">
                        <Camera className="w-4 h-4" />
                      </Button>
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {answer.trim().split(/\s+/).filter(Boolean).length} words
                </p>
                <Button variant="gradient" disabled={checking || !answer.trim()} onClick={checkAnswer}>
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Check with AI
                </Button>
              </div>
            </CardContent>
          </Card>

          {evaluation && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Score</p>
                      <p className="text-3xl font-bold text-violet-400">
                        {evaluation.score}/{evaluation.maxScore || currentSubjectiveQuestion.marks}
                      </p>
                    </div>
                    <Button onClick={nextSubjectiveQuestion}>
                      {questionIndex >= subjective.questions.length - 1 ? 'Finish' : 'Next Question'}
                    </Button>
                  </div>
                  <AiAnswerRenderer content={evaluation.feedback} label="AI Feedback" />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject, index) => (
            <motion.div key={subject.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
              <Card className="hover:border-violet-500/30 transition-colors cursor-pointer h-full" onClick={() => openChapters(subject.id)}>
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${subject.color}20` }}>
                    <BookOpen className="w-5 h-5" style={{ color: subject.color }} />
                  </div>
                  <h3 className="font-semibold mb-1">{subject.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{chaptersBySubject[subject.id]?.length || 0} class chapters</p>
                  <Button variant="gradient" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); openChapters(subject.id); }}>
                    <FileQuestion className="w-3.5 h-3.5" />Choose chapter file
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {subjects.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={BookOpen}
                title="No subjects found for your class"
                description="Subjects appear here based on your profile board and class. Check your profile or ask AI Tutor for topic-specific help."
                primaryHref="/settings"
                primaryLabel="Check Profile"
                secondaryHref="/ai-tutor"
                secondaryLabel="Ask AI Tutor"
              />
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {openSubjectId && selectedSubject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-[1px]" onClick={() => setOpenSubjectId(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[86vh] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl shadow-black/70" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold">{selectedSubject.name} Chapter Test</h3>
                  <p className="text-xs text-muted-foreground">Select a chapter, then choose one of its uploaded source files.</p>
                </div>
                <button onClick={() => setOpenSubjectId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid md:grid-cols-[1fr_260px] gap-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Chapter</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {chapters.map((chapter) => (
                      <button key={chapter.id} onClick={() => { setChapterId(chapter.id); setResourceId(null); }}
                        className={cn('w-full text-left p-3 rounded-lg border text-sm transition-colors',
                          chapterId === chapter.id ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-border hover:border-violet-500/40')}>
                        {chapter.name}
                      </button>
                    ))}
                    {chapters.length === 0 && (
                      <EmptyState
                        icon={ListChecks}
                        title="No chapters for this subject yet"
                        description="Only chapters for your selected board and class are shown. Once chapters are added, MCQ, short-answer, and long-answer tests will be available here."
                        className="py-8"
                      />
                    )}
                  </div>
                  {chapterId && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Uploaded chapter file</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {chapterResources.map((resource) => (
                          <button
                            key={resource.id}
                            type="button"
                            onClick={() => setResourceId(resource.id)}
                            className={cn('w-full rounded-lg border p-3 text-left text-sm transition-colors', resourceId === resource.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-border hover:border-emerald-500/40')}
                          >
                            <span className="block truncate font-medium">{resource.title}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">Saved source text and chapter MCQs</span>
                          </button>
                        ))}
                        {chapterResources.length === 0 && <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">No uploaded file is ready for this chapter yet.</p>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Test source</p>
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-3 text-sm text-emerald-300">
                      <FileQuestion className="h-4 w-4 shrink-0" /> Only saved MCQs from the selected file
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Number of questions</p>
                    <div className="grid grid-cols-4 gap-2">
                      {countOptions.map((option) => (
                        <button key={option} type="button" onClick={() => setCount(option)}
                          className={cn('rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
                            count === option ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-border text-muted-foreground hover:text-foreground')}>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button variant="gradient" size="lg" className="w-full" disabled={!resourceId || loading} onClick={startPractice}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {loading ? 'Preparing saved MCQs...' : 'Start random test'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
