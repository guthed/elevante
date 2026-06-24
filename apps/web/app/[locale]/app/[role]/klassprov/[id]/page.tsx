import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCurrentProfile } from '@/lib/supabase/server';
import { LinkButton } from '@/components/ui/Button';
import { TestResult } from '@/components/app/TestResult';
import {
  getClassTestForTeacher,
  getClassTestSubmissions,
  getMySubmissionResult,
  getPublishedClassTest,
  getStudentClassTests,
} from '@/lib/data/class-test';
import type {
  ClassTestStatus,
  ClassTestSubmissionStatus,
  PracticeQuestion,
} from '@/lib/supabase/database';
import { QuestionEditor } from './QuestionEditor';
import { CloseTestButton } from './CloseTestButton';
import { ClassTestRunner } from './ClassTestRunner';

// Publicering rättar inget men editorns spar-/regenereringsanrop kan vara tunga.
export const maxDuration = 60;

type Props = {
  params: Promise<{ locale: string; role: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Klassprov' : 'Class test',
    robots: { index: false, follow: false },
  };
}

function statusLabel(status: ClassTestStatus, sv: boolean): string {
  if (status === 'published') return sv ? 'Publicerat' : 'Published';
  if (status === 'closed') return sv ? 'Stängt' : 'Closed';
  return sv ? 'Utkast' : 'Draft';
}

function statusTone(status: ClassTestStatus): 'neutral' | 'success' | 'warning' {
  if (status === 'published') return 'success';
  if (status === 'closed') return 'neutral';
  return 'warning';
}

function submissionStatusLabel(
  status: ClassTestSubmissionStatus,
  sv: boolean,
): string {
  if (status === 'released') return sv ? 'Släppt' : 'Released';
  return sv ? 'Väntar på granskning' : 'Awaiting review';
}

function submissionStatusTone(
  status: ClassTestSubmissionStatus,
): 'success' | 'warning' {
  return status === 'released' ? 'success' : 'warning';
}

