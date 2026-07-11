'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BookOpen, BarChart3, FileQuestion, Settings, Shield, Library, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const ADMIN_NAV = [
  { icon: LayoutDashboard, label: 'Overview', href: '/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: GraduationCap, label: 'Colleges', href: '/admin/colleges' },
  { icon: BookOpen, label: 'Content', href: '/admin/content' },
  { icon: Library, label: 'Resources', href: '/admin/resources' },
  { icon: FileQuestion, label: 'Questions', href: '/admin/questions' },
  { icon: BarChart3, label: 'Analytics', href: '/admin/analytics' },
  { icon: Shield, label: 'AI Usage', href: '/admin/ai-usage' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-sidebar flex-col border-r border-sidebar-border z-40">
      <div className="p-6 border-b border-sidebar-border">
        <p className="font-bold text-sidebar-foreground">Admin Panel</p>
        <p className="text-xs text-sidebar-foreground/50">ilm AI</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {ADMIN_NAV.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50')}>
              <item.icon className="w-4 h-4" />{item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
