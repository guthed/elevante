import Script from 'next/script';

// GA4 — laddas ENBART efter att användaren samtyckt (via CookieConsent), och
// aldrig på /app/*-rutter med elevdata.
export const GA_MEASUREMENT_ID = 'G-ZRWQPL8BH5';

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
