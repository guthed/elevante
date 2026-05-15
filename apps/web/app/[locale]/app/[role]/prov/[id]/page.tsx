import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getPracticeTest } from '@/lib/data/student';
import { TestResult } from '@/components/app/TestResult';

type Props = {
  params: Promise<{ locale: string; role: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Delat prov' : 'Shared test',
    robots: { index: false, follow: false },
  };
}

export default async function SharedTestDetailPage({ params }: Props) {
  const { locale: rawLocale, role, id } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'teacher') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  // RLS släpper bara igenom prov som eleven delat och som hör till skolan.
  const data = await getPracticeTest(id);
  if (!data || !data.test.shared_with_teacher || data.test.status !== 'graded') {
    notFound();
  }
  const { test, courseName, studentName } = data;
  const base = `/${locale}/app/teacher`;

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-6 text-[0.8125rem] text-[var(--color-ink-muted)]">
          <Link href={`${base}/prov`} className="hover:text-[var(--color-ink)]">
            {sv ? 'Delade prov' : 'Shared tests'}
          </Link>
          <span className="px-2 text-[var(--color-sand-strong)]">/</span>
          <span className="text-[var(--color-ink-secondary)]">
            {studentName ?? (sv ? 'Elev' : 'Student')}
          </span>
        </nav>

        <p className="eyebrow">
          {[
            courseName,
            `${test.lesson_ids.length} ${
              test.lesson_ids.length === 1
                ? sv ? 'lektion' : 'lesson'
                : sv ? 'lektioner' : 'lessons'
            }`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <h1 className="mt-2 font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {studentName
            ? sv
              ? `${studentName}s testprov`
              : `${studentName}'s practice test`
            : sv
              ? 'Testprov'
              : 'Practice test'}
        </h1>

        <div className="mt-8">
          <TestResult
            questions={test.questions}
            answers={test.submission?.answers ?? []}
            overallFeedback={test.submission?.overall_feedback ?? ''}
            score={test.score ?? 0}
            maxScore={test.max_score}
            locale={locale}
            headerNote={sv ? 'Elevens resultat' : "Student's result"}
          />
        </div>
      </div>
    </div>
  );
}
