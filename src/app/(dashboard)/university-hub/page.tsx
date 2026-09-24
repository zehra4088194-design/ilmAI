import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { getUniversityPrograms } from '@/lib/university-hub/queries';

export const metadata = { title: 'University Hub | ilm AI' };

export default async function UniversityHubPage() {
  const programs = await getUniversityPrograms();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">University Hub</h1>
        <p className="text-muted-foreground mt-1 text-sm">Pick your degree program to see year-wise subjects and resources.</p>
      </header>

      {programs.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No degree programs yet"
          description="Ask your admin to add your program in University Hub — it'll show up here immediately."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {programs.map((program: any) => (
            <Link key={program.id} href={`/university-hub/${program.slug}`}>
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="flex items-center gap-3 p-5">
                  <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{program.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {program.stream ? `${program.stream} - ` : ''}
                      {program.total_years} year(s)
                    </span>
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
