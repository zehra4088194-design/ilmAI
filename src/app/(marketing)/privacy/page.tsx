import { Metadata } from 'next';
import { StaticContentPage } from '@/components/features/marketing/StaticContentPage';

export const metadata: Metadata = {
  title: 'Privacy Policy - ilm AI',
  description: 'How ilm AI collects, stores, and uses user data across learning, payments, and support flows.',
};

export default function PrivacyPage() {
  return (
    <StaticContentPage
      eyebrow="Legal"
      title="Privacy Policy"
      description="This Privacy Policy explains how ilm AI collects, uses, protects, and retains user data when you use the website, dashboard, AI features, payments, and parent tools."
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
          title: 'Who processes sensitive AI data',
          paragraphs: [
            'Raw AI and scan provider secrets are never exposed directly in the browser or public frontend.',
            'AI and OCR requests are routed through a secure gateway. External providers may process a request only to generate its response.',
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
            'You can contact us directly about marketing or support communication preferences.',
          ],
        },
      ]}
    />
  );
}
