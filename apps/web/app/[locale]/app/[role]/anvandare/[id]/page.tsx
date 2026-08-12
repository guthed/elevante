import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getAdminUserDetail } from '@/lib/data/admin';
import { UserRoleForm } from '../UserRoleForm';

type Props = {
  params: Promise<{ locale: string; role: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.admin.users.title,
    robots: { index: false, follow: false },
  };
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { locale, role, id } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.admin.users;
  const detailLabels = labels.detail;
  const sv = locale === 'sv';

  const detail = await getAdminUserDetail(id, profile.is_staff);
  if (!detail) notFound();

  const roleLabel =
    detail.role === 'student' ? (sv ? 'Elev' : 'Student') : detail.role === 'teacher' ? (sv ? 'Lärare' : 'Teacher') : 'Admin';

  return (
    <PageWrapper
      title={detail.full_name ?? detail.email ?? '—'}
      subtitle={roleLabel}
      actions={
        <Link
          href={`/${locale}/app/admin/anvandare`}
          className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]"
        >
          {detailLabels.back}
        </Link>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {detail.role === 'student' ? (
            <Card>
              <CardHeader>
                <CardTitle>{detailLabels.classesHeading}</CardTitle>
              </CardHeader>
              <CardBody>
                {detail.classes.length === 0 ? (
                  <p className="text-sm text-[var(--color-ink-muted)]">{detailLabels.classesEmpty}</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.classes.map((cls) => (
                      <li key={cls.id}>
                        <Link
                          href={`/${locale}/app/admin/klasser/${cls.id}`}
                          className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-accent)]"
                        >
                          {cls.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          ) : null}

          {detail.role === 'teacher' ? (
            <Card>
              <CardHeader>
                <CardTitle>{detailLabels.coursesHeading}</CardTitle>
              </CardHeader>
              <CardBody>
                {detail.courses.length === 0 ? (
                  <p className="text-sm text-[var(--color-ink-muted)]">{detailLabels.coursesEmpty}</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.courses.map((course) => (
                      <li key={course.id} className="text-sm">
                        <span className="font-medium text-[var(--color-primary)]">{course.name}</span>{' '}
                        <span className="text-[var(--color-ink-subtle)]">{course.code}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <Avatar name={detail.full_name ?? detail.email ?? '?'} size="md" />
              <div className="min-w-0">
                <div className="truncate font-medium text-[var(--color-primary)]">
                  {detail.full_name ?? '—'}
                </div>
                <div className="truncate text-sm text-[var(--color-ink-subtle)]">{detail.email}</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-[var(--color-ink-subtle)]">
              {detailLabels.createdLabel}{' '}
              {new Date(detail.created_at).toLocaleDateString(sv ? 'sv-SE' : 'en-GB')}
            </div>
            <div className="mt-6">
              <UserRoleForm
                userId={detail.id}
                currentRole={detail.role}
                isSelf={detail.id === profile.id}
                labels={labels}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
