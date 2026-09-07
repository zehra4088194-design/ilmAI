'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { BLOG_POSTS, type BlogPost } from '@/content/blog-posts';

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-PK', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  );
}

// Reuses the same posts that power /blog — this is a "recent news"-style strip on the homepage,
// not a separate content system, so a new post shows up here automatically.
const RECENT_POSTS: BlogPost[] = [...BLOG_POSTS]
  .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  .slice(0, 3);

export function RecentUpdatesSection() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">
              Recent from <span className="gradient-text">ilm AI</span>
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl">
              What we shipped and what we are writing about — straight from the team building the platform.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {RECENT_POSTS.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className="glass group flex h-full flex-col rounded-2xl border border-border/50 p-6 transition-all duration-300 hover:border-violet-500/30"
              >
                <span className="inline-block w-fit rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-400">
                  {post.category}
                </span>
                <h3 className="mt-4 text-lg font-semibold leading-snug group-hover:text-violet-300">{post.title}</h3>
                <p className="text-muted-foreground mt-2 line-clamp-3 flex-1 text-sm leading-relaxed">{post.excerpt}</p>
                <span className="text-muted-foreground mt-5 flex items-center gap-1.5 text-xs">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(post.updatedAt)}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
