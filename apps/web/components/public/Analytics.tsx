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
// besöket. Laddas för ALLA besökare på den publika sajten — inte bakom
// cookie-samtycket, till skillnad från GA. Affärsbeslut: B2B-besöks-
// identifiering på företagsnivå, med berättigat intresse som grund. Redovisat i
// cookie-policyn. Laddas fortfarande aldrig på /app/*-rutter med elevdata.
export function Albacross() {
  return (
    <Script
      src="https://serve.albacross.com/track.js"
      strategy="afterInteractive"
    />
  );
}

// Snitcher — B2B-besöksidentifiering (IP → företag), samma kategori som
// Albacross och samma villkor: alla besökare på den publika sajten, aldrig på
// /app/*-rutter. Snitcher B.V. är nederländskt och aggregerar på företagsnivå.
export const SNITCHER_PROFILE_ID = 'sGWBneHBaF';

// Leverantörens bootstrap, ordagrant. Den köar anrop i en shim och injicerar
// sedan radar.min.js från cdn.snitcher.com. Renderas server-side (inte via
// next/script) av två skäl: snippeten hamnar i rå HTML där Snitchers
// installationskontroll hittar den, och den kör direkt vid parse i stället för
// efter hydrering. Samma lärdom som Albacross-buggen.
const SNITCHER_BOOTSTRAP = `!function(e){"use strict";var t=e&&e.namespace;if(t&&e.profileId&&e.cdn){var i=window[t];if(i&&Array.isArray(i)||(i=window[t]=[]),!i.initialized&&!i._loaded)if(i._loaded)console&&console.warn("[Radar] Duplicate initialization attempted");else{i._loaded=!0;["track","page","identify","group","alias","ready","debug","on","off","once","trackClick","trackSubmit","trackLink","trackForm","pageview","screen","reset","register","setAnonymousId","addSourceMiddleware","addIntegrationMiddleware","addDestinationMiddleware","giveCookieConsent"].forEach((function(e){var a;i[e]=(a=e,function(){var e=window[t];if(e.initialized)return e[a].apply(e,arguments);var i=[].slice.call(arguments);return i.unshift(a),e.push(i),e})})),-1===e.apiEndpoint.indexOf("http")&&(e.apiEndpoint="https://"+e.apiEndpoint),i.bootstrap=function(){var t,i=document.createElement("script");i.async=!0,i.type="text/javascript",i.id="__radar__",i.setAttribute("data-settings",JSON.stringify(e)),i.src=[-1!==(t=e.cdn).indexOf("http")?"":"https://",t,"/releases/latest/radar.min.js"].join("");var a=document.scripts[0];a.parentNode.insertBefore(i,a)},i.bootstrap()}}else"undefined"!=typeof console&&console.error("[Radar] Configuration incomplete")}({"apiEndpoint":"radar.snitcher.com","cdn":"cdn.snitcher.com","namespace":"Snitcher","profileId":"${SNITCHER_PROFILE_ID}"});`;

export function Snitcher() {
  return (
    <script id="snitcher-init" dangerouslySetInnerHTML={{ __html: SNITCHER_BOOTSTRAP }} />
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
