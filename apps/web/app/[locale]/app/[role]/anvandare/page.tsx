import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getAdminUsers } from '@/lib/data/admin';
import { UserRoleForm } from './UserRoleForm';

type Props = {
  params: Promise<{ locale: string; role: string }>;
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

export default async function AdminUsersPage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.admin.users;
  const users = await getAdminUsers();

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      {users.length === 0 ? (
        <EmptyState title={labels.empty} />
      ) : (
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-ink-subtle)]">
                <tr>
                  <th className="px-6 py-4">{labels.nameColumn}</th>
                  <th className="px-6 py-4">{labels.emailColumn}</th>
                  <th className="px-6 py-4">{labels.roleColumn}</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.full_name ?? user.email ?? '?'} size="sm" />
                        <span className="text-[var(--color-primary)]">
                          {user.full_name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-[var(--color-ink-muted)]">
                      {user.email ?? '—'}
                    </td>
                    <td className="px-6 py-3" colSpan={2}>
                      <UserRoleForm
                        userId={user.id}
                        currentRole={user.role}
                        labels={labels}
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
