import { Metadata } from 'next';
import { StaticContentPage } from '@/components/features/marketing/StaticContentPage';

export const metadata: Metadata = {
  title: 'Terms of Service - ilm AI',
  description: 'Terms governing access to ilm AI products, subscriptions, AI tools, and user responsibilities.',
};

export default function TermsPage() {
  return (
    <StaticContentPage
      eyebrow="Legal"
      title="Terms of Service"
      description="These Terms of Service define the rules for using the ilm AI platform, AI tools, subscriptions, parent features, and website. Using the platform means you agree to these rules."
      sideTitle="Need clarification?"
      sideText="If you need clarification about billing, acceptable use, or account restrictions, contact support."
      sideActions={[
        { href: '/contact', label: 'Ask Support', variant: 'gradient' },
        { href: '/privacy', label: 'Read Privacy Policy' },
      ]}
      sections={[
        {
          title: 'Use of the platform',
          bullets: [
            'ilm AI is designed to provide educational support.',
            'You will use your account lawfully and honestly.',
            'You will not attempt to access another user\'s account or data without authorization.',
            'You will not use the platform for spam, abuse, cheating automation, or harmful activity.',
          ],
        },
        {
          title: 'AI-generated content',
          bullets: [
            'AI responses guidance ke liye hoti hain; unhein final academic or professional advice ka exact substitute na samjhein.',
            'Students must review their work and use AI responsibly according to their academic policy.',
            'We continuously improve response quality, but cannot guarantee absolute correctness for every output.',
          ],
        },
        {
          title: 'Subscriptions and billing',
          bullets: [
            'Paid plans include feature access, quotas, and limits.',
            'Billing and payment processing may be handled by external providers.',
            'If payment fraud, abuse, or reversal is detected, account features may be temporarily restricted.',
          ],
        },
        {
          title: 'Suspension and termination',
          bullets: [
            'We may suspend or terminate abusive, fraudulent, or policy-violating accounts.',
            'You can request account closure through support.',
          ],
        },
        {
          title: 'Service changes',
          paragraphs: [
            'ilm AI may update its features, pricing, limits, supported tools, and platform behavior over time.',
            'We will try to provide reasonable communication about major operational changes.',
          ],
        },
      ]}
    />
  );
}
