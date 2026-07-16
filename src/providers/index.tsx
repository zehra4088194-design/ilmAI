'use client';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { useState, type ReactNode } from 'react';
import { I18nProvider } from '@/providers/I18nProvider';
import type { Locale } from '@/lib/i18n/config';
import { GlobalSpeechControls } from '@/components/features/speech/GlobalSpeechControls';
import { CookieConsent } from '@/components/features/cookies/CookieConsent';
import { AdSenseScript } from '@/components/features/ads/AdSenseScript';
import { PostHogClient } from '@/components/features/analytics/PostHogClient';
import { APP_THEME_IDS, DEFAULT_THEME_ID } from '@/lib/constants/themes';
import { ServiceWorkerRegister } from '@/components/features/offline/ServiceWorkerRegister';

export function Providers({ children, locale }: { children: ReactNode; locale: Locale }) {
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
          defaultTheme={DEFAULT_THEME_ID}
          themes={APP_THEME_IDS}
          enableSystem={false}
          disableTransitionOnChange={false}
        >
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
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
