import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Banknote,
  BookOpen,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  IdCard,
  School,
  Settings2,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolAcademicSetup, getSchoolOverview } from '@/lib/school-erp/queries';
import { cn } from '@/lib/utils/cn';

const quickActions = [
  {
    title: 'Register student',
    description: 'Create student identity, guardian links, enrollment and app access.',
    href: '/school-admin/people',
    icon: GraduationCap,
  },
  {
    title: 'Add staff member',
    description: 'Add teacher, accountant, admissions or administrative staff.',
    href: '/school-admin/people',
    icon: IdCard,
  },
  {
    title: 'Create class',
    description: 'Set class code, level, session, fee and section capacity.',
    href: '/school-admin/settings',
    icon: BookOpen,
  },
  {
    title: 'Generate fee',
    description: 'Prepare monthly vouchers and follow up unpaid challans.',
    href: '/school-admin/fees',
    icon: Banknote,
  },
];

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default async function SchoolLaunchpadPage() {
  const { supabase, context } = await requireSchoolContext('dashboard.read');
  if (!context) redirect('/dashboard');

  const [overview, setup] = await Promise.all([
    getSchoolOverview(supabase, context),
    getSchoolAcademicSetup(supabase, context),
  ]);

  const currentYear = setup.years.find((year: any) => year.is_current) || setup.years[0];
  const mainCampus = setup.campuses.find((campus: any) => campus.is_main) || setup.campuses[0];
  const setupItems = [
    {
      title: 'School profile',
      description: mainCampus ? `${mainCampus.name} campus is ready` : 'Add the main campus and school identity',
      done: Boolean(mainCampus),
      href: '/school-admin/settings',
    },
    {
      title: 'Academic session',
      description: currentYear ? `${currentYear.name} is configured` : 'Create the first school year',
      done: Boolean(currentYear),
      href: '/school-admin/settings',
    },
    {
      title: 'Classes and sections',
      description: `${setup.classes.length} classes and ${setup.sections.length} sections`,
      done: setup.classes.length > 0 && setup.sections.length > 0,
      href: '/school-admin/settings',
    },
    {
      title: 'Subjects and teachers',
      description: `${setup.offerings.length} subject offerings assigned`,
      done: setup.offerings.length > 0,
      href: '/school-admin/academics',
    },
    {
      title: 'People and admissions',
      description: `${overview.counts.students} students and ${overview.counts.staff} staff active`,
      done: overview.counts.students > 0 || overview.counts.staff > 0,
      href: '/school-admin/people',
    },
  ];
  const completed = setupItems.filter((item) => item.done).length;
  const attendanceRate = overview.counts.students
    ? Math.max(0, Math.round(((overview.counts.students - overview.counts.absentToday) / overview.counts.students) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="School launchpad"
        description="A simple setup and daily operations dashboard for school admins."
        action={<Badge variant="outline">{completed} of {setupItems.length} ready</Badge>}
      />

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-border border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.22em]">Step {Math.min(completed + 1, setupItems.length)} of {setupItems.length}</p>
                <CardTitle className="mt-2 text-2xl">Setup checklist</CardTitle>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Sparkles className="h-5 w-5" />
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {setupItems.map((item, index) => (
              <Link
                key={item.title}
                href={item.href}
                className="border-border hover:bg-muted/50 flex items-center gap-4 border-b p-4 transition-colors last:border-0"
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold',
                    item.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border text-muted-foreground',
                  )}
                >
                  {item.done ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{item.title}</span>
                  <span className="text-muted-foreground block text-sm">{item.description}</span>
                </span>
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-700">
                <School className="h-5 w-5" />
              </span>
              <p className="mt-5 text-4xl font-bold">{overview.counts.students}</p>
              <p className="text-muted-foreground text-sm">Active students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
                <UsersRound className="h-5 w-5" />
              </span>
              <p className="mt-5 text-4xl font-bold">{overview.counts.staff}</p>
              <p className="text-muted-foreground text-sm">Staff members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700">
                <BookOpen className="h-5 w-5" />
              </span>
              <p className="mt-5 text-4xl font-bold">{setup.classes.length}</p>
              <p className="text-muted-foreground text-sm">Classes in {currentYear?.name || 'session'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-700">
                <ClipboardList className="h-5 w-5" />
              </span>
              <p className="mt-5 text-4xl font-bold">{attendanceRate}%</p>
              <p className="text-muted-foreground text-sm">Attendance rate today</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick operations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="border-border hover:bg-muted/50 flex min-h-32 flex-col justify-between rounded-lg border p-4 transition-colors"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950">
                  <action.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="mt-4 block font-semibold">{action.title}</span>
                  <span className="text-muted-foreground mt-1 block text-sm">{action.description}</span>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">School profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.18em]">Campus</p>
              <p className="mt-2 text-lg font-semibold">{mainCampus?.name || context.organization.name}</p>
              <p className="text-muted-foreground text-sm">{mainCampus?.city || 'City not set'}{mainCampus?.country ? `, ${mainCampus.country}` : ''}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <CalendarClock className="text-muted-foreground h-4 w-4" />
                <p className="mt-3 font-semibold">{currentYear?.name || 'No session'}</p>
                <p className="text-muted-foreground text-xs">{formatDate(currentYear?.starts_on)} to {formatDate(currentYear?.ends_on)}</p>
              </div>
              <Link href="/school-admin/settings" className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                <Settings2 className="text-muted-foreground h-4 w-4" />
                <p className="mt-3 font-semibold">Schedule settings</p>
                <p className="text-muted-foreground text-xs">Timezone, periods, working days and sections</p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
