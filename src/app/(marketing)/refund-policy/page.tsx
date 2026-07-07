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
      description="Ye Refund Policy explain karti hai ke ilm AI paid subscriptions, duplicate charges, failed activations, aur billing disputes ko kaise handle karta hai."
      sideTitle="Billing support"
      sideText="Agar aapko payment issue, duplicate charge, ya subscription activation delay ka masla ho to support team ko transaction details ke sath foran contact karein."
      sideActions={[
        { href: '/contact', label: 'Contact Billing Support', variant: 'gradient' },
        { href: '/terms', label: 'Read Terms of Service' },
      ]}
      sections={[
        {
          title: 'General refund rule',
          paragraphs: [
            'ilm AI digital subscription service hai, is liye successful activation ke baad refunds automatic nahi hote.',
            'Har refund request manual review ke baad decide ki jati hai based on payment status, service activation, aur issue ki nature.',
          ],
        },
        {
          title: 'Cases where refund review hoti hai',
          bullets: [
            'Duplicate charge lag gaya ho.',
            'Payment capture ho gayi ho lekin subscription activate na hui ho.',
            'Incorrect billing amount deduct hui ho.',
            'Technical failure ki wajah se paid access intended tarah deliver na hui ho.',
          ],
        },
        {
          title: 'Cases where refund reject ho sakti hai',
          bullets: [
            'Paid features successfully unlock ho chuki hon aur normal use available raha ho.',
            'User ne active plan use karne ke baad sirf change of mind ki basis par refund request bheji ho.',
            'Policy violation, abuse, ya fraudulent activity detect hui ho.',
          ],
        },
        {
          title: 'How to request a refund',
          bullets: [
            'Support team ko account email ke sath message bhejein.',
            'Payment receipt, transaction id, provider name, aur issue ka short summary share karein.',
            'Agar payment PayPro ya Paddle se hui hai to provider reference bhi include karein.',
          ],
        },
        {
          title: 'Resolution timeline',
          paragraphs: [
            'Refund-related requests ko as early as possible review kiya jata hai, lekin exact timing payment provider verification par depend karti hai.',
            'Approved refund ka final settlement aapke payment provider ya card/bank processing timeline ke mutabiq complete hota hai.',
          ],
        },
      ]}
    />
  );
}
