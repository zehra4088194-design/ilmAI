import { Metadata } from 'next';
import { StaticContentPage } from '@/components/features/marketing/StaticContentPage';

export const metadata: Metadata = {
  title: 'Help Center - ilm AI',
  description: 'Account, billing, AI tools, parent dashboard, and technical support for ilm AI.',
};

export default async function HelpPage() {
  return (
    <StaticContentPage
      eyebrow="Support"
      title="Help Center"
      description="Find quick answers to common ilm AI questions here. If your issue is not resolved, contact us directly."
      sideTitle="Need direct help?"
      sideText="If you have an account, payment, parent-linking, or AI response issue, send us a message from the contact page."
      sideActions={[
        { href: '/contact', label: 'Contact Support', variant: 'gradient' },
        { href: '/status', label: 'Check System Status' },
      ]}
      sections={[
        {
          title: 'Account and login',
          bullets: [
            'If you cannot log in, check your email and password first.',
            'You can request a reset link from the Forgot Password page.',
            'If you use Google sign-in, use the same Google account again.',
            'If you do not receive the verification email, check your spam folder.',
          ],
        },
        {
          title: 'Subscriptions and payments',
          bullets: [
            'Plans are shown in PKR for Pakistan and USD for other countries.',
            'Paddle handles Visa/Mastercard recurring checkout; Pakistani cards must support international e-commerce and 3D Secure.',
            'Easypaisa/JazzCash manual verification is available as a fallback in Pakistan.',
            'The Play Store app uses and syncs existing web subscriptions.',
            'If payment succeeds but the plan does not activate, contact support with your Paddle receipt or wallet proof.',
          ],
        },
        {
          title: 'AI tools',
          bullets: [
            'AI Tutor, Guess Paper, Full Test, OCR, aur Essay Writer sab AI Gateway ke zariye run karte hain.',
            'If a response is slow, wait a few seconds and try again.',
            'For weak OCR results, use a clear image, good lighting, and a straight camera angle.',
            'For voice tutor issues, check microphone permission and use a stable internet connection.',
          ],
        },
        {
          title: 'Parent dashboard',
          bullets: [
            'The student should generate a parent invite or link code first.',
            'A linked Free account can see locked progress indicators; live dashboards, reports, and communication unlock on the student\'s Pro or Elite plan.',
            'Attachments are private and accessible only to linked users.',
          ],
        },
      ]}
    />
  );
}
