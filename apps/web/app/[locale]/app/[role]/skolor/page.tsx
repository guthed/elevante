import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getAdminSchools, getStaffAccounts } from '@/lib/data/admin';
import { CreateSchoolForm } from './CreateSchoolForm';
import { BootstrapAdminForm } from './BootstrapAdminForm';
import { GrantStaffForm, RevokeStaffButton } from './StaffAccessForm';

type Props = {
  params: Promise<{ locale: string; role: string }>;
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

export default async function AdminSchoolsPage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.is_staff) redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.admin.schools;
  const staffLabels = labels.staff;
  const [schools, staffAccounts] = await Promise.all([
    getAdminSchools(),
    getStaffAccounts(),
  ]);

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {schools.length === 0 ? (
            <EmptyState title={labels.empty} />
          ) : (
            schools.map((school) => (
              <Card key={school.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-4">
                    <Link href={`/${locale}/app/admin/skolor/${school.id}`} className="group min-w-0 flex-1">
                      <div className="text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
                        {school.slug}
                      </div>
                      <div className="mt-1 font-serif text-2xl text-[var(--color-primary)] group-hover:text-[var(--color-accent)]">
                        {school.name}
                      </div>
                      <div className="mt-2 text-xs text-[var(--color-ink-subtle)]">
                        {labels.createdLabel}{' '}
                        {new Date(school.created_at).toLocaleDateString(
                          locale === 'sv' ? 'sv-SE' : 'en-GB',
                        )}
                      </div>
                    </Link>
                    <Badge tone="neutral">{school.country}</Badge>
                  </div>
                  {school.adminCount === 0 ? (
                    <BootstrapAdminForm
                      schoolId={school.id}
                      locale={locale}
                      labels={dict.app.pages.admin.schools.bootstrapAdmin}
                    />
                  ) : null}
                </CardBody>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{labels.createTitle}</CardTitle>
            </CardHeader>
            <CardBody>
              <CreateSchoolForm labels={labels} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{staffLabels.heading}</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <p className="text-xs text-[var(--color-ink-subtle)]">{staffLabels.hint}</p>
                {staffAccounts.length === 0 ? (
                  <p className="text-sm text-[var(--color-ink-subtle)]">
                    {staffLabels.listEmpty}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {staffAccounts.map((account) => (
                      <li
                        key={account.id}
                        className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-2 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--color-primary)]">
                            {account.full_name ?? '—'}
                          </p>
                          <p className="truncate text-xs text-[var(--color-ink-subtle)]">
                            {account.email ?? '—'}
                          </p>
                        </div>
                        {account.email ? (
                          <RevokeStaffButton email={account.email} labels={staffLabels} />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <GrantStaffForm labels={staffLabels} />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
