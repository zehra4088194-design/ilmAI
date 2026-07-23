import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-4877865173601332';
const hasAdsense = Boolean(adsenseClientId);
const hasPaddle = Boolean(process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN);
const sentryBuildEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

function csp() {
  const scriptSrc = ["'self'", "'unsafe-eval'", "'unsafe-inline'"];
  const frameSrc = [
    "'self'",
    'https://drive.google.com',
    'https://docs.google.com',
    'https://www.youtube.com',
    'https://www.youtube-nocookie.com',
  ];
  const imgSrc = ["'self'", 'data:', 'blob:', 'https:'];
  const connectSrc = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.groq.com',
    'https://api.anthropic.com',
    'https://api.openai.com',
    'https://generativelanguage.googleapis.com',
    'https://*.googleapis.com',
    'wss://generativelanguage.googleapis.com',
    'https://eu.i.posthog.com',
    'https://us.i.posthog.com',
    'https://app.posthog.com',
    'https://*.posthog.com',
    'https://*.ingest.sentry.io',
    'https://*.ingest.us.sentry.io',
  ];

  if (hasAdsense) {
    scriptSrc.push('https://pagead2.googlesyndication.com', 'https://www.googletagservices.com');
    frameSrc.push('https://googleads.g.doubleclick.net', 'https://tpc.googlesyndication.com');
    imgSrc.push('https://googleads.g.doubleclick.net', 'https://pagead2.googlesyndication.com');
    connectSrc.push('https://pagead2.googlesyndication.com', 'https://googleads.g.doubleclick.net');
  }

  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    scriptSrc.push('https://www.gstatic.com');
    connectSrc.push(
      'https://firebaseinstallations.googleapis.com',
      'https://fcmregistrations.googleapis.com',
      'https://fcm.googleapis.com'
    );
  }

  if (hasPaddle) {
    scriptSrc.push('https://cdn.paddle.com');
    frameSrc.push('https://*.paddle.com', 'https://*.paddle.io');
    imgSrc.push('https://*.paddle.com', 'https://*.paddle.io');
    connectSrc.push('https://*.paddle.com', 'https://*.paddle.io');
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc.join(' ')}`,
    "font-src 'self'",
    `connect-src ${connectSrc.join(' ')}`,
    `frame-src ${frameSrc.join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
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
          { key: 'Content-Security-Policy', value: csp() },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/home', destination: '/', permanent: true },
      { source: '/sign-in', destination: '/login', permanent: true },
      { source: '/sign-up', destination: '/register', permanent: true },
    ];
  },
};

export default sentryBuildEnabled
  ? withSentryConfig(nextConfig, {
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
  : nextConfig;
