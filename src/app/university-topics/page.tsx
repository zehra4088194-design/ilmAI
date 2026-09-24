import type { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/service';

export const metadata: Metadata = {
  title: 'University Study Topics | ilm AI',
  description: 'Browse public university study topics by degree program, professional year, and subject on ilm AI.',
  alternates: { canonical: '/university-topics' },
};

export default async function UniversityTopicsIndexPage() {
  const db = createServiceClient();
  const [{ data: programs }, { data: years }, { data: links }] = await Promise.all([
    db.from('university_degree_programs').select('id,slug,name,stream,total_years').eq('is_active', true).order('sort_order').order('name'),
    db.from('university_program_years').select('id,program_id,label,year_number').order('sort_order').order('year_number'),
    db.from('university_program_year_subjects').select('program_year_id,subject:university_subjects!inner(id,name,is_active)').eq('subject.is_active', true).order('sort_order'),
  ]);

  const yearRows = years || [];
  const subjectLinks = links || [];
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-border/70 bg-card/70 p-6 sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary"><GraduationCap className="h-5 w-5" /> University study topics</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">University Notes, Questions & Resources</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
            Public topic pages for university subjects, with available notes, books, past papers, question banks, and indexed study material.
          </p>
        </header>

        <div className="mt-8 space-y-8">
          {(programs || []).map((program: any) => (
            <section key={program.id} className="rounded-3xl border border-border/70 bg-card/40 p-5 sm:p-7">
              <h2 className="text-2xl font-bold">{program.name}</h2>
              {program.stream && <p className="mt-1 text-sm text-muted-foreground">{program.stream}</p>}
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {yearRows.filter((year: any) => year.program_id === program.id).map((year: any) => {
                  const yearSubjects = subjectLinks
                    .filter((link: any) => link.program_year_id === year.id && link.subject)
                    .map((link: any) => link.subject);
                  return (
                    <div key={year.id} className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <h3 className="font-semibold">{program.name} — {year.label}</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {yearSubjects.map((subject: any) => (
                          <Link
                            key={subject.id}
                            href={`/university-topics/${program.slug}/${year.id}/${subject.id}`}
                            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:border-primary/40 hover:text-primary"
                          >
                            {subject.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
