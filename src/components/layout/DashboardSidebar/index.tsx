'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Brain, FileText, TrendingUp, Trophy, Settings,
  Zap, StickyNote, Bookmark, Star, CreditCard, ChevronRight, X, Menu,
  Library, CalendarClock, HelpCircle, Target, LogOut, Users, PenLine, Cake,
  GraduationCap, Presentation, Mic2, FlaskConical, Quote, BriefcaseBusiness, Network, Video,
  Camera, MessageCircle, Sparkles, WandSparkles, Gamepad2, Music2, Pill, HardDriveDownload, School, FileQuestion, BookOpenText, ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { InstitutionBranding } from '@/lib/branding/resolveInstitutionBranding';

const NAV_GROUPS = [
  { 
    label: 'Study',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: BookOpen, label: 'Study', href: '/study' },
      { icon: Target, label: 'Diagnostic Test', href: '/diagnostic', badge: 'Start' },
      { icon: Zap, label: 'Adaptive Practice', href: '/practice' },
      { icon: Brain, label: 'AI Tutor', href: '/ai-tutor', badge: 'AI' },
      { icon: Camera, label: 'Scan & Solve', href: '/scan', badge: 'AI' },
      { icon: Target, label: 'AI Insights', href: '/insights', badge: 'AI' },
      { icon: CalendarClock, label: 'Smart Planner', href: '/planner/today', badge: 'AI' },
      { icon: BriefcaseBusiness, label: 'Career', href: '/career', badge: 'AI' },
      { icon: BookOpenText, label: 'Quran Class', href: '/quran' },
      { icon: MessageCircle, label: 'Study Buddies', href: '/student-chat', badge: 'Pro' },
      { icon: Gamepad2, label: 'Games', href: '/games', badge: 'Pro' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { icon: Video, label: 'Lectures', href: '/lectures' },
      { icon: FileText, label: 'Past Papers', href: '/past-papers' },
      { icon: Network, label: 'Pairing Schemes', href: '/library?type=pairing_scheme' },
      { icon: FileQuestion, label: 'Guess Papers', href: '/library?type=guess_paper' },
      { icon: Library, label: 'Library', href: '/library' },
      { icon: BookOpenText, label: 'Class Library', href: '/class-library' },
      { icon: HardDriveDownload, label: 'Downloads', href: '/downloads', badge: 'Pro' },
      { icon: Star, label: 'Flashcards', href: '/flashcards' },
      { icon: StickyNote, label: 'Notes', href: '/notes' },
      { icon: Bookmark, label: 'Bookmarks', href: '/bookmarks' },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { icon: Target, label: 'AI Guess Paper', href: '/guess-paper', badge: 'AI' },
      { icon: FileText, label: 'Full Test', href: '/full-test', badge: 'AI' },
      { icon: PenLine, label: 'Essay Writer', href: '/essay-writer', badge: 'AI' },
      { icon: HelpCircle, label: 'Ask a Teacher', href: '/doubts' },
      { icon: CalendarClock, label: 'Study Routine', href: '/routine' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { icon: WandSparkles, label: 'AI Humanizer', href: '/humanizer', badge: 'AI' },
      { icon: Music2, label: 'Rest Sounds', href: '/rest', badge: 'Pro' },
      { icon: Mic2, label: 'Speaking Practice', href: '/tutor/speaking-practice', badge: 'AI' },
      { icon: Sparkles, label: 'Motivation', href: '/motivation', badge: 'AI' },
      { icon: Cake, label: 'Age Counter', href: '/age-counter' },
    ],
  },
  {
    label: 'Progress',
    items: [
      { icon: TrendingUp, label: 'Progress', href: '/progress' },
      { icon: Trophy, label: 'Leaderboard', href: '/leaderboard' },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: School, label: 'School Portal', href: '/school' },
      { icon: CreditCard, label: 'Subscription', href: '/subscription' },
      { icon: ShoppingBag, label: 'Store', href: '/api/store-handoff' },
      { icon: Settings, label: 'Settings', href: '/settings' },
    ],
  },
];
// The full "University" tools group (Essay Assistant, PharmaPulse, Semester Planner, ...) — and
// the University Hub link itself — belong only to UNIVERSITY_NAV_GROUPS below, shown when
// education_level === 'university'. They used to also appear here in the generic NAV_GROUPS every
// school/college K-12 student sees, which is exactly the "leaking an irrelevant nav into a
// different persona" problem the comment on UNIVERSITY_NAV_GROUPS already warns against.

