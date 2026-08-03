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
import { PRIMARY_SITE_LINKS } from '@/lib/seo/study-tools';
import { getSiteUrl } from '@/lib/utils/siteUrl';

export const metadata: Metadata = {
  title: 'ilm AI - AI-Powered Learning for Pakistan and India',
  description:
    'Study notes, video lectures, a public library, AI Tutor, MCQ practice, and an AI Presentation Builder for Pakistani and Indian students.',
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  // Already logged in? Skip the marketing page entirely and go straight to
  // the dashboard — a returning, authenticated visitor should never land
  // back on the landing page.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect('/dashboard');
  }
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') || undefined;
  const country = requestHeaders.get('cf-ipcountry') || requestHeaders.get('x-country-code') || 'PK';
  const currency = getCurrencyForCountry(country);
  const siteUrl = getSiteUrl();
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'ilm AI',
        url: siteUrl,
        description: metadata.description,
      },
      {
        '@type': 'ItemList',
        name: 'ilm AI Study Tools',
        itemListElement: PRIMARY_SITE_LINKS.map((link, index) => ({
          '@type': 'SiteNavigationElement',
          position: index + 1,
          name: link.name,
          url: `${siteUrl}${link.url}`,
        })),
      },
    ],
  };

  return (
    <div className="bg-background min-h-screen">
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
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
      />
    </div>
  );
}
