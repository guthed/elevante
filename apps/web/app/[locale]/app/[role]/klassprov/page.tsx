import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCurrentProfile } from '@/lib/supabase/server';
import {
  getStudentClassTests,
  getTeacherClassTests,
  type StudentClassTestRow,
} from '@/lib/data/class-test';
import type { ClassTestStatus } from '@/lib/supabase/database';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Klassprov' : 'Class tests',
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

const studentRowClass =
  'flex items-center gap-4 rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-5 py-4';

function StudentRowBody({
  row,
  labels,
  sv,
}: {
  row: StudentClassTestRow;
  labels: { awaitingReview: string; released: string };
  sv: boolean;
}) {
  return (
    <>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-[1.0625rem] text-[var(--color-ink)]">
          {row.title}
        </p>
        {row.className ? (
          <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {row.className}
          </p>
        ) : null}
      </div>
      {row.submissionStatus === 'released' ? (
        <Badge tone="success" className="shrink-0">
          {labels.released}
        </Badge>
      ) : row.submissionStatus === 'graded' ? (
        <Badge tone="warning" className="shrink-0">
          {labels.awaitingReview}
        </Badge>
      ) : (
        <Badge tone="neutral" className="shrink-0">
          {sv ? 'Att göra' : 'To do'}
        </Badge>
      )}
    </>
  );
}

function renderStudentRow(
  row: StudentClassTestRow,
  studentBase: string,
  labels: { awaitingReview: string; released: string },
  sv: boolean,
) {
  // 'graded' = inlämnat men ej släppt → inget resultat ännu, ingen länk.
  if (row.submissionStatus === 'graded') {
    return (
      <div className={studentRowClass}>
        <StudentRowBody row={row} labels={labels} sv={sv} />
      </div>
    );
  }
  // null (gör provet) eller 'released' (visa resultat) → länk till detaljvyn.
  return (
    <Link
      href={`${studentBase}/klassprov/${row.testId}`}
      className={`${studentRowClass} transition-colors hover:bg-[var(--color-surface-soft)]`}
    >
      <StudentRowBody row={row} labels={labels} sv={sv} />
    </Link>
  );
}

export default async function ClassTestsPage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const t = dict.app.klassprov;

  if (role === 'student') {
    const rows = await getStudentClassTests(profile.id);
    const studentBase = `/${locale}/app/student`;

    return (
      <div className="container-wide py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Klassprov' : 'Class tests'}
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Prov från dina lärare. Gör provet och se ditt resultat när läraren släpper det.'
              : 'Tests from your teachers. Take the test and see your result once your teacher releases it.'}
          </p>

          <div className="mt-8">
            {rows.length === 0 ? (
              <EmptyState
                title={sv ? 'Inga klassprov ännu' : 'No class tests yet'}
                description={
                  sv
                    ? 'När en lärare publicerar ett prov till din klass dyker det upp här.'
                    : 'When a teacher publishes a test to your class, it shows up here.'
                }
              />
            ) : (
              <ul className="space-y-2">
                {rows.map((row) => (
                  <li key={row.testId}>
                    {renderStudentRow(row, studentBase, t, sv)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  const tests = await getTeacherClassTests();
  const base = `/${locale}/app/${role}`;

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
              {sv ? 'Klassprov' : 'Class tests'}
            </h1>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {sv
                ? 'AI-genererade prov för dina klasser. Skapa, publicera och granska inlämningar.'
                : 'AI-generated tests for your classes. Create, publish and review submissions.'}
            </p>
          </div>
          <LinkButton href={`${base}/klassprov/nytt`} className="shrink-0">
            {t.newTest}
          </LinkButton>
        </div>

        <div className="mt-8">
          {tests.length === 0 ? (
            <EmptyState
              title={sv ? 'Inga klassprov ännu' : 'No class tests yet'}
              description={
                sv
                  ? 'Skapa ditt första prov från en eller flera lektioner.'
                  : 'Create your first test from one or more lessons.'
              }
            />
          ) : (
            <ul className="space-y-2">
              {tests.map((test) => (
                <li key={test.id}>
                  <Link
                    href={`${base}/klassprov/${test.id}`}
                    className="flex items-center gap-4 rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-5 py-4 transition-colors hover:bg-[var(--color-surface-soft)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[1.0625rem] text-[var(--color-ink)]">
                        {test.title}
                      </p>
                      <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">
                        {[
                          test.className,
                          `${test.submissionCount} ${
                            test.submissionCount === 1
                              ? sv
                                ? 'inlämning'
                                : 'submission'
                              : sv
                                ? 'inlämningar'
                                : 'submissions'
                          }`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    {test.pendingReviewCount > 0 ? (
                      <Badge tone="warning" className="shrink-0">
                        {test.pendingReviewCount} {t.pendingReview}
                      </Badge>
                    ) : null}
                    <Badge tone={statusTone(test.status)} className="shrink-0">
                      {statusLabel(test.status, sv)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
