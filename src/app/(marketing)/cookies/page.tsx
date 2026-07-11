import { Metadata } from 'next';
import { StaticContentPage } from '@/components/features/marketing/StaticContentPage';

export const metadata: Metadata = {
  title: 'Cookie Policy - ilm AI',
  description: 'How ilm AI uses cookies and similar storage for authentication, preferences, and analytics-related behavior.',
};

export default function CookiesPage() {
  return (
    <StaticContentPage
      eyebrow="Legal"
      title="Cookie Policy"
      description="Ye Cookie Policy batati hai ke ilm AI cookies aur similar browser storage ko authentication, preferences, aur product experience improve karne ke liye kaise use karta hai."
      sideTitle="Cookie-related help"
      sideText="Agar language preference, login session, ya browser storage behavior par issue aaye to support page use karein."
      sideActions={[
        { href: '/help', label: 'Open Help Center', variant: 'gradient' },
        { href: '/privacy', label: 'Read Privacy Policy' },
      ]}
      sections={[
        {
          title: 'What cookies do here',
          bullets: [
            'Login sessions maintain karne mein help karti hain.',
            'Language aur interface preferences remember karne mein use hoti hain.',
            'Security-related checks aur session continuity improve karti hain.',
            'Daily study email permission optional hai. Agar allow ho to profile mein consent save hota hai aur AI-generated study reminders Resend ke through bheje ja sakte hain.',
          ],
        },
        {
          title: 'Types of data stored',
          bullets: [
            'Authentication/session state',
            'Selected locale or language preference',
            'Basic product usage state needed for smoother navigation',
          ],
        },
        {
          title: 'What cookies do not contain',
          bullets: [
            'Raw AI provider secrets browser cookies mein store nahi kiye jate.',
            'Payment provider secret keys browser cookies mein store nahi ki jati.',
            'Sensitive backend-only credentials client-side storage mein expose nahi kiye jate.',
          ],
        },
        {
          title: 'Managing cookies',
          paragraphs: [
            'Aap apne browser settings se cookies clear ya block kar sakte hain.',
            'Cookies disable karne ki surat mein kuch parts of the platform, especially login and preference persistence, properly kaam nahi kar sakte.',
          ],
        },
      ]}
    />
  );
}
