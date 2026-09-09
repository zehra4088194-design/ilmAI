'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';

// Same number/name as the public marketing footer (src/components/features/landing/Footer) —
// kept in sync manually since this is a separate, much smaller strip for the logged-in app shell
// (DashboardShell), which never rendered any footer before this.
const WHATSAPP_CONTACT_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_BOT_NUMBER || '';
const WHATSAPP_CONTACT_NAME = 'M. Husnain Noor';

/** A single unobtrusive line under the main content — not the full marketing footer (that stays
 * pre-login-only), just enough that a logged-in user can find Privacy/Terms/support without
 * hunting through settings. */
export function DashboardFooter() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    // Extra bottom padding on mobile only — SideChatWidget's floating bubble sits fixed at
    // right-5 bottom-5 and would otherwise sit on top of this footer's text once someone scrolls
    // all the way down (same reason DashboardShell's <main> carries pb-24 on mobile).
    <footer className="border-border/60 text-muted-foreground flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t px-3 py-3 pb-20 text-center text-[11px] sm:px-4 sm:pb-3">
      <span suppressHydrationWarning>© {currentYear} ilm AI</span>
      <Link href="/privacy" className="hover:text-foreground hover:underline">
        Privacy
      </Link>
      <Link href="/terms" className="hover:text-foreground hover:underline">
        Terms
      </Link>
      <Link href="/help" className="hover:text-foreground hover:underline">
        Help
      </Link>
      {WHATSAPP_CONTACT_NUMBER && (
        <a
          href={`https://wa.me/${WHATSAPP_CONTACT_NUMBER}`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground inline-flex items-center gap-1 hover:underline"
        >
          <MessageCircle className="h-3 w-3" />
          {WHATSAPP_CONTACT_NAME}
        </a>
      )}
    </footer>
  );
}
