import { Metadata } from 'next';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { Target, Users, Heart } from 'lucide-react';
export const metadata: Metadata = { title: 'About Us - StudyVerse AI' };

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-6">Hamare Baare Mein</h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          StudyVerse AI 2024 mein shuru hua ek mission ke saath: Pakistan ke har student ko quality education tak AI-powered access dena, chahe wo kisi bhi shehar ya board se ho.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Target, title: 'Hamari Mission', text: 'Affordable, accessible, AI-powered education sab Pakistani students ke liye.' },
            { icon: Users, title: 'Hamari Team', text: 'Educators, engineers, aur AI experts jo Pakistan ke education system ko samajhte hain.' },
            { icon: Heart, title: 'Hamare Values', text: 'Student-first approach, transparency, aur continuous improvement.' },
          ].map((item, i) => (
            <div key={i} className="glass rounded-xl p-6 border border-border/50">
              <item.icon className="w-8 h-8 text-violet-400 mb-3" />
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Aaj StudyVerse AI 50,000+ students ki madad kar raha hai apne board exams mein behtar scores lene mein. Hum FBISE se lekar provincial boards tak, sab ke liye design karte hain.
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}
