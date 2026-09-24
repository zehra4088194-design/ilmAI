import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { draftAiSubmissionFeedback, gradeSubmission } from '../../../../../actions';

export const metadata: Metadata = { title: 'Grade Assignment' };

export default async function GradeAssignmentPage({ params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const supabase = await createClient();
  const db = supabase as any;
  const [{ data: assignment }, { data: submissions }] = await Promise.all([
    db.from('class_assignments').select('title, max_marks').eq('id', assignmentId).single(),
    db.from('assignment_submissions').select('*, profiles(full_name)').eq('assignment_id', assignmentId).order('submitted_at'),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-sm text-violet-400">{assignment?.title}</p>
        <h1 className="text-2xl font-bold">Grading queue</h1>
      </div>
      {(submissions || []).map((submission: any) => (
        <div key={submission.id} className="glass space-y-4 rounded-xl p-4">
          <div>
            <p className="font-semibold">{submission.profiles?.full_name}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{submission.submission_text || submission.submission_url || 'No text submitted'}</p>
          </div>
          {submission.ai_feedback && (
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
              <p className="mb-1 text-xs font-semibold uppercase text-violet-400">AI draft, review before saving</p>
              <p className="text-sm">{submission.ai_feedback}</p>
            </div>
          )}
          <form action={draftAiSubmissionFeedback}>
            <input type="hidden" name="class_id" value={id} />
            <input type="hidden" name="assignment_id" value={assignmentId} />
            <input type="hidden" name="submission_id" value={submission.id} />
            <input type="hidden" name="assignment_title" value={assignment?.title || ''} />
            <input type="hidden" name="submission_text" value={submission.submission_text || ''} />
            <Button size="sm" variant="outline">Get AI feedback suggestion</Button>
          </form>
          <form action={gradeSubmission} className="grid gap-3">
            <input type="hidden" name="class_id" value={id} />
            <input type="hidden" name="submission_id" value={submission.id} />
            <Input name="marks_awarded" type="number" step="0.5" max={assignment?.max_marks || undefined} defaultValue={submission.marks_awarded || ''} placeholder="Marks" />
            <Textarea name="feedback" defaultValue={submission.feedback || submission.ai_feedback || ''} placeholder="Teacher feedback" />
            <Button size="sm" variant="gradient">Save grade</Button>
          </form>
        </div>
      ))}
      {!submissions?.length && <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No submissions yet.</p>}
    </div>
  );
}
