'use client';
import { useEffect, useState } from 'react';
import { Search, Menu, X, Zap, FileText, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { CreditBalancePill } from '@/components/features/ai-selector/CreditBalancePill';
import { usePathname } from 'next/navigation';

type DashboardNavbarProps = {
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  desktopSidebarOpen?: boolean;
  onToggleDesktopSidebar?: () => void;
};

type SearchResult = {
  id: string;
  type: 'subject' | 'chapter' | 'resource' | 'lecture' | 'note' | 'past-paper';
  name: string;
  subtitle: string;
  href: string;
};

export function DashboardNavbar({
  mobileMenuOpen: controlledMobileMenuOpen,
  onToggleMobileMenu,
  desktopSidebarOpen = true,
  onToggleDesktopSidebar,
}: DashboardNavbarProps = {}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isParentPortal = pathname === '/parent' || pathname?.startsWith('/parent/');
  const [uncontrolledMobileMenuOpen, setUncontrolledMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [hasInstitutionConnection, setHasInstitutionConnection] = useState(false);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const mobileMenuOpen = controlledMobileMenuOpen ?? uncontrolledMobileMenuOpen;
  const setMobileMenuOpen = setUncontrolledMobileMenuOpen;

  useEffect(() => {
    if (controlledMobileMenuOpen !== undefined) return;
    const sync = (event: Event) => setMobileMenuOpen(Boolean((event as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener('ilm-ai-dashboard-menu-state', sync);
    return () => window.removeEventListener('ilm-ai-dashboard-menu-state', sync);
  }, [controlledMobileMenuOpen]);

  useEffect(() => {
    if (user?.role !== 'student') {
      setHasInstitutionConnection(false);
      return;
    }
    let cancelled = false;
    fetch('/api/student-applications/availability')
      .then((response) => (response.ok ? response.json() : { connected: false }))
      .then((json) => {
        if (!cancelled) setHasInstitutionConnection(Boolean(json.connected));
      })
      .catch(() => {
        if (!cancelled) setHasInstitutionConnection(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id) {
      setReferralUrl(null);
      return;
    }
    let cancelled = false;
    fetch('/api/referral/code')
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (cancelled || json?.status !== 'success' || !json.data?.code) return;
        setReferralUrl(window.location.origin + '/register?ref=' + encodeURIComponent(json.data.code));
      })
      .catch(() => {
        if (!cancelled) setReferralUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!shareOpen) return;
    const close = () => setShareOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [shareOpen]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const gradeQuery = user?.gradeLevel ? `&gradeLevel=${encodeURIComponent(user.gradeLevel)}` : '';
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}${gradeQuery}`);
        const json = await response.json();
        setSearchResults(json.results || []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const shareLink = referralUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://ilmai.study');
  const shareMessage = 'Join ilm AI — study smarter with AI-powered learning tools.';
  const shareMessageWithReward = `${shareMessage} Use my referral link and you’ll both unlock 10 free AI credits. ${shareLink}`;

  const openShareTarget = (target: 'whatsapp' | 'instagram' | 'facebook' | 'x') => {
    const fullMessage = shareMessageWithReward;
    const whatsappText = 'Use my referral link and you’ll both unlock 10 free AI credits. ' + shareLink;
    let url = '';
    if (target === 'whatsapp') {
      url = 'https://wa.me/?text=' + encodeURIComponent(whatsappText);
    } else if (target === 'facebook') {
      url = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareLink);
    } else if (target === 'x') {
      url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareMessageWithReward) + '&url=' + encodeURIComponent(shareLink);
    } else {
      void navigator.clipboard?.writeText(shareLink);
      url = 'https://www.instagram.com/';
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    setShareOpen(false);
  };

  const toggleMobileMenu = () => {
    if (onToggleMobileMenu) {
      onToggleMobileMenu();
      return;
    }
    window.dispatchEvent(new Event('ilm-ai-toggle-dashboard-menu'));
  };

  return (
    <header
      className={`border-border bg-background/95 pointer-events-auto fixed top-0 right-0 left-0 z-[80] flex h-16 min-w-0 items-center gap-2 border-b px-2 backdrop-blur-[1px] transition-[left] duration-300 sm:gap-3 sm:px-4 md:px-6 lg:z-30 ${desktopSidebarOpen ? 'lg:left-64' : 'lg:left-0'}`}
    >
      <button
        type="button"
        className="relative z-[120] inline-flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 lg:hidden"
        onClick={toggleMobileMenu}
        aria-label={mobileMenuOpen ? 'Close dashboard menu' : 'Open dashboard menu'}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      <button
        type="button"
        className="border-border bg-muted/50 text-foreground hover:bg-muted hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border lg:inline-flex"
        onClick={onToggleDesktopSidebar}
        aria-label={desktopSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        aria-expanded={desktopSidebarOpen}
        title={desktopSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {desktopSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      <div className="relative max-w-md min-w-0 flex-1">
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
            placeholder="Search..."
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
              <p className="text-muted-foreground px-4 py-3 text-sm">No subject or chapter found.</p>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {!isParentPortal && <CreditBalancePill />}

        {user && (
          <div className="relative" onPointerDown={(event) => event.stopPropagation()}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setShareOpen((open) => !open)}
              aria-expanded={shareOpen}
              aria-haspopup="menu"
              title="Share ilm AI"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden md:inline">Share ilm AI</span>
            </Button>
            {shareOpen && (
              <div className="border-border bg-popover text-popover-foreground absolute top-12 right-0 z-[120] w-52 overflow-hidden rounded-xl border p-1.5 shadow-xl">
                <div className="border-b border-border/60 px-2.5 py-2">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">Share ilm AI</p>
                  <p className="mt-1 text-xs text-violet-500">Both of you get 10 free AI credits.</p>
                </div>
                {([
                  ['whatsapp', 'WhatsApp'],
                  ['instagram', 'Instagram'],
                  ['facebook', 'Facebook'],
                  ['x', 'X'],
                ] as const).map(([target, label]) => (
                  <button
                    key={target}
                    type="button"
                    role="menuitem"
                    onClick={() => openShareTarget(target)}
                    className="hover:bg-muted flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {user?.role === 'student' && hasInstitutionConnection && (
          <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
            <Link href="/student-applications">
              <FileText className="h-4 w-4" /> Applications
            </Link>
          </Button>
        )}
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
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
}
