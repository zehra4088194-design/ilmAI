'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2, CircleAlert, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createInstitutionCompetition, INITIAL_COMPETITION_ACTION_STATE } from '@/lib/competitions/actions';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export function CreateInstitutionCompetitionForm({
  competitionType,
  formOptions,
}: {
  competitionType: 'class_vs_class' | 'school_vs_school';
  formOptions: { subjects: any[]; chaptersBySubject: Record<string, any[]>; sections: any[] };
}) {
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [state, formAction, pending] = useActionState(createInstitutionCompetition, INITIAL_COMPETITION_ACTION_STATE);
  const chapters = subjectId ? formOptions.chaptersBySubject[subjectId] || [] : [];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="border-border hover:border-violet-500/40 mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <Plus className="h-4 w-4" />
        {competitionType === 'class_vs_class' ? 'Start a Class vs Class challenge' : 'Start a School vs School challenge'}
      </button>
    );
  }

  return (
    <form action={formAction} className="border-border bg-card mb-4 space-y-3 rounded-xl border p-4">
      <input type="hidden" name="competition_type" value={competitionType} />
      <input type="text" name="title" placeholder="Competition title" required className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm" />

      <div className="grid gap-3 sm:grid-cols-2">
        <select name="subject_id" className={selectClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
          <option value="">Subject</option>
          {formOptions.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="chapter_id" className={selectClass} required disabled={!subjectId}>
          <option value="">Chapter</option>
          {chapters.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {competitionType === 'class_vs_class' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="section_a_id" className={selectClass} required>
            <option value="">Section A</option>
            {formOptions.sections.map((s: any) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select name="section_b_id" className={selectClass} required>
            <option value="">Section B</option>
            {formOptions.sections.map((s: any) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-muted-foreground text-xs">Duration (hours)</label>
        <input type="number" name="duration_hours" defaultValue={24} min={1} max={72} className="border-input bg-background h-9 w-24 rounded-lg border px-2 text-sm" />
      </div>

      {state.message && (
        <p className={`flex items-center gap-2 text-xs ${state.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
          {state.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Creating...' : 'Create competition'}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
