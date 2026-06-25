import type { NextConfig } from 'next';

const securityHeaders = [
  // Mindre permissivt än default; tillåter inline-stilar (Tailwind/PostCSS),
  // GA/GTM via google-analytics + googletagmanager, samt Supabase realtime wss.
  // CSP är medvetet bred i v1 — strama åt när vi vet exakt vilka inline-scripts
  // som Next.js 16 fortfarande genererar för App Router/RSC.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.google-analytics.com https://*.supabase.co wss://*.supabase.co https://api.berget.ai https://api.anthropic.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; '),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // HSTS sätts redan av Vercel, men det skadar inte att ange explicit.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [{ source: '/skolan', destination: '/rektor', permanent: false }];
  },
  async headers() {
    return [
      {
        // Applicera på alla rutter utom Next.js internals
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Vercels preview-/projektdomän (*.vercel.app) ska aldrig indexeras —
        // den konkurrerar annars med elevante.se om ranking och AI-citat.
        // Produktionsdomänen (elevante.se) matchar inte och påverkas inte.
        source: '/:path*',
        has: [{ type: 'host', value: '.*\\.vercel\\.app' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;
