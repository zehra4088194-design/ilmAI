import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/features/landing/Navbar';
import { HeroSection } from '@/components/features/landing/HeroSection';
import { StatsSection } from '@/components/features/landing/StatsSection';
import { FeaturesSection } from '@/components/features/landing/FeaturesSection';
import { BoardsSection } from '@/components/features/landing/BoardsSection';
import { PricingSection } from '@/components/features/landing/PricingSection';
import { TestimonialsSection } from '@/components/features/landing/TestimonialsSection';
import { FaqSection } from '@/components/features/landing/FaqSection';
import { LandingFooter } from '@/components/features/landing/Footer';
import { getCurrencyForCountry } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'ilm AI - AI-Powered Learning for Pakistan and India',
  description: 'AI-powered MCQ practice, tutoring, and past papers for Pakistani and Indian students. Start for free!',
};

export default async function HomePage() {
  // Already logged in? Skip the marketing page entirely and go straight to
  // the dashboard — a returning, authenticated visitor should never land
  // back on the landing page.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect('/dashboard');
  }
  const requestHeaders = await headers();
  const country = requestHeaders.get('cf-ipcountry') || requestHeaders.get('x-country-code') || 'PK';
  const currency = getCurrencyForCountry(country);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <BoardsSection />
        <PricingSection currency={currency} />
        <TestimonialsSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
