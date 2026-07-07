'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, Camera, ChevronDown, ChevronUp, Clock, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AIProviderSelector } from '@/components/features/ai-selector/AIProviderSelector';
import { compressImageForOcr } from '@/lib/utils/image-compress';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import type { AiProviderId, ModelTier } from '@/lib/ai/gateway';
import type { SubscriptionTier } from '@/types';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

const BOARD_PATTERNS: Record<string, { mcq: number; short: number; long: number; marks: number; time: number }> = {
  'GRADE_9':  { mcq: 15, short: 6, long: 3, marks: 75, time: 180 },
  'GRADE_10': { mcq: 15, short: 6, long: 3, marks: 75, time: 180 },
  'GRADE_11': { mcq: 20, short: 8, long: 4, marks: 100, time: 195 },
  'GRADE_12': { mcq: 20, short: 8, long: 4, marks: 100, time: 195 },
};

type TestState = 'setup' | 'loading' | 'paper' | 'grading' | 'result';

export function FullTestSetup({
  subjects, defaultBoard, defaultGrade, userTier,
}: { subjects: any[]; defaultBoard: string; defaultGrade: string; userTier: SubscriptionTier }) {
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
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number } | null>(null);
  const wholeTestFileRef = useRef<HTMLInputElement>(null);
  const isFreeTier = userTier === 'FREE';

  const bp = BOARD_PATTERNS[grade] || BOARD_PATTERNS['GRADE_10']!;
  const counts = pattern === 'board' ? { mcq: bp.mcq, short: bp.short, long: bp.long } : custom;
  const selectedSubject = subjects.find(s => s.id === subject);

  const generate = async () => {
    if (!subject) { toast.error('Subject select karo'); return; }
    setState('loading');
    try {
      const res = await fetch('/api/ai/full-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: selectedSubject?.name || 'Subject',
          chapterName: chapter,
          className: grade.replace('GRADE_', 'Class ').replace('_', '-'),
          boardName: BOARDS.find(b => b.value === board)?.label || board,
          mcqCount: counts.mcq,
          shortCount: counts.short,
          longCount: counts.long,
          provider, aiTier,
        }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); setState('setup'); return; }
      // Tag questions with IDs for grading
      const p = json.data;
      p.shortQs = (p.shortQs || []).map((q: any) => ({ ...q, id: nanoid() }));
      p.longQs = (p.longQs || []).map((q: any) => ({ ...q, id: nanoid() }));
      setPaper(p);
      setAnswers({});
      setState('paper');
    } catch { toast.error('Test generate nahi hua'); setState('setup'); }
  };

  const handleScanWholeTest = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const writeQuestions = [...(paper.shortQs || []), ...(paper.longQs || [])];
    const emptyQuestions = writeQuestions.filter((q: any) => !(answers[q.id] || '').trim());
    if (emptyQuestions.length === 0) {
      toast.error('Saare written answers already bhare hue hain');
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
        const res = await fetch('/api/ocr', { method: 'POST', body: formData });
        if (res.status === 429) {
          hitLimit = true;
          const json = await res.json().catch(() => null);
          toast.error(`${json?.error || 'Daily scan limit khatam ho gayi'} — ${recognizedTexts.length} page(s) scan ho chuke the.`);
          break;
        }
        const json = await res.json();
        if (json.data?.text) recognizedTexts.push(json.data.text);
      } catch {
        // Best effort — skip a page that fails and keep going with the rest
      }
    }

    if (recognizedTexts.length > 0) {
      setAnswers(a => {
        const updated = { ...a };
        let ti = 0;
        for (const q of emptyQuestions) {
          if (ti >= recognizedTexts.length) break;
          updated[q.id] = recognizedTexts[ti];
          ti++;
        }
        return updated;
      });
      if (!hitLimit) toast.success('Scan ho gaya — jawabaat check kar lo, zaroorat ho to edit karo.');
    } else if (!hitLimit) {
      toast.error('Koi text scan nahi ho saka');
    }

    setScanningWhole(false);
    setScanProgress(null);
    if (wholeTestFileRef.current) wholeTestFileRef.current.value = '';
  };

  const submitTest = async () => {
    const mcqCorrect = (paper.mcqs || []).filter((_: any, i: number) => answers[`mcq_${i}`] === i).length;
    // Actually mcq answer is stored as index. Fix:
    // We'll compare stored index to q.correct
    const mcqResults = (paper.mcqs || []).map((q: any, i: number) => ({
      correct: answers[`mcq_${i}`] === q.correct,
      userAns: answers[`mcq_${i}`],
      correctAns: q.correct,
    }));

    const writeQuestions = [
      ...(paper.shortQs || []).map((q: any) => ({ ...q, section: 'short' })),
      ...(paper.longQs || []).map((q: any) => ({ ...q, section: 'long' })),
    ];
    const writeAnswers: Record<string, string> = {};
    writeQuestions.forEach(q => { writeAnswers[q.id] = answers[q.id] || ''; });

    setState('grading');
    try {
      const res = await fetch('/api/ai/grade-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: writeQuestions, answers: writeAnswers, subjectName: selectedSubject?.name, className: grade.replace('GRADE_', 'Class '), provider, aiTier }),
      });
      const json = await res.json();
      const writeEvals = json.data || writeQuestions.map(() => ({ score: 0, grade: '?', feedback: 'Grading pending' }));
      setGradeResults([...mcqResults.map((r: any) => ({ type: 'mcq', ...r })), ...writeEvals.map((e: any, i: number) => ({ type: writeQuestions[i]?.section, ...e }))]);
      setState('result');
    } catch { toast.error('Grading fail ho gayi'); setState('paper'); }
  };

  return (
    <AnimatePresence mode="wait">
      {state === 'setup' && (
        <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Subject</label>
                  <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Board</label>
                  <select value={board} onChange={e => setBoard(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {BOARDS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Grade Level</label>
                  <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
                    {GRADE_LEVELS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Chapter</label>
                  <input value={chapter} onChange={e => setChapter(e.target.value)} placeholder="e.g. Chapter 5 ya Full Book" className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
              </div>

              {/* Pattern toggle */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Pattern</label>
                <div className="flex gap-2">
                  {(['board', 'custom'] as const).map(p => (
                    <button key={p} onClick={() => setPattern(p)} className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-all capitalize', pattern === p ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
                      {p === 'board' ? '🏫 Board Pattern' : '⚙️ Custom'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pattern details */}
              {pattern === 'board' ? (
                <div className="grid grid-cols-3 gap-3">
                  {[['MCQs', bp.mcq, 'text-violet-400'], ['Short Q', bp.short, 'text-blue-400'], ['Long Q', bp.long, 'text-amber-400']].map(([label, count, color]) => (
                    <div key={label as string} className="bg-muted/30 rounded-xl p-3 text-center">
                      <p className={`text-2xl font-bold ${color}`}>{count}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {(['mcq', 'short', 'long'] as const).map(key => (
                    <div key={key}>
                      <label className="text-xs text-muted-foreground block mb-1 capitalize">{key === 'mcq' ? 'MCQs' : `${key === 'short' ? 'Short' : 'Long'} Qs`}</label>
                      <div className="flex gap-1">
                        {[0, 5, 10, 15, 20].map(n => (
                          <button key={n} onClick={() => setCustom(c => ({ ...c, [key]: n }))} className={cn('flex-1 py-1.5 rounded text-xs font-medium transition-all', custom[key] === n ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground hover:bg-muted/60')}>
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

          <div className="flex items-center justify-between flex-wrap gap-3">
            <AIProviderSelector provider={provider} tier={aiTier} onChange={(p, t) => { setProvider(p); setAiTier(t); }} isFreeTier={isFreeTier} />
            <Button variant="gradient" size="lg" onClick={generate}>
              <Sparkles className="w-5 h-5" />Test Generate Karo
            </Button>
          </div>
        </motion.div>
      )}

      {state === 'loading' && (
        <motion.div key="loading" className="text-center py-20">
          <div className="w-14 h-14 mx-auto mb-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-semibold">AI poora paper bana raha hai...</p>
          <p className="text-sm text-muted-foreground mt-2">MCQs + Short + Long questions — thora intezaar karo</p>
        </motion.div>
      )}

      {state === 'grading' && (
        <motion.div key="grading" className="text-center py-20">
          <div className="w-14 h-14 mx-auto mb-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-semibold">AI check kar raha hai...</p>
          <p className="text-sm text-muted-foreground mt-2">Saare jawabaat evaluate ho rahe hain</p>
        </motion.div>
      )}

      {state === 'paper' && paper && (
        <motion.div key="paper" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold">{paper.title}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                {paper.totalMarks && <span>📊 {paper.totalMarks} marks</span>}
                {paper.timeAllowed && <span><Clock className="inline w-3.5 h-3.5" /> {paper.timeAllowed} min</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input ref={wholeTestFileRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handleScanWholeTest} />
              <Button variant="outline" onClick={() => wholeTestFileRef.current?.click()} disabled={scanningWhole}>
                <Camera className="w-4 h-4" />
                {scanningWhole ? `Scanning page ${scanProgress?.current} of ${scanProgress?.total}...` : 'Poora Test Scan Karo'}
              </Button>
              <Button variant="gradient" onClick={submitTest}><FileCheck className="w-4 h-4" />Submit Test</Button>
            </div>
          </div>

          {/* MCQ Section */}
          {paper.mcqs?.length > 0 && (
            <TestSection title="Section A — MCQs (1 mark each)" count={paper.mcqs.length}>
              <div className="space-y-5">
                {paper.mcqs.map((q: any, i: number) => (
                  <MCQQuestion key={i} index={i} question={q} selected={answers[`mcq_${i}`]} onSelect={(idx) => setAnswers(a => ({ ...a, [`mcq_${i}`]: idx }))} />
                ))}
              </div>
            </TestSection>
          )}

          {/* Short Questions */}
          {paper.shortQs?.length > 0 && (
            <TestSection title="Section B — Short Questions" count={paper.shortQs.length}>
              <div className="space-y-5">
                {paper.shortQs.map((q: any, i: number) => (
                  <WrittenQuestion key={q.id} index={i} question={q} value={answers[q.id] || ''} onChange={(val) => setAnswers(a => ({ ...a, [q.id]: val }))} rows={4} />
                ))}
              </div>
            </TestSection>
          )}

          {/* Long Questions */}
          {paper.longQs?.length > 0 && (
            <TestSection title="Section C — Long Questions" count={paper.longQs.length}>
              <div className="space-y-5">
                {paper.longQs.map((q: any, i: number) => (
                  <WrittenQuestion key={q.id} index={i} question={q} value={answers[q.id] || ''} onChange={(val) => setAnswers(a => ({ ...a, [q.id]: val }))} rows={8} />
                ))}
              </div>
            </TestSection>
          )}

          <Button variant="gradient" size="xl" className="w-full" onClick={submitTest}>
            <FileCheck className="w-5 h-5" />Test Submit Karo
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
      <div className="flex items-center justify-between p-4 cursor-pointer border-b border-border" onClick={() => setOpen(!open)}>
        <h3 className="font-bold text-sm">{title} <span className="text-muted-foreground font-normal">({count})</span></h3>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </div>
      {open && <CardContent className="p-4">{children}</CardContent>}
    </Card>
  );
}

function MCQQuestion({ index, question, selected, onSelect }: { index: number; question: any; selected?: number; onSelect: (i: number) => void }) {
  const L = ['A', 'B', 'C', 'D'];
  return (
    <div>
      <p className="font-medium text-sm mb-3"><span className="text-muted-foreground">Q{index + 1}. </span>{question.q}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {(question.opts || []).map((opt: string, i: number) => (
          <label key={i} className={cn('flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm', selected === i ? 'bg-violet-500/20 border-violet-500 text-violet-300' : 'border-border hover:border-violet-500/40 bg-muted/20')}>
            <input type="radio" name={`mcq_${index}`} className="accent-violet-500" checked={selected === i} onChange={() => onSelect(i)} />
            <span className="font-semibold text-xs shrink-0">{L[i]}.</span> {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

function WrittenQuestion({ index, question, value, onChange, rows }: { index: number; question: any; value: string; onChange: (v: string) => void; rows: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const compressed = await compressImageForOcr(file);
      const formData = new FormData();
      formData.append('file', new File([compressed.blob], 'answer.jpg', { type: 'image/jpeg' }));
      const res = await fetch('/api/ocr', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.data?.text) onChange((value ? `${value}\n\n` : '') + json.data.text);
      else toast.error('Text scan nahi hua');
    } catch { toast.error('Scan fail ho gaya'); }
    finally { setScanning(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-medium text-sm flex-1"><span className="text-muted-foreground">Q{index + 1}. </span>{question.q}</p>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="text-xs">{question.marks} marks</Badge>
        </div>
      </div>
      {question.guide && <p className="text-xs text-violet-400 mb-2">💡 {question.guide}</p>}
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder="Apna jawab yahan likho..."
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y" />
      <div className="flex items-center gap-2 mt-1.5">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScan} />
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => fileRef.current?.click()} disabled={scanning}>
          <Camera className="w-3 h-3" />{scanning ? 'Scanning...' : 'Handwritten Answer Scan Karo'}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{value.trim().split(/\s+/).filter(Boolean).length} words</span>
      </div>
    </div>
  );
}

function TestResult({ paper, gradeResults, answers, onRetry }: { paper: any; gradeResults: any[]; answers: any; onRetry: () => void }) {
  const mcqResults = gradeResults.filter(r => r.type === 'mcq');
  const writeResults = gradeResults.filter(r => r.type !== 'mcq');
  const mcqScore = mcqResults.filter(r => r.correct).length;
  const writeScore = writeResults.reduce((sum, r) => sum + (parseFloat(r.score) || 0), 0);
  const total = mcqScore + writeScore;
  const maxMarks = paper.totalMarks || (mcqResults.length + writeResults.reduce((sum: number, _: any, i: number) => {
    const allWrites = [...(paper.shortQs || []), ...(paper.longQs || [])];
    return sum + (allWrites[i]?.marks || 0);
  }, 0));
  const pct = maxMarks > 0 ? Math.round((total / maxMarks) * 100) : 0;
  const L = ['A', 'B', 'C', 'D'];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Score summary */}
      <div className="text-center glass rounded-2xl p-8 border border-border/50">
        <p className="text-6xl font-bold gradient-text">{pct}%</p>
        <p className="text-muted-foreground mt-2">{total.toFixed(1)} / {maxMarks} marks</p>
        <div className="flex justify-center gap-4 mt-4">
          <Badge variant={pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'destructive'} className="text-base px-4 py-1.5">
            Grade: {pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'F'}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-muted/30 rounded-xl p-3"><p className="text-xl font-bold text-violet-400">{mcqScore}/{mcqResults.length}</p><p className="text-xs text-muted-foreground">MCQs</p></div>
          <div className="bg-muted/30 rounded-xl p-3"><p className="text-xl font-bold text-blue-400">{writeResults.filter((_,i) => i < (paper.shortQs?.length || 0)).reduce((s,r) => s+(parseFloat(r.score)||0), 0).toFixed(1)}</p><p className="text-xs text-muted-foreground">Short Qs</p></div>
          <div className="bg-muted/30 rounded-xl p-3"><p className="text-xl font-bold text-green-400">{writeResults.filter((_,i) => i >= (paper.shortQs?.length || 0)).reduce((s,r) => s+(parseFloat(r.score)||0), 0).toFixed(1)}</p><p className="text-xs text-muted-foreground">Long Qs</p></div>
        </div>
      </div>

      {/* MCQ review */}
      {paper.mcqs?.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-sm mb-3">MCQ Review</h3>
            {paper.mcqs.map((q: any, i: number) => {
              const r = mcqResults[i];
              return (
                <div key={i} className={cn('p-3 rounded-lg border text-xs', r?.correct ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5')}>
                  <p className="font-medium mb-1">{r?.correct ? '✅' : '❌'} Q{i+1}. {q.q}</p>
                  <p>Tumhara: <strong>{r?.userAns !== undefined ? L[r.userAns] : '—'}</strong> · Sahi: <strong className="text-green-400">{L[q.correct]}</strong></p>
                  {!r?.correct && q.exp && <p className="text-muted-foreground mt-1">💡 {q.exp}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Written Q review */}
      {writeResults.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-bold text-sm mb-3">Written Questions Review</h3>
            {[...(paper.shortQs || []), ...(paper.longQs || [])].map((q: any, i: number) => {
              const r = writeResults[i];
              return (
                <div key={q.id} className="p-3 rounded-lg border border-border/50 bg-muted/20 text-xs space-y-1">
                  <p className="font-medium">Q{i+1}. {q.q}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-[10px]">Grade: {r?.grade || '?'}</Badge>
                    <Badge variant="outline" className="text-[10px]">{parseFloat(r?.score || '0').toFixed(1)}/{q.marks}</Badge>
                  </div>
                  {r?.feedback && <p className="text-muted-foreground">{r.feedback}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onRetry}>Naya Test</Button>
        <Button variant="gradient" className="flex-1" onClick={() => window.location.href = '/dashboard'}><CheckCircle2 className="w-4 h-4" />Dashboard</Button>
      </div>
    </motion.div>
  );
}
