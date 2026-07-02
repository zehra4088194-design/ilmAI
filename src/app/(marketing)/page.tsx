import { Metadata } from 'next';
import { Navbar } from '@/components/features/landing/Navbar';
import { HeroSection } from '@/components/features/landing/HeroSection';
import { StatsSection } from '@/components/features/landing/StatsSection';
import { FeaturesSection } from '@/components/features/landing/FeaturesSection';
import { BoardsSection } from '@/components/features/landing/BoardsSection';
import { PricingSection } from '@/components/features/landing/PricingSection';
import { TestimonialsSection } from '@/components/features/landing/TestimonialsSection';
import { FaqSection } from '@/components/features/landing/FaqSection';
import { LandingFooter } from '@/components/features/landing/Footer';

export const metadata: Metadata = {
  title: 'StudyVerse AI - Pakistan ka #1 AI Study Platform',
  description: 'AI-powered MCQ practice, tutoring, and past papers for Pakistani students. Free mein start karo!',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <BoardsSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
