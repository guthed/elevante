import type { NextConfig } from 'next';
import createBundleAnalyzer from '@next/bundle-analyzer';

const securityHeaders = [
  // Mindre permissivt än default; tillåter inline-stilar (Tailwind/PostCSS),
  // GA/GTM via google-analytics + googletagmanager, Albacross besöks-
  // identifiering samt Supabase realtime wss.
  // CSP är medvetet bred i v1 — strama åt när vi vet exakt vilka inline-scripts
  // som Next.js 16 fortfarande genererar för App Router/RSC.
  //
  // Albacross: track.js hämtas från serve.albacross.com och rapporterar in till
  // andra subdomäner under albacross.com — därför wildcard i både script-src och
  // connect-src. Utan detta blockerar webbläsaren scriptet helt, vilket är
  // exakt varför Albacross rapporterade "hittar ingen kod" på elevante.se.
  //
  // Snitcher: samma upplägg — radar.min.js hämtas från cdn.snitcher.com och
  // rapporterar in till radar.snitcher.com. Wildcard av samma skäl. Lägg ALLTID
  // till nya spårningsdomäner här samtidigt som scriptet, annars ser
  // leverantören en tyst blockerad integration.
  //
  // GA4: gtag.js hämtas från www.googletagmanager.com, men själva mät-
  // träffarna ("collect") skickas till en REGIONAL subdomän — t.ex.
  // region1.google-analytics.com — inte www.google-analytics.com. Samma
  // missförstånd som Albacross-buggen ovan: en icke-wildcardad connect-src
  // blockerar hitsen tyst (ingen JS-fel, ingen nätverksbild i UI:t — bara
  // stumt inga träffar i GA). Upptäckt 2026-08-17: GA-trafiken dog helt
  // 2026-08-14 utan någon matchande kodändring, sannolikt för att Google
  // bytte routing till regionala collect-endpoints för den här egendomen.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.google-analytics.com https://*.albacross.com https://*.snitcher.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.google-analytics.com https://*.albacross.com https://*.snitcher.com https://*.supabase.co wss://*.supabase.co https://api.berget.ai https://api.anthropic.com",
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
  experimental: {
    serverActions: {
      // Server Actions har annars en inbyggd gräns på 1 MB oavsett vad
      // appens egen kod tillåter — uploadAvatar (app/actions/account.ts)
      // validerar upp till 5 MB (AVATAR_MAX_BYTES), men den koden körs
      // aldrig om Next redan stoppat requesten på vägen in. 6 MB ger
      // marginal för multipart/form-overhead ovanpå själva filen.
      bodySizeLimit: '6mb',
    },
  },
  images: {
    // Uppladdade profilbilder ligger i Supabase Storage (elevante-avatars,
    // publik bucket) — next/image optimerar bara vitlistade domäner.
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
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

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
