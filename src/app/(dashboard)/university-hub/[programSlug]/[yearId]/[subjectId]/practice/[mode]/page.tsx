import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { UniversitySubjectivePractice } from '@/components/features/university-hub/UniversitySubjectivePractice';
import { getUniversityProgramBySlug, getUniversitySubjectById } from '@/lib/university-hub/queries';

export default async function UniversitySubjectivePracticePage({
  params,
}: {
  params: Promise<{ programSlug: string; yearId: string; subjectId: string; mode: string }>;
}) {
  const { programSlug, yearId, subjectId, mode } = await params;
  if (mode !== 'short' && mode !== 'long') notFound();
  const program = await getUniversityProgramBySlug(programSlug);
  if (!program) notFound();
  const subject = await getUniversitySubjectById(subjectId);
  if (!subject || subject.program_year_id !== yearId) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/university-hub/${programSlug}/${yearId}/${subjectId}`}
        className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> {subject.name}
      </Link>
      <header>
        <h1 className="text-2xl font-bold">
          {subject.name} - {mode === 'short' ? 'Short Questions' : 'Long Questions'}
        </h1>
      </header>
      <UniversitySubjectivePractice subjectName={subject.name} programName={program.name} mode={mode} />
    </div>
  );
}
