import { Metadata } from 'next';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { Target, Users, Heart } from 'lucide-react';
export const metadata: Metadata = { title: 'About Us - ilm AI' };

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-6">About ilm AI</h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          ilm AI began in 2024 with a mission to give every student in Pakistan AI-powered access to quality education, regardless of their city or board.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Target, title: 'Our mission', text: 'Affordable, accessible, AI-powered education for every Pakistani student.' },
            { icon: Users, title: 'Our team', text: 'Educators, engineers, and AI experts who understand Pakistan\'s education system.' },
            { icon: Heart, title: 'Our values', text: 'A student-first approach, transparency, and continuous improvement.' },
          ].map((item, i) => (
            <div key={i} className="glass rounded-xl p-6 border border-border/50">
              <item.icon className="w-8 h-8 text-violet-400 mb-3" />
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Today, ilm AI helps more than 50,000 students achieve better board exam scores. We support everyone from FBISE to provincial boards.
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}
