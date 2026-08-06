import type { Metadata } from 'next';
import { BookOpenCheck, CreditCard, LifeBuoy, Mail, MessageSquareWarning, Phone } from 'lucide-react';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { ContactForm } from '@/components/features/marketing/ContactForm';

export const metadata: Metadata = {
  title: 'Contact ilm AI',
  description:
    'Contact ilm AI support about account access, billing, product issues, privacy, accessibility, or corrections to educational content.',
  alternates: { canonical: '/contact' },
};

const CONTACT_TOPICS = [
  {
    icon: LifeBuoy,
    title: 'Product support',
    text: 'Account access, AI tools, scans, parent features, or unexpected errors.',
  },
  {
    icon: CreditCard,
    title: 'Billing',
    text: 'Payment receipts, plan activation, duplicate charges, or refund questions.',
  },
  {
    icon: BookOpenCheck,
    title: 'Content correction',
    text: 'Outdated references, broken links, unclear explanations, or factual errors.',
  },
  {
    icon: MessageSquareWarning,
    title: 'Privacy or safety',
    text: 'Data requests, abuse reports, accessibility, or responsible-use concerns.',
  },
];

export default function ContactPage() {
  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main>
        <section className="border-border/60 to-background border-b bg-gradient-to-b from-violet-950/40 px-4 pt-32 pb-12">
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-violet-300">
              <Mail className="h-4 w-4" /> Contact ilm AI
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Tell us what needs attention</h1>
            <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-8">
              Give us the relevant page, account context, or error message. Do not send passwords, one-time codes,
              payment PINs, or unnecessary identity documents.
            </p>
          </div>
        </section>

        <section className="px-4 py-14">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <ContactForm />
            <aside>
              <h2 className="text-lg font-semibold">What we can help with</h2>
              <div className="mt-5 space-y-5">
                {CONTACT_TOPICS.map((topic) => (
                  <div key={topic.title} className="flex gap-3">
                    <topic.icon className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
                    <div>
                      <h3 className="text-sm font-semibold">{topic.title}</h3>
                      <p className="text-muted-foreground mt-1 text-sm leading-6">{topic.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-border/70 mt-8 rounded-xl border p-5">
                <p className="text-sm font-semibold">Direct contact</p>
                <a
                  href="mailto:ilmai.study1@gmail.com"
                  className="mt-2 block text-sm text-violet-300 underline-offset-4 hover:underline"
                >
                  ilmai.study1@gmail.com
                </a>
                <a
                  href="tel:+923480049900"
                  className="mt-3 flex items-center gap-2 text-sm text-violet-300 underline-offset-4 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  03480049900
                </a>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
