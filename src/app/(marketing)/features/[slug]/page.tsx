import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { ArrowRight, BookOpenCheck, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { Button } from '@/components/ui/button';
import { getSiteUrl } from '@/lib/utils/siteUrl';
import { isPublicStudyToolSlug, PUBLIC_STUDY_TOOLS } from '@/lib/seo/study-tools';

export function generateStaticParams() {
  return Object.keys(PUBLIC_STUDY_TOOLS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isPublicStudyToolSlug(slug)) return {};
  const tool = PUBLIC_STUDY_TOOLS[slug];
  return {
    title: tool.name,
    description: tool.description,
    alternates: { canonical: `/features/${slug}` },
    openGraph: {
      title: `${tool.name} | ilm AI`,
      description: tool.description,
      url: `/features/${slug}`,
      type: 'website',
    },
  };
}

export default async function StudyToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isPublicStudyToolSlug(slug)) notFound();
  const tool = PUBLIC_STUDY_TOOLS[slug];
  const nonce = (await headers()).get('x-nonce') || undefined;
  const canonicalUrl = `${getSiteUrl()}/features/${slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: tool.name,
    description: tool.description,
    url: canonicalUrl,
    isPartOf: { '@type': 'WebSite', name: 'ilm AI', url: getSiteUrl() },
  };

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main>
        <section className="border-border/60 border-b px-4 pt-32 pb-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-violet-500/12 text-violet-400">
              <BookOpenCheck className="h-6 w-6" />
            </div>
            <h1 className="max-w-3xl text-4xl font-bold sm:text-5xl">{tool.name}</h1>
            <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-8">{tool.heading}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gradient">
                <Link href={`${tool.destination}?from=features`}>
                  {tool.action} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/library">Browse Library</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="px-4 py-14">
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)]">
            <div>
              <h2 className="text-2xl font-bold">Designed for a real study workflow</h2>
              <p className="text-muted-foreground mt-4 text-base leading-7">{tool.intro}</p>
            </div>
            <ul className="space-y-4" aria-label={`${tool.name} highlights`}>
              {tool.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm leading-6">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <LandingFooter />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
    </div>
  );
}
