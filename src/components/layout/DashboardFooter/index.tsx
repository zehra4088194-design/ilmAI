'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';

const WHATSAPP_CONTACT_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER || '';
const SOCIAL_LINKS = [
  { label: 'Instagram', href: 'https://www.instagram.com/ilmai.study/' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UC2rIe0QZUQnjI0jpxI6U4QQ' },
  { label: 'X', href: 'https://x.com/ilmai_study' },
] as const;

export function DashboardFooter() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <footer className="border-border/60 text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t px-3 py-3 pb-20 text-center text-[11px] sm:px-4 sm:pb-3">
      <span suppressHydrationWarning>© {currentYear} ilm AI</span>
      <Link href="/privacy" className="hover:text-foreground hover:underline">Privacy</Link>
      <Link href="/terms" className="hover:text-foreground hover:underline">Terms</Link>
      <Link href="/help" className="hover:text-foreground hover:underline">Help</Link>
      {SOCIAL_LINKS.map((link) => (
        <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">{link.label}</a>
      ))}
      {WHATSAPP_CONTACT_NUMBER && (
        <a href={`https://wa.me/${WHATSAPP_CONTACT_NUMBER}`} target="_blank" rel="noopener noreferrer" className="hover:text-foreground inline-flex items-center gap-1 hover:underline">
          <MessageCircle className="h-3 w-3" /> WhatsApp
        </a>
      )}
    </footer>
  );
}
