import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { notFound } from 'next/navigation';

const POSTS: Record<string, { title: string; date: string; content: string }> = {
  'fbise-exam-tips-2026': { title: 'How to Prepare for FBISE Exams - Complete Guide 2026', date: '2026-05-15', content: 'Consistent practice is essential for FBISE exams. Solve past papers, practise MCQs, and identify your weak areas. Use ilm AI Tutor to clarify difficult concepts.' },
  'ai-tutoring-benefits': { title: 'Benefits of AI Tutoring for Pakistani Students', date: '2026-04-22', content: 'AI tutoring is available 24/7, provides personalized explanations, and is more affordable than traditional tuition. It is becoming a game changer for Pakistani students.' },
  'time-management-students': { title: 'Time Management Tips for Students', date: '2026-03-10', content: 'Use the Pomodoro technique, set daily goals, and minimize distractions. ilm AI Study Timer can help you stay on track.' },
};

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 container mx-auto px-4 max-w-2xl">
        <p className="text-xs text-muted-foreground mb-3">{new Date(post.date).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <h1 className="text-3xl font-bold mb-6">{post.title}</h1>
        <p className="text-muted-foreground leading-relaxed text-lg">{post.content}</p>
      </main>
      <LandingFooter />
    </div>
  );
}
