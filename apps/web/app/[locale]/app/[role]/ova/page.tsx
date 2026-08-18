import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getTrainingCourses } from '@/lib/data/training';
import { OvaPicker } from './OvaPicker';

// Att bygga en session kan behöva backfilla träningsunderlag via Edge
// Function (ett Claude-anrop per lektion) — högre timeout än en vanlig chat.
export const maxDuration = 60;

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
