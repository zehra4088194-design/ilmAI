import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipboardList, CalendarClock, FileText, Bell, Library, Users, LayoutDashboard, Sparkles, Search, Award, Presentation, Camera, BookOpen } from 'lucide-react';
import { requireCollegeContext } from '@/lib/college-erp/access';

const items = [
  ['Dashboard', '/college', LayoutDashboard], ['My Institution', '/college/student-hub', Users], ['Attendance', '/college#attendance', ClipboardList], ['Timetable', '/college#timetable', CalendarClock], ['Assignments', '/college#assignments', FileText], ['Exams & Results', '/college#results', FileText], ['Notices', '/college#notices', Bell], ['Institution Library', '/college/library', Library], ['Curriculum Books', '/college/curriculum', BookOpen], ['Institution AI', '/college/institution-ai', Sparkles], ['Certificates & Records', '/college/documents', Award], ['Search anything', '/search', Search],
] as const;

export default async function CollegePortalLayout({ children }: { children: React.ReactNode }) {
  const { context } = await requireCollegeContext('dashboard.read');
  if (!context) return children;
  // Institution students must use the normal ilm AI student app. The college portal shell is only
  // for parents and institution staff/teachers; student-specific branding is handled by the
  // shared dashboard shell.
  if (context.membership.member_role === 'student') redirect('/dashboard');
  const studentNav = ['student','parent'].includes(context.membership.member_role);
  const teacherNav = ['owner','admin','coordinator','teacher'].includes(context.membership.member_role);
  return <div>
    <div className="border-border bg-card/70 sticky top-0 z-20 border-b backdrop-blur-xl"><div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
      <div className="mr-2 flex shrink-0 items-center gap-2 pr-2 text-xs font-bold">{context.organization.logo_url ? <img src={context.organization.logo_url} alt="" className="h-7 w-7 rounded-lg object-cover" /> : <span className="h-7 w-7 rounded-lg bg-violet-600" />}<span className="hidden sm:inline">{context.organization.name} · ilm AI</span></div>
      {studentNav && items.map(([label, href, Icon]) => <Link key={href} href={href} className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><Icon className="h-3.5 w-3.5" />{label}</Link>)}
      {teacherNav && <><Link href="/college/curriculum" className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><BookOpen className="h-3.5 w-3.5" />Curriculum Books</Link><Link href="/college/teacher-tools" className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><Presentation className="h-3.5 w-3.5" />Teacher AI Tools</Link><Link href="/college/photo-test" className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"><Camera className="h-3.5 w-3.5" />Photo → Test</Link></>}
    </div></div>{children}
  </div>;
}
