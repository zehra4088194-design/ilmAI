import type { Metadata, Viewport } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import { Providers } from '@/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://ilm.ai'),
  title: { default: 'ilm AI - Pakistan ka #1 AI Study Platform', template: '%s | ilm AI' },
  description: 'Pakistan ka sabse advanced AI-powered study platform. FBISE, Punjab, Sindh, KPK boards ke liye MCQs, AI Tutor, Past Papers aur bahut kuch. Free mein start karo!',
  keywords: ['ilm-ai', 'Pakistan study', 'FBISE', 'Punjab board', 'matric', 'inter', 'MCQ', 'AI tutor', 'past papers'],
  authors: [{ name: 'ilm AI Team' }],
  creator: 'ilm AI',
  openGraph: {
    type: 'website', locale: 'en_PK', url: 'https://ilm.ai', siteName: 'ilm AI',
    title: 'ilm AI - Pakistan ka #1 AI Study Platform',
    description: 'AI-powered MCQ practice, tutoring, and past papers for Pakistani students.',
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
