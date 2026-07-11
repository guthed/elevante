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
    alternates: alternatesFor(locale, '/integritetspolicy'),
    title: sv ? 'Integritetspolicy — Elevante' : 'Privacy policy — Elevante',
    description: sv
      ? 'Så behandlar Elevante personuppgifter: all data inom EU, råljud raderas efter transkribering, och skolan är personuppgiftsansvarig för elevdata.'
      : 'How Elevante processes personal data: all data inside the EU, raw audio deleted after transcription, and the school is the controller of student data.',
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sv = locale === 'sv';

  const sections: LegalSection[] = sv
    ? [
        {
          h: 'Personuppgiftsansvarig',
          p: [
            'Elevante AB (”Elevante”, ”vi”) är personuppgiftsansvarig för behandlingen av personuppgifter på denna webbplats och för konton som skapas direkt hos oss. Kontakt: john@elevante.se. Postadress och organisationsnummer lämnas på begäran.',
            'För personuppgifter som behandlas inom ramen för en skolas användning av tjänsten (elevers och lärares lektionsdata) är skolan eller huvudmannen personuppgiftsansvarig och Elevante är personuppgiftsbiträde. Den behandlingen regleras i ett personuppgiftsbiträdesavtal (DPA) mellan skolan och Elevante.',
          ],
        },
        {
          h: 'Vilka uppgifter vi behandlar',
          list: [
            'Kontouppgifter: namn, e-postadress, roll (elev/lärare/admin) och skoltillhörighet.',
            'Lektionsdata: ljudinspelning (tillfälligt), transkript av lektionen, samt elevens frågor och AI-svar i chatten.',
            'Teknisk data: inloggningssession, loggar och anonymiserad användningsstatistik.',
            'Uppgifter du lämnar i kontaktformuläret: namn, e-post, skola och meddelande.',
          ],
        },
        {
          h: 'Ändamål och rättslig grund',
          list: [
            'Tillhandahålla tjänsten till skolan – fullgörande av avtal samt, för elevdata, skolans uppgift av allmänt intresse (GDPR art. 6.1 e).',
            'Transkribera och tillgängliggöra lektioner för repetition – samma grund.',
            'Hantera konton och inloggning – fullgörande av avtal.',
            'Förbättra och säkra tjänsten samt föra statistik – berättigat intresse.',
            'Besvara förfrågningar via kontaktformuläret – berättigat intresse.',
          ],
        },
        {
          h: 'Hur länge vi sparar uppgifterna',
          p: [
            'Råljudet raderas automatiskt så snart lektionen har transkriberats. Transkript och tillhörande lektionsdata sparas så länge skolan vill använda dem och raderas när skolan begär det eller när avtalet upphör. Kontouppgifter sparas under avtalstiden. Meddelanden från kontaktformuläret sparas så länge det behövs för att hantera ärendet.',
          ],
        },
        {
          h: 'Var data lagras – ingen överföring utanför EU',
          p: [
            'All behandling av person- och lektionsdata sker inom EU. Transkribering körs på svensk infrastruktur via Berget AI. Databas och lagring ligger hos Supabase inom EU, och applikationen driftas på Vercel (Stockholm). Anrop till språkmodell (Anthropic Claude) sker mot en EU-baserad endpoint. Inga elev- eller lärardata förs till tredjeland.',
          ],
        },
        {
          h: 'Personuppgiftsbiträden',
          p: [
            'Vi anlitar leverantörer som behandlar uppgifter för vår räkning, bland annat: Berget AI (transkribering och AI-infrastruktur, Sverige), Supabase (databas och lagring, EU), Anthropic (språkmodell, EU-endpoint), Vercel (drift) och Loops (utskick av transaktionell e-post). Webbplatsen använder även Google Analytics för anonymiserad statistik – se vår cookie-policy.',
          ],
        },
        {
          h: 'Dina rättigheter',
          p: [
            'Du har rätt att begära tillgång till, rättelse eller radering av dina personuppgifter, att invända mot eller begära begränsning av behandlingen samt rätt till dataportabilitet. Gäller behandlingen elevdata vänder du dig i första hand till din skola, som är personuppgiftsansvarig. Du har också rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY).',
          ],
        },
        {
          h: 'Säkerhet',
          p: [
            'Vi skyddar uppgifterna med tekniska och organisatoriska åtgärder, bland annat åtkomstkontroll per skola (radnivåsäkerhet), kryptering i överföring och begränsad behörighet. Ingen AI-modell tränas på elevernas data.',
          ],
        },
        {
          h: 'Ändringar och kontakt',
          p: [
            'Vi kan uppdatera denna policy. Väsentliga ändringar informerar vi om på webbplatsen. Frågor om personuppgifter besvaras på john@elevante.se.',
          ],
        },
      ]
    : [
        {
          h: 'Data controller',
          p: [
            'Elevante AB (“Elevante”, “we”) is the controller for personal data on this website and for accounts created directly with us. Contact: john@elevante.se. Postal address and company registration number are available on request.',
            'For personal data processed as part of a school’s use of the service (students’ and teachers’ lesson data), the school is the controller and Elevante is the processor. That processing is governed by a data processing agreement (DPA) between the school and Elevante.',
          ],
        },
        {
          h: 'What data we process',
          list: [
            'Account data: name, email address, role (student/teacher/admin) and school.',
            'Lesson data: audio recording (temporary), the lesson transcript, and the student’s questions and AI answers in the chat.',
            'Technical data: login session, logs and anonymised usage statistics.',
            'Data you provide in the contact form: name, email, school and message.',
          ],
        },
        {
          h: 'Purposes and legal basis',
          list: [
            'Providing the service to the school – performance of a contract and, for student data, the school’s task carried out in the public interest (GDPR Art. 6(1)(e)).',
            'Transcribing and making lessons available for revision – same basis.',
            'Managing accounts and login – performance of a contract.',
            'Improving and securing the service and producing statistics – legitimate interest.',
            'Responding to contact-form enquiries – legitimate interest.',
          ],
        },
        {
          h: 'How long we keep the data',
          p: [
            'Raw audio is deleted automatically as soon as the lesson has been transcribed. Transcripts and related lesson data are kept for as long as the school wants to use them and are deleted on the school’s request or when the agreement ends. Account data is kept for the term of the agreement. Contact-form messages are kept for as long as needed to handle the enquiry.',
          ],
        },
        {
          h: 'Where data is stored – no transfer outside the EU',
          p: [
            'All processing of personal and lesson data takes place inside the EU. Transcription runs on Swedish infrastructure via Berget AI. The database and storage are hosted by Supabase inside the EU, and the application runs on Vercel (Stockholm). Calls to the language model (Anthropic Claude) go to an EU-based endpoint. No student or teacher data is transferred to a third country.',
          ],
        },
        {
          h: 'Processors',
          p: [
            'We use providers that process data on our behalf, including: Berget AI (transcription and AI infrastructure, Sweden), Supabase (database and storage, EU), Anthropic (language model, EU endpoint), Vercel (hosting) and Loops (sending transactional email). The website also uses Google Analytics for anonymised statistics – see our cookie policy.',
          ],
        },
        {
          h: 'Your rights',
          p: [
            'You have the right to request access to, rectification or erasure of your personal data, to object to or request restriction of processing, and to data portability. Where the processing concerns student data, please contact your school in the first instance, as it is the controller. You also have the right to lodge a complaint with the Swedish Authority for Privacy Protection (IMY).',
          ],
        },
        {
          h: 'Security',
          p: [
            'We protect the data with technical and organisational measures, including per-school access control (row-level security), encryption in transit and limited authorisation. No AI model is trained on students’ data.',
          ],
        },
        {
          h: 'Changes and contact',
          p: [
            'We may update this policy. We will announce material changes on the website. Questions about personal data are answered at john@elevante.se.',
          ],
        },
      ];

  return (
    <>
      <JsonLd
        data={breadcrumbLd(
          locale,
          '/integritetspolicy',
          sv ? 'Integritetspolicy' : 'Privacy policy',
        )}
      />
      <LegalDoc
        title={sv ? 'Integritetspolicy' : 'Privacy policy'}
        updated={sv ? 'Senast uppdaterad 1 juni 2026' : 'Last updated 1 June 2026'}
        sections={sections}
      />
    </>
  );
}
