import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { UniversityMcqRunner } from '@/components/features/university-hub/UniversityMcqRunner';
import { getClassLibraryClassBySlug, getClassLibrarySubjectById, getClassLibraryQuestions } from '@/lib/class-library/queries';

export default async function ClassLibraryMcqPage({
  params,
}: {
  params: Promise<{ classSlug: string; subjectId: string }>;
}) {
  const { classSlug, subjectId } = await params;
  const klass = await getClassLibraryClassBySlug(classSlug);
  if (!klass) notFound();
  const subject = await getClassLibrarySubjectById(subjectId);
  if (!subject || subject.class_id !== klass.id) notFound();
  const questions = await getClassLibraryQuestions(subjectId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/class-library/${classSlug}/${subjectId}`}
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
