import Script from 'next/script';

// GA4 — laddas ENBART efter att användaren samtyckt (via CookieConsent), och
// aldrig på /app/*-rutter med elevdata.
export const GA_MEASUREMENT_ID = 'G-ZRWQPL8BH5';

// Albacross — B2B-besöksidentifiering (IP → företag). Laddas ENBART efter
// samtycke, av samma skäl som GA, och aldrig på /app/*-rutter.
export const ALBACROSS_ID = '89709790';

export function Albacross() {
  return (
    <>
      <Script id="albacross-init" strategy="afterInteractive">
        {`window._nQc="${ALBACROSS_ID}";`}
      </Script>
      <Script
        src="https://serve.albacross.com/track.js"
        strategy="afterInteractive"
      />
    </>
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
