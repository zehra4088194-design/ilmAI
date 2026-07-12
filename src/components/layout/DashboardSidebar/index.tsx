'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, Brain, FileText, TrendingUp, Trophy, Settings,
  Zap, StickyNote, Bookmark, Star, CreditCard, ChevronRight, X, Menu,
  Library, CalendarClock, HelpCircle, Target, LogOut, Users, PenLine, Cake
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/auth/useAuth';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

const NAV_GROUPS = [
  { 
    label: 'Study',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
      { icon: BookOpen, label: 'Study', href: '/study' },
      { icon: Zap, label: 'AI Testing', href: '/practice' },
      { icon: Brain, label: 'AI Tutor', href: '/ai-tutor', badge: 'AI' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { icon: FileText, label: 'Past Papers', href: '/past-papers' },
      { icon: Library, label: 'Library', href: '/library' },
      { icon: Star, label: 'Flashcards', href: '/flashcards' },
      { icon: StickyNote, label: 'Notes', href: '/notes' },
      { icon: Bookmark, label: 'Bookmarks', href: '/bookmarks' },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { icon: Target, label: 'Guess Paper', href: '/guess-paper', badge: 'AI' },
      { icon: FileText, label: 'Full Test', href: '/full-test', badge: 'AI' },
      { icon: PenLine, label: 'Essay Writer', href: '/essay-writer', badge: 'AI' },
      { icon: HelpCircle, label: 'Ask a Teacher', href: '/doubts' },
      { icon: CalendarClock, label: 'Study Routine', href: '/routine' },
    ],
  },
  {
    label: 'Tools',
    items: [
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
      { icon: Settings, label: 'Settings', href: '/settings' },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 p-5 border-b border-sidebar-border shrink-0 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sidebar-foreground">ilm <span className="text-violet-400">AI</span></span>
      </Link>

      {/* Nav groups */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {user?.role === 'parent' && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 px-2 mb-1.5">Parent Portal</p>
            <Link href="/parent" onClick={() => setMobileOpen(false)}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive('/parent') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
              <Users className={cn('w-4 h-4 shrink-0', isActive('/parent') ? 'text-violet-400' : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70')} />
              <span className="flex-1">My Children</span>
              {isActive('/parent') && <ChevronRight className="w-3 h-3 text-violet-400 shrink-0" />}
            </Link>
          </div>
        )}
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 px-2 mb-1.5">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
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
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-sidebar flex-col border-r border-sidebar-border z-40 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-full w-72 bg-sidebar z-50 border-r border-sidebar-border overflow-hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
