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
      description="Ye Privacy Policy batati hai ke ilm AI user data ko kaise collect, use, protect, aur retain karta hai jab aap website, dashboard, AI features, payments, aur parent tools use karte hain."
      sideTitle="Questions about data?"
      sideText="Agar aapko data handling, account removal, ya privacy concerns par sawal hai to support team se direct rabta karein."
      sideActions={[
        { href: '/contact', label: 'Contact Support', variant: 'gradient' },
        { href: '/terms', label: 'Read Terms of Service' },
      ]}
      sections={[
        {
          title: 'What we collect',
          bullets: [
            'Account data jaise naam, email address, board, grade, aur subscription tier.',
            'Learning activity jaise quiz attempts, notes, routines, bookmarks, flashcards, aur progress records.',
            'Parent linking data, messages, aur attachments jab parent dashboard features use kiye jate hain.',
            'Payment-related metadata jo provider verification aur subscription management ke liye zaroori ho.',
          ],
        },
        {
          title: 'How we use your data',
          bullets: [
            'Account chalane, dashboard personalize karne, aur academic recommendations dene ke liye.',
            'AI tools ko better context dene ke liye, jaise board, grade, aur selected subjects.',
            'Subscription activation, billing verification, aur abuse prevention ke liye.',
            'Support issues diagnose karne aur platform improve karne ke liye.',
          ],
        },
        {
          title: 'Who processes sensitive AI data',
          paragraphs: [
            'Saare raw AI aur scan provider secrets directly browser ya public frontend mein expose nahi kiye jate.',
            'AI aur OCR requests secure gateway ke zariye route hoti hain. External providers request process kar sakte hain sirf response generate karne ke liye.',
          ],
        },
        {
          title: 'Data storage and protection',
          bullets: [
            'User records secure backend services mein store kiye jate hain.',
            'Private attachments aur parent-linked files protected storage access rules ke sath rakhi jati hain.',
            'Hum unauthorized access, misuse, aur accidental disclosure ko limit karne ke liye technical safeguards use karte hain.',
          ],
        },
        {
          title: 'User choices',
          bullets: [
            'Aap apna profile data update kar sakte hain.',
            'Aap support ke zariye account deletion ya data removal request bhej sakte hain.',
            'Aap marketing ya support communication preferences ke hawale se humse direct rabta kar sakte hain.',
          ],
        },
      ]}
    />
  );
}
