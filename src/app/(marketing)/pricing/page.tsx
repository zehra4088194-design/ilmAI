import { Metadata } from 'next';
import { Navbar } from '@/components/features/landing/Navbar';
import { LandingFooter } from '@/components/features/landing/Footer';
import { PricingSectionV2 } from '@/components/features/landing/PricingSectionV2';
import { FaqSection } from '@/components/features/landing/FaqSection';
export const metadata: Metadata = {
  title: 'Pricing - ilm AI',
  description: 'Compare ilm AI Free, Pro, and Elite study plans for school, college, and university learners.',
  alternates: { canonical: '/pricing' },
};
export default function PricingPage() {
  return <div className="bg-background min-h-screen"><Navbar /><main className="pt-20"><PricingSectionV2 /><FaqSection /></main><LandingFooter /></div>;
}
