import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getTeacherOverview } from '@/lib/data/teacher';
import { getStudentOverview } from '@/lib/data/student';
import { getAdminOverview } from '@/lib/data/admin';
import { StudentHome } from '@/components/app/student/StudentHome';
import { TeacherDashboard } from '@/components/app/teacher/TeacherDashboard';
import { AdminOverview as AdminOverviewView } from '@/components/app/admin/AdminOverview';

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

  if (role === 'teacher') {
    const profile = await getCurrentProfile();
    if (!profile) notFound();
    const data = await getTeacherOverview(profile.id);
    const firstName =
      profile.full_name?.split(' ')[0] ?? profile.email?.split('@')[0] ?? 'du';
    return <TeacherDashboard locale={locale} firstName={firstName} data={data} />;
  }

  if (role === 'student') {
    const profile = await getCurrentProfile();
    if (!profile) notFound();
    const data = await getStudentOverview(profile.id);
    const firstName =
      profile.full_name?.split(' ')[0] ?? profile.email?.split('@')[0] ?? 'du';
    return <StudentHome locale={locale} firstName={firstName} data={data} />;
  }

  // Admin — Editorial Calm enligt Stitch screen 13
  const data = await getAdminOverview();
  return <AdminOverviewView locale={locale} data={data} />;
}
