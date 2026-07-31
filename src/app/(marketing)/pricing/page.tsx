import { Metadata } from 'next';
import { headers } from 'next/headers';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { PricingSection } from '@/components/features/landing/PricingSection';
import { FaqSection } from '@/components/features/landing/FaqSection';
import { getCurrencyForCountry } from '@/lib/constants';
export const metadata: Metadata = {
  title: 'Pricing - ilm AI',
  description: 'Compare ilm AI Free, Pro, and Elite study plans for school, college, and university learners.',
  alternates: { canonical: '/pricing' },
};
export default async function PricingPage() {
  const requestHeaders = await headers();
  const country = requestHeaders.get('cf-ipcountry') || requestHeaders.get('x-country-code') || 'PK';

  return (
    <div className="bg-background min-h-screen">
      <Navbar />
      <main className="pt-20">
        <PricingSection currency={getCurrencyForCountry(country)} />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
