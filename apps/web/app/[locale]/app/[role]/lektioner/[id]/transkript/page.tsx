import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getStudentLessonDetail } from '@/lib/data/student';

type Props = {
  params: Promise<{ locale: string; role: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: locale === 'sv' ? 'Transkript' : 'Transcript',
    robots: { index: false, follow: false },
  };
}

export default async function TranscriptPage({ params }: Props) {
  const { locale, role, id } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);
  if (role !== 'student') redirect(`/${locale}/app/${role}/lektioner/${id}`);

  const lesson = await getStudentLessonDetail(id);
  if (!lesson || !lesson.transcriptText) notFound();

  const sv = locale === 'sv';
  const base = `/${locale}/app/student`;

  return (
    <div className="container-wide py-10 md:py-14">
      <nav className="mb-8 text-[0.8125rem] text-[var(--color-ink-muted)]">
        <Link href={`${base}/lektioner/${id}`} className="hover:text-[var(--color-ink)]">
          {sv ? '← Tillbaka till lektionen' : '← Back to lesson'}
        </Link>
      </nav>
      <header className="mb-8">
        <p className="eyebrow">{sv ? 'Transkript' : 'Transcript'}</p>
        <h1 className="mt-2 font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {lesson.title ?? lesson.course?.name ?? lesson.id}
        </h1>
      </header>
      <article className="rounded-[20px] bg-[var(--color-surface)] p-6 md:p-10">
        <pre className="whitespace-pre-wrap font-mono text-[0.875rem] leading-[1.7] text-[var(--color-ink)]">
          {lesson.transcriptText}
        </pre>
      </article>
    </div>
  );
}
