import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getAdminCourses, getSchoolTeachers } from '@/lib/data/admin';
import { AdminCoursesView } from './AdminCoursesView';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.admin.courses.title,
    robots: { index: false, follow: false },
  };
}

export default async function AdminCoursesPage({ params }: Props) {
  const { locale, role } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.admin.courses;
  const [courses, teachers] = await Promise.all([
    getAdminCourses(profile.school_id),
    getSchoolTeachers(profile.school_id),
  ]);

  return (
    <PageWrapper title={labels.title} subtitle={labels.subtitle}>
      <AdminCoursesView courses={courses} teachers={teachers} labels={labels} />
    </PageWrapper>
  );
}
