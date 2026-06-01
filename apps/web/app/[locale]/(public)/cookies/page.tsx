import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { alternatesFor, breadcrumbLd } from '@/lib/site';
import { JsonLd } from '@/components/public/JsonLd';
import { LegalDoc, type LegalSection } from '@/components/public/LegalDoc';
import { CookieSettingsButton } from '@/components/public/CookieSettingsButton';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sv = locale === 'sv';
  return {
    alternates: alternatesFor(locale, '/cookies'),
    title: sv ? 'Cookies — Elevante' : 'Cookies — Elevante',
    description: sv
      ? 'Vilka cookies Elevante använder: nödvändiga inloggningscookies och anonymiserad analys (Google Analytics), och hur du hanterar dem.'
      : 'Which cookies Elevante uses: essential login cookies and anonymised analytics (Google Analytics), and how to manage them.',
  };
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sv = locale === 'sv';

  const sections: LegalSection[] = sv
    ? [
        {
          h: 'Vad är cookies?',
          p: [
            'Cookies är små textfiler som sparas i din webbläsare när du besöker en webbplats. De används för att webbplatsen ska fungera och för att förstå hur den används.',
          ],
        },
        {
          h: 'Cookies vi använder',
          list: [
            'Nödvändiga cookies: håller dig inloggad och säkrar din session i webbappen (Supabase Auth). Dessa krävs för att tjänsten ska fungera och kan inte väljas bort.',
            'Analyscookies: Google Analytics (t.ex. _ga) samlar anonymiserad statistik om hur webbplatsen används, så att vi kan förbättra den.',
          ],
        },
        {
          h: 'Samtycke',
          p: [
            'Nödvändiga cookies används med stöd av berättigat intresse och kräver inte samtycke. Analyscookies sätts endast med ditt samtycke. Du kan när som helst återkalla ditt samtycke genom att rensa cookies i din webbläsare.',
          ],
        },
        {
          h: 'Hantera cookies',
          p: [
            'Du kan blockera eller radera cookies i din webbläsares inställningar. Observera att nödvändiga cookies behövs för att kunna logga in. För att välja bort Google Analytics kan du även använda Googles tillägg för avregistrering.',
          ],
        },
        {
          h: 'Ändringar och kontakt',
          p: [
            'Vi kan uppdatera denna cookie-policy. Frågor besvaras på john@elevante.se. Se även vår integritetspolicy för hur vi behandlar personuppgifter.',
          ],
        },
      ]
    : [
        {
          h: 'What are cookies?',
          p: [
            'Cookies are small text files saved in your browser when you visit a website. They are used to make the website work and to understand how it is used.',
          ],
        },
        {
          h: 'Cookies we use',
          list: [
            'Essential cookies: keep you logged in and secure your session in the web app (Supabase Auth). These are required for the service to work and cannot be opted out of.',
            'Analytics cookies: Google Analytics (e.g. _ga) collects anonymised statistics about how the website is used so we can improve it.',
          ],
        },
        {
          h: 'Consent',
          p: [
            'Essential cookies are used on the basis of legitimate interest and do not require consent. Analytics cookies are set only with your consent. You can withdraw your consent at any time by clearing cookies in your browser.',
          ],
        },
        {
          h: 'Managing cookies',
          p: [
            'You can block or delete cookies in your browser settings. Note that essential cookies are needed to log in. To opt out of Google Analytics you can also use Google’s opt-out add-on.',
          ],
        },
        {
          h: 'Changes and contact',
          p: [
            'We may update this cookie policy. Questions are answered at john@elevante.se. See also our privacy policy for how we process personal data.',
          ],
        },
      ];

  return (
    <>
      <JsonLd data={breadcrumbLd(locale, '/cookies', 'Cookies')} />
      <LegalDoc
        title={sv ? 'Cookie-policy' : 'Cookie policy'}
        updated={sv ? 'Senast uppdaterad 1 juni 2026' : 'Last updated 1 June 2026'}
        sections={sections}
        footer={
          <CookieSettingsButton
            label={sv ? 'Ändra cookie-inställningar' : 'Change cookie settings'}
          />
        }
      />
    </>
  );
}
