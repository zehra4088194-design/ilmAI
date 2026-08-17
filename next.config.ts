import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';
import withPWAInit from '@ducanh2912/next-pwa';

const sentryBuildEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
);

// Overrides the plugin's own default "apis" and "pages" runtime-caching entries
// (matched by cacheName, see extendDefaultRuntimeCaching below) rather than
// hand-listing every route: online-only endpoints (AI/vision/OCR/voice/
// payments/auth/etc, see src/lib/offline/online-only.ts) and everything else
// under /api/* go NetworkOnly — API responses are per-user and often
// mutations, so they're never safe to cache in a bucket shared across
// whichever account is signed into this browser. Page navigations keep the
// plugin's default NetworkFirst-by-pathname behavior (works across builds
// with no hardcoded route list) but get a 3.5s network timeout so a slow
// connection still falls back to the cached page quickly instead of hanging.
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // The plugin's own default (register: true) injects an inline <script> to
  // call navigator.serviceWorker.register() — that script carries no CSP
  // nonce, so it gets blocked by this app's strict-dynamic CSP. Registration
  // is already handled properly by
  // src/components/features/offline/ServiceWorkerRegister (a real React
  // effect, production-only), so the plugin's own injection is both
  // redundant and broken here.
  register: false,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  extendDefaultRuntimeCaching: true,
  fallbacks: {
    document: '/offline.html',
  },
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
        method: 'GET',
        options: { cacheName: 'apis' },
      },
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && !url.pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages',
          networkTimeoutSeconds: 3.5,
          expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['tesseract.js', 'tesseract.js-core'],
  experimental: {
    ppr: false,
    reactCompiler: false,
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/sign-in', destination: '/login', permanent: true },
      { source: '/sign-up', destination: '/register', permanent: true },
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
      { source: '/terms-of-service', destination: '/terms', permanent: true },
      { source: '/cookie-policy', destination: '/cookies', permanent: true },
      { source: '/refund', destination: '/refund-policy', permanent: true },
      { source: '/help-center', destination: '/help', permanent: true },
    ];
  },
};

const configWithPWA = withPWA(nextConfig);

export default sentryBuildEnabled
  ? withSentryConfig(configWithPWA, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      webpack: {
        treeshake: { removeDebugLogging: true },
      },
      sourcemaps: {
        disable: false,
      },
    })
  : configWithPWA;
