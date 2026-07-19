import { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
export const metadata: Metadata = { title: 'Blog - ilm AI' };

const POSTS = [
  { slug: 'fbise-exam-tips-2026', title: 'How to Prepare for FBISE Exams - Complete Guide 2026', excerpt: 'Proven strategies and study techniques for board exams.', date: '2026-05-15' },
  { slug: 'ai-tutoring-benefits', title: 'Benefits of AI Tutoring for Pakistani Students', excerpt: 'How AI technology is improving the study experience.', date: '2026-04-22' },
  { slug: 'time-management-students', title: 'Time Management Tips for Students', excerpt: 'How to balance study and the rest of your life.', date: '2026-03-10' },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-10">ilm AI Blog</h1>
        <div className="space-y-6">
          {POSTS.map(post => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block glass rounded-xl p-6 border border-border/50 hover:border-violet-500/30 transition-colors">
              <p className="text-xs text-muted-foreground mb-2">{new Date(post.date).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
              <p className="text-muted-foreground text-sm">{post.excerpt}</p>
            </Link>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
