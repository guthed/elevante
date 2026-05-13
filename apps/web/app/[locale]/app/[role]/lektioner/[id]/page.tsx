import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { LessonStatusBadge } from '@/components/app/LessonStatusBadge';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getLessonDetail } from '@/lib/data/teacher';
import { getStudentLessonDetail } from '@/lib/data/student';
import { MaterialUploadForm } from './MaterialUploadForm';
import { MaterialList } from './MaterialList';
import { LessonChatForm } from './LessonChatForm';
import { StudentLessonDetail as StudentLessonDetailView } from '@/components/app/student/StudentLessonDetail';

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
    const lesson = await getLessonDetail(id);
    if (!lesson) notFound();
    const labels = dict.app.pages.teacher.lessonDetail;
    const base = `/${locale}/app/teacher`;
    const recordedLabel = lesson.recordedAt
      ? new Date(lesson.recordedAt).toLocaleString(locale === 'sv' ? 'sv-SE' : 'en-GB')
      : labels.notRecorded;

    return (
      <PageWrapper
        title={lesson.title ?? lesson.course?.name ?? lesson.id}
        subtitle={recordedLabel}
        actions={
          <>
            <LessonStatusBadge
              status={lesson.status}
              labels={dict.app.pages.teacher.statuses}
            />
            <Link
              href={`${base}/lektioner`}
              className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]"
            >
              {labels.back}
            </Link>
          </>
        }
      >
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>{labels.transcriptHeading}</CardTitle>
              </CardHeader>
              <CardBody>
                {lesson.status === 'ready' && lesson.transcriptText ? (
                  <div className="prose max-w-none whitespace-pre-wrap font-mono text-sm text-[var(--color-primary)]">
                    {lesson.transcriptText}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-8 text-center text-sm text-[var(--color-ink-muted)]">
                    <p className="font-medium text-[var(--color-primary)]">
                      {labels[
                        `transcript${capitalize(lesson.status)}` as
                          | 'transcriptPending'
                          | 'transcriptProcessing'
                          | 'transcriptReady'
                          | 'transcriptFailed'
                      ]}
                    </p>
                    <p className="mt-2">{labels.transcriptComingSoon}</p>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{labels.materialsHeading}</CardTitle>
              </CardHeader>
              <CardBody>
                <MaterialList
                  materials={lesson.materials}
                  emptyText={labels.materialsEmpty}
                />
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardBody>
                <dl className="space-y-4 text-sm">
                  <Meta label={labels.metaCourse} value={lesson.course?.name ?? '—'} />
                  <Meta label={labels.metaClass} value={lesson.class?.name ?? '—'} />
                  <Meta
                    label={labels.metaTeacher}
                    value={lesson.teacher?.full_name ?? '—'}
                  />
                  <Meta label={labels.metaRecorded} value={recordedLabel} />
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <MaterialUploadForm lessonId={lesson.id} labels={labels} />
              </CardBody>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Student-vy — Editorial Calm enligt Stitch screen 09
  const lesson = await getStudentLessonDetail(id);
  if (!lesson) notFound();
  return <StudentLessonDetailView locale={locale} lesson={lesson} dict={dict} />;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-[var(--color-ink-subtle)]">
        {label}
      </dt>
      <dd className="mt-1 text-[var(--color-primary)]">{value}</dd>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
