import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LessonStatusBadge } from '@/components/app/LessonStatusBadge';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getStudentLibrary, getStudentOverview } from '@/lib/data/student';

type Props = {
  params: Promise<{ locale: string; role: string }>;
  searchParams: Promise<{ course?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.student.library.title,
    robots: { index: false, follow: false },
  };
}

export default async function StudentLibraryPage({ params, searchParams }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.student.library;

  const { course: courseFilter } = await searchParams;

  const [overview, lessons] = await Promise.all([
    getStudentOverview(profile.id),
    getStudentLibrary(profile.id, courseFilter),
  ]);

  const base = `/${locale}/app/student`;

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      {overview.courses.length > 0 ? (
        <nav className="mb-8 flex flex-wrap gap-2" aria-label={labels.allCourses}>
          <Link
            href={`${base}/bibliotek`}
            className={pillClass(!courseFilter)}
          >
            {labels.allCourses}
          </Link>
          {overview.courses.map((course) => (
            <Link
              key={course.id}
              href={`${base}/bibliotek?course=${course.id}`}
              className={pillClass(courseFilter === course.id)}
            >
              {course.code} — {course.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {lessons.length === 0 ? (
        <EmptyState title={labels.empty} />
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-[var(--color-border)]">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`${base}/lektioner/${lesson.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-[var(--color-bg-subtle)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--color-primary)]">
                      {lesson.title ?? lesson.courseName ?? lesson.id}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                      {lesson.courseName ?? '—'} ·{' '}
                      {lesson.recordedAt
                        ? new Date(lesson.recordedAt).toLocaleString(
                            locale === 'sv' ? 'sv-SE' : 'en-GB',
                          )
                        : labels.notRecorded}
                    </div>
                  </div>
                  <LessonStatusBadge
                    status={lesson.status}
                    labels={dict.app.pages.teacher.statuses}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PageWrapper>
  );
}

function pillClass(active: boolean): string {
  if (active) {
    return 'rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white';
  }
  return 'rounded-full border border-[var(--color-border)] bg-white px-4 py-1.5 text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-primary)]';
}
