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
      description="Ye Terms of Service ilm AI platform, AI tools, subscriptions, parent features, aur website use karne ke rules define karti hai. Platform use karne ka matlab hai ke aap in rules se agree karte hain."
      sideTitle="Need clarification?"
      sideText="Agar aapko billing, acceptable use, ya account restrictions par koi clarification chahiye ho to support se rabta karein."
      sideActions={[
        { href: '/contact', label: 'Ask Support', variant: 'gradient' },
        { href: '/privacy', label: 'Read Privacy Policy' },
      ]}
      sections={[
        {
          title: 'Use of the platform',
          bullets: [
            'ilm AI educational support ke liye design ki gayi platform hai.',
            'Aap apna account lawful aur honest tareeqe se use karenge.',
            'Aap kisi doosre user ke account ya data ko unauthorized access karne ki koshish nahi karenge.',
            'Aap platform ko spam, abuse, cheating automation, ya harmful activity ke liye use nahi karenge.',
          ],
        },
        {
          title: 'AI-generated content',
          bullets: [
            'AI responses guidance ke liye hoti hain; unhein final academic or professional advice ka exact substitute na samjhein.',
            'Student ko apna kaam review karna aur academic policy ke mutabiq responsibly use karna zaroori hai.',
            'Hum response quality improve karte rehte hain lekin har output ki absolute correctness guarantee nahi di jati.',
          ],
        },
        {
          title: 'Subscriptions and billing',
          bullets: [
            'Paid plans feature access, quotas, aur limits ke sath aati hain.',
            'Billing and payment processing external providers ke zariye handle ho sakti hai.',
            'Agar payment fraud, abuse, ya reversal detect ho to account features temporarily restrict kiye ja sakte hain.',
          ],
        },
        {
          title: 'Suspension and termination',
          bullets: [
            'Hum abusive, fraudulent, ya policy-violating accounts ko suspend ya terminate kar sakte hain.',
            'Aap support ke zariye apna account close karne ki request bhej sakte hain.',
          ],
        },
        {
          title: 'Service changes',
          paragraphs: [
            'ilm AI apne features, pricing, limits, supported tools, aur platform behavior ko waqt ke sath update kar sakta hai.',
            'Hum major operational changes ke liye reasonable communication maintain karne ki koshish karte hain.',
          ],
        },
      ]}
    />
  );
}
