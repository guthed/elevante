import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { alternatesFor, breadcrumbLd } from '@/lib/site';
import { JsonLd } from '@/components/public/JsonLd';
import { LegalDoc, type LegalSection } from '@/components/public/LegalDoc';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sv = locale === 'sv';
  return {
    alternates: alternatesFor(locale, '/villkor'),
    title: sv ? 'Användarvillkor — Elevante' : 'Terms of service — Elevante',
    description: sv
      ? 'Villkoren för att använda Elevante: avtal med skolan, tillåten användning, immateriella rättigheter, pris och svensk tillämplig lag.'
      : 'The terms for using Elevante: agreement with the school, acceptable use, intellectual property, pricing and Swedish governing law.',
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sv = locale === 'sv';

  const sections: LegalSection[] = sv
    ? [
        {
          h: 'Om tjänsten',
          p: [
            'Elevante är en tjänst som spelar in och transkriberar lektioner och låter elever ställa frågor om innehållet via en AI som svarar utifrån den faktiska lektionen. Tjänsten tillhandahålls av Elevante AB.',
          ],
        },
        {
          h: 'Avtal med skolan',
          p: [
            'Elevante tecknas av en skola eller huvudman. Elever och lärare använder tjänsten genom sin skola. Genom att använda tjänsten godkänner du dessa villkor. Är du under 18 år sker användningen inom ramen för skolans verksamhet.',
          ],
        },
        {
          h: 'Konton och ansvar',
          p: [
            'Du ansvarar för att hålla dina inloggningsuppgifter skyddade och för aktivitet som sker via ditt konto. Missbruk kan leda till att kontot stängs av.',
          ],
        },
        {
          h: 'Tillåten användning',
          list: [
            'Använd tjänsten för studier, undervisning och administration kopplat till skolan.',
            'Spela inte in personer utan den grund och information som krävs enligt skolans rutiner och GDPR.',
            'Försök inte kringgå säkerhet, kopiera tjänsten eller använda den för att kränka andra.',
          ],
        },
        {
          h: 'Immateriella rättigheter',
          p: [
            'Elevante äger plattformen, dess programvara och varumärke. Skolan och dess lärare behåller rättigheterna till sitt eget undervisningsinnehåll och de inspelningar och transkript som skapas. Elevante får behandla detta innehåll endast för att leverera tjänsten.',
          ],
        },
        {
          h: 'Pris och betalning',
          p: [
            'Tjänsten kostar 500 kronor per elev och år och faktureras skolan. Allt ingår – inspelning, transkribering, AI-chat och support. Skolor med fler än 1 000 elever får volymrabatt. Eventuella ändringar i pris meddelas i god tid.',
          ],
        },
        {
          h: 'Tillgänglighet och support',
          p: [
            'Vi strävar efter hög tillgänglighet men kan inte garantera att tjänsten alltid är fri från avbrott. Planerat underhåll aviseras när det är möjligt. Support nås via john@elevante.se.',
          ],
        },
        {
          h: 'Ansvarsbegränsning',
          p: [
            'Tjänsten tillhandahålls i befintligt skick. Elevante ansvarar inte för indirekta skador eller för beslut som fattas baserat på AI-genererat innehåll. AI:n är ett stöd för repetition och ersätter inte lärarens bedömning. Inget i dessa villkor begränsar ansvar som inte får begränsas enligt tvingande lag.',
          ],
        },
        {
          h: 'Uppsägning',
          p: [
            'Skolans avtal regleras separat. Vid avslut exporteras eller raderas data enligt skolans val, i enlighet med vår integritetspolicy.',
          ],
        },
        {
          h: 'Tillämplig lag och ändringar',
          p: [
            'Svensk lag gäller och tvist prövas av svensk domstol. Vi kan uppdatera dessa villkor och informerar om väsentliga ändringar på webbplatsen. Frågor: john@elevante.se.',
          ],
        },
      ]
    : [
        {
          h: 'About the service',
          p: [
            'Elevante is a service that records and transcribes lessons and lets students ask questions about the content via an AI that answers from the actual lesson. The service is provided by Elevante AB.',
          ],
        },
        {
          h: 'Agreement with the school',
          p: [
            'Elevante is contracted by a school or operator. Students and teachers use the service through their school. By using the service you accept these terms. If you are under 18, use takes place within the school’s activities.',
          ],
        },
        {
          h: 'Accounts and responsibility',
          p: [
            'You are responsible for keeping your login credentials safe and for activity carried out via your account. Misuse may lead to the account being suspended.',
          ],
        },
        {
          h: 'Acceptable use',
          list: [
            'Use the service for studying, teaching and school-related administration.',
            'Do not record people without the legal basis and information required by the school’s routines and the GDPR.',
            'Do not attempt to bypass security, copy the service or use it to harm others.',
          ],
        },
        {
          h: 'Intellectual property',
          p: [
            'Elevante owns the platform, its software and brand. The school and its teachers retain the rights to their own teaching content and the recordings and transcripts created. Elevante may process this content only to deliver the service.',
          ],
        },
        {
          h: 'Pricing and payment',
          p: [
            'The service costs SEK 500 per student per year, billed to the school. Everything is included – recording, transcription, AI chat and support. Schools with more than 1,000 students receive a volume discount. Any changes to pricing are announced in good time.',
          ],
        },
        {
          h: 'Availability and support',
          p: [
            'We aim for high availability but cannot guarantee uninterrupted service. Planned maintenance is announced where possible. Support is available at john@elevante.se.',
          ],
        },
        {
          h: 'Limitation of liability',
          p: [
            'The service is provided “as is”. Elevante is not liable for indirect damages or for decisions made based on AI-generated content. The AI is a support for revision and does not replace the teacher’s assessment. Nothing in these terms limits liability that may not be limited under mandatory law.',
          ],
        },
        {
          h: 'Termination',
          p: [
            'The school’s agreement is governed separately. On termination, data is exported or deleted at the school’s choice, in accordance with our privacy policy.',
          ],
        },
        {
          h: 'Governing law and changes',
          p: [
            'Swedish law applies and disputes are settled by Swedish courts. We may update these terms and will announce material changes on the website. Questions: john@elevante.se.',
          ],
        },
      ];

  return (
    <>
      <JsonLd
        data={breadcrumbLd(
          locale,
          '/villkor',
          sv ? 'Användarvillkor' : 'Terms of service',
        )}
      />
      <LegalDoc
        title={sv ? 'Användarvillkor' : 'Terms of service'}
        updated={sv ? 'Senast uppdaterad 1 juni 2026' : 'Last updated 1 June 2026'}
        sections={sections}
      />
    </>
  );
}
