import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getLessonDetail, getLessonInsight } from '@/lib/data/teacher';
import { getStudentLessonDetail } from '@/lib/data/student';
import { generateLessonInsight } from '@/lib/ai/anthropic';
import { StudentLessonDetail as StudentLessonDetailView } from '@/components/app/student/StudentLessonDetail';
import { TeacherLessonDetail as TeacherLessonDetailView } from '@/components/app/teacher/TeacherLessonDetail';

type Props = {
  params: Promise<{ locale: string; role: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.teacher.lessons.title,
    robots: { index: false, follow: false },
  };
}

export default async function LessonDetailPage({ params }: Props) {
  const { locale, role, id } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  if (role === 'admin') {
    redirect(`/${locale}/app/admin`);
  }

  const dict = await getDictionary(locale);

  if (role === 'teacher') {
    const [lesson, insight] = await Promise.all([
      getLessonDetail(id),
      getLessonInsight(id),
    ]);
    if (!lesson) notFound();

    let aiInsight = '';
    if (insight && insight.concepts.length > 0) {
      const engagement = insight.concepts.map((c) => ({
        concept: c,
        totalQuestions: insight.students.reduce(
          (sum, s) => sum + (s.conceptQuestionCounts[c] ?? 0),
          0,
        ),
        studentsAsking: insight.students.filter(
          (s) => (s.conceptQuestionCounts[c] ?? 0) > 0,
        ).length,
      }));
      const notViewed = insight.students
        .filter((s) => !s.hasViewed)
        .map((s) => s.fullName.split(' ')[0] ?? s.fullName);
      aiInsight = await generateLessonInsight(
        lesson.title ?? '—',
        engagement,
        notViewed,
        insight.students.length,
      );
    }

    return (
      <TeacherLessonDetailView
        locale={locale}
        lesson={lesson}
        dict={dict}
        insight={insight}
        aiInsight={aiInsight}
      />
    );
  }

  // Student-vy — Editorial Calm enligt Stitch screen 09
  const lesson = await getStudentLessonDetail(id);
  if (!lesson) notFound();
  return <StudentLessonDetailView locale={locale} lesson={lesson} dict={dict} />;
}
