'use client';
import { useEffect, useState } from 'react';
import { Bell, Search, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/common/ThemeToggle';

export function DashboardNavbar() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const sync = (event: Event) => setMobileMenuOpen(Boolean((event as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener('ilm-ai-dashboard-menu-state', sync);
    return () => window.removeEventListener('ilm-ai-dashboard-menu-state', sync);
  }, []);

  const toggleMobileMenu = () => window.dispatchEvent(new Event('ilm-ai-toggle-dashboard-menu'));

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 border-b border-border bg-background/95 backdrop-blur-[1px] z-30 flex items-center px-4 md:px-6 gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Search subjects, chapters..." className="w-full bg-muted/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* XP Display */}
        {user && (
          <Badge variant="outline" className="hidden md:flex items-center gap-1 border-violet-500/30 text-violet-400">
            ⚡ {user.xp.toLocaleString()} XP
          </Badge>
        )}
        {user?.subscriptionTier === 'FREE' && (
          <Button asChild variant="gradient" size="sm" className="hidden sm:inline-flex">
            <Link href="/subscription">Upgrade Pro</Link>
          </Button>
        )}
        {/* Language */}
        <LanguageSwitcher />
        {/* Theme */}
        <ThemeToggle />
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
        <Button variant="gradient" size="icon" className="lg:hidden" onClick={toggleMobileMenu} aria-label="Open dashboard menu">
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>
    </header>
  );
}
