import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { SharedTeacherTestClient } from '@/components/features/teacher/SharedTeacherTestClient';

export const metadata = { title: 'Assigned Test | ilm AI' };

export default async function SharedTeacherTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/teacher/shared-tests/${id}`)}`);

  const service = createServiceClient() as any;
  const { data: share } = await service
    .from('teacher_test_shares')
    .select('id, student_id, status, due_at, teacher_generated_tests(title, paper_snapshot)')
    .eq('id', id)
    .maybeSingle();
  if (!share || share.student_id !== user.id) notFound();
  const test = Array.isArray(share.teacher_generated_tests) ? share.teacher_generated_tests[0] : share.teacher_generated_tests;
  const snapshot = test?.paper_snapshot || {};
  const questions = [
    ...(snapshot.mcqs || []), ...(snapshot.shortQuestions || []), ...(snapshot.longQuestions || []),
    ...(snapshot.letterQuestions || []), ...(snapshot.vocabQuestions || []), ...(snapshot.grammarQuestions || []),
    ...(snapshot.numericalQuestions || []), ...(snapshot.extraQuestions || []),
  ];
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <SharedTeacherTestClient
        shareId={share.id}
        title={test?.title || 'Teacher Test'}
        questions={questions}
        dueAt={share.due_at || null}
        alreadyCompleted={share.status === 'completed'}
      />
    </main>
  );
}
