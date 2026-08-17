import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { getUniversityProgramBySlug, getUniversityProgramYears, getUniversitySubjects } from '@/lib/university-hub/queries';
import { subjectIconFor } from '@/lib/university-hub/subject-icons';

export default async function UniversityYearPage({
  params,
}: {
  params: Promise<{ programSlug: string; yearId: string }>;
}) {
  const { programSlug, yearId } = await params;
  const program = await getUniversityProgramBySlug(programSlug);
  if (!program) notFound();
  const years = await getUniversityProgramYears(program.id);
  const year = years.find((item: any) => item.id === yearId);
  if (!year) notFound();
  const subjects = await getUniversitySubjects(yearId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/university-hub/${program.slug}`} className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline">
        <ArrowLeft className="h-4 w-4" /> {program.name}
      </Link>
      <header>
        <h1 className="text-2xl font-bold">
          Syllabus of {program.name} {year.label}
        </h1>
      </header>

      {subjects.length === 0 ? (
        <EmptyState icon={BookOpen} title="No subjects yet" description="Your admin hasn't added subjects for this year yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.map((subject: any) => {
            const Icon = subjectIconFor(subject.name);
            return (
              <Link key={subject.id} href={`/university-hub/${program.slug}/${yearId}/${subject.id}`}>
                <Card className="hover:border-primary/40 h-full transition-colors">
                  <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
                    <span className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="text-sm font-bold tracking-wide uppercase">{subject.name}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
