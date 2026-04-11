import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { LessonStatusBadge } from '@/components/app/LessonStatusBadge';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getClassDetail } from '@/lib/data/teacher';

type Props = {
  params: Promise<{ locale: string; role: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.teacher.classes.title,
    robots: { index: false, follow: false },
  };
}

export default async function ClassDetailPage({ params }: Props) {
  const { locale, role, id } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'teacher') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.teacher.classDetail;

  const detail = await getClassDetail(id);
  if (!detail) notFound();

  const base = `/${locale}/app/teacher`;

  return (
    <PageWrapper
      title={detail.name}
      subtitle={
        detail.year
          ? `${dict.app.pages.teacher.classes.year} ${detail.year}`
          : undefined
      }
      actions={
        <Link
          href={`${base}/klasser`}
          className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]"
        >
          {labels.back}
        </Link>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {detail.courses.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{labels.coursesHeading}</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="space-y-3">
                  {detail.courses.map((course) => (
                    <li
                      key={course.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-medium text-[var(--color-primary)]">
                          {course.name}
                        </div>
                        <div className="text-xs text-[var(--color-ink-subtle)]">
                          {course.code}
                        </div>
                      </div>
                      <Badge tone="neutral">{course.code}</Badge>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{labels.lessonsHeading}</CardTitle>
            </CardHeader>
            <CardBody>
              {detail.recentLessons.length === 0 ? (
                <EmptyState
                  title={dict.app.pages.teacher.lessons.empty}
                  className="border-0 bg-transparent py-8"
                />
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {detail.recentLessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`${base}/lektioner/${lesson.id}`}
                        className="flex items-center justify-between gap-4 py-3 transition-colors hover:text-[var(--color-accent)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {lesson.title ?? lesson.courseName ?? lesson.id}
                          </div>
                          <div className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                            {lesson.recordedAt
                              ? new Date(lesson.recordedAt).toLocaleString(
                                  locale === 'sv' ? 'sv-SE' : 'en-GB',
                                )
                              : dict.app.pages.teacher.lessonDetail.notRecorded}
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
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{labels.membersHeading}</CardTitle>
          </CardHeader>
          <CardBody>
            {detail.members.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">
                {labels.membersEmpty}
              </p>
            ) : (
              <ul className="space-y-3">
                {detail.members.map((member) => (
                  <li key={member.id} className="flex items-center gap-3">
                    <Avatar name={member.full_name ?? member.email ?? '?'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[var(--color-primary)]">
                        {member.full_name ?? member.email ?? '—'}
                      </div>
                      {member.email && member.full_name ? (
                        <div className="truncate text-xs text-[var(--color-ink-subtle)]">
                          {member.email}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
