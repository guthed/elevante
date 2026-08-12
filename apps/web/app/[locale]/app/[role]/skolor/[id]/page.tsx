import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getSchoolDetail } from '@/lib/data/admin';

type Props = {
  params: Promise<{ locale: string; role: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.admin.schools.title,
    robots: { index: false, follow: false },
  };
}

export default async function AdminSchoolDetailPage({ params }: Props) {
  const { locale, role, id } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.is_staff) redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.admin.schools.detail;
  const sv = locale === 'sv';

  const school = await getSchoolDetail(id);
  if (!school) notFound();

  const usersBase = `/${locale}/app/admin/anvandare`;
  const classesBase = `/${locale}/app/admin/klasser`;

  return (
    <PageWrapper
      title={school.name}
      subtitle={school.slug}
      actions={
        <Link
          href={`/${locale}/app/admin/skolor`}
          className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]"
        >
          {labels.back}
        </Link>
      }
    >
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Badge tone="neutral">{school.country}</Badge>
        <Badge tone="neutral">
          {school.studentsCount} {labels.studentsLabel}
        </Badge>
        <Badge tone="neutral">
          {school.teachersCount} {labels.teachersLabel}
        </Badge>
        <Badge tone="neutral">
          {school.admins.length} {labels.adminsLabel}
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{labels.classesHeading}</CardTitle>
            </CardHeader>
            <CardBody>
              {school.classes.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">{labels.classesEmpty}</p>
              ) : (
                <ul className="space-y-3">
                  {school.classes.map((cls) => (
                    <li key={cls.id}>
                      <Link
                        href={`${classesBase}/${cls.id}`}
                        className="flex items-center justify-between gap-4 hover:text-[var(--color-accent)]"
                      >
                        <span className="font-medium text-[var(--color-primary)]">{cls.name}</span>
                        <span className="text-xs text-[var(--color-ink-subtle)]">
                          {cls.studentsCount} {labels.studentsLabel}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{labels.coursesHeading}</CardTitle>
            </CardHeader>
            <CardBody>
              {school.courses.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">{labels.coursesEmpty}</p>
              ) : (
                <ul className="space-y-2">
                  {school.courses.map((course) => (
                    <li key={course.id} className="text-sm">
                      <span className="font-medium text-[var(--color-primary)]">{course.name}</span>{' '}
                      <span className="text-[var(--color-ink-subtle)]">{course.code}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{labels.adminsHeading}</CardTitle>
          </CardHeader>
          <CardBody>
            {school.admins.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">{labels.adminsEmpty}</p>
            ) : (
              <ul className="space-y-3">
                {school.admins.map((admin) => (
                  <li key={admin.id}>
                    <Link
                      href={`${usersBase}/${admin.id}`}
                      className="flex items-center gap-3 hover:text-[var(--color-accent)]"
                    >
                      <Avatar name={admin.full_name ?? admin.email ?? '?'} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[var(--color-primary)]">
                          {admin.full_name ?? '—'}
                        </div>
                        <div className="truncate text-xs text-[var(--color-ink-subtle)]">
                          {admin.email}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
      <p className="mt-6 text-xs text-[var(--color-ink-subtle)]">
        {new Date(school.created_at).toLocaleDateString(sv ? 'sv-SE' : 'en-GB')}
      </p>
    </PageWrapper>
  );
}
