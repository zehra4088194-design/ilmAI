import type { Metadata, Viewport } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import { Providers } from '@/providers';
import { getSiteUrl } from '@/lib/utils/siteUrl';
import { getThemeStylesheetHref, parseAppTheme, THEME_COOKIE_NAME } from '@/lib/constants/themes';
import { DEFAULT_LOCALE, isValidLocale, LOCALE_COOKIE_NAME, type Locale } from '@/lib/i18n/config';
import { createClient } from '@/lib/supabase/server';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'ilm AI - AI Study Platform for School, College & University', template: '%s | ilm AI' },
  description:
    'AI-powered study platform for school, college, and university students: AI Tutor, MCQs, past papers, essays, assignments, presentations, viva prep, and study plans.',
  keywords: [
    'ilm-ai',
    'Pakistan study',
    'FBISE',
    'Punjab board',
    'matric',
    'inter',
    'university',
    'assignment help',
    'AI tutor',
    'past papers',
  ],
  authors: [{ name: 'ilm AI Team' }],
  creator: 'ilm AI',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: siteUrl,
    siteName: 'ilm AI',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#7c3aed' },
    { media: '(prefers-color-scheme: dark)', color: '#8b5cf6' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialTheme = parseAppTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);
  const savedLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  let initialLocale: Locale = isValidLocale(savedLocale) ? savedLocale : DEFAULT_LOCALE;
  if (!isValidLocale(savedLocale)) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await (supabase.from('profiles') as any)
        .select('preferred_language')
        .eq('id', user.id)
        .maybeSingle();
      if (isValidLocale(profile?.preferred_language)) initialLocale = profile.preferred_language;
    }
  }

  return (
    <html
      lang={initialLocale === 'roman-ur' ? 'en-PK' : 'en'}
      dir="ltr"
      className={initialTheme.className}
      data-theme-family={initialTheme.family}
      data-theme-mode={initialTheme.mode}
      suppressHydrationWarning
    >
      <head>
        <link
          id="ilm-ai-theme-stylesheet"
          rel="stylesheet"
          href={getThemeStylesheetHref(initialTheme.family)}
          data-theme-family={initialTheme.family}
        />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers locale={initialLocale} initialTheme={initialTheme.className}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
