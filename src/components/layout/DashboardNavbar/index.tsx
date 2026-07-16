'use client';
import { useEffect, useState } from 'react';
import { Search, Menu, X, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { NotificationBell } from '@/components/ui/NotificationBell';

type DashboardNavbarProps = {
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
};

type SearchResult = {
  id: string;
  type: 'subject' | 'chapter' | 'resource' | 'lecture' | 'note';
  name: string;
  subtitle: string;
  href: string;
};

export function DashboardNavbar({
  mobileMenuOpen: controlledMobileMenuOpen,
  onToggleMobileMenu,
}: DashboardNavbarProps = {}) {
  const { user } = useAuth();
  const [uncontrolledMobileMenuOpen, setUncontrolledMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const mobileMenuOpen = controlledMobileMenuOpen ?? uncontrolledMobileMenuOpen;
  const setMobileMenuOpen = setUncontrolledMobileMenuOpen;

  useEffect(() => {
    if (controlledMobileMenuOpen !== undefined) return;
    const sync = (event: Event) => setMobileMenuOpen(Boolean((event as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener('ilm-ai-dashboard-menu-state', sync);
    return () => window.removeEventListener('ilm-ai-dashboard-menu-state', sync);
  }, [controlledMobileMenuOpen]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await response.json();
        setSearchResults(json.results || []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const toggleMobileMenu = () => {
    if (onToggleMobileMenu) {
      onToggleMobileMenu();
      return;
    }
    window.dispatchEvent(new Event('ilm-ai-toggle-dashboard-menu'));
  };

  return (
    <header className="border-border bg-background/95 pointer-events-auto fixed top-0 right-0 left-0 z-[80] flex h-16 items-center gap-4 border-b px-4 backdrop-blur-[1px] md:px-6 lg:left-64 lg:z-30">
      <button
        type="button"
        className="relative z-[120] inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 lg:hidden"
        onClick={toggleMobileMenu}
        aria-label={mobileMenuOpen ? 'Close dashboard menu' : 'Open dashboard menu'}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      {/* Search */}
      <div className="relative max-w-md flex-1">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={searchQuery}
            onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setSearchOpen(false);
              if (event.key === 'Enter' && searchResults[0]) window.location.href = searchResults[0].href;
            }}
            placeholder="Search subjects, chapters..."
            className="border-border bg-muted/50 focus:ring-primary/50 w-full rounded-lg border py-2 pr-4 pl-9 text-sm transition-all focus:ring-2 focus:outline-none"
          />
        </div>
        {searchOpen && searchQuery.trim().length >= 2 && (
          <div className="border-border bg-popover text-popover-foreground absolute top-12 right-0 left-0 z-[100] overflow-hidden rounded-xl border shadow-xl">
            {searchResults.length > 0 ? (
              searchResults.map((result) => (
                <Link
                  key={`${result.type}:${result.id}`}
                  href={result.href}
                  onClick={() => setSearchOpen(false)}
                  className="border-border/50 hover:bg-muted/60 block border-b px-4 py-3 transition-colors last:border-0"
                >
                  <p className="text-sm font-semibold">{result.name}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{result.subtitle}</p>
                </Link>
              ))
            ) : (
              <p className="text-muted-foreground px-4 py-3 text-sm">Koi subject ya chapter nahi mila.</p>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* XP Display */}
        {user && (
          <Badge
            data-xp-target
            variant="outline"
            className="hidden items-center gap-1 border-violet-500/30 text-violet-400 md:flex"
          >
            <Zap className="h-3.5 w-3.5 fill-current" /> {user.xp.toLocaleString()} XP
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
        <NotificationBell />
      </div>
    </header>
  );
}
