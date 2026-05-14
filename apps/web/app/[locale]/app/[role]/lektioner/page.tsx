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
import { getTeacherLessons, getLessonStatusCounts } from '@/lib/data/teacher';
import { LessonStatusFilter } from '@/components/app/teacher/LessonStatusFilter';
import type { TranscriptStatus } from '@/lib/supabase/database';

type StatusFilter = 'all' | TranscriptStatus;

function isStatusFilter(s: string | undefined): s is StatusFilter {
  return s === 'all' || s === 'ready' || s === 'processing' || s === 'pending' || s === 'failed';
}

type Props = {
  params: Promise<{ locale: string; role: string }>;
  searchParams: Promise<{ status?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.teacher.lessons.title,
    robots: { index: false, follow: false },
  };
}

export default async function TeacherLessonsPage({ params, searchParams }: Props) {
  const { locale, role } = await params;
  const { status: statusParam } = await searchParams;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'teacher') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const activeStatus: StatusFilter = isStatusFilter(statusParam) ? statusParam : 'all';

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.teacher.lessons;
  const [allLessons, statusCounts] = await Promise.all([
    getTeacherLessons(profile.id),
    profile.school_id
      ? getLessonStatusCounts(profile.school_id)
      : Promise.resolve({ all: 0, ready: 0, processing: 0, pending: 0, failed: 0 }),
  ]);
  const lessons =
    activeStatus === 'all'
      ? allLessons
      : allLessons.filter((l) => l.status === activeStatus);
  const base = `/${locale}/app/teacher`;

  if (allLessons.length === 0) {
    return (
      <PageWrapper title={labels.title} subtitle={labels.subtitle}>
        <EmptyState title={labels.empty} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      <div className="mb-6">
        <LessonStatusFilter locale={locale} active={activeStatus} counts={statusCounts} />
      </div>
      {lessons.length === 0 ? (
        <EmptyState title={labels.empty} />
      ) : (
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-ink-subtle)]">
              <tr>
                <th className="px-6 py-4">{labels.dateLabel}</th>
                <th className="px-6 py-4">{labels.courseLabel}</th>
                <th className="px-6 py-4">{labels.classLabel}</th>
                <th className="px-6 py-4">{labels.statusLabel}</th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => (
                <tr
                  key={lesson.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-subtle)]"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`${base}/lektioner/${lesson.id}`}
                      className="font-medium text-[var(--color-primary)] hover:text-[var(--color-accent)]"
                    >
                      {lesson.recordedAt
                        ? new Date(lesson.recordedAt).toLocaleString(
                            locale === 'sv' ? 'sv-SE' : 'en-GB',
                          )
                        : dict.app.pages.teacher.lessonDetail.notRecorded}
                    </Link>
                    {lesson.title ? (
                      <div className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                        {lesson.title}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-[var(--color-ink-muted)]">
                    {lesson.courseName ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-[var(--color-ink-muted)]">
                    {lesson.className ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <LessonStatusBadge
                      status={lesson.status}
                      labels={dict.app.pages.teacher.statuses}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      )}
    </PageWrapper>
  );
}
