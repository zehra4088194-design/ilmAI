import type { Metadata, Viewport } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import { Providers } from '@/providers';
import { getSiteUrl } from '@/lib/utils/siteUrl';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'ilm AI - AI Study Platform for School, College & University', template: '%s | ilm AI' },
  description: 'AI-powered study platform for school, college, and university students: AI Tutor, MCQs, past papers, essays, assignments, presentations, viva prep, and study plans.',
  keywords: ['ilm-ai', 'Pakistan study', 'FBISE', 'Punjab board', 'matric', 'inter', 'university', 'assignment help', 'AI tutor', 'past papers'],
  authors: [{ name: 'ilm AI Team' }],
  creator: 'ilm AI',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', locale: 'en_PK', url: siteUrl, siteName: 'ilm AI',
    title: 'ilm AI - AI Study Platform for School, College & University',
    description: 'AI-powered tutoring, MCQ practice, assignments, presentations, viva prep, and past papers.',
    images: [{ url: '/images/og/og-default.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', site: '@ilm_ai' },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico', apple: '/icons/apple-touch-icon.png' },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#7c3aed' }, { media: '(prefers-color-scheme: dark)', color: '#8b5cf6' }],
  width: 'device-width', initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {adsenseClientId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        )}
      </head>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers locale="en">{children}</Providers>
      </body>
    </html>
  );
}
