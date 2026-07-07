import Link from 'next/link';
import { ReactNode } from 'react';
import { LandingFooter } from '@/components/features/landing/Footer';
import { Navbar } from '@/components/features/landing/Navbar';
import { Button } from '@/components/ui/button';

type Section = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type StaticContentPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Section[];
  sideTitle: string;
  sideText: string;
  sideActions?: Array<{
    href: string;
    label: string;
    variant?: 'default' | 'outline' | 'gradient' | 'ghost';
  }>;
  children?: ReactNode;
};

export function StaticContentPage({
  eyebrow,
  title,
  description,
  sections,
  sideTitle,
  sideText,
  sideActions = [],
  children,
}: StaticContentPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 max-w-3xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-violet-400">{eyebrow}</p>
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">{description}</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                {sections.map((section) => (
                  <section key={section.title} className="glass rounded-2xl border border-border/50 p-6 md:p-8">
                    <h2 className="mb-4 text-2xl font-semibold">{section.title}</h2>
                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph} className="mb-4 last:mb-0 text-sm leading-7 text-muted-foreground md:text-base">
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="space-y-3 text-sm leading-7 text-muted-foreground md:text-base">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-3">
                            <span className="mt-2 h-2 w-2 rounded-full bg-violet-400/80" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
                {children}
              </div>

              <aside className="glass h-fit rounded-2xl border border-border/50 p-6 lg:sticky lg:top-28">
                <h2 className="mb-3 text-xl font-semibold">{sideTitle}</h2>
                <p className="mb-5 text-sm leading-7 text-muted-foreground">{sideText}</p>
                <div className="space-y-3">
                  {sideActions.map((action) => (
                    <Button key={action.href} asChild variant={action.variant || 'outline'} className="w-full justify-center">
                      <Link href={action.href}>{action.label}</Link>
                    </Button>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
