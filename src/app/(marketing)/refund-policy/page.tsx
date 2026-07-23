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
          title: '14-day refund policy',
          paragraphs: [
            'For eligible paid subscriptions purchased through Paddle, ilm AI provides a minimum 14-day refund window from the date of purchase or renewal.',
            'If you are not satisfied with your purchase, contact us within 14 days with your account email and transaction details so we can review and process the request according to Paddle Buyer Terms.',
          ],
        },
        {
          title: 'Refunds we support',
          bullets: [
            'You request a refund within 14 days of the original purchase or renewal.',
            'A duplicate charge was made.',
            'Payment was captured but the subscription was not activated.',
            'An incorrect billing amount was charged.',
            'A technical failure prevented access to the paid service.',
          ],
        },
        {
          title: 'Cases that may require additional review',
          bullets: [
            'Refund requests made after the 14-day refund window.',
            'Requests connected to misuse, fraud, policy violations, or chargeback abuse.',
            'Manual institutional payments, local-wallet payments, or bank-transfer payments that were not processed by Paddle.',
          ],
        },
        {
          title: 'How to request a refund',
          bullets: [
            'Contact billing support from the email address used on your ilm AI account.',
            'Include your Paddle receipt, transaction ID, plan name, billing cycle, charged currency, and a short reason for the request.',
            'For local wallet or bank-transfer payments, include the payment screenshot or transaction reference so we can verify it manually.',
          ],
        },
        {
          title: 'Resolution timeline',
          paragraphs: [
            'We aim to review refund requests as quickly as possible. Processing time can depend on Paddle, the payment method, the customer bank, or local payment provider timelines.',
            'Approved Paddle refunds are processed through Paddle. Approved manual local-payment refunds are handled through the original or mutually agreed payment channel where possible.',
          ],
        },
      ]}
    />
  );
}
