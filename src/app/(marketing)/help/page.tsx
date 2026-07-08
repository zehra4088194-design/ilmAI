import { Metadata } from 'next';
import { StaticContentPage } from '@/components/features/marketing/StaticContentPage';

export const metadata: Metadata = {
  title: 'Help Center - ilm AI',
  description: 'Account, billing, AI tools, parent dashboard, and technical support for ilm AI.',
};

export default function HelpPage() {
  return (
    <StaticContentPage
      eyebrow="Support"
      title="Help Center"
      description="ilm AI use karte waqt jo common sawalat aate hain, un sab ka quick jawab yahan diya gaya hai. Agar issue phir bhi solve na ho to humse direct rabta karein."
      sideTitle="Need direct help?"
      sideText="Agar account, payment, parent linking, ya AI response se related koi masla ho to contact page se message bhejein."
      sideActions={[
        { href: '/contact', label: 'Contact Support', variant: 'gradient' },
        { href: '/status', label: 'Check System Status' },
      ]}
      sections={[
        {
          title: 'Account aur login',
          bullets: [
            'Agar login nahi ho raha to pehle email aur password dobara check karein.',
            'Forgot Password page se reset link hasil ki ja sakti hai.',
            'Google sign-in use karte hain to wahi Google account dobara use karein.',
            'Agar verification email na mile to spam folder bhi check karein.',
          ],
        },
        {
          title: 'Subscriptions aur payments',
          bullets: [
            'Filhaal sirf manual Pakistan payments active hain.',
            'Easypaisa number 03480049900 aur JazzCash number 03006596490 use karein.',
            'Payment bhejne ke baad screenshot zehra4088194@gmail.com par share karein.',
            'Within 1 hour your transaction will be verified.',
            'Agar payment ho jaye lekin plan upgrade na ho to support se receipt ya transaction reference ke sath rabta karein.',
          ],
        },
        {
          title: 'AI tools',
          bullets: [
            'AI Tutor, Guess Paper, Full Test, OCR, aur Essay Writer sab AI Gateway ke zariye run karte hain.',
            'Agar response slow ho to kuch seconds wait karke dobara try karein.',
            'Agar OCR result weak ho to clear image, achhi lighting, aur seedha camera angle use karein.',
            'Voice tutor issue ki surat mein microphone permission aur stable internet check karein.',
          ],
        },
        {
          title: 'Parent dashboard',
          bullets: [
            'Student pehle parent invite ya link code generate kare.',
            'Parent account approved link ke baad messages, routine tests, aur attachments dekh sakta hai.',
            'Attachments private hoti hain aur linked users ke ilawa kisi ko access nahi hota.',
          ],
        },
      ]}
    />
  );
}
