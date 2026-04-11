import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getTeacherClasses } from '@/lib/data/teacher';

type Props = {
  params: Promise<{ locale: string; role: string }>;
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

export default async function TeacherClassesPage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'teacher') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.teacher.classes;
  const classes = await getTeacherClasses(profile.id);
  const base = `/${locale}/app/teacher`;

  if (classes.length === 0) {
    return (
      <PageWrapper title={labels.title} subtitle={labels.subtitle}>
        <EmptyState title={labels.empty} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls) => (
          <Link
            key={cls.id}
            href={`${base}/klasser/${cls.id}`}
            className="group rounded-2xl border border-[var(--color-border)] bg-white p-6 transition-colors hover:border-[var(--color-accent)]"
          >
            <div className="text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
              {cls.year ? `${labels.year} ${cls.year}` : ''}
            </div>
            <div className="mt-2 font-serif text-2xl text-[var(--color-primary)]">
              {cls.name}
            </div>
            <div className="mt-4 text-sm text-[var(--color-ink-muted)]">
              {cls.studentsCount} {labels.studentsLabel}
            </div>
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}
