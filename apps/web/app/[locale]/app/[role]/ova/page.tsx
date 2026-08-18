import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getTrainingCourses } from '@/lib/data/training';
import { OvaPicker } from './OvaPicker';

// Generering av träningsunderlag väntas INTE längre in på klientens öppna
// anslutning. prepareTrainingSession (app/actions/training.ts, fas 1) kollar
// bara vad som saknas och schemalägger backfillen via next/server after() —
// requesten mot klienten returnerar direkt. startTrainingSession (fas 2)
// läser bara befintligt underlag och gör aldrig någon generering.
//
// MEN: Server Actions ärver maxDuration från SIDAN de anropas från (det
// finns ingen separat per-action-config), och after()-jobbet hålls vid liv
// av Vercels waitUntil bara så länge den ursprungliga invokeringens
// maxDuration tillåter — se next/server after()-dokumentationen. Den här
// konstanten styr alltså fortfarande hur lång tid den FAKTISKA Claude-
// genereringen får innan Vercel dödar invokeringen, precis som förut — bara
// att det numera sker bakom kulisserna istället för på klientens anslutning.
// Sänk den INTE till en kort siffra bara för att requesten känns snabb.
//
// MÄTT 2026-08-18 mot riktiga lektioner: ~70 s för EN lektion, ~90-100 s för
// två parallellt. MAX_BACKFILL_PER_REQUEST (lib/data/training.ts) tillåter
// upp till 5 parallellt i en enda backfill — aldrig uppmätt, så 240 s ger
// ~140 s marginal över det värsta uppmätta för ökad kontention/rate-limit-
// backoff vid högre parallellitet. Fortfarande lägre än den gamla
// blankettsiffran 300, som var dimensionerad för ett helt annat problem
// (att hålla en enda klientanslutning öppen hela vägen) — sänk inte utan att
// mäta om, precis som innan.
export const maxDuration = 240;

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Plugga' : 'Study',
    robots: { index: false, follow: false },
  };
}

export default async function OvaPage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const courses = await getTrainingCourses(profile.id);

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-[clamp(2rem,3vw+1rem,3rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
          {sv ? 'Plugga' : 'Study'}
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? 'Ta reda på vad du faktiskt kan — innan det räknas. Välj lektioner och träna på det som togs upp där.'
            : 'Find out what you actually know — before it counts. Pick lessons and practise what was covered.'}
        </p>

        <div className="mt-10">
          {courses.length === 0 ? (
            <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Du har inga färdiga lektioner att träna på ännu.'
                : 'You have no finished lessons to practise on yet.'}
            </p>
          ) : (
            <OvaPicker locale={locale} courses={courses} />
          )}
        </div>
      </div>
    </div>
  );
}