export default async function ClassTestDetailPage({ params }: Props) {
  const { locale: rawLocale, role, id } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const t = dict.app.klassprov;

  if (role === 'student') {
    const studentBase = `/${locale}/app/student`;
    const rows = await getStudentClassTests(profile.id);
    const row = rows.find((r) => r.testId === id);

    const breadcrumb = (
      <nav className="mb-6 text-[0.8125rem] text-[var(--color-ink-muted)]">
        <Link
          href={`${studentBase}/klassprov`}
          className="hover:text-[var(--color-ink)]"
        >
          {sv ? 'Klassprov' : 'Class tests'}
        </Link>
        <span className="px-2 text-[var(--color-sand-strong)]">/</span>
        <span className="text-[var(--color-ink-secondary)]">
          {row?.title ?? (sv ? 'Prov' : 'Test')}
        </span>
      </nav>
    );

    // --- Släppt resultat ---
    if (row?.submissionStatus === 'released' && row.submissionId) {
      const result = await getMySubmissionResult(row.submissionId);
      if (result) {
        // Hämta facit-strippade frågorna för att para ihop question_id → prompt.
        const published = await getPublishedClassTest(id);
        const questions: PracticeQuestion[] = (published?.questions ?? []).map(
          (q) => ({ ...q, answer_key: '', correct_index: null }),
        );

        return (
          <div className="container-wide py-10 md:py-14">
            <div className="mx-auto max-w-3xl">
              {breadcrumb}
              <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
                {row.title}
              </h1>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {sv
                  ? 'Läraren har granskat och släppt ditt resultat.'
                  : 'Your teacher has reviewed and released your result.'}
              </p>
              <div className="mt-8">
                <TestResult
                  questions={questions}
                  answers={result.answers}
                  overallFeedback={result.overall_feedback}
                  score={result.score}
                  maxScore={result.max_score}
                  locale={locale}
                />
              </div>
            </div>
          </div>
        );
      }
      // Edge: släppt-flagga men inget resultat → fall igenom till väntläge.
    }

    // --- Inlämnat, väntar på granskning ---
    if (row?.submissionStatus === 'graded') {
      return (
        <div className="container-wide py-10 md:py-14">
          <div className="mx-auto max-w-3xl">
            {breadcrumb}
            <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
              {row.title}
            </h1>
            <div className="mt-8">
              <EmptyState
                title={sv ? 'Inlämnat' : 'Submitted'}
                description={t.awaitingReview}
                action={
                  <LinkButton href={`${studentBase}/klassprov`} variant="ghost">
                    {sv ? 'Till klassprov' : 'Back to class tests'}
                  </LinkButton>
                }
              />
            </div>
          </div>
        </div>
      );
    }

    // --- Gör provet ---
    const test = await getPublishedClassTest(id);
    if (!test) notFound();

    return (
      <div className="container-wide py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          {breadcrumb}
          <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
            {test.title}
          </h1>
          <p className="mb-2 mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? `${test.questions.length} frågor. Svara så gott du kan — läraren granskar innan resultatet släpps.`
              : `${test.questions.length} questions. Answer as best you can — your teacher reviews before the result is released.`}
          </p>
          <div className="mt-8">
            <ClassTestRunner
              testId={id}
              questions={test.questions}
              locale={locale}
            />
          </div>
        </div>
      </div>
    );
  }

  const test = await getClassTestForTeacher(id);
  if (!test) notFound();

  const base = `/${locale}/app/${role}`;

  // --- Utkast: frågeeditor ---
  if (test.status === 'draft') {
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
            <span className="text-[var(--color-ink-secondary)]">
              {test.title}
            </span>
          </nav>

          <div className="flex items-start justify-between gap-4">
            <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
              {test.title}
            </h1>
            <Badge tone={statusTone(test.status)} className="mt-2 shrink-0">
              {statusLabel(test.status, sv)}
            </Badge>
          </div>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Justera frågorna, regenerera enskilda frågor eller publicera provet till klassen.'
              : 'Tweak the questions, regenerate individual ones, or publish the test to the class.'}
          </p>

          <div className="mt-8">
            <QuestionEditor
              testId={test.id}
              initialQuestions={test.questions}
              role={role}
              locale={locale}
              labels={{
                regenerate: t.regenerate,
                publish: t.publish,
                points: t.points,
                save: sv ? 'Spara' : 'Save',
                remove: sv ? 'Ta bort' : 'Remove',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // --- Publicerat/stängt: inlämnings-översikt ---
  const { submitted, notStarted } = await getClassTestSubmissions(test);

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
          <span className="text-[var(--color-ink-secondary)]">{test.title}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
                {test.title}
              </h1>
              <Badge tone={statusTone(test.status)} className="shrink-0">
                {statusLabel(test.status, sv)}
              </Badge>
            </div>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {submitted.length}{' '}
              {submitted.length === 1
                ? sv
                  ? 'inlämning'
                  : 'submission'
                : sv
                  ? 'inlämningar'
                  : 'submissions'}
            </p>
          </div>
          {test.status === 'published' ? (
            <div className="mt-1 shrink-0">
              <CloseTestButton testId={test.id} locale={locale} />
            </div>
          ) : null}
        </div>

        <section className="mt-8">
          <h2 className="mb-3 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            {sv ? 'Inlämningar' : 'Submissions'}
          </h2>
          {submitted.length === 0 ? (
            <EmptyState
              title={sv ? 'Inga inlämningar ännu' : 'No submissions yet'}
              description={
                sv
                  ? 'Här dyker elevernas inlämningar upp när de gjort provet.'
                  : 'Student submissions show up here once they take the test.'
              }
            />
          ) : (
            <ul className="space-y-2">
              {submitted.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`${base}/klassprov/${test.id}/${row.id}`}
                    className="flex items-center gap-4 rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-5 py-4 transition-colors hover:bg-[var(--color-surface-soft)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[1.0625rem] text-[var(--color-ink)]">
                        {row.studentName ?? (sv ? 'Okänd elev' : 'Unknown student')}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] tabular-nums text-[var(--color-ink-muted)]">
                        {row.score}/{row.maxScore} {t.points.toLowerCase()}
                      </p>
                    </div>
                    <Badge
                      tone={submissionStatusTone(row.status)}
                      className="shrink-0"
                    >
                      {submissionStatusLabel(row.status, sv)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {notStarted.length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-3 text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
              {t.notStarted}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {notStarted.map((student) => (
                <li
                  key={student.id}
                  className="rounded-full border border-[var(--color-sand)] bg-[var(--color-surface)] px-3.5 py-1.5 text-[0.8125rem] text-[var(--color-ink-secondary)]"
                >
                  {student.name ?? (sv ? 'Okänd elev' : 'Unknown student')}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
