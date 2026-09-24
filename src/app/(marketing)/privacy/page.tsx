import { Metadata } from 'next';
import { StaticContentPage } from '@/components/features/marketing/StaticContentPage';

export const metadata: Metadata = {
  title: 'Privacy Policy - ilm AI',
  description: 'How ilm AI collects, stores, and uses user data across learning, payments, and support flows.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <StaticContentPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="Effective August 2, 2026. This Privacy Policy explains how ilm AI collects, uses, protects, and retains user data when you use the website, dashboard, AI features, payments, parent tools, and advertising-supported pages."
      sideTitle="Questions about data?"
      sideText="If you have questions about data handling, account removal, or privacy, contact our support team directly."
      sideActions={[
        { href: '/contact', label: 'Contact Support', variant: 'gradient' },
        { href: '/terms', label: 'Read Terms of Service' },
      ]}
      sections={[
        {
          title: 'What we collect',
          bullets: [
            'Account data such as name, email address, board, grade, and subscription tier.',
            'Learning activity such as quiz attempts, notes, routines, bookmarks, flashcards, and progress records.',
            'Parent-linking data, messages, and attachments when parent dashboard features are used.',
            'Payment-related metadata required for provider verification and subscription management.',
          ],
        },
        {
          title: 'How we use your data',
          bullets: [
            'To operate the account, personalize the dashboard, and provide academic recommendations.',
            'To give AI tools better context, such as board, grade, and selected subjects.',
            'For subscription activation, billing verification, and abuse prevention.',
            'To diagnose support issues and improve the platform.',
          ],
        },
        {
          title: 'Spam and abuse protection',
          paragraphs: [
            "Public forms and sensitive account actions may use Google reCAPTCHA v3 to assess whether a request is likely to be legitimate. It works in the background and may process technical signals such as the IP address, browser information, page context, and interaction data under Google's Privacy Policy and Terms of Service.",
            'We use the resulting risk score for security and abuse prevention. The private reCAPTCHA secret is stored only on the server.',
          ],
          links: [
            {
              href: 'https://policies.google.com/privacy',
              label: 'Google Privacy Policy',
              external: true,
            },
            {
              href: 'https://policies.google.com/terms',
              label: 'Google Terms of Service',
              external: true,
            },
          ],
        },
        {
          title: 'In-house promotional banners',
          paragraphs: [
            'ilm AI does not use Google AdSense or any third-party advertising network. Free, content-based pages may show promotional banners for ilmai.store, ilm AI\'s own e-commerce site, served and hosted entirely on ilm AI\'s own systems.',
            'When a banner is clicked, we log an unguessable reference id (and, if you are logged in, your account id) so a resulting purchase can be attributed back to that click. That reference id, and whether it led to a purchase, is shared with ilmai.store for attribution — no browsing history or advertising cookie is shared with any outside party.',
            'These banners are not loaded until the visitor allows marketing cookies in Cookie Settings.',
          ],
        },
        {
          title: 'Who processes sensitive AI data',
          paragraphs: [
            'Private service credentials are never exposed directly in the browser or public frontend.',
            'Intelligent and document-processing requests use secure server-side services. Approved service providers may process a request only to generate its response.',
          ],
        },
        {
          title: 'Data storage and protection',
          bullets: [
            'User records are stored in secure backend services.',
            'Private attachments and parent-linked files use protected storage access rules.',
            'Recent parent and student chats remain in live storage for 2 days, then move to compressed private archive storage.',
            'Archived conversations and shared files remain accessible only to their authenticated participants.',
            'Temporary scans and processing files are deleted after 2 days.',
            'We use technical safeguards to limit unauthorized access, misuse, and accidental disclosure.',
          ],
        },
        {
          title: 'User choices',
          bullets: [
            'You can update your profile data.',
            'You can request account deletion or data removal through support.',
            'You can reopen Cookie Settings from the website footer and change optional analytics, marketing, or study-email preferences.',
            'You can contact us directly about advertising, marketing, support communication, or privacy questions.',
          ],
        },
      ]}
    />
  );
}
