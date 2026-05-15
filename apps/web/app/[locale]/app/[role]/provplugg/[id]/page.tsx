import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getPracticeTest } from '@/lib/data/student';
import { TestResult } from '@/components/app/TestResult';
import { TestRunner } from './TestRunner';
import { ShareTestButton } from './ShareTestButton';

// Rättningen anropar Claude för att bedöma fritextsvaren — högre timeout.
export const maxDuration = 60;

type Props = {
  params: Promise<{ locale: string; role: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Testprov' : 'Practice test',
    robots: { index: false, follow: false },
  };
}

export default async function PracticeTestPage({ params }: Props) {
  const { locale: rawLocale, role, id } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const data = await getPracticeTest(id);
  if (!data || data.test.user_id !== profile.id) notFound();
  const { test, courseName } = data;

  const base = `/${locale}/app/student`;

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-6 text-[0.8125rem] text-[var(--color-ink-muted)]">
          <Link href={`${base}/provplugg`} className="hover:text-[var(--color-ink)]">
            {sv ? 'Plugga inför prov' : 'Exam prep'}
          </Link>
          <span className="px-2 text-[var(--color-sand-strong)]">/</span>
          <span className="text-[var(--color-ink-secondary)]">
            {sv ? 'Testprov' : 'Practice test'}
          </span>
        </nav>

        <p className="eyebrow">
          {courseName ?? (sv ? 'Testprov' : 'Practice test')} ·{' '}
          {test.lesson_ids.length} {test.lesson_ids.length === 1
            ? sv ? 'lektion' : 'lesson'
            : sv ? 'lektioner' : 'lessons'}
        </p>
        <h1 className="mt-2 font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {test.status === 'graded'
            ? sv ? 'Ditt rättade testprov' : 'Your graded practice test'
            : sv ? 'Testprov' : 'Practice test'}
        </h1>

        <div className="mt-8">
          {test.status === 'generated' ? (
            <>
              <p className="mb-6 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? `${test.questions.length} frågor. Svara så gott du kan — du får poäng och feedback när du lämnar in.`
                  : `${test.questions.length} questions. Answer as best you can — you get a score and feedback on submit.`}
              </p>
              <TestRunner testId={test.id} questions={test.questions} locale={locale} />
            </>
          ) : (
            <TestResult
              questions={test.questions}
              answers={test.submission?.answers ?? []}
              overallFeedback={test.submission?.overall_feedback ?? ''}
              score={test.score ?? 0}
              maxScore={test.max_score}
              locale={locale}
              footer={
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <ShareTestButton
                    testId={test.id}
                    initiallyShared={test.shared_with_teacher}
                    locale={locale}
                  />
                  <Link
                    href={`${base}/provplugg`}
                    className="text-[0.9375rem] text-[var(--color-ink-secondary)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
                  >
                    {sv ? 'Gör ett nytt testprov' : 'Take another practice test'}
                  </Link>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
