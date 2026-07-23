'use client';
import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useState, type ReactNode } from 'react';
import { I18nProvider } from '@/providers/I18nProvider';
import type { Locale } from '@/lib/i18n/config';
import { APP_THEME_IDS, DEFAULT_THEME_ID, type AppThemeId } from '@/lib/constants/themes';
import { ThemeRuntime } from '@/components/common/ThemeRuntime';

const AdSenseScript = dynamic(
  () => import('@/components/features/ads/AdSenseScript').then((module) => module.AdSenseScript),
  { ssr: false }
);
const CookieConsent = dynamic(
  () => import('@/components/features/cookies/CookieConsent').then((module) => module.CookieConsent),
  { ssr: false }
);
const GlobalSpeechControls = dynamic(
  () => import('@/components/features/speech/GlobalSpeechControls').then((module) => module.GlobalSpeechControls),
  { ssr: false }
);
const PostHogClient = dynamic(
  () => import('@/components/features/analytics/PostHogClient').then((module) => module.PostHogClient),
  { ssr: false }
);
const ServiceWorkerRegister = dynamic(
  () =>
    import('@/components/features/offline/ServiceWorkerRegister').then(
      (module) => module.ServiceWorkerRegister
    ),
  { ssr: false }
);
const ReactQueryDevtools =
  process.env.NODE_ENV === 'development'
    ? dynamic(
        () =>
          import('@tanstack/react-query-devtools').then(
            (module) => module.ReactQueryDevtools
          ),
        { ssr: false }
      )
    : null;

export function Providers({
  children,
  locale,
  initialTheme = DEFAULT_THEME_ID,
}: {
  children: ReactNode;
  locale: Locale;
  initialTheme?: AppThemeId;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: 0 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <ThemeProvider
          attribute="class"
          defaultTheme={initialTheme}
          themes={APP_THEME_IDS}
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <ThemeRuntime />
          {children}
          <AdSenseScript />
          <PostHogClient />
          <ServiceWorkerRegister />
          <GlobalSpeechControls />
          <CookieConsent />
          <Toaster
            position="top-right"
            richColors
            expand
            duration={4000}
            toastOptions={{
              classNames: { toast: 'glass', title: 'font-semibold', description: 'text-muted-foreground' },
            }}
          />
        </ThemeProvider>
      </I18nProvider>
      {ReactQueryDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
