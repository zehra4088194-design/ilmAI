import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UniversityActionForm } from '@/components/features/university-hub/UniversityActionForm';
import { ResourceCoverageBadges } from '@/components/features/admin/content/ResourceCoverageBadges';
import { getUniversityAdminTree, getUniversityAdminStats } from '@/lib/university-hub/queries';
import { UNIVERSITY_RESOURCE_TYPES } from '@/lib/university-hub/types';
import { createUniversityProgram, createUniversitySubject, deleteUniversitySubject } from '@/lib/university-hub/admin-actions';

export const metadata = { title: 'University Hub | Admin | ilm AI' };

export default async function AdminUniversityPage() {
  const [programs, stats] = await Promise.all([getUniversityAdminTree(), getUniversityAdminStats()]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">University Hub</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Platform-wide degree programs, years, and subjects — dynamic: add a program here and it shows up for every
          university student immediately, no deploy needed. Subjects are a shared pool: typing the same subject name
          under a different program/year links it to the one already there instead of creating a duplicate, so its
          notes and MCQs are already there for the second program too.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create degree program</CardTitle>
        </CardHeader>
        <CardContent>
          <UniversityActionForm
            action={createUniversityProgram}
            submitLabel="Create program"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          >
            <Input name="name" placeholder="Program name (e.g. Pharm-D)" required />
            <Input name="stream" placeholder="Stream (e.g. Medical) — optional" />
            <Input name="total_years" type="number" min={1} max={8} defaultValue={4} placeholder="Total years" />
          </UniversityActionForm>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {programs.map((program: any) => (
          <Card key={program.id}>
            <CardContent className="space-y-4 p-4">
              <div>
                <h2 className="font-semibold">{program.name}</h2>
                <p className="text-muted-foreground text-xs">
                  /{program.slug} {program.stream ? `- ${program.stream}` : ''} - {program.total_years} year(s)
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {program.years.map((year: any) => (
                  <div key={year.id} className="border-border rounded-xl border p-3">
                    <p className="mb-2 text-sm font-semibold">{year.label}</p>
                    <div className="space-y-1.5">
                      {year.subjects.map((subject: any) => (
                        <div key={subject.id} className="border-border/60 space-y-1 border-b pb-1.5 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href={`/admin/university/subjects/${subject.id}`}
                              className="text-primary truncate text-xs font-medium hover:underline"
                            >
                              {subject.name}
                            </Link>
                            <UniversityActionForm action={deleteUniversitySubject} submitLabel="Remove" className="shrink-0">
                              <input type="hidden" name="subject_id" value={subject.id} />
                              <input type="hidden" name="program_year_id" value={year.id} />
                            </UniversityActionForm>
                          </div>
                          <ResourceCoverageBadges
                            resourceTypes={UNIVERSITY_RESOURCE_TYPES}
                            resourceCounts={stats[subject.id]?.resourceCounts}
                            questionCount={stats[subject.id]?.questionCount}
                          />
                        </div>
                      ))}
                      {year.subjects.length === 0 && (
                        <p className="text-muted-foreground text-xs">No subjects yet.</p>
                      )}
                    </div>
                    <UniversityActionForm action={createUniversitySubject} submitLabel="Add subject" className="mt-3 flex gap-2">
                      <input type="hidden" name="program_year_id" value={year.id} />
                      <Input
                        name="name"
                        placeholder="Subject name (reuses it if it already exists elsewhere)"
                        required
                        className="h-9 text-sm"
                      />
                    </UniversityActionForm>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {programs.length === 0 && (
          <p className="text-muted-foreground text-sm">No degree programs yet — create one above to get started.</p>
        )}
      </div>
    </div>
  );
}
