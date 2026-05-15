import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getStudentCoursesWithLessons } from '@/lib/data/student';
import { ExamPrepPicker } from './ExamPrepPicker';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Plugga inför prov' : 'Exam prep',
    robots: { index: false, follow: false },
  };
}

export default async function ProvpluggPage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const courses = await getStudentCoursesWithLessons(profile.id);

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-[clamp(2rem,3vw+1rem,3rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
          {sv ? 'Plugga inför prov' : 'Exam prep'}
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? 'Välj de lektioner provet täcker, så hjälper Elevante dig att repetera — med svar som bara bygger på det som faktiskt sagts på lektionerna.'
            : 'Pick the lessons your exam covers and Elevante helps you review — with answers grounded only in what was actually said in class.'}
        </p>

        <div className="mt-10">
          {courses.length === 0 ? (
            <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Du har inga färdiga lektioner att plugga på ännu.'
                : 'You have no finished lessons to study yet.'}
            </p>
          ) : (
            <ExamPrepPicker locale={locale} courses={courses} />
          )}
        </div>
      </div>
    </div>
  );
}
