'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LayoutDashboard, Users, BookOpen, BarChart3, FileQuestion, Settings, Shield, Library, GraduationCap, Menu, X, MessageCircleWarning, Music2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Overview', href: '/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: GraduationCap, label: 'Colleges', href: '/admin/colleges' },
  { icon: BookOpen, label: 'Content', href: '/admin/content' },
  { icon: Library, label: 'Resources', href: '/admin/resources' },
  { icon: Music2, label: 'Rest Library', href: '/admin/library' },
  { icon: FileQuestion, label: 'Questions', href: '/admin/questions' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Activity, label: 'Release Readiness', href: '/admin/release' },
  { icon: Shield, label: 'AI Usage', href: '/admin/ai-usage' },
  { icon: MessageCircleWarning, label: 'Chat Blocks', href: '/admin/chat-moderation' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-6 border-b border-sidebar-border">
        <p className="font-bold text-sidebar-foreground">Admin Panel</p>
        <p className="text-xs text-sidebar-foreground/50">ilm AI</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {ADMIN_NAV.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50')}
            >
              <item.icon className="w-4 h-4" />{item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="gradient"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? 'Close admin menu' : 'Open admin menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-sidebar flex-col border-r border-sidebar-border z-40">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close admin menu overlay"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar pt-14 shadow-2xl lg:hidden">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
