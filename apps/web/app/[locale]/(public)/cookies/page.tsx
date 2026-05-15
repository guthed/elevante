import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { LegalPage, type LegalSection } from '@/components/public/LegalPage';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sv = locale === 'sv';
  return {
    title: sv ? 'Cookies — Elevante' : 'Cookies — Elevante',
    description: sv
      ? 'Så använder Elevante cookies. Bara nödvändiga cookies, ingen spårning.'
      : 'How Elevante uses cookies. Only necessary cookies, no tracking.',
  };
}

export default async function CookiesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sv = locale === 'sv';

  const sections: LegalSection[] = sv
    ? [
        {
          heading: 'Vad är cookies',
          body: [
            'Cookies är små textfiler som sparas i din webbläsare när du besöker en webbplats. De används för att webbplatsen ska fungera och för att komma ihåg vissa val du gör.',
          ],
        },
        {
          heading: 'Så använder Elevante cookies',
          body: [
            'Elevante använder bara nödvändiga cookies. De krävs för att tjänsten ska fungera — framför allt för att hålla dig inloggad och för att komma ihåg ditt språkval.',
            'Vi använder inga cookies för annonsering, profilering eller spårning över andra webbplatser. Vi säljer aldrig data om dig.',
          ],
        },
        {
          heading: 'Cookies vi använder',
          body: [
            'Inloggningssession: håller dig inloggad i webbappen medan du använder den. Hanteras av vår autentiseringsleverantör Supabase.',
            'Språkval: kommer ihåg om du valt svenska eller engelska, så att du slipper välja om varje gång.',
          ],
        },
        {
          heading: 'Hantera cookies',
          body: [
            'Eftersom Elevante bara använder nödvändiga cookies krävs inget samtycke. Du kan när som helst radera cookies eller blockera dem i din webbläsares inställningar.',
            'Blockerar du nödvändiga cookies kan delar av webbappen sluta fungera, till exempel inloggningen.',
          ],
        },
        {
          heading: 'Kontakt',
          body: [
            'Frågor om vår användning av cookies skickas till john@guthed.se. Mer om hur vi behandlar personuppgifter finns i vår integritetspolicy.',
          ],
        },
      ]
    : [
        {
          heading: 'What are cookies',
          body: [
            'Cookies are small text files saved in your browser when you visit a website. They are used to make the website work and to remember certain choices you make.',
          ],
        },
        {
          heading: 'How Elevante uses cookies',
          body: [
            'Elevante only uses necessary cookies. They are required for the service to work — above all to keep you signed in and to remember your language choice.',
            'We use no cookies for advertising, profiling or tracking across other websites. We never sell data about you.',
          ],
        },
        {
          heading: 'Cookies we use',
          body: [
            'Sign-in session: keeps you signed in to the web app while you use it. Managed by our authentication provider, Supabase.',
            'Language choice: remembers whether you chose Swedish or English, so you do not have to choose again every time.',
          ],
        },
        {
          heading: 'Managing cookies',
          body: [
            'Because Elevante only uses necessary cookies, no consent is required. You can delete cookies or block them at any time in your browser settings.',
            'If you block necessary cookies, parts of the web app may stop working, such as sign-in.',
          ],
        },
        {
          heading: 'Contact',
          body: [
            'Questions about our use of cookies can be sent to john@guthed.se. More about how we process personal data is available in our privacy policy.',
          ],
        },
      ];

  return (
    <LegalPage
      eyebrow={sv ? 'Juridik' : 'Legal'}
      title="Cookies"
      intro={
        sv
          ? 'Elevante använder bara nödvändiga cookies — inga spårnings- eller annonscookies.'
          : 'Elevante only uses necessary cookies — no tracking or advertising cookies.'
      }
      lastUpdated={sv ? 'Senast uppdaterad 15 maj 2026' : 'Last updated 15 May 2026'}
      sections={sections}
    />
  );
}
