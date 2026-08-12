import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { alternatesFor, breadcrumbLd, socialFor } from '@/lib/site';
import { JsonLd } from '@/components/public/JsonLd';
import { LegalDoc, type LegalSection } from '@/components/public/LegalDoc';
import { CookieSettingsButton } from '@/components/public/CookieSettingsButton';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sv = locale === 'sv';
  const title = 'Cookies — Elevante';
  const description = sv
    ? 'Vilka cookies Elevante använder: nödvändiga inloggningscookies, besöksidentifiering och anonymiserad analys — och hur du hanterar dem.'
    : 'Which cookies Elevante uses: essential login cookies, visitor identification and anonymised analytics — and how to manage them.';
  return {
    alternates: alternatesFor(locale, '/cookies'),
    title,
    description,
    ...socialFor(locale, '/cookies', title, description),
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
            'Nödvändiga cookies: håller dig inloggad och säkrar din session i webbappen. Dessa krävs för att tjänsten ska fungera och kan inte väljas bort.',
            'Analyscookies: vi använder ett analysverktyg som samlar anonymiserad statistik om hur webbplatsen används, så att vi kan förbättra den.',
            'Besöksidentifiering: vi använder tjänster som utifrån IP-adress visar vilka organisationer som besöker webbplatsen. Identifieringen sker på organisationsnivå — vi får veta att exempelvis en kommun eller skola varit här, inte vem du är. Används endast på den publika sajten, aldrig i appen.',
          ],
        },
        {
          h: 'Samtycke',
          p: [
            'Nödvändiga cookies används med stöd av berättigat intresse och kräver inte samtycke. Detsamma gäller besöksidentifieringen, som vi använder med stöd av vårt berättigade intresse av att veta vilka verksamheter som är intresserade av Elevante — den är alltså aktiv utan att du behöver godkänna något.',
            'Analyscookies sätts endast med ditt samtycke. Du kan när som helst återkalla ditt samtycke genom att rensa cookies i din webbläsare.',
          ],
        },
        {
          h: 'Hantera cookies',
          p: [
            'Du kan blockera eller radera cookies i din webbläsares inställningar. Observera att nödvändiga cookies behövs för att kunna logga in.',
            'Vill du invända mot besöksidentifieringen, eller begära att vi raderar uppgifter kopplade till ditt besök, mejla john@elevante.se så åtgärdar vi det.',
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
            'Essential cookies: keep you logged in and secure your session in the web app. These are required for the service to work and cannot be opted out of.',
            'Analytics cookies: we use an analytics tool that collects anonymised statistics about how the website is used so we can improve it.',
            'Visitor identification: we use services that show, based on IP address, which organisations visit the website. Identification happens at organisation level — we learn that, say, a municipality or a school has been here, not who you are. Used only on the public site, never in the app.',
          ],
        },
        {
          h: 'Consent',
          p: [
            'Essential cookies are used on the basis of legitimate interest and do not require consent. The same applies to visitor identification, which we use on the basis of our legitimate interest in knowing which organisations are interested in Elevante — it is therefore active without you having to approve anything.',
            'Analytics cookies are set only with your consent. You can withdraw your consent at any time by clearing cookies in your browser.',
          ],
        },
        {
          h: 'Managing cookies',
          p: [
            'You can block or delete cookies in your browser settings. Note that essential cookies are needed to log in.',
            'If you wish to object to visitor identification, or ask us to delete data linked to your visit, email john@elevante.se and we will take care of it.',
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
