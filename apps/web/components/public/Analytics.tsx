import Script from 'next/script';

// GA4 — laddas ENBART efter att användaren samtyckt (via CookieConsent), och
// aldrig på /app/*-rutter med elevdata.
export const GA_MEASUREMENT_ID = 'G-ZRWQPL8BH5';

// Albacross — B2B-besöksidentifiering (IP → företag). Kontot är 89709790.
export const ALBACROSS_ID = '89709790';

// Bara ID-deklarationen. Sätter en JS-variabel — ingen cookie, ingen
// nätverkstrafik, inga personuppgifter — och kräver därför inget samtycke.
// Renderas server-side i den publika layouten så att snippeten finns i rå HTML
// (Albacross installationskontroll letar efter den) och så att `_nQc` garanterat
// är satt innan track.js laddas.
export function AlbacrossSiteId() {
  return (
    <script
      id="albacross-site-id"
      dangerouslySetInnerHTML={{ __html: `window._nQc="${ALBACROSS_ID}";` }}
    />
  );
}

// Själva spårningen: track.js sätter cookie (nQ_cookieId) och rapporterar
// besöket. Laddas ENBART efter samtycke, av samma skäl som GA, och aldrig på
// /app/*-rutter.
export function Albacross() {
  return (
    <Script
      src="https://serve.albacross.com/track.js"
      strategy="afterInteractive"
    />
  );
}

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
