import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getUniversityProgramBySlug, getUniversityProgramYears } from '@/lib/university-hub/queries';

export default async function UniversityProgramPage({ params }: { params: Promise<{ programSlug: string }> }) {
  const { programSlug } = await params;
  const program = await getUniversityProgramBySlug(programSlug);
  if (!program) notFound();
  const years = await getUniversityProgramYears(program.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/university-hub" className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline">
        <ArrowLeft className="h-4 w-4" /> All programs
      </Link>
      <header>
        <h1 className="text-2xl font-bold">{program.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Choose your professional year.</p>
      </header>

      <div className="grid gap-3">
        {years.map((year: any) => (
          <Link key={year.id} href={`/university-hub/${program.slug}/${year.id}`}>
            <Card className="hover:border-primary/40 transition-colors">
              <CardContent className="flex items-center gap-3 p-4">
                <span className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <span className="font-semibold">
                  {program.name} - {year.label}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
