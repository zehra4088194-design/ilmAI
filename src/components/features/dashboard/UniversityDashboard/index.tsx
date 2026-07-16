import Link from 'next/link';
import { ArrowRight, CalendarDays, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { UNIVERSITY_FEATURES, UNIVERSITY_TOOLS } from '@/lib/constants/university';

type Props = {
  profile: {
    full_name?: string | null;
    university_program?: string | null;
    university_semester?: string | null;
    university_courses?: string[] | null;
    university_exam_target_date?: string | null;
    preferred_output_style?: string | null;
    sponsored_institution_name?: string | null;
  } | null;
};

export function UniversityDashboard({ profile }: Props) {
  const courses = profile?.university_courses || [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="via-background overflow-hidden rounded-2xl border bg-gradient-to-br from-violet-500/15 to-cyan-500/10 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
              <GraduationCap className="h-3.5 w-3.5" />
              University Mode
            </div>
            <h1 className="text-3xl font-bold">Welcome back, {profile?.full_name || 'Student'}</h1>
            {profile?.sponsored_institution_name && (
              <p className="text-primary mt-1 text-sm font-medium">Welcome from {profile.sponsored_institution_name}</p>
            )}
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-6">
              Essays, assignments, presentations, viva prep, project reports and semester planning are ready for your
              university workflow.
            </p>
          </div>
          <div className="bg-card/80 grid gap-2 rounded-xl border p-4 text-sm shadow-sm backdrop-blur sm:min-w-80">
            <p>
              <span className="text-muted-foreground">Program:</span>{' '}
              <strong>{profile?.university_program || 'Set in Settings'}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Semester:</span>{' '}
              <strong>{profile?.university_semester || 'Set in Settings'}</strong>
            </p>
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-violet-400" />{' '}
              {profile?.university_exam_target_date || 'No exam target set'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {UNIVERSITY_TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group h-full">
            <Card className="border-border/70 bg-card/90 h-full transition-all hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-lg">
              <CardContent className="flex h-full flex-col p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                  <tool.icon className="h-5 w-5" />
                </div>
                <h2 className="font-semibold">{tool.label}</h2>
                <p className="text-muted-foreground mt-2 flex-1 text-sm leading-6">{tool.description}</p>
                <div className="mt-4 flex items-center justify-between text-sm font-semibold text-violet-300">
                  <span>Open tool</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Your Courses</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <span key={course} className="bg-muted/30 rounded-full border px-3 py-1 text-sm">
                    {course}
                  </span>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  Courses Settings me add karo taake prompts aur plans zyada personal ho jayen.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold">Study Draft Reminder</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Use AI output as a study draft. Review, personalize, verify facts, and add real references before
              submission.
            </p>
            <p className="text-muted-foreground mt-3 text-xs">
              Preferred style: {profile?.preferred_output_style || 'simple'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {UNIVERSITY_FEATURES.map((feature) => (
          <div
            key={feature.label}
            className="bg-card/80 flex items-center gap-3 rounded-xl border p-4 text-sm font-medium"
          >
            <feature.icon className="h-4 w-4 text-violet-400" />
            {feature.label}
          </div>
        ))}
      </div>
    </div>
  );
}
