'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { BookOpen, Heart, HandHeart, MessageCircle } from 'lucide-react';
import { openCookieSettings } from '@/lib/utils/cookieConsent';
import { PRIMARY_SITE_LINKS } from '@/lib/seo/study-tools';
import { SupportDonateWidget } from '@/components/features/support/SupportDonateWidget';

const WHATSAPP_CONTACT_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER || '';
const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://www.instagram.com/ilmai.study/' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UC2rIe0QZUQnjI0jpxI6U4QQ' },
  { label: 'X', href: 'https://x.com/ilmai_study' },
] as const;

const LINKS = {
  'Study Tools': PRIMARY_SITE_LINKS.map((link) => ({ label: link.name, href: link.url })),
  Support: [
    { label: 'Help Center', href: '/help' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
    { label: 'Study Guides', href: '/blog' },
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600"><BookOpen className="h-4 w-4 text-white" /></div>
              <span className="font-bold">ilm AI</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">An advanced AI-powered study platform for Pakistan. Prepare effectively for board exams.</p>
          </div>
          {Object.entries(LINKS).map(([heading, links]) => (
            <div key={heading}><h4 className="mb-4 text-sm font-semibold">{heading}</h4><ul className="space-y-2">{links.map((link) => <li key={link.href}><Link href={link.href} className="text-muted-foreground hover:text-foreground text-sm transition-colors">{link.label}</Link></li>)}</ul></div>
          ))}
        </div>

        <div className="border-border from-rose-500/10 to-amber-500/10 mb-8 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-gradient-to-r p-5 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-white"><HandHeart className="h-5 w-5" /></div><div><p className="text-sm font-bold">Enjoying ilm AI?</p><p className="text-muted-foreground text-xs">A small contribution keeps it free for students.</p></div></div>
          <SupportDonateWidget trigger={(open) => <button type="button" onClick={open} className="shrink-0 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:scale-105">Support us</button>} />
        </div>

        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {WHATSAPP_CONTACT_NUMBER && <a href={`https://wa.me/${WHATSAPP_CONTACT_NUMBER}`} target="_blank" rel="noreferrer" className="border-border bg-card/60 hover:border-emerald-500/40 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"><MessageCircle className="h-3 w-3 text-emerald-500" />WhatsApp</a>}
          {SOCIAL_LINKS.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="border-border bg-card/60 hover:border-primary/40 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors">{link.label}</a>)}
          <a href="mailto:support@ilmai.study" target="_blank" rel="noreferrer" className="border-border bg-card/60 hover:border-emerald-500/40 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"><MessageCircle className="h-3 w-3 text-emerald-500" />Email Support</a>
        </div>

        <div className="border-border flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-muted-foreground text-center text-sm md:text-left">© <span suppressHydrationWarning>{currentYear}</span> ilm AI. Pakistan</p>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4"><button type="button" onClick={openCookieSettings} className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline">Cookie Settings</button><p className="text-muted-foreground flex items-center gap-1.5 text-sm">Made with <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" /> for students of the subcontinent</p></div>
        </div>
      </div>
    </footer>
  );
}
