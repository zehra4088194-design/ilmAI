'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap, BookOpen, LibraryBig } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/auth/useAuth';
import { useTranslations } from '@/providers/I18nProvider';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { PRIMARY_SITE_LINKS } from '@/lib/seo/study-tools';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useAuth();
  const t = useTranslations();

  const NAV_LINKS = PRIMARY_SITE_LINKS.map((link) => ({
    label: link.name,
    href: link.url,
    icon: link.url === '/library' ? LibraryBig : undefined,
  }));

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed top-0 right-0 left-0 z-50 transition-all duration-300',
        isScrolled ? 'glass border-border/50 border-b py-3' : 'py-5'
      )}
    >
      <div className="container mx-auto flex items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 transition-transform group-hover:scale-110">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">
            ilm <span className="gradient-text">AI</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors',
                link.href === '/library' && 'text-primary'
              )}
            >
              {link.icon && <link.icon className="h-4 w-4" />}
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          {user ? (
            <Button asChild variant="gradient" size="sm">
              <Link href="/dashboard">
                <Zap className="h-4 w-4" />
                {t('navbar.dashboard')}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t('navbar.login')}</Link>
              </Button>
              <Button asChild variant="gradient" size="sm">
                <Link href="/register">
                  <Zap className="h-4 w-4" />
                  {t('navbar.getStartedFree')}
                </Link>
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <LanguageSwitcher />
          <button className="hover:bg-accent rounded-lg p-2" onClick={() => setIsMobileOpen(!isMobileOpen)}>
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass border-border/50 border-t md:hidden"
          >
            <div className="container mx-auto flex flex-col gap-3 px-4 py-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    'text-muted-foreground hover:text-foreground flex items-center gap-2 py-2 text-sm font-medium',
                    link.href === '/library' && 'text-primary'
                  )}
                >
                  {link.icon && <link.icon className="h-4 w-4" />}
                  {link.label}
                </Link>
              ))}
              <div className="border-border flex gap-3 border-t pt-2">
                {user ? (
                  <Button asChild variant="gradient" className="flex-1">
                    <Link href="/dashboard">{t('navbar.dashboard')}</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" className="flex-1">
                      <Link href="/login">{t('navbar.login')}</Link>
                    </Button>
                    <Button asChild variant="gradient" className="flex-1">
                      <Link href="/register">{t('navbar.startFree')}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
