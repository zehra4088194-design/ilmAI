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
    // Without these, a newly-deployed service worker installs but sits "waiting" until every
    // open tab is closed — real users routinely leave a tab open for days, so the OLD worker
    // (running whatever runtime-caching rules existed when IT was built) stays in control
    // indefinitely. That's how the /api/* NetworkOnly rule above stopped applying for anyone
    // whose browser had installed the service worker from before this rule existed: their old
    // worker kept serving a stale cached post-login-destination response forever, sending
    // school/college members to the generic dashboard no matter what the current code says.
    // skipWaiting + clientsClaim make a new deploy take over on its very next activation instead
    // of waiting for a full browser restart; cleanupOutdatedCaches drops runtime cache buckets
    // left behind by a previous config so a rule change (like this one) can't get stuck replaying
    // forever once cache entries were already written under the old rules.
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
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
    // Next's own Server Action body parser defaults to 1MB and rejects anything larger before the
    // action's own code (and its try/catch) ever runs — that's an unhandled request-level failure,
    // not a caught app error, so it surfaces as the generic error boundary. Several school/college
    // logo, avatar, and resource-upload actions accept files up to 4-10MB (see MAX_LOGO_BYTES in
    // school-erp/storage.ts and its college-erp mirror), which this default silently broke for any
    // upload past 1MB — this is what made "upload a logo, hit save" crash instead of failing with
    // a real error message.
    serverActions: { bodySizeLimit: '10mb' },
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
