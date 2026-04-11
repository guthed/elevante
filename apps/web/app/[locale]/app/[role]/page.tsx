import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card, CardBody } from '@/components/ui/Card';
import { LinkButton } from '@/components/ui/Button';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getTeacherOverview } from '@/lib/data/teacher';
import { getStudentOverview } from '@/lib/data/student';
import { getAdminOverview } from '@/lib/data/admin';
import { LessonStatusBadge } from '@/components/app/LessonStatusBadge';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) return {};
  const dict = await getDictionary(locale);
  return {
    title: `${dict.app.roleTitles[role]} · ${dict.app.pages[role].overview.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function RoleOverviewPage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  const dict = await getDictionary(locale);
  const overview = dict.app.pages[role].overview;
  const base = `/${locale}`;

  if (role === 'teacher') {
    const profile = await getCurrentProfile();
    if (!profile) notFound();
    const data = await getTeacherOverview(profile.id);
    const teacher = dict.app.pages.teacher.overview;

    if (
      data.classes.length === 0 &&
      data.courses.length === 0 &&
      data.recentLessons.length === 0
    ) {
      return (
        <PageWrapper title={teacher.title} subtitle={teacher.subtitle}>
          <EmptyState title={teacher.emptyTitle} description={teacher.emptyBody} />
        </PageWrapper>
      );
    }

    return (
      <PageWrapper title={teacher.title} subtitle={teacher.subtitle}>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatTile
            label={teacher.classesHeading}
            value={data.classes.length}
            href={`${base}/app/teacher/klasser`}
          />
          <StatTile
            label={teacher.coursesHeading}
            value={data.courses.length}
            href={`${base}/app/teacher/lektioner`}
          />
          <StatTile
            label={teacher.recentLessonsHeading}
            value={data.recentLessons.length}
            href={`${base}/app/teacher/lektioner`}
          />
        </div>

        {data.classes.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-serif text-2xl text-[var(--color-primary)]">
              {teacher.classesHeading}
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.classes.map((cls) => (
                <Link
                  key={cls.id}
                  href={`${base}/app/teacher/klasser/${cls.id}`}
                  className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-colors hover:border-[var(--color-accent)]"
                >
                  <div className="text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
                    {cls.year ? `${dict.app.pages.teacher.classes.year} ${cls.year}` : ''}
                  </div>
                  <div className="mt-2 font-serif text-2xl text-[var(--color-primary)]">
                    {cls.name}
                  </div>
                  <div className="mt-4 text-sm text-[var(--color-ink-muted)]">
                    {cls.studentsCount} {teacher.studentsCount}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {data.recentLessons.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-serif text-2xl text-[var(--color-primary)]">
              {teacher.recentLessonsHeading}
            </h2>
            <Card padded={false} className="mt-6">
              <ul className="divide-y divide-[var(--color-border)]">
                {data.recentLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`${base}/app/teacher/lektioner/${lesson.id}`}
                      className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-[var(--color-bg-subtle)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-[var(--color-primary)]">
                          {lesson.title ?? lesson.courseName ?? lesson.id}
                        </div>
                        <div className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                          {lesson.className ?? '—'} ·{' '}
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
            </Card>
          </section>
        ) : null}
      </PageWrapper>
    );
  }

  if (role === 'student') {
    const profile = await getCurrentProfile();
    if (!profile) notFound();
    const data = await getStudentOverview(profile.id);
    const student = dict.app.pages.student.overview;

    if (data.courses.length === 0 && data.recentLessons.length === 0) {
      return (
        <PageWrapper title={student.title} subtitle={student.subtitle}>
          <EmptyState title={student.emptyTitle} description={student.emptyBody} />
        </PageWrapper>
      );
    }

    return (
      <PageWrapper
        title={student.title}
        subtitle={student.subtitle}
        actions={
          <>
            <LinkButton
              href={`${base}/app/student/chat`}
              variant="ghost"
              size="sm"
            >
              {student.chatCta}
            </LinkButton>
            <LinkButton href={`${base}/app/student/bibliotek`} size="sm">
              {student.openLibrary}
            </LinkButton>
          </>
        }
      >
        {data.courses.length > 0 ? (
          <section>
            <h2 className="font-serif text-2xl text-[var(--color-primary)]">
              {student.coursesHeading}
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.courses.map((course) => (
                <Link
                  key={course.id}
                  href={`${base}/app/student/bibliotek?course=${course.id}`}
                  className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-colors hover:border-[var(--color-accent)]"
                >
                  <div className="text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
                    {course.code}
                  </div>
                  <div className="mt-2 font-serif text-2xl text-[var(--color-primary)]">
                    {course.name}
                  </div>
                  <div className="mt-4 text-sm text-[var(--color-ink-muted)]">
                    {course.lessonsCount} {dict.app.pages.teacher.overview.lessonsCount}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {data.recentLessons.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-serif text-2xl text-[var(--color-primary)]">
              {student.recentLessonsHeading}
            </h2>
            <Card padded={false} className="mt-6">
              <ul className="divide-y divide-[var(--color-border)]">
                {data.recentLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={`${base}/app/student/lektioner/${lesson.id}`}
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
                            : dict.app.pages.student.library.notRecorded}
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
          </section>
        ) : null}
      </PageWrapper>
    );
  }

  // Admin: rik översikt med stat-tiles + recent lessons + quick actions
  const data = await getAdminOverview();
  const admin = dict.app.pages.admin.overview;

  return (
    <PageWrapper
      title={admin.title}
      subtitle={admin.subtitle}
      actions={
        <>
          <LinkButton href={`${base}/app/admin/skolor`} variant="ghost" size="sm">
            {admin.manageSchools}
          </LinkButton>
          <LinkButton href={`${base}/app/admin/anvandare`} size="sm">
            {admin.manageUsers}
          </LinkButton>
        </>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label={admin.schoolsLabel}
          value={data.schoolsCount}
          href={`${base}/app/admin/skolor`}
        />
        <StatTile
          label={admin.studentsLabel}
          value={data.studentsCount}
          href={`${base}/app/admin/anvandare`}
        />
        <StatTile
          label={admin.teachersLabel}
          value={data.teachersCount}
          href={`${base}/app/admin/anvandare`}
        />
        <StatTile
          label={admin.lessonsLabel}
          value={data.lessonsCount}
          href={`${base}/app/admin/statistik`}
        />
        <StatTile
          label={admin.transcribedLabel}
          value={data.transcribedCount}
          href={`${base}/app/admin/statistik`}
        />
      </div>

      {data.recentLessons.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-serif text-2xl text-[var(--color-primary)]">
            {admin.recentLessonsHeading}
          </h2>
          <Card padded={false} className="mt-6">
            <ul className="divide-y divide-[var(--color-border)]">
              {data.recentLessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--color-primary)]">
                      {lesson.title ?? lesson.courseName ?? lesson.id}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                      {lesson.className ?? '—'} ·{' '}
                      {lesson.recordedAt
                        ? new Date(lesson.recordedAt).toLocaleString(
                            locale === 'sv' ? 'sv-SE' : 'en-GB',
                          )
                        : '—'}
                    </div>
                  </div>
                  <LessonStatusBadge
                    status={lesson.status}
                    labels={dict.app.pages.teacher.statuses}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="font-serif text-2xl text-[var(--color-primary)]">
          {admin.quickActionsHeading}
        </h2>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href={`${base}/app/admin/schema`} variant="outline" size="sm">
            {admin.uploadSchedule}
          </LinkButton>
          <LinkButton href={`${base}/app/admin/anvandare`} variant="outline" size="sm">
            {admin.manageUsers}
          </LinkButton>
          <LinkButton href={`${base}/app/admin/skolor`} variant="outline" size="sm">
            {admin.manageSchools}
          </LinkButton>
        </div>
      </section>
    </PageWrapper>
  );
}

function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card interactive>
        <CardBody>
          <div className="text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
            {label}
          </div>
          <div className="mt-2 font-serif text-5xl text-[var(--color-primary)]">
            {value}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