// Shown instead of NAV_GROUPS for education_level === 'university'. The board/grade-locked
// K-12 groups (Diagnostic Test, Adaptive Practice, Games, AI Guess Paper, Full Test, board
// Lectures/Past Papers/Library) don't apply to a university student and are mostly broken for
// them anyway (they key off grade_level/board, which a university profile never sets) — same
// "don't leak an irrelevant nav into a different persona" rule already applied to parents and
// teachers above. Generic, non-board-locked tools (AI Tutor, Notes, Flashcards, Career, the
// Tools/Progress/Account groups) are kept since they're still useful for a university student.
const UNIVERSITY_NAV_GROUPS = [
  {
    label: 'University',
    items: [
      { icon: GraduationCap, label: 'University Hub', href: '/university-hub', badge: 'New' },
      { icon: PenLine, label: 'Essay Assistant', href: '/university/essay-assistant', badge: 'AI' },
      { icon: FileText, label: 'Assignment Helper', href: '/university/assignment-helper', badge: 'AI' },
      { icon: Presentation, label: 'Presentation Builder', href: '/university/presentation-builder', badge: 'AI' },
      { icon: Mic2, label: 'Viva Practice', href: '/university/viva-practice', badge: 'AI' },
      { icon: FlaskConical, label: 'Research Helper', href: '/university/research-helper', badge: 'AI' },
      { icon: Library, label: 'Project Builder', href: '/university/project-builder', badge: 'AI' },
      { icon: Network, label: 'PDF Summarizer', href: '/university/pdf-summarizer', badge: 'AI' },
      { icon: Pill, label: 'PharmaPulse', href: '/university/pharmapulse', badge: 'AI' },
      { icon: Quote, label: 'Citation Generator', href: '/university/citation-generator' },
      { icon: BriefcaseBusiness, label: 'Resume Builder', href: '/university/resume-builder', badge: 'AI' },
      { icon: CalendarClock, label: 'Semester Planner', href: '/university/semester-planner' },
    ],
  },
  {
    label: 'Study',
    items: [
      { icon: Brain, label: 'AI Tutor', href: '/ai-tutor', badge: 'AI' },
      { icon: Camera, label: 'Scan & Solve', href: '/scan', badge: 'AI' },
      { icon: BriefcaseBusiness, label: 'Career', href: '/career', badge: 'AI' },
      { icon: BookOpenText, label: 'Quran Class', href: '/quran' },
      { icon: MessageCircle, label: 'Study Buddies', href: '/student-chat', badge: 'Pro' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { icon: HardDriveDownload, label: 'Downloads', href: '/downloads', badge: 'Pro' },
      { icon: Star, label: 'Flashcards', href: '/flashcards' },
      { icon: StickyNote, label: 'Notes', href: '/notes' },
      { icon: Bookmark, label: 'Bookmarks', href: '/bookmarks' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { icon: WandSparkles, label: 'AI Humanizer', href: '/humanizer', badge: 'AI' },
      { icon: Music2, label: 'Rest Sounds', href: '/rest', badge: 'Pro' },
      { icon: Mic2, label: 'Speaking Practice', href: '/tutor/speaking-practice', badge: 'AI' },
      { icon: Sparkles, label: 'Motivation', href: '/motivation', badge: 'AI' },
      { icon: Cake, label: 'Age Counter', href: '/age-counter' },
    ],
  },
  {
    label: 'Progress',
    items: [
      { icon: TrendingUp, label: 'Progress', href: '/progress' },
      { icon: Trophy, label: 'Leaderboard', href: '/leaderboard' },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: CreditCard, label: 'Subscription', href: '/subscription' },
      { icon: ShoppingBag, label: 'Store', href: '/api/store-handoff' },
      { icon: Settings, label: 'Settings', href: '/settings' },
    ],
  },
];

type DashboardSidebarProps = {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  desktopOpen?: boolean;
  onDesktopOpenChange?: (open: boolean) => void;
  branding?: InstitutionBranding | null;
};

export function DashboardSidebar({ mobileOpen: controlledMobileOpen, onMobileOpenChange, desktopOpen = true, onDesktopOpenChange, branding }: DashboardSidebarProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, signOut } = useAuth();
  const [uncontrolledMobileOpen, setUncontrolledMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const sidebarScrollKey = 'ilm-ai-dashboard-sidebar-scroll';
  const mobileOpen = controlledMobileOpen ?? uncontrolledMobileOpen;
  const setMobileOpen = (next: boolean) => {
    if (onMobileOpenChange) onMobileOpenChange(next);
    else setUncontrolledMobileOpen(next);
  };

  const isActive = (href: string) => {
    const [hrefPath, hrefQuery] = href.split('?');
    if (hrefQuery) {
      const expected = new URLSearchParams(hrefQuery);
      return (
        (pathname === hrefPath || pathname.startsWith(`${hrefPath}/`)) &&
        [...expected.entries()].every(([key, value]) => searchParams.get(key) === value)
      );
    }
    if (href === '/library' && ['pairing_scheme', 'guess_paper'].includes(searchParams.get('type') || '')) {
      return false;
    }
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  };

  const rememberSidebarScroll = () => {
    if (typeof window === 'undefined' || !navRef.current) return;
    window.sessionStorage.setItem(sidebarScrollKey, String(navRef.current.scrollTop));
  };

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof window === 'undefined') return;

    const savedScroll = Number(window.sessionStorage.getItem(sidebarScrollKey) || 0);
    window.requestAnimationFrame(() => {
      nav.scrollTop = savedScroll;
    });

    const handleScroll = () => {
      window.sessionStorage.setItem(sidebarScrollKey, String(nav.scrollTop));
    };
    nav.addEventListener('scroll', handleScroll, { passive: true });
    return () => nav.removeEventListener('scroll', handleScroll);
  }, [pathname, mobileOpen]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-sidebar-border p-5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 hover:opacity-80 transition-opacity">
          {branding ? (
            <>
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- institution-supplied logo, arbitrary remote host
                <img
                  src={branding.logoUrl}
                  alt={branding.name}
                  className="h-8 w-8 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="min-w-0 truncate text-sm font-bold text-sidebar-foreground" title={`${branding.name} · Ilm AI`}>
                {branding.name} <span className="text-sidebar-foreground/40">· ilm <span className="text-violet-400">AI</span></span>
              </span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sidebar-foreground">ilm <span className="text-violet-400">AI</span></span>
            </>
          )}
        </Link>
        {onDesktopOpenChange && (
          <button type="button" onClick={() => onDesktopOpenChange(false)} className="hidden rounded-lg p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:inline-flex" aria-label="Close sidebar" title="Close sidebar">
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden" aria-label="Close menu" title="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav groups */}
      <nav ref={navRef} className="flex-1 p-3 overflow-y-auto space-y-4">
        {user?.role === 'parent' && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 px-2 mb-1.5">Parent Portal</p>
            <div className="space-y-0.5">
              <Link href="/parent" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/parent') && !isActive('/parent/analytics') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <Users className={cn('w-4 h-4 shrink-0', isActive('/parent') && !isActive('/parent/analytics') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">My Children</span>
                {isActive('/parent') && !isActive('/parent/analytics') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/parent/analytics" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/parent/analytics') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <TrendingUp className={cn('w-4 h-4 shrink-0', isActive('/parent/analytics') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Performance & Reports</span>
                {isActive('/parent/analytics') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
            </div>
          </div>
        )}
        {user?.role === 'teacher' && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 px-2 mb-1.5">Teacher Portal</p>
            <div className="space-y-0.5">
              <Link href="/teacher/tests" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/teacher/tests') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <FileQuestion className={cn('w-4 h-4 shrink-0', isActive('/teacher/tests') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Test Paper Studio</span>
                {isActive('/teacher/tests') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/library" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/library') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <Library className={cn('w-4 h-4 shrink-0', isActive('/library') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Resource Library</span>
                {isActive('/library') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/quran" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/quran') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <BookOpenText className={cn('w-4 h-4 shrink-0', isActive('/quran') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Quran Class</span>
                {isActive('/quran') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/subscription" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/subscription') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <CreditCard className={cn('w-4 h-4 shrink-0', isActive('/subscription') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Subscription</span>
                {isActive('/subscription') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/settings" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/settings') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <Settings className={cn('w-4 h-4 shrink-0', isActive('/settings') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Settings</span>
                {isActive('/settings') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
            </div>
          </div>
        )}
        {user?.role === 'principal' && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 px-2 mb-1.5">Principal Portal</p>
            <div className="space-y-0.5">
              <Link href="/school-admin" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/school-admin') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <LayoutDashboard className={cn('w-4 h-4 shrink-0', isActive('/school-admin') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Dashboard</span>
                {isActive('/school-admin') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/school-admin/teachers" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/school-admin/teachers') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <Presentation className={cn('w-4 h-4 shrink-0', isActive('/school-admin/teachers') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Teachers</span>
                {isActive('/school-admin/teachers') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/school-admin/classes" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/school-admin/classes') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <School className={cn('w-4 h-4 shrink-0', isActive('/school-admin/classes') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Classes</span>
                {isActive('/school-admin/classes') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/school-admin/students" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/school-admin/students') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <Users className={cn('w-4 h-4 shrink-0', isActive('/school-admin/students') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Students</span>
                {isActive('/school-admin/students') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/school-admin/invoices" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/school-admin/invoices') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <FileText className={cn('w-4 h-4 shrink-0', isActive('/school-admin/invoices') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Invoices & Fees</span>
                {isActive('/school-admin/invoices') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/school-admin/payroll" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/school-admin/payroll') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <CreditCard className={cn('w-4 h-4 shrink-0', isActive('/school-admin/payroll') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">Payroll</span>
                {isActive('/school-admin/payroll') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
              <Link href="/school-admin/settings" onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                  isActive('/school-admin/settings') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                <Settings className={cn('w-4 h-4 shrink-0', isActive('/school-admin/settings') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                <span className="flex-1">School Settings</span>
                {isActive('/school-admin/settings') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
              </Link>
            </div>
          </div>
        )}
        {/* role === 'admin' still falls through to the full generic nav below, unchanged —
            deliberately not touched here. That value is the SAME one requireAdminUser() checks
            for platform-admin access (src/lib/admin/auth.ts); it must never be used for
            institution-level access.
            Parents, teachers, and principals get their own trimmed nav above — the full consumer
            tool nav (AI tutor, flashcards, games, etc.) is student/consumer-facing and must not
            leak into any portal (parent, teacher, principal). This ensures strict separation of
            concerns and prevents users from accessing inappropriate features.
            See CLAUDE_CODE_MASTER_PROMPT.md Part 4.4 / point 12. */}
        {user?.role !== 'parent' &&
          user?.role !== 'teacher' &&
          user?.role !== 'principal' &&
          (user?.educationLevel === 'university' ? UNIVERSITY_NAV_GROUPS : NAV_GROUPS).map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 px-2 mb-1.5">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => { rememberSidebarScroll(); setMobileOpen(false); }}
                    className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                      active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
                    <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
                    <span className="flex-1">{item.label}</span>
                    {'badge' in item && item.badge && (
                      <Badge className="text-[10px] bg-violet-600 text-white px-1.5 py-0 shrink-0">{item.badge}</Badge>
                    )}
                    {active && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-sidebar-accent/20 hover:bg-sidebar-accent/40 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.fullName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{user.fullName || 'Student'}</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate">{user.subscriptionTier} · ⚡{user.xp} XP</p>
            </div>
            <button onClick={signOut} className="text-sidebar-foreground/30 hover:text-destructive transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
    
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`bg-sidebar border-sidebar-border fixed top-0 left-0 z-40 hidden h-dvh w-64 flex-col overflow-hidden border-r transition-transform duration-300 lg:flex ${desktopOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile fallback toggle when Sidebar is used without DashboardShell */}
      {controlledMobileOpen === undefined && (
        <button
          className="lg:hidden fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
        </button>
      )}

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-[85] bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="border-sidebar-border bg-sidebar fixed top-0 left-0 z-[95] h-dvh w-72 max-w-[86vw] overflow-hidden border-r shadow-2xl lg:hidden">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
