import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpenCheck, Brain, Heart, ShieldCheck, Target, Users } from 'lucide-react';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';

export const metadata: Metadata = {
  title: 'About ilm AI',
  description:
    'Learn who builds ilm AI, what the platform publishes, how educational guides are reviewed, and how to report a correction.',
  alternates: { canonical: '/about' },
};

const PRINCIPLES = [
  {
    icon: Target,
    title: 'Useful before impressive',
    text: 'A feature or guide should help a student complete a real learning task, not merely sound advanced.',
  },
  {
    icon: ShieldCheck,
    title: 'Honest about AI',
    text: 'AI can explain and create practice, but it can also be wrong. Important answers should be checked.',
  },
  {
    icon: Heart,
    title: 'Student-first access',
    text: 'We design for different devices, study levels, boards, and budgets across Pakistan.',
  },
];

export default function AboutPage() {
  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main>
        <section className="border-border/60 to-background border-b bg-gradient-to-b from-violet-950/40 px-4 pt-32 pb-14">
          <div className="mx-auto max-w-4xl">
            <p className="mb-4 text-sm font-semibold text-violet-300">About ilm AI</p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              Practical learning support, built for students in Pakistan
            </h1>
            <p className="text-muted-foreground mt-6 max-w-3xl text-lg leading-8">
              ilm AI is an independent education-technology project built by a small team in Pakistan. Development began
              in 2024 around a simple question: how can one platform help a student understand a topic, practise it,
              and see what to improve next?
            </p>
          </div>
        </section>

        <section className="px-4 py-14">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-5 md:grid-cols-3">
              {PRINCIPLES.map((item) => (
                <div key={item.title} className="border-border/70 bg-card/50 rounded-2xl border p-6">
                  <item.icon className="mb-4 h-7 w-7 text-violet-300" />
                  <h2 className="font-semibold">{item.title}</h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 grid gap-12">
              <section className="grid gap-6 md:grid-cols-[3rem_minmax(0,1fr)]">
                <Brain className="h-9 w-9 text-violet-300" />
                <div>
                  <h2 className="text-2xl font-bold">What the product does</h2>
                  <div className="text-muted-foreground mt-4 space-y-4 leading-7">
                    <p>
                      The platform combines AI tutoring, practice questions, past-paper and library resources, study
                      planning, flashcards, progress tools, and university workflows. Some features require an account
                      because they use a learner’s selected level, subjects, history, or private files.
                    </p>
                    <p>
                      Public pages and study guides are available without signing in. Paid plans fund AI processing and
                      expanded limits; the core product also includes a free tier. Current inclusions and prices are
                      listed on the{' '}
                      <Link href="/pricing" className="text-violet-300 underline-offset-4 hover:underline">
                        pricing page
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-[3rem_minmax(0,1fr)]">
                <BookOpenCheck className="h-9 w-9 text-violet-300" />
                <div>
                  <h2 className="text-2xl font-bold">How our public guides are prepared</h2>
                  <div className="text-muted-foreground mt-4 space-y-4 leading-7">
                    <p>
                      The ilm AI Editorial Team writes guides around a specific student task, such as checking a past
                      paper or recovering from a missed study day. We favour concrete steps, examples, limits, and
                      self-checks over guaranteed marks or “secret” exam predictions.
                    </p>
                    <p>
                      Before publication, material is checked for clarity, internal consistency, responsible AI
                      guidance, and unsupported claims. Where a board rule or syllabus can change, we direct students to
                      the responsible authority and treat its current notice as the source of truth.
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 md:grid-cols-[3rem_minmax(0,1fr)]">
                <Users className="h-9 w-9 text-violet-300" />
                <div>
                  <h2 className="text-2xl font-bold">Corrections and accountability</h2>
                  <div className="text-muted-foreground mt-4 space-y-4 leading-7">
                    <p>
                      Educational content should be open to correction. Articles show a visible update date, and
                      material changes are reviewed before publication. We do not present AI output as an official board
                      notice or a substitute for a qualified teacher’s judgment.
                    </p>
                    <p>
                      If you find an error, broken link, unclear explanation, accessibility issue, or outdated board
                      reference, send the page URL and a short description through our{' '}
                      <Link href="/contact" className="text-violet-300 underline-offset-4 hover:underline">
                        contact page
                      </Link>
                      . We review correction reports and update the relevant page when needed.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <aside className="mt-14 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-7">
              <h2 className="text-xl font-bold">A note for students and parents</h2>
              <p className="text-muted-foreground mt-3 leading-7">
                AI-generated educational responses can contain mistakes. Verify important formulas, quotations,
                citations, medical or safety information, and official academic requirements with the prescribed text or
                responsible professional. See our{' '}
                <Link href="/help" className="text-violet-300 underline-offset-4 hover:underline">
                  Help Center
                </Link>{' '}
                for product guidance and our{' '}
                <Link href="/privacy" className="text-violet-300 underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>{' '}
                for data practices.
              </p>
            </aside>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
