import { Metadata } from 'next';
import { StaticContentPage } from '@/components/features/marketing/StaticContentPage';

export const metadata: Metadata = {
  title: 'Refund Policy - ilm AI',
  description: 'Refund policy for ilm AI subscriptions, billing disputes, duplicate charges, and payment review.',
};

export default function RefundPolicyPage() {
  return (
    <StaticContentPage
      eyebrow="Legal"
      title="Refund Policy"
      description="This Refund Policy explains how ilm AI handles paid subscriptions, duplicate charges, failed activations, and billing disputes."
      sideTitle="Billing support"
      sideText="If you have a payment issue, duplicate charge, or subscription activation delay, contact support promptly with your transaction details."
      sideActions={[
        { href: '/contact', label: 'Contact Billing Support', variant: 'gradient' },
        { href: '/terms', label: 'Read Terms of Service' },
      ]}
      sections={[
        {
          title: 'General refund rule',
          paragraphs: [
            'ilm AI is a digital subscription service, so refunds are not automatic after successful activation.',
            'Every refund request is decided after a manual review of payment status, service activation, and the nature of the issue.',
          ],
        },
        {
          title: 'Cases where a refund may be reviewed',
          bullets: [
            'Duplicate charge lag gaya ho.',
            'Payment capture ho gayi ho lekin subscription activate na hui ho.',
            'Incorrect billing amount deduct hui ho.',
            'Technical failure ki wajah se paid access intended tarah deliver na hui ho.',
          ],
        },
        {
          title: 'Cases where a refund may be rejected',
          bullets: [
            'Paid features were successfully unlocked and normal use was available.',
            'The user requests a refund only because they changed their mind after using the active plan.',
            'Policy violation, abuse, ya fraudulent activity detect hui ho.',
          ],
        },
        {
          title: 'How to request a refund',
          bullets: [
            'Message the support team using your account email.',
            'Share the Paddle receipt/transaction ID for card payments or transaction proof for a local wallet.',
            'Plan, billing cycle, charged currency aur issue ka short summary mention karein.',
          ],
        },
        {
          title: 'Resolution timeline',
          paragraphs: [
            'Refund requests are reviewed as early as possible, but timing depends on payment verification.',
            'The final settlement of an approved refund follows internal review and the transfer trail.',
          ],
        },
      ]}
    />
  );
}
