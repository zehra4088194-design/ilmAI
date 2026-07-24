'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { FileDown, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Subject = { id: string; name: string };
type Chapter = { id: string; subject_id: string; name: string };
type Question = { q: string; marks: number; keyPoints: string[]; modelAnswer: string; guide?: string };
type Mcq = { q: string; opts: string[]; correct: number; exp: string };
type Paper = {
  subject: Subject;
  chapter: { id: string; name: string };
  institutionName: string;
  title: string;
  timeAllowed: number;
  totalMarks: number;
  includeAnswerKey: boolean;
  paperTheme: 'light' | 'dark';
  mcqs: Mcq[];
  shortQuestions: Question[];
  longQuestions: Question[];
  sourceCount: number;
};

export function TeacherTestStudio({ subjects, chapters }: { subjects: Subject[]; chapters: Chapter[] }) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
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
  const [paperTheme, setPaperTheme] = useState<'light' | 'dark'>('light');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [loading, setLoading] = useState(false);
  const [paper, setPaper] = useState<Paper | null>(null);

  async function generate() {
    if (!subjectId || !chapterId) {
      toast.error('Select a subject and chapter.');
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
          institutionName,
          title,
          mcqCount,
          shortCount,
          longCount,
          timeAllowed,
          paperTheme,
          includeAnswerKey,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'The test could not be generated.');
      setPaper(json.data);
      toast.success('A new random paper is ready.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The test could not be generated.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="print:hidden">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-2">
          <Field label="Institution name">
            <Input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} placeholder="School, college, or academy" />
          </Field>
          <Field label="Paper title">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Subject">
            <select
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setChapterId('');
              }}
            >
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </Field>
          <Field label="Chapter">
            <select
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              value={chapterId}
              onChange={(event) => setChapterId(event.target.value)}
            >
              <option value="">Select chapter</option>
              {filteredChapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-2">
            <NumberField label="MCQs" value={mcqCount} max={30} onChange={setMcqCount} />
            <NumberField label="Short" value={shortCount} max={15} onChange={setShortCount} />
            <NumberField label="Long" value={longCount} max={8} onChange={setLongCount} />
            <NumberField label="Minutes" value={timeAllowed} max={240} onChange={setTimeAllowed} />
          </div>
          <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeAnswerKey} onChange={(event) => setIncludeAnswerKey(event.target.checked)} />
              Include answer key
            </label>
            <label className="flex items-center gap-2 text-sm">
              Paper background
              <select className="rounded-md border border-input bg-card px-2 py-1" value={paperTheme} onChange={(event) => setPaperTheme(event.target.value as 'light' | 'dark')}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <Button variant="gradient" className="ml-auto" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : paper ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {paper ? 'Generate another random paper' : 'Generate test'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {paper && (
        <>
          <div className="flex items-center justify-between gap-3 print:hidden">
            <p className="text-sm text-muted-foreground">Built from {paper.sourceCount} uploaded chapter source file{paper.sourceCount === 1 ? '' : 's'}.</p>
            <Button onClick={() => window.print()}><FileDown className="h-4 w-4" />Print / Save PDF</Button>
          </div>
          <TestPaper paper={paper} />
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function NumberField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  return <Field label={label}><Input type="number" min={0} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></Field>;
}

function TestPaper({ paper }: { paper: Paper }) {
  const dark = paper.paperTheme === 'dark';
  return (
    <article
      id="teacher-test-paper"
      className={`relative mx-auto min-h-[1120px] max-w-[794px] overflow-hidden rounded-lg border bg-cover bg-top p-8 shadow-2xl print:min-h-0 print:max-w-none print:rounded-none print:border-0 print:shadow-none sm:p-12 ${dark ? 'text-slate-100' : 'text-slate-950'}`}
      style={{ backgroundImage: `url(/test-paper/bg-${paper.paperTheme}.webp)` }}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]">
        <Image src="/icons/icon-512.png" alt="" width={360} height={360} />
      </div>
      <div className="relative z-10">
        <header className="border-b-2 border-[#d9a441] pb-5 text-center">
          <div className="flex items-center justify-center gap-3">
            <Image src="/icons/icon-192.png" alt="Ilm AI" width={46} height={46} />
            <h1 className="text-3xl font-black tracking-tight">Ilm AI</h1>
          </div>
          {paper.institutionName && <p className="mt-2 text-base font-bold uppercase tracking-[0.12em]">{paper.institutionName}</p>}
          <h2 className="mt-3 text-xl font-extrabold text-[#d9a441]">{paper.title}</h2>
          <p className="mt-1 text-sm">{paper.subject.name} | {paper.chapter.name}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-left text-xs font-semibold">
            <span>Name: __________________</span>
            <span>Time: {paper.timeAllowed} minutes</span>
            <span className="text-right">Marks: {paper.totalMarks}</span>
          </div>
        </header>

        {paper.mcqs.length > 0 && <QuestionSection title="Section A - Multiple Choice Questions">
          {paper.mcqs.map((question, index) => (
            <div key={`${question.q}-${index}`} className="mb-4 break-inside-avoid text-sm">
              <p className="font-semibold">{index + 1}. {question.q}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1 pl-3">
                {question.opts.map((option, optionIndex) => <span key={option}>{String.fromCharCode(65 + optionIndex)}. {option}</span>)}
              </div>
            </div>
          ))}
        </QuestionSection>}

        {paper.shortQuestions.length > 0 && <QuestionSection title="Section B - Short Questions">
          {paper.shortQuestions.map((question, index) => <p key={`${question.q}-${index}`} className="mb-4 break-inside-avoid text-sm font-semibold">{index + 1}. {question.q} <span className="float-right">[{question.marks}]</span></p>)}
        </QuestionSection>}

        {paper.longQuestions.length > 0 && <QuestionSection title="Section C - Long Questions">
          {paper.longQuestions.map((question, index) => <p key={`${question.q}-${index}`} className="mb-6 break-inside-avoid text-sm font-semibold">{index + 1}. {question.q} <span className="float-right">[{question.marks}]</span></p>)}
        </QuestionSection>}

        {paper.includeAnswerKey && <section className="mt-10 break-before-page">
          <h2 className="border-b-2 border-[#d9a441] pb-2 text-xl font-black">Teacher Answer Key</h2>
          {paper.mcqs.length > 0 && <p className="mt-4 text-sm"><strong>MCQs:</strong> {paper.mcqs.map((question, index) => `${index + 1}-${String.fromCharCode(65 + question.correct)}`).join(', ')}</p>}
          {[...paper.shortQuestions, ...paper.longQuestions].map((question, index) => (
            <div key={`${question.q}-${index}`} className="mt-5 break-inside-avoid text-sm">
              <p className="font-bold">{index + 1}. {question.q}</p>
              <p className="mt-1 leading-6">{question.modelAnswer || question.keyPoints.join(' ') || 'Use the uploaded chapter source for marking.'}</p>
            </div>
          ))}
        </section>}
        <footer className="mt-10 flex justify-between border-t border-[#d9a441]/70 pt-3 text-[10px] font-semibold">
          <span>www.ilmai.study</span><span>ilmai.study1@gmail.com</span>
        </footer>
      </div>
      <style jsx global>{`
        @page { size: A4; margin: 0; }
        @media print {
          body * { visibility: hidden !important; }
          #teacher-test-paper, #teacher-test-paper * { visibility: visible !important; }
          #teacher-test-paper { position: absolute; inset: 0; width: 210mm; min-height: 297mm; padding: 14mm; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </article>
  );
}

function QuestionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-7"><h2 className="mb-4 border-b border-[#d9a441]/70 pb-2 text-lg font-black">{title}</h2>{children}</section>;
}
