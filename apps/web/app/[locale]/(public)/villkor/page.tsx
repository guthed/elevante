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
    title: sv ? 'Villkor — Elevante' : 'Terms — Elevante',
    description: sv
      ? 'Villkoren för att använda Elevante och elevante.se.'
      : 'The terms for using Elevante and elevante.se.',
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sv = locale === 'sv';

  const sections: LegalSection[] = sv
    ? [
        {
          heading: 'Om dessa villkor',
          body: [
            'De här villkoren gäller för användningen av webbplatsen elevante.se och tjänsten Elevante. Genom att använda webbplatsen eller tjänsten godkänner du villkoren.',
            'Det kommersiella avtalet mellan Elevante och en skola regleras separat i ett särskilt avtal. Skiljer sig det avtalet från dessa villkor gäller det särskilda avtalet.',
          ],
        },
        {
          heading: 'Tjänsten',
          body: [
            'Elevante spelar in och transkriberar lektioner och låter elever ställa frågor om innehållet. AI-svaren bygger strikt på lektionens transkribering och innehåller alltid källhänvisning.',
            'Elevante är ett stöd i lärandet och ersätter inte undervisning, lärare eller elevens eget arbete.',
          ],
        },
        {
          heading: 'Avtal och konton',
          body: [
            'Elevante tillhandahålls till skolor och huvudmän. Elever och lärare får tillgång till tjänsten via sin skola.',
            'Du ansvarar för att hålla dina inloggningsuppgifter säkra och för aktivitet som sker under ditt konto. Misstänker du att kontot använts av någon annan ska du kontakta din skola eller oss.',
          ],
        },
        {
          heading: 'Tillåten användning',
          body: [
            'Tjänsten får bara användas för utbildningssyfte och i enlighet med skolans regler. Du får inte försöka kringgå säkerhetsfunktioner, störa driften eller använda tjänsten för olagligt eller kränkande innehåll.',
            'Inspelning av lektioner sker av läraren och ska ske i enlighet med skolans rutiner och gällande regler.',
          ],
        },
        {
          heading: 'Immateriella rättigheter',
          body: [
            'Elevante, varumärket och programvaran tillhör oss. Lektionsinnehåll, transkriberingar och material tillhör skolan respektive den som skapat innehållet.',
            'Du får inte kopiera, sälja vidare eller bygga vidare på tjänsten utan vårt skriftliga medgivande.',
          ],
        },
        {
          heading: 'Tillgänglighet och ändringar',
          body: [
            'Vi arbetar för att Elevante ska vara tillgängligt och stabilt, men kan inte garantera att tjänsten alltid är fri från avbrott. Underhåll och uppdateringar kan påverka tillgängligheten.',
            'Vi kan komma att uppdatera dessa villkor. Väsentliga ändringar meddelas på elevante.se eller direkt till skolan.',
          ],
        },
        {
          heading: 'Ansvarsbegränsning',
          body: [
            'Elevante levereras i befintligt skick. Vi ansvarar inte för indirekta skador eller för beslut som fattas enbart utifrån AI-genererade svar. Svaren är ett stöd och bör värderas av eleven.',
          ],
        },
        {
          heading: 'Uppsägning',
          body: [
            'En skola kan avsluta sitt avtal enligt villkoren i det särskilda avtalet. När avtalet upphör exporteras skolans data till skolan och våra kopior raderas inom 30 dagar.',
          ],
        },
        {
          heading: 'Tillämplig lag',
          body: [
            'Svensk lag tillämpas på dessa villkor. Tvister avgörs av svensk allmän domstol.',
          ],
        },
        {
          heading: 'Kontakt',
          body: ['Frågor om dessa villkor skickas till john@guthed.se.'],
        },
      ]
    : [
        {
          heading: 'About these terms',
          body: [
            'These terms apply to the use of the website elevante.se and the Elevante service. By using the website or the service you accept these terms.',
            'The commercial agreement between Elevante and a school is governed separately by a specific agreement. If that agreement differs from these terms, the specific agreement prevails.',
          ],
        },
        {
          heading: 'The service',
          body: [
            'Elevante records and transcribes lessons and lets students ask questions about the content. AI answers are based strictly on the lesson transcript and always include a source reference.',
            'Elevante is a support for learning and does not replace teaching, teachers or the student’s own work.',
          ],
        },
        {
          heading: 'Agreement and accounts',
          body: [
            'Elevante is provided to schools and operators. Students and teachers get access to the service through their school.',
            'You are responsible for keeping your login credentials secure and for activity under your account. If you suspect your account has been used by someone else, contact your school or us.',
          ],
        },
        {
          heading: 'Acceptable use',
          body: [
            'The service may only be used for educational purposes and in accordance with the school’s rules. You must not attempt to bypass security features, disrupt operations, or use the service for illegal or offensive content.',
            'Lessons are recorded by the teacher and must be recorded in accordance with the school’s routines and applicable rules.',
          ],
        },
        {
          heading: 'Intellectual property',
          body: [
            'Elevante, the brand and the software belong to us. Lesson content, transcripts and materials belong to the school and to whoever created the content.',
            'You may not copy, resell or build on the service without our written consent.',
          ],
        },
        {
          heading: 'Availability and changes',
          body: [
            'We work to keep Elevante available and stable, but cannot guarantee that the service is always free from interruption. Maintenance and updates may affect availability.',
            'We may update these terms. Material changes are announced on elevante.se or communicated directly to the school.',
          ],
        },
        {
          heading: 'Limitation of liability',
          body: [
            'Elevante is provided as is. We are not liable for indirect damage or for decisions made solely on the basis of AI-generated answers. The answers are a support and should be assessed by the student.',
          ],
        },
        {
          heading: 'Termination',
          body: [
            'A school can end its agreement under the terms of the specific agreement. When the agreement ends, the school’s data is exported to the school and our copies are deleted within 30 days.',
          ],
        },
        {
          heading: 'Governing law',
          body: [
            'Swedish law applies to these terms. Disputes are settled by Swedish general courts.',
          ],
        },
        {
          heading: 'Contact',
          body: ['Questions about these terms can be sent to john@guthed.se.'],
        },
      ];

  return (
    <LegalPage
      eyebrow={sv ? 'Juridik' : 'Legal'}
      title={sv ? 'Villkor' : 'Terms'}
      intro={
        sv
          ? 'Villkoren för att använda Elevante och webbplatsen elevante.se.'
          : 'The terms for using Elevante and the elevante.se website.'
      }
      lastUpdated={sv ? 'Senast uppdaterad 15 maj 2026' : 'Last updated 15 May 2026'}
      sections={sections}
    />
  );
}
