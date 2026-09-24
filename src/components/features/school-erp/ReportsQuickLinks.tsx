import Link from 'next/link';
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';

type ReportLink = { label: string; href: string; icon: LucideIcon };

const LINKS: ReportLink[] = [
  { label: 'Attendance report', href: '/school-admin/attendance', icon: CalendarDays },
  { label: 'Fee collection report', href: '/school-admin/fees', icon: CircleDollarSign },
  { label: 'Class summary', href: '/school-admin/academics', icon: GraduationCap },
  { label: 'Exam results', href: '/school-admin/exams', icon: ClipboardList },
  { label: 'Full reports dashboard', href: '/school-admin/reports', icon: BarChart3 },
];

/** Quick-jump list to the deeper report pages — each target page enforces its own permission. */
export function ReportsQuickLinks() {
  return (
    <div className="space-y-1">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="hover:bg-muted flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium"
        >
          <link.icon className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="flex-1">{link.label}</span>
          <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
        </Link>
      ))}
    </div>
  );
}
