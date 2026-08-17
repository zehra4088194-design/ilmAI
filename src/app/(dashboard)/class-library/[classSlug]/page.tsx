import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { getClassLibraryClassBySlug, getClassLibrarySubjects } from '@/lib/class-library/queries';
import { subjectIconFor } from '@/lib/university-hub/subject-icons';

export default async function ClassLibraryClassPage({ params }: { params: Promise<{ classSlug: string }> }) {
  const { classSlug } = await params;
  const klass = await getClassLibraryClassBySlug(classSlug);
  if (!klass) notFound();
  const subjects = await getClassLibrarySubjects(klass.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/class-library" className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline">
        <ArrowLeft className="h-4 w-4" /> Class Library
      </Link>
      <header>
        <h1 className="text-2xl font-bold">Syllabus of {klass.name}</h1>
      </header>

      {subjects.length === 0 ? (
        <EmptyState icon={BookOpen} title="No subjects yet" description="Your admin hasn't added subjects for this class yet." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {subjects.map((subject: any) => {
            const Icon = subjectIconFor(subject.name);
            return (
              <Link key={subject.id} href={`/class-library/${klass.slug}/${subject.id}`}>
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
