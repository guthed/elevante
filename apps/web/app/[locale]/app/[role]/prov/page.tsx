import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getSharedPracticeTests } from '@/lib/data/teacher';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Delade prov' : 'Shared tests',
    robots: { index: false, follow: false },
  };
}

export default async function SharedTestsPage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'teacher') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const tests = await getSharedPracticeTests();
  const base = `/${locale}/app/teacher`;

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {sv ? 'Delade prov' : 'Shared tests'}
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? 'Övningsprov som elever själva har valt att dela med dig. Klicka för att se svar och feedback.'
            : 'Practice tests students have chosen to share with you. Click to see answers and feedback.'}
        </p>

        <div className="mt-8">
          {tests.length === 0 ? (
            <p className="rounded-[16px] border border-dashed border-[var(--color-sand)] p-8 text-center text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Inga elever har delat ett prov med dig ännu.'
                : 'No students have shared a test with you yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {tests.map((t) => {
                const percent =
                  t.maxScore > 0 ? Math.round((t.score / t.maxScore) * 100) : 0;
                return (
                  <li key={t.id}>
                    <Link
                      href={`${base}/prov/${t.id}`}
                      className="flex items-center gap-4 rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-5 py-4 transition-colors hover:bg-[var(--color-surface-soft)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-[1rem] text-[var(--color-ink)]">
                          {t.studentName ?? (sv ? 'Okänd elev' : 'Unknown student')}
                        </p>
                        <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">
                          {[
                            t.courseName,
                            `${t.lessonCount} ${
                              t.lessonCount === 1
                                ? sv ? 'lektion' : 'lesson'
                                : sv ? 'lektioner' : 'lessons'
                            }`,
                            t.sharedAt
                              ? new Date(t.sharedAt).toLocaleDateString(
                                  sv ? 'sv-SE' : 'en-GB',
                                )
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <span className="shrink-0 font-serif text-[1.125rem] text-[var(--color-ink)] tabular-nums">
                        {t.score}/{t.maxScore}
                        <span className="ml-1.5 text-[0.8125rem] text-[var(--color-ink-muted)]">
                          {percent}%
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
