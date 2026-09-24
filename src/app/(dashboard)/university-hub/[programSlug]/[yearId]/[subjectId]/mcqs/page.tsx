import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { UniversityMcqRunner } from '@/components/features/university-hub/UniversityMcqRunner';
import { getUniversitySubjectById, getUniversityQuestions } from '@/lib/university-hub/queries';

export default async function UniversityMcqPage({
  params,
}: {
  params: Promise<{ programSlug: string; yearId: string; subjectId: string }>;
}) {
  const { programSlug, yearId, subjectId } = await params;
  const subject = await getUniversitySubjectById(subjectId, yearId);
  if (!subject) notFound();
  const questions = await getUniversityQuestions(subjectId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/university-hub/${programSlug}/${yearId}/${subjectId}`}
        className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> {subject.name}
      </Link>
      <header>
        <h1 className="text-2xl font-bold">{subject.name} - MCQ's</h1>
      </header>
      <UniversityMcqRunner questions={questions as any} subjectName={subject.name} />
    </div>
  );
}
