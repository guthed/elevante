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
    title: sv ? 'Integritetspolicy — Elevante' : 'Privacy policy — Elevante',
    description: sv
      ? 'Så behandlar Elevante personuppgifter. GDPR-säkert, data inom EU.'
      : 'How Elevante processes personal data. GDPR-safe, data within the EU.',
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sv = locale === 'sv';

  const sections: LegalSection[] = sv
    ? [
        {
          heading: 'Vilka vi är',
          body: [
            'Elevante är en svensk plattform som spelar in och transkriberar lektioner så att elever kan ställa frågor om dem efteråt. Den här policyn beskriver hur personuppgifter behandlas när du besöker elevante.se och när Elevante används i en skola.',
            'Har du frågor om hur vi hanterar personuppgifter når du oss på john@guthed.se.',
          ],
        },
        {
          heading: 'Personuppgiftsansvar',
          body: [
            'För personuppgifter som rör elever och lärare i tjänsten är skolan eller huvudmannen personuppgiftsansvarig. Elevante är personuppgiftsbiträde och behandlar uppgifterna enligt ett personuppgiftsbiträdesavtal som tecknas innan tjänsten tas i bruk.',
            'För besökare på elevante.se och för dig som kontaktar oss via kontaktformuläret är Elevante personuppgiftsansvarig.',
          ],
        },
        {
          heading: 'Vilka uppgifter vi behandlar',
          body: [
            'Kontaktformulär: namn, e-postadress, skola eller organisation samt det meddelande du skickar.',
            'Tjänsten: kontouppgifter (namn, e-post, roll och skoltillhörighet), inspelat lektionsljud, transkriberingar av lektioner samt de frågor och svar som skapas i elevchatten.',
          ],
        },
        {
          heading: 'Ändamål och rättslig grund',
          body: [
            'Kontaktuppgifter behandlas för att kunna svara på din förfrågan och boka demo, med berättigat intresse som rättslig grund.',
            'Uppgifter i tjänsten behandlas för att leverera Elevante till skolan. Den rättsliga grunden bestäms av skolan i egenskap av personuppgiftsansvarig och regleras i personuppgiftsbiträdesavtalet. Vi tränar aldrig AI-modeller på elevernas data.',
          ],
        },
        {
          heading: 'Lagring och plats',
          body: [
            'All persondata lagras inom EU. Databas, lagring och autentisering körs på Supabase i EU och webbtjänsten driftas via Vercel i Stockholm.',
            'Inspelat råljud sparas bara tills transkriberingen är klar och raderas därefter automatiskt. Det som behålls är text.',
          ],
        },
        {
          heading: 'Underbiträden',
          body: [
            'Vi anlitar ett begränsat antal underbiträden för att kunna leverera tjänsten: Supabase (databas, lagring och autentisering), Berget AI (svensk taligenkänning), Anthropic (AI-genererade svar) och Resend (utskick av e-post från kontaktformuläret).',
            'Samtliga underbiträden är bundna av personuppgiftsbiträdesavtal och får bara behandla uppgifter enligt våra instruktioner.',
          ],
        },
        {
          heading: 'Lagringstid',
          body: [
            'Råljud raderas direkt efter transkribering. Transkriberingar, lektioner och chattar lagras så länge skolan har ett aktivt avtal. Avslutas avtalet exporterar vi all data till skolan och raderar våra kopior inom 30 dagar.',
            'Meddelanden från kontaktformuläret sparas så länge det behövs för att hantera din förfrågan.',
          ],
        },
        {
          heading: 'Dina rättigheter',
          body: [
            'Du har rätt att begära tillgång till, rättelse av eller radering av dina personuppgifter, samt att invända mot eller begära begränsning av behandlingen.',
            'Rör begäran uppgifter i tjänsten kontaktar du i första hand din skola, som är personuppgiftsansvarig. Du har också rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY).',
          ],
        },
        {
          heading: 'Cookies',
          body: [
            'Elevante använder bara nödvändiga cookies för inloggning och språkval. Vi använder inga cookies för annonsering eller spårning. Läs mer på vår cookie-sida.',
          ],
        },
        {
          heading: 'Kontakt',
          body: [
            'Frågor om den här policyn eller om hur dina personuppgifter behandlas skickas till john@guthed.se.',
          ],
        },
      ]
    : [
        {
          heading: 'Who we are',
          body: [
            'Elevante is a Swedish platform that records and transcribes classroom lessons so students can ask questions about them afterwards. This policy describes how personal data is processed when you visit elevante.se and when Elevante is used at a school.',
            'If you have questions about how we handle personal data, reach us at john@guthed.se.',
          ],
        },
        {
          heading: 'Data controller responsibility',
          body: [
            'For personal data relating to students and teachers in the service, the school or operator is the data controller. Elevante acts as a data processor and processes the data under a data processing agreement signed before the service is put into use.',
            'For visitors to elevante.se and for anyone contacting us through the contact form, Elevante is the data controller.',
          ],
        },
        {
          heading: 'What data we process',
          body: [
            'Contact form: name, email address, school or organisation, and the message you send.',
            'The service: account data (name, email, role and school affiliation), recorded lesson audio, lesson transcripts, and the questions and answers created in the student chat.',
          ],
        },
        {
          heading: 'Purpose and legal basis',
          body: [
            'Contact data is processed to respond to your enquiry and book a demo, on the legal basis of legitimate interest.',
            'Data in the service is processed to deliver Elevante to the school. The legal basis is determined by the school as data controller and is set out in the data processing agreement. We never train AI models on student data.',
          ],
        },
        {
          heading: 'Storage and location',
          body: [
            'All personal data is stored within the EU. The database, storage and authentication run on Supabase in the EU, and the web service is operated through Vercel in Stockholm.',
            'Recorded raw audio is kept only until transcription is finished and is then deleted automatically. What remains is text.',
          ],
        },
        {
          heading: 'Sub-processors',
          body: [
            'We use a limited number of sub-processors to deliver the service: Supabase (database, storage and authentication), Berget AI (Swedish speech recognition), Anthropic (AI-generated answers) and Resend (sending email from the contact form).',
            'All sub-processors are bound by data processing agreements and may only process data according to our instructions.',
          ],
        },
        {
          heading: 'Retention',
          body: [
            'Raw audio is deleted immediately after transcription. Transcripts, lessons and chats are stored for as long as the school has an active agreement. If the agreement ends, we export all data to the school and delete our copies within 30 days.',
            'Messages from the contact form are kept for as long as needed to handle your enquiry.',
          ],
        },
        {
          heading: 'Your rights',
          body: [
            'You have the right to request access to, rectification of or erasure of your personal data, and to object to or request restriction of the processing.',
            'If the request concerns data in the service, contact your school first, as it is the data controller. You also have the right to lodge a complaint with the Swedish Authority for Privacy Protection (IMY).',
          ],
        },
        {
          heading: 'Cookies',
          body: [
            'Elevante only uses necessary cookies for sign-in and language choice. We use no cookies for advertising or tracking. Read more on our cookie page.',
          ],
        },
        {
          heading: 'Contact',
          body: [
            'Questions about this policy or about how your personal data is processed can be sent to john@guthed.se.',
          ],
        },
      ];

  return (
    <LegalPage
      eyebrow={sv ? 'Juridik' : 'Legal'}
      title={sv ? 'Integritetspolicy' : 'Privacy policy'}
      intro={
        sv
          ? 'Så behandlar Elevante personuppgifter — och varför vi byggt tjänsten GDPR-säkert från grunden.'
          : 'How Elevante processes personal data — and why we built the service GDPR-safe from the ground up.'
      }
      lastUpdated={sv ? 'Senast uppdaterad 15 maj 2026' : 'Last updated 15 May 2026'}
      sections={sections}
    />
  );
}
