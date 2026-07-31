import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, Clock3 } from 'lucide-react';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { BLOG_POSTS } from '@/content/blog-posts';

export const metadata: Metadata = {
  title: 'Study Guides for Pakistani Students',
  description:
    'Practical, original study guides on board-exam preparation, past papers, time management, MCQ practice, and responsible AI tutoring.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: '/blog',
    title: 'Study Guides for Pakistani Students | ilm AI',
    description:
      'Detailed study methods for board exams, past-paper practice, time management, MCQs, and responsible AI learning.',
  },
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-PK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export default function BlogPage() {
  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main>
        <section className="border-border/60 to-background border-b bg-gradient-to-b from-violet-950/40 px-4 pt-32 pb-14">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-violet-300">
              <BookOpen className="h-4 w-4" />
              ilm AI Learning Library
            </div>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              Study methods you can use, test, and improve
            </h1>
            <p className="text-muted-foreground mt-5 max-w-3xl text-lg leading-8">
              Detailed guides for Pakistani students preparing for board exams and university work. Each article focuses
              on a practical process—not shortcuts or guaranteed-score claims.
            </p>
          </div>
        </section>

        <section className="px-4 py-14">
          <div className="mx-auto grid max-w-5xl gap-7">
            {BLOG_POSTS.map((post, index) => (
              <article
                key={post.slug}
                className="border-border/70 bg-card/60 rounded-2xl border p-6 shadow-sm transition-colors hover:border-violet-500/40 sm:p-8"
              >
                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  <span className="rounded-full bg-violet-500/10 px-3 py-1 font-semibold text-violet-300">
                    {post.category}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <time dateTime={post.updatedAt}>
                      {post.updatedAt === post.publishedAt ? 'Published' : 'Updated'} {formatDate(post.updatedAt)}
                    </time>
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {post.readingMinutes} min read
                  </span>
                </div>
                <h2 className={`${index === 0 ? 'text-3xl' : 'text-2xl'} max-w-4xl leading-tight font-bold`}>
                  <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-violet-300">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-muted-foreground mt-4 max-w-4xl leading-7">{post.excerpt}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200"
                >
                  Read the complete guide <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
