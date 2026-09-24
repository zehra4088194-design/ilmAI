import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter, Geist_Mono, Caveat, Kalam } from 'next/font/google';
import { cookies, headers } from 'next/headers';
import '@/styles/globals.css';
import 'katex/dist/katex.min.css';
import { Providers } from '@/providers';
import { getSiteUrl } from '@/lib/utils/siteUrl';
import { getThemeStylesheetHref, parseAppTheme, THEME_COOKIE_NAME } from '@/lib/constants/themes';
import { DEFAULT_LOCALE, isValidLocale, LOCALE_COOKIE_NAME, type Locale } from '@/lib/i18n/config';
import { createClient } from '@/lib/supabase/server';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
// The "whiteboard" handwritten touch on AI answers — see .ai-doc-body h3 and .ai-final-answer in
// globals.css. Only ever used for a few short accent words, never body text, so weight 700 alone
// (Caveat's boldest) is enough.
const caveat = Caveat({ subsets: ['latin'], weight: ['700'], variable: '--font-caveat', display: 'swap' });
// A second, rounder handwriting face — used for a note's actual body text when a student picks
// "Handwritten" style (NoteEditor/NotesGrid), so it reads more like a real handwritten page than
// Caveat's script does at paragraph length. Needs the regular + bold weight range for that.
const kalam = Kalam({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-kalam', display: 'swap' });
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'ilm AI - AI Study Platform for School, College & University', template: '%s | ilm AI' },
  description:
    'Study notes, video lectures, a public library, AI Tutor, MCQs, past papers, and an AI Presentation Builder for school, college, and university students.',
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
  publisher: 'ilm AI',
  category: 'education',
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: siteUrl,
    siteName: 'ilm AI',
    title: 'ilm AI - AI Study Platform for School, College & University',
    description: 'AI-powered tutoring, MCQ practice, assignments, presentations, viva prep, and past papers.',
  },
  twitter: { card: 'summary_large_image' },
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
  const requestHeaders = await headers();
  const nonce = requestHeaders.get('x-nonce') || undefined;
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
        <Script id="service-worker-register" nonce={nonce} strategy="beforeInteractive">
          {process.env.NODE_ENV === 'production'
            ? `if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error) => {
    console.error('Service worker registration failed:', error);
  });
}`
            : ''}
        </Script>
        <link
          id="ilm-ai-theme-stylesheet"
          rel="stylesheet"
          href={getThemeStylesheetHref(initialTheme.family)}
          data-theme-family={initialTheme.family}
        />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} ${caveat.variable} ${kalam.variable} font-sans antialiased`}>
        <Providers locale={initialLocale} initialTheme={initialTheme.className}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
