import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { LayoutDashboard, ClipboardList, CalendarClock, FileText, Bell, Library, Users, Sparkles, Search, Award, Presentation, Camera, BookOpen } from 'lucide-react';

const items = [
  ['Dashboard', '/school', LayoutDashboard], ['My Institution', '/school/student-hub', Users], ['Attendance', '/school#attendance', ClipboardList], ['Timetable', '/school#timetable', CalendarClock], ['Assignments', '/school/todays-homework', FileText], ['Exams & Results', '/school#results', FileText], ['Notices', '/school#notices', Bell], ['Institution Library', '/school/library', Library], ['Curriculum Books', '/school/curriculum', BookOpen], ['Institution AI', '/school/institution-ai', Sparkles], ['Certificates & Records', '/school/documents', Award], ['Search anything', '/search', Search],
] as const;

export default async function SchoolPortalLayout({ children }: { children: React.ReactNode }) {
  const { context } = await requireSchoolContext('dashboard.read');
  if (!context) return children;
  // Institution students must use the normal ilm AI student app. The school portal shell is only
  // for parents and institution staff/teachers; student-specific branding is handled by the
  // shared dashboard shell.
  if (context.membership.member_role === 'student') redirect('/dashboard');
  const studentNav = ['student','parent'].includes(context.membership.member_role);
  const teacherNav = ['owner','admin','coordinator','teacher'].includes(context.membership.member_role);
  return <div>
    <div className="border-border bg-card/70 sticky top-0 z-20 border-b backdrop-blur-xl"><div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
      <div className="mr-2 flex shrink-0 items-center gap-2 pr-2 text-xs font-bold">{context.organization.logo_url ? <img src={context.organization.logo_url} alt="" className="h-7 w-7 rounded-lg object-cover" /> : <span className="h-7 w-7 rounded-lg bg-violet-600" />}<span className="hidden sm:inline">{context.organization.name} · ilm AI</span></div>
      {studentNav && items.map(([label, href, Icon]) => <Link key={href} href={href} className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><Icon className="h-3.5 w-3.5" />{label}</Link>)}
      {teacherNav && <><Link href="/school/curriculum" className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><BookOpen className="h-3.5 w-3.5" />Curriculum Books</Link><Link href="/school/teacher-tools" className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><Presentation className="h-3.5 w-3.5" />Teacher AI Tools</Link><Link href="/school/photo-test" className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><Camera className="h-3.5 w-3.5" />Photo → Test</Link></>}
    </div></div>{children}
  </div>;
}
