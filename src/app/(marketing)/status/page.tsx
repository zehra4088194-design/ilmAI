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
      description="Neeche ilm AI ke core systems ki current health summary di gayi hai. Agar kisi specific feature mein issue aaye to support team se rabta karein."
      sideTitle="What to do if something breaks"
      sideText="Agar kisi route, payment, ya AI tool mein issue nazar aaye to screenshot, exact error, aur apna account email ke sath support ko bhejein."
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
            'Slow responses usually heavy AI load ya unstable network ki wajah se hoti hain.',
            'Voice session issues aksar browser microphone permissions se related hoti hain.',
            'Payment confirmation delay kabhi kabhi payment provider webhook sync ki wajah se ho sakti hai.',
          ],
        },
        {
          title: 'Support response flow',
          paragraphs: [
            'Critical issues jaise login failure, payment captured but plan not activated, ya dashboard crash ko high priority par dekha jata hai.',
            'General product questions, content suggestions, aur feature requests normal support queue mein handle hoti hain.',
          ],
        },
      ]}
    />
  );
}
