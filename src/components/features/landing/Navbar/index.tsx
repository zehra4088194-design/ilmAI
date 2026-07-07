'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/auth/useAuth';
import { useTranslations } from '@/providers/I18nProvider';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user } = useAuth();
  const t = useTranslations();

  const NAV_LINKS = [
    { label: t('navbar.features'), href: '#features' },
    { label: t('navbar.boards'), href: '#boards' },
    { label: t('navbar.pricing'), href: '/pricing' },
    { label: t('navbar.blog'), href: '/blog' },
  ];

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'glass border-b border-border/50 py-3' : 'py-5')}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">ilm <span className="gradient-text">AI</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <Button asChild variant="gradient" size="sm"><Link href="/dashboard"><Zap className="w-4 h-4" />{t('navbar.dashboard')}</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link href="/login">{t('navbar.login')}</Link></Button>
              <Button asChild variant="gradient" size="sm"><Link href="/register"><Zap className="w-4 h-4" />{t('navbar.getStartedFree')}</Link></Button>
            </>
          )}
        </div>
        <div className="md:hidden flex items-center gap-1">
          <LanguageSwitcher />
          <button className="p-2 rounded-lg hover:bg-accent" onClick={() => setIsMobileOpen(!isMobileOpen)}>
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden glass border-t border-border/50">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              {NAV_LINKS.map(link => (
                <Link key={link.href} href={link.href} onClick={() => setIsMobileOpen(false)} className="text-sm font-medium py-2 text-muted-foreground hover:text-foreground">{link.label}</Link>
              ))}
              <div className="flex gap-3 pt-2 border-t border-border">
                {user ? <Button asChild variant="gradient" className="flex-1"><Link href="/dashboard">{t('navbar.dashboard')}</Link></Button> : (
                  <><Button asChild variant="outline" className="flex-1"><Link href="/login">{t('navbar.login')}</Link></Button>
                  <Button asChild variant="gradient" className="flex-1"><Link href="/register">{t('navbar.startFree')}</Link></Button></>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
