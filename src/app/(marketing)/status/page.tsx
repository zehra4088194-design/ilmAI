import { Metadata } from 'next';
import { StaticContentPage } from '@/components/features/marketing/StaticContentPage';

export const metadata: Metadata = {
  title: 'System Status - ilm AI',
  description: 'Current operational status of ilm AI app, payments, AI gateway, and support systems.',
};

export default function StatusPage() {
  return (
    <StaticContentPage
      eyebrow="Operations"
      title="System Status"
      description="This page shows the current health summary of ilm AI core systems. If a specific feature has an issue, contact support."
      sideTitle="What to do if something breaks"
      sideText="If a route, payment, or AI tool has an issue, send support a screenshot, exact error, and your account email."
      sideActions={[
        { href: '/contact', label: 'Report an Issue', variant: 'gradient' },
        { href: '/help', label: 'Open Help Center' },
      ]}
      sections={[
        {
          title: 'Current platform status',
          bullets: [
            'Website and dashboard: Operational',
            'Authentication and user accounts: Operational',
            'AI Tutor and content generation: Operational',
            'OCR and scan processing: Operational',
            'Parent dashboard and messaging: Operational',
            'Payments and subscription activation: Operational',
          ],
        },
        {
          title: 'Known failure patterns',
          bullets: [
            'Slow responses are usually caused by heavy AI load or an unstable network.',
            'Voice session issues are often related to browser microphone permissions.',
            'Payment confirmation delays can sometimes be caused by payment provider webhook synchronization.',
          ],
        },
        {
          title: 'Support response flow',
          paragraphs: [
            'Critical issues such as login failure, captured payment with an inactive plan, or a dashboard crash receive high priority.',
            'General product questions, content suggestions, and feature requests are handled in the normal support queue.',
          ],
        },
      ]}
    />
  );
}
