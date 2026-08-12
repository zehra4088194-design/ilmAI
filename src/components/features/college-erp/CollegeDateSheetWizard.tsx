'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { createCollegeExamScheduleBatch } from '@/lib/college-erp/actions';

// Mirrors src/components/features/school-erp/DateSheetWizard.tsx, pointed at the college action.
type Section = { id: string; name: string; college_semesters?: { name: string } | { name: string }[] | null };
type Exam = { id: string; name: string };

type SlotDraft = {
  sectionId: string;
  subjectName: string;
  examDate: string;
  startsAt: string;
  endsAt: string;
  room: string;
  maxMarks: string;
  passingMarks: string;
};

const EMPTY_SLOT: SlotDraft = { sectionId: '', subjectName: '', examDate: '', startsAt: '', endsAt: '', room: '', maxMarks: '100', passingMarks: '40' };
const QUESTIONS = ['section', 'subject', 'date', 'time', 'room'] as const;
type Question = (typeof QUESTIONS)[number];

function sectionLabel(section: Section) {
  const semester = Array.isArray(section.college_semesters) ? section.college_semesters[0] : section.college_semesters;
  return `${semester?.name ? `${semester.name} - ` : ''}${section.name}`;
}

export function CollegeDateSheetWizard({ exams, sections }: { exams: Exam[]; sections: Section[] }) {
  const [examId, setExamId] = useState(String(exams[0]?.id || ''));
  const [stage, setStage] = useState<'asking' | 'confirm-another' | 'review'>('asking');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draft, setDraft] = useState<SlotDraft>(EMPTY_SLOT);
  const [entries, setEntries] = useState<SlotDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const question: Question = QUESTIONS[questionIndex]!;

  const canAdvance = (() => {
    switch (question) {
      case 'section': return Boolean(draft.sectionId);
      case 'subject': return draft.subjectName.trim().length > 0;
      case 'date': return /^\d{4}-\d{2}-\d{2}$/.test(draft.examDate);
      default: return true;
    }
  })();

  const next = () => {
    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      setEntries((current) => [...current, draft]);
      setDraft(EMPTY_SLOT);
      setQuestionIndex(0);
      setStage('confirm-another');
    }
  };
  const back = () => setQuestionIndex((i) => Math.max(0, i - 1));
  const addAnother = (yes: boolean) => setStage(yes ? 'asking' : 'review');
  const removeEntry = (index: number) => setEntries((current) => current.filter((_, i) => i !== index));

  const saveDateSheet = async () => {
    if (!examId || !entries.length) return;
    setSaving(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('exam_id', examId);
      form.append(
        'entries',
        JSON.stringify(
          entries.map((entry) => ({
            sectionId: entry.sectionId,
            subjectName: entry.subjectName,
            examDate: entry.examDate,
            startsAt: entry.startsAt || null,
            endsAt: entry.endsAt || null,
            room: entry.room || null,
            maxMarks: Number(entry.maxMarks) || 100,
            passingMarks: Number(entry.passingMarks) || 40,
          }))
        )
      );
      const state = await createCollegeExamScheduleBatch({ success: false, message: '' }, form);
      setResult(state.message);
      if (state.success) setEntries([]);
    } finally {
      setSaving(false);
    }
  };

  if (!exams.length) {
    return <p className="text-muted-foreground text-sm">Create an exam first, then build its date sheet here.</p>;
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-1 text-xs font-medium">
        Building the date sheet for
        <select value={examId} onChange={(event) => setExamId(event.target.value)} className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm">
          {exams.map((exam) => (<option key={exam.id} value={exam.id}>{exam.name}</option>))}
        </select>
      </label>

      {entries.length > 0 && (
        <div className="border-border space-y-1.5 rounded-lg border p-3">
          <p className="text-xs font-semibold">Added so far ({entries.length})</p>
          {entries.map((entry, index) => (
            <div key={`${entry.sectionId}-${entry.subjectName}-${index}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">
                {sections.find((s) => s.id === entry.sectionId) ? sectionLabel(sections.find((s) => s.id === entry.sectionId)!) : 'Section'} — {entry.subjectName} — {entry.examDate}
              </span>
              {stage === 'review' && (
                <button type="button" onClick={() => removeEntry(index)} className="text-destructive shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {stage === 'asking' && (
        <div className="border-border space-y-3 rounded-lg border p-4">
          <Badge variant="outline">Exam slot {entries.length + 1} — question {questionIndex + 1} of {QUESTIONS.length}</Badge>
          {question === 'section' && (
            <label className="block space-y-1 text-sm font-medium">
              Which section is this exam for?
              <select value={draft.sectionId} onChange={(event) => setDraft({ ...draft, sectionId: event.target.value })} className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm" autoFocus>
                <option value="">Select a section</option>
                {sections.map((section) => (<option key={section.id} value={section.id}>{sectionLabel(section)}</option>))}
              </select>
            </label>
          )}
          {question === 'subject' && (
            <label className="block space-y-1 text-sm font-medium">
              Which course?
              <Input value={draft.subjectName} onChange={(event) => setDraft({ ...draft, subjectName: event.target.value })} placeholder="Data Structures" autoFocus />
            </label>
          )}
          {question === 'date' && (
            <label className="block space-y-1 text-sm font-medium">
              Which date?
              <Input type="date" value={draft.examDate} onChange={(event) => setDraft({ ...draft, examDate: event.target.value })} autoFocus />
            </label>
          )}
          {question === 'time' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 text-sm font-medium">Start time (optional)<Input type="time" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></label>
              <label className="block space-y-1 text-sm font-medium">End time (optional)<Input type="time" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} /></label>
            </div>
          )}
          {question === 'room' && (
            <label className="block space-y-1 text-sm font-medium">
              Room / invigilator (optional)
              <Input value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} placeholder="Room 204 — Dr. Khan" />
            </label>
          )}
          <div className="flex items-center justify-between pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={back} disabled={questionIndex === 0}><ArrowLeft className="h-3.5 w-3.5" />Back</Button>
            <Button type="button" size="sm" onClick={next} disabled={!canAdvance}>
              {questionIndex < QUESTIONS.length - 1 ? 'Next' : 'Add this exam'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {stage === 'confirm-another' && (
        <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Add another exam to this date sheet?</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => addAnother(true)}><Plus className="h-3.5 w-3.5" />Yes, add another</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addAnother(false)}>No, I&apos;m done</Button>
          </div>
        </div>
      )}

      {stage === 'review' && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={saveDateSheet} disabled={saving || !entries.length}>
            {saving ? 'Saving...' : (<><CheckCircle2 className="h-4 w-4" />Save date sheet ({entries.length} exam{entries.length === 1 ? '' : 's'})</>)}
          </Button>
          <Button type="button" variant="outline" onClick={() => setStage('confirm-another')}><Calendar className="h-4 w-4" />Add more</Button>
          {result && <span className="text-muted-foreground text-xs">{result}</span>}
        </div>
      )}
    </div>
  );
}
