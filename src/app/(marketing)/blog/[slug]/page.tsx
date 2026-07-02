import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { notFound } from 'next/navigation';

const POSTS: Record<string, { title: string; date: string; content: string }> = {
  'fbise-exam-tips-2026': { title: 'FBISE Exam Ki Tayari Kaise Karein - Complete Guide 2026', date: '2026-05-15', content: 'FBISE exams ki tayari ke liye sabse zaroori cheez hai consistent practice. Past papers solve karo, MCQs ki practice karo, aur apni weak areas identify karo. StudyVerse AI Tutor se concepts clear karo jo samajh nahi aate.' },
  'ai-tutoring-benefits': { title: 'AI Tutoring Ke Fawaid Pakistani Students Ke Liye', date: '2026-04-22', content: 'AI tutoring 24/7 available hoti hai, personalized explanations deti hai, aur traditional tuition se kaafi affordable hai. Pakistani students ke liye ye game-changer ban raha hai.' },
  'time-management-students': { title: 'Students Ke Liye Time Management Tips', date: '2026-03-10', content: 'Pomodoro technique use karo, daily goals set karo, aur distractions minimize karo. StudyVerse ka Study Timer feature isme madad karta hai.' },
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
