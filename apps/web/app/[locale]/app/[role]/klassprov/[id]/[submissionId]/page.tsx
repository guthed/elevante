import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import {
  getClassTestForTeacher,
  getSubmissionForTeacher,
} from '@/lib/data/class-test';
import { GradeReview } from './GradeReview';

// Spar-/släppanropen i granskningsvyn rättar inget men kan vara tunga.
export const maxDuration = 60;

type Props = {
  params: Promise<{
    locale: string;
    role: string;
    id: string;
    submissionId: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Granska inlämning' : 'Review submission',
    robots: { index: false, follow: false },
  };
}

export default async function GradeReviewPage({ params }: Props) {
  const { locale: rawLocale, role, id, submissionId } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  if (role === 'student') {
    redirect(`/${locale}/app/student`);
  }

  const dict = await getDictionary(locale);
  const t = dict.app.klassprov;

  const [submission, test] = await Promise.all([
    getSubmissionForTeacher(submissionId),
    getClassTestForTeacher(id),
  ]);
  if (!submission || !test) notFound();

  const base = `/${locale}/app/${role}`;

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-6 text-[0.8125rem] text-[var(--color-ink-muted)]">
          <Link
            href={`${base}/klassprov`}
            className="hover:text-[var(--color-ink)]"
          >
            {sv ? 'Klassprov' : 'Class tests'}
          </Link>
          <span className="px-2 text-[var(--color-sand-strong)]">/</span>
          <Link
            href={`${base}/klassprov/${id}`}
            className="hover:text-[var(--color-ink)]"
          >
            {test.title}
          </Link>
          <span className="px-2 text-[var(--color-sand-strong)]">/</span>
          <span className="text-[var(--color-ink-secondary)]">
            {sv ? 'Granska' : 'Review'}
          </span>
        </nav>

        <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {test.title}
        </h1>

        <div className="mt-8">
          <GradeReview
            test={test}
            submission={submission}
            role={role}
            locale={locale}
            labels={{
              release: t.release,
              released: t.released,
              overallFeedback: t.overallFeedback,
              points: t.points,
              save: t.save,
            }}
          />
        </div>
      </div>
    </div>
  );
}
