'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { BookOpen, Heart } from 'lucide-react';
import { openCookieSettings } from '@/lib/utils/cookieConsent';

const LINKS = {
  Product: [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Study Guides', href: '/blog' },
    { label: 'Public Library', href: '/library' },
  ],
  Support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Contact', href: '/contact' },
    { label: 'Status', href: '/status' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Refund Policy', href: '/refund-policy' },
  ],
};

export function LandingFooter() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="border-border bg-muted/10 border-t py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 grid gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">ilm AI</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              An advanced AI-powered study platform for Pakistan. Prepare effectively for board exams.
            </p>
          </div>
          {Object.entries(LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="mb-4 text-sm font-semibold">{heading}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-border flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-muted-foreground text-center text-sm md:text-left">
            © <span suppressHydrationWarning>{currentYear}</span> ilm AI. Pakistan
          </p>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
            <button
              type="button"
              onClick={openCookieSettings}
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              Cookie Settings
            </button>
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              Made with <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" /> by{' '}
              <span className="text-foreground font-semibold">Hafiz M. Husnain Noor</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
