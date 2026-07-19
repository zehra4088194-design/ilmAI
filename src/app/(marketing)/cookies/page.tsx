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
      description="This Cookie Policy explains how ilm AI uses cookies and similar browser storage for authentication, preferences, and product experience."
      sideTitle="Cookie-related help"
      sideText="If you have an issue with language preferences, login sessions, or browser storage, use the support page."
      sideActions={[
        { href: '/help', label: 'Open Help Center', variant: 'gradient' },
        { href: '/privacy', label: 'Read Privacy Policy' },
      ]}
      sections={[
        {
          title: 'What cookies do here',
          bullets: [
            'They help maintain login sessions.',
            'They remember language and interface preferences.',
            'They improve security checks and session continuity.',
            'Daily study email permission is optional. If allowed, consent is saved to your profile and AI-generated study reminders may be sent through Resend.',
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
            'Raw AI provider secrets are not stored in browser cookies.',
            'Payment provider secret keys are not stored in browser cookies.',
            'Sensitive backend-only credentials are not exposed in client-side storage.',
          ],
        },
        {
          title: 'Managing cookies',
          paragraphs: [
            'You can clear or block cookies in your browser settings.',
            'If cookies are disabled, some platform features, especially login and preference persistence, may not work correctly.',
          ],
        },
      ]}
    />
  );
}
