import { Metadata } from 'next';
import { StaticContentPage } from '@/components/features/marketing/StaticContentPage';

export const metadata: Metadata = {
  title: 'Cookie Policy - ilm AI',
  description:
    'How ilm AI uses cookies and similar storage for authentication, preferences, and analytics-related behavior.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <StaticContentPage
      eyebrow="Legal"
      title="Cookie Policy"
      description="Effective July 30, 2026. This Cookie Policy explains how ilm AI and approved service providers use cookies and similar browser storage for authentication, preferences, analytics, advertising, and product experience."
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
            'Daily study email permission is optional. If allowed, consent is saved to your profile and study reminders may be sent through the configured email provider.',
          ],
        },
        {
          title: 'Cookie and storage categories',
          bullets: [
            'Necessary: authentication, security, selected locale, theme, and basic session continuity.',
            'Analytics: optional product-usage measurement used to understand and improve the platform.',
            'Marketing and advertising: optional Google AdSense tags, advertising cookies, ad delivery, and measurement on eligible pages.',
            'Study emails: an optional preference that allows learning reminders; it does not enable advertising cookies.',
          ],
        },
        {
          title: 'Google AdSense cookies',
          paragraphs: [
            'When advertising is enabled, third-party vendors including Google may use cookies to serve and measure ads based on a visitor’s prior visits to ilm AI or other websites. Advertising cookies may use Google or DoubleClick domains.',
            'Visitors can decline marketing cookies in ilm AI Cookie Settings. Depending on location, a separate Google-certified consent message may also appear for the choices required by advertising regulations.',
          ],
          links: [
            {
              href: 'https://adssettings.google.com/',
              label: 'Manage personalized ads in Google Ads Settings',
              external: true,
            },
            {
              href: 'https://policies.google.com/technologies/ads',
              label: 'Read Google’s advertising technology information',
              external: true,
            },
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
            'Use Cookie Settings in the website footer to change optional preferences. You can also clear or block cookies in your browser settings.',
            'If cookies are disabled, some platform features, especially login and preference persistence, may not work correctly.',
          ],
        },
      ]}
    />
  );
}
