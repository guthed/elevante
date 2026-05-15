import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getPracticeTest } from '@/lib/data/student';
import type { PracticeAnswer, PracticeQuestion } from '@/lib/supabase/database';
import { TestRunner } from './TestRunner';

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
              retryHref={`${base}/provplugg`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function scoreTone(ratio: number): string {
  if (ratio >= 0.999) return 'var(--color-sage)';
  if (ratio > 0) return 'var(--color-sand-strong)';
  return 'var(--color-coral)';
}

function TestResult({
  questions,
  answers,
  overallFeedback,
  score,
  maxScore,
  locale,
  retryHref,
}: {
  questions: PracticeQuestion[];
  answers: PracticeAnswer[];
  overallFeedback: string;
  score: number;
  maxScore: number;
  locale: Locale;
  retryHref: string;
}) {
  const sv = locale === 'sv';
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const answerByQuestion = new Map(answers.map((a) => [a.question_id, a]));

  return (
    <div className="space-y-8">
      {/* Poäng-header */}
      <div className="rounded-[20px] bg-[var(--color-surface)] p-6 text-center">
        <p className="eyebrow">{sv ? 'Resultat' : 'Result'}</p>
        <p className="mt-2 font-serif text-[2.75rem] leading-none text-[var(--color-ink)] tabular-nums">
          {score}
          <span className="text-[var(--color-ink-muted)]">/{maxScore}</span>
        </p>
        <p className="mt-1 text-[0.9375rem] text-[var(--color-ink-secondary)]">
          {percent}%
        </p>
        {overallFeedback ? (
          <p className="mx-auto mt-4 max-w-xl text-[0.9375rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
            {overallFeedback}
          </p>
        ) : null}
      </div>

      {/* Per fråga */}
      <ol className="space-y-5">
        {questions.map((q, idx) => {
          const a = answerByQuestion.get(q.id);
          const points = a?.points ?? 0;
          const ratio = q.max_points > 0 ? points / q.max_points : 0;
          return (
            <li
              key={q.id}
              className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 md:p-6"
            >
              <div className="mb-3 flex items-baseline justify-between gap-4">
                <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  {sv ? 'Fråga' : 'Question'} {idx + 1}
                </span>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium tabular-nums"
                  style={{
                    background: scoreTone(ratio),
                    color: ratio >= 0.999 || ratio === 0 ? '#FFF' : 'var(--color-ink)',
                  }}
                >
                  {points}/{q.max_points}
                </span>
              </div>
              <p className="font-serif text-[1.0625rem] leading-snug text-[var(--color-ink)]">
                {q.prompt}
              </p>

              <div className="mt-3 rounded-[12px] bg-[var(--color-canvas)] px-4 py-3">
                <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                  {sv ? 'Ditt svar' : 'Your answer'}
                </p>
                <p className="mt-1 text-[0.9375rem] text-[var(--color-ink)]">
                  {a?.answer && a.answer.trim().length > 0
                    ? a.answer
                    : sv
                      ? '(inget svar)'
                      : '(no answer)'}
                </p>
              </div>

              {a?.feedback ? (
                <div className="mt-3 rounded-[12px] border-l-2 border-[var(--color-coral)] bg-[var(--color-canvas)] px-4 py-3">
                  <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                    {sv ? 'Feedback' : 'Feedback'}
                  </p>
                  <p className="mt-1 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
                    {a.feedback}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div>
        <Link
          href={retryHref}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition-opacity hover:opacity-90"
        >
          {sv ? 'Gör ett nytt testprov' : 'Take another practice test'}
        </Link>
      </div>
    </div>
  );
}
