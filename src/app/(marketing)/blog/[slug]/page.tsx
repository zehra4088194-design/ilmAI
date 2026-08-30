import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { HouseAdBanner } from '@/components/features/ads/HouseAdBanner';
import { BLOG_POSTS, BLOG_POSTS_BY_SLUG } from '@/content/blog-posts';
import { getSiteUrl } from '@/lib/utils/siteUrl';

type BlogPostPageProps = { params: Promise<{ slug: string }> };

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS_BY_SLUG[slug];
  if (!post) {
    return { title: 'Guide Not Found', robots: { index: false, follow: false } };
  }

  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    authors: [{ name: 'ilm AI Editorial Team', url: '/about' }],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: ['ilm AI Editorial Team'],
      section: post.category,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS_BY_SLUG[slug];
  if (!post) notFound();
  const nonce = (await headers()).get('x-nonce') || undefined;

  const canonicalUrl = `${getSiteUrl()}/blog/${post.slug}`;
  const relatedPosts = BLOG_POSTS.filter((item) => item.slug !== post.slug).slice(0, 3);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        mainEntityOfPage: canonicalUrl,
        inLanguage: 'en-PK',
        author: {
          '@type': 'Organization',
          name: 'ilm AI Editorial Team',
          url: `${getSiteUrl()}/about`,
        },
        publisher: {
          '@type': 'Organization',
          name: 'ilm AI',
          url: getSiteUrl(),
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: post.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main className="px-4 pt-28 pb-20">
        <article className="mx-auto max-w-4xl">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> All study guides
          </Link>

          <header className="border-border/70 border-b pb-9">
            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
              {post.category}
            </span>
            <h1 className="mt-5 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">{post.title}</h1>
            <p className="text-muted-foreground mt-5 text-lg leading-8">{post.description}</p>
            <div className="text-muted-foreground mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                {post.readingMinutes} minute read
              </span>
              <Link href="/about" className="hover:text-foreground underline-offset-4 hover:underline">
                By ilm AI Editorial Team
              </Link>
            </div>
          </header>

          <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="min-w-0">
              <div className="space-y-5 text-lg leading-8">
                {post.intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <aside className="my-10 rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6">
                <div className="mb-4 flex items-center gap-2 font-semibold">
                  <BookOpenCheck className="h-5 w-5 text-violet-300" />
                  Key takeaways
                </div>
                <ul className="space-y-3">
                  {post.takeaways.map((takeaway) => (
                    <li key={takeaway} className="flex gap-3 leading-7">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-violet-300" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </aside>

              <HouseAdBanner slot="content_inline" className="my-10" />

              <div className="space-y-12">
                {post.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h2 className="mb-5 text-2xl font-bold tracking-tight sm:text-3xl">{section.heading}</h2>
                    {section.paragraphs && (
                      <div className="text-muted-foreground space-y-4 leading-8">
                        {section.paragraphs.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    )}
                    {section.bullets && (
                      <ul className="text-muted-foreground mt-5 space-y-3">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-3 leading-7">
                            <CheckCircle2 className="mt-1.5 h-4 w-4 shrink-0 text-violet-300" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.numbered && (
                      <ol className="mt-6 space-y-4">
                        {section.numbered.map((item, index) => (
                          <li key={item.title} className="border-border/70 bg-card/40 rounded-xl border p-5">
                            <div className="flex gap-4">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm font-bold text-violet-300">
                                {index + 1}
                              </span>
                              <div>
                                <h3 className="font-semibold">{item.title}</h3>
                                <p className="text-muted-foreground mt-1 leading-7">{item.text}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                    {section.note && (
                      <div className="mt-6 flex gap-3 rounded-xl border border-blue-500/25 bg-blue-500/5 p-4">
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
                        <p className="text-muted-foreground text-sm leading-6">{section.note}</p>
                      </div>
                    )}
                  </section>
                ))}
              </div>

              <section className="border-border/70 mt-14 border-t pt-10">
                <h2 className="text-3xl font-bold">Frequently asked questions</h2>
                <div className="mt-6 space-y-5">
                  {post.faq.map((item) => (
                    <div key={item.question} className="border-border/70 rounded-xl border p-5">
                      <h3 className="font-semibold">{item.question}</h3>
                      <p className="text-muted-foreground mt-2 leading-7">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              {post.sources && (
                <section className="border-border/70 mt-10 border-t pt-8">
                  <h2 className="text-lg font-semibold">Official reference</h2>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    Use the responsible authority for the latest syllabus, notices, and exam requirements.
                  </p>
                  <ul className="mt-3">
                    {post.sources.map((source) => (
                      <li key={source.href}>
                        <a
                          href={source.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-violet-300 underline-offset-4 hover:underline"
                        >
                          {source.label} <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <aside className="border-border/70 bg-muted/20 mt-10 rounded-2xl border p-6 text-sm">
                <p className="font-semibold">About this guide</p>
                <p className="text-muted-foreground mt-2 leading-6">
                  The ilm AI Editorial Team prepares practical educational material and reviews it for clarity,
                  responsible AI use, and relevance to students in Pakistan. Board rules can change, so official notices
                  take priority. Found an error?{' '}
                  <Link href="/contact" className="text-violet-300 underline">
                    Tell us
                  </Link>
                  .
                </p>
              </aside>
            </div>

            <aside className="hidden lg:block">
              <nav aria-label="On this page" className="sticky top-24">
                <p className="mb-3 text-sm font-semibold">On this page</p>
                <ol className="border-border space-y-2 border-l pl-4">
                  {post.sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="text-muted-foreground hover:text-foreground block text-sm leading-5"
                      >
                        {section.heading.replace(/^\d+\.\s*/, '')}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          </div>

          <section className="border-border/70 border-t pt-10">
            <h2 className="text-2xl font-bold">Continue learning</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {relatedPosts.map((item) => (
                <Link
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  className="border-border/70 rounded-xl border p-4 hover:border-violet-500/40"
                >
                  <span className="text-xs font-semibold text-violet-300">{item.category}</span>
                  <h3 className="mt-2 leading-snug font-semibold">{item.title}</h3>
                  <span className="text-muted-foreground mt-3 inline-flex items-center gap-1 text-xs">
                    Read guide <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </main>
      <LandingFooter />
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </div>
  );
}
