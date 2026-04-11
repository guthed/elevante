import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LessonStatusBadge } from '@/components/app/LessonStatusBadge';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getAdminStats } from '@/lib/data/admin';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.admin.stats.title,
    robots: { index: false, follow: false },
  };
}

export default async function AdminStatsPage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.admin.stats;
  const stats = await getAdminStats();

  const maxCount = Math.max(...stats.weeklyLessons.map((d) => d.count), 1);
  const totalLessons = stats.weeklyLessons.reduce((sum, d) => sum + d.count, 0);

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{labels.weeklyHeading}</CardTitle>
            </CardHeader>
            <CardBody>
              {totalLessons === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">{labels.noData}</p>
              ) : (
                <div className="space-y-2">
                  {stats.weeklyLessons.map((day) => {
                    const pct = (day.count / maxCount) * 100;
                    const date = new Date(day.day);
                    return (
                      <div key={day.day} className="flex items-center gap-3">
                        <div className="w-16 text-xs text-[var(--color-ink-subtle)]">
                          {date.toLocaleDateString(
                            locale === 'sv' ? 'sv-SE' : 'en-GB',
                            { weekday: 'short', day: '2-digit' },
                          )}
                        </div>
                        <div className="relative flex-1">
                          <div
                            className="h-6 rounded-full bg-[var(--color-accent)]"
                            style={{ width: `${Math.max(pct, 4)}%` }}
                          />
                        </div>
                        <div className="w-8 text-right text-sm text-[var(--color-primary)]">
                          {day.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{labels.statusHeading}</CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3">
                {stats.statusBreakdown.map((row) => (
                  <li
                    key={row.status}
                    className="flex items-center justify-between"
                  >
                    <LessonStatusBadge
                      status={row.status}
                      labels={dict.app.pages.teacher.statuses}
                    />
                    <span className="font-mono text-[var(--color-primary)]">
                      {row.count}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{labels.activityHeading}</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="space-y-4">
              <Total
                label={dict.app.pages.admin.overview.studentsLabel}
                value={stats.totals.students}
              />
              <Total
                label={dict.app.pages.admin.overview.teachersLabel}
                value={stats.totals.teachers}
              />
              <Total label="admin" value={stats.totals.admins} />
            </dl>
          </CardBody>
        </Card>
      </div>

      {totalLessons === 0 && stats.totals.students === 0 ? (
        <div className="mt-12">
          <EmptyState title={labels.noData} />
        </div>
      ) : null}
    </PageWrapper>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="font-serif text-3xl text-[var(--color-primary)]">{value}</dd>
    </div>
  );
}
