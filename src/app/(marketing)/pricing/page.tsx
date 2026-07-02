import { Metadata } from 'next';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { PricingSection } from '@/components/features/landing/PricingSection';
import { FaqSection } from '@/components/features/landing/FaqSection';
export const metadata: Metadata = { title: 'Pricing - StudyVerse AI' };
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <PricingSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
