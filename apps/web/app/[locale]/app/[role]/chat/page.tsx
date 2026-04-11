import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getStudentOverview, getUserChatHistory } from '@/lib/data/student';
import { CourseChatStarter } from './CourseChatStarter';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.student.chat.title,
    robots: { index: false, follow: false },
  };
}

export default async function StudentChatLandingPage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.student.chat;

  const [{ courses }, history] = await Promise.all([
    getStudentOverview(profile.id),
    getUserChatHistory(),
  ]);

  const base = `/${locale}/app/student`;

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>{labels.startCourseChat}</CardTitle>
            </CardHeader>
            <CardBody>
              {courses.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">
                  {dict.app.pages.student.overview.emptyBody}
                </p>
              ) : (
                <CourseChatStarter
                  locale={locale}
                  courses={courses.map((c) => ({
                    id: c.id,
                    label: `${c.code} — ${c.name}`,
                  }))}
                  labels={labels}
                />
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{labels.historyHeading}</CardTitle>
          </CardHeader>
          <CardBody>
            {history.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">
                {labels.noHistory}
              </p>
            ) : (
              <ul className="space-y-3">
                {history.map((chat) => (
                  <li key={chat.id}>
                    <Link
                      href={`${base}/chat/${chat.id}`}
                      className="block rounded-xl border border-[var(--color-border)] bg-white p-3 transition-colors hover:border-[var(--color-accent)]"
                    >
                      <div className="truncate text-sm font-medium text-[var(--color-primary)]">
                        {chat.title ?? '—'}
                      </div>
                      <div className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                        {new Date(chat.updated_at).toLocaleDateString(
                          locale === 'sv' ? 'sv-SE' : 'en-GB',
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {history.length === 0 && courses.length === 0 ? (
        <div className="mt-12">
          <EmptyState title={labels.empty} />
        </div>
      ) : null}
    </PageWrapper>
  );
}
