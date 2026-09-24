import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UniversityActionForm } from '@/components/features/university-hub/UniversityActionForm';
import { UniversityResourceUrlField } from '@/components/features/university-hub/UniversityResourceUrlField';
import { UNIVERSITY_RESOURCE_TYPES } from '@/lib/university-hub/types';
import {
  getUniversitySubjectById,
  getUniversitySubjectResources,
  getUniversityQuestions,
  resolveUniversityResourceUrl,
} from '@/lib/university-hub/queries';
import {
  createUniversityResource,
  deleteUniversityResource,
  createUniversityQuestion,
  deleteUniversityQuestion,
} from '@/lib/university-hub/admin-actions';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function AdminUniversitySubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const subject = await getUniversitySubjectById(subjectId);
  if (!subject) notFound();

  const [rawResources, questions] = await Promise.all([
    getUniversitySubjectResources(subjectId),
    getUniversityQuestions(subjectId),
  ]);
  // Resolve r2:// upload URIs (ilmai-uni-bucket included) to a signed HTTPS URL the "open" link
  // below can actually load — see resolveUniversityResourceUrl. External links pass through as-is.
  const resources = await Promise.all(
    rawResources.map(async (resource: any) => ({ ...resource, openUrl: await resolveUniversityResourceUrl(resource.url) }))
  );

  return (
    <div className="space-y-6">
      <Link href="/admin/university" className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to University Hub
      </Link>
      <header>
        <h1 className="text-2xl font-bold">{subject.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Resources and MCQ bank for this subject.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add resource link</CardTitle>
        </CardHeader>
        <CardContent>
          <UniversityActionForm
            action={createUniversityResource}
            submitLabel="Add resource"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <input type="hidden" name="subject_id" value={subjectId} />
            <select name="resource_type" className={selectClass} required>
              {UNIVERSITY_RESOURCE_TYPES.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
            <Input name="title" placeholder="Title (e.g. Chapter 1 - Alkanes.pdf)" required />
            <UniversityResourceUrlField />
          </UniversityActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resources ({resources.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {UNIVERSITY_RESOURCE_TYPES.map((type) => {
            const items = resources.filter((resource: any) => resource.resource_type === type.key);
            if (!items.length) return null;
            return (
              <div key={type.key}>
                <p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">{type.label}</p>
                <div className="space-y-1">
                  {items.map((resource: any) => (
                    <div key={resource.id} className="border-border flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                      <span className="truncate">
                        {resource.title}
                        {resource.openUrl && (
                          <a href={resource.openUrl} target="_blank" rel="noreferrer" className="text-primary ml-2 text-xs underline">
                            open
                          </a>
                        )}
                      </span>
                      <UniversityActionForm action={deleteUniversityResource} submitLabel="Remove" className="shrink-0">
                        <input type="hidden" name="resource_id" value={resource.id} />
                      </UniversityActionForm>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {resources.length === 0 && <p className="text-muted-foreground text-sm">No resources yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add MCQ</CardTitle>
        </CardHeader>
        <CardContent>
          <UniversityActionForm action={createUniversityQuestion} submitLabel="Add question" className="grid gap-3">
            <input type="hidden" name="subject_id" value={subjectId} />
            <Input name="text" placeholder="Question text" required />
            <div className="grid gap-3 md:grid-cols-2">
              <Input name="option_a" placeholder="Option A" required />
              <Input name="option_b" placeholder="Option B" required />
              <Input name="option_c" placeholder="Option C (optional)" />
              <Input name="option_d" placeholder="Option D (optional)" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select name="correct_answer" className={selectClass} required defaultValue="">
                <option value="" disabled>
                  Correct option
                </option>
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>
              <select name="difficulty" className={selectClass} defaultValue="MEDIUM">
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <Input name="explanation" placeholder="Explanation (optional)" />
          </UniversityActionForm>
          <p className="text-muted-foreground mt-3 text-xs">
            For bulk import, insert rows directly into <code>university_questions</code> via Supabase — same shape:
            <code> text, options (jsonb array of {'{'}id, text{'}'}), correct_answer, explanation, difficulty, marks</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">MCQ bank ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {questions.map((question: any) => (
            <div key={question.id} className="border-border rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{question.text}</p>
                <UniversityActionForm action={deleteUniversityQuestion} submitLabel="Remove" className="shrink-0">
                  <input type="hidden" name="question_id" value={question.id} />
                </UniversityActionForm>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Correct: {String(question.correct_answer).toUpperCase()} - {question.difficulty}
              </p>
            </div>
          ))}
          {questions.length === 0 && <p className="text-muted-foreground text-sm">No questions yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
