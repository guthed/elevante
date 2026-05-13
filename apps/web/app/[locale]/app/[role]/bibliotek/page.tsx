import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { EmptyState } from '@/components/ui/EmptyState';
import { getCurrentProfile } from '@/lib/supabase/server';
import {
  getStudentLibrary,
  getStudentOverview,
  type StudentLessonRow,
} from '@/lib/data/student';

type Props = {
  params: Promise<{ locale: string; role: string }>;
  searchParams: Promise<{ course?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.student.library.title,
    robots: { index: false, follow: false },
  };
}

// Editorial Calm — Stitch screen 08-bibliotek.png

export default async function StudentLibraryPage({ params, searchParams }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.student.library;
  const sv = locale === 'sv';

  const { course: courseFilter } = await searchParams;

  const [overview, lessons] = await Promise.all([
    getStudentOverview(profile.id),
    getStudentLibrary(profile.id, courseFilter),
  ]);

  const base = `/${locale}/app/student`;
  const activeCourse = courseFilter
    ? overview.courses.find((c) => c.id === courseFilter)
    : null;

  return (
    <div className="container-wide grid gap-12 py-10 md:grid-cols-12 md:py-14">
      {/* MAIN — 8 cols */}
      <div className="md:col-span-8">
        <header>
          <h1 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
            {labels.title}
          </h1>
          <p className="mt-2 text-[0.875rem] text-[var(--color-ink-muted)]">
            {sv
              ? 'Alla lektioner du har tillgång till.'
              : 'All lessons you have access to.'}
          </p>
        </header>

        {/* Course filter pills */}
        {overview.courses.length > 0 ? (
          <nav
            className="mt-8 flex flex-wrap gap-2"
            aria-label={labels.allCourses}
          >
            <FilterPill
              href={`${base}/bibliotek`}
              active={!courseFilter}
              label={labels.allCourses}
              count={lessons.length}
            />
            {overview.courses.map((course) => (
              <FilterPill
                key={course.id}
                href={`${base}/bibliotek?course=${course.id}`}
                active={courseFilter === course.id}
                label={course.name}
                count={course.lessonsCount}
              />
            ))}
          </nav>
        ) : null}

        {/* List header */}
        <div className="mt-10 flex items-baseline justify-between border-b border-[var(--color-sand)] pb-3">
          <h2 className="font-serif text-[1.25rem] leading-tight text-[var(--color-ink)]">
            {activeCourse
              ? activeCourse.name
              : sv
                ? 'Senast tillagda'
                : 'Recently added'}
          </h2>
          <p className="text-[0.8125rem] text-[var(--color-ink-muted)]">
            {lessons.length}{' '}
            {sv
              ? lessons.length === 1
                ? 'lektion'
                : 'lektioner'
              : lessons.length === 1
                ? 'lesson'
                : 'lessons'}
          </p>
        </div>

        {/* Lesson list */}
        {lessons.length === 0 ? (
          <div className="mt-6">
            <EmptyState title={labels.empty} />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-sand)]">
            {lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                locale={locale}
                href={`${base}/lektioner/${lesson.id}`}
              />
            ))}
          </ul>
        )}
      </div>

      {/* RIGHT RAIL — 4 cols */}
      <aside className="md:col-span-4">
        <div className="sticky top-6">
          <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
            {sv ? 'Kurser i fokus' : 'Courses in focus'}
          </h3>
          <ul className="mt-4 space-y-5">
            {overview.courses.slice(0, 4).map((course) => (
              <li key={course.id}>
                <p className="font-serif text-[1rem] text-[var(--color-ink)]">
                  {course.name}
                </p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-ink-muted)]">
                  {course.code} · {course.lessonsCount}{' '}
                  {sv ? 'lektioner' : 'lessons'}
                </p>
                <Link
                  href={`${base}/bibliotek?course=${course.id}`}
                  className="mt-1 inline-flex text-[0.8125rem] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] hover:underline"
                >
                  {sv ? 'Hoppa in' : 'Jump in'} →
                </Link>
              </li>
            ))}
            {overview.courses.length === 0 ? (
              <li className="text-[0.875rem] text-[var(--color-ink-muted)]">
                {sv
                  ? 'Du är inte tilldelad någon kurs än.'
                  : 'You aren\'t assigned to a course yet.'}
              </li>
            ) : null}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={[
        'inline-flex items-center gap-2 rounded-[12px] border px-3.5 py-1.5 text-[0.875rem] transition-colors',
        active
          ? 'border-transparent bg-[var(--color-sand)]/50 text-[var(--color-ink)]'
          : 'border-[var(--color-sand)] bg-[var(--color-canvas)] text-[var(--color-ink-secondary)] hover:border-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]',
      ].join(' ')}
    >
      <span>{label}</span>
      <span className="text-[0.75rem] text-[var(--color-ink-muted)]">{count}</span>
    </Link>
  );
}

function statusDotClass(status: StudentLessonRow['status']): string {
  if (status === 'ready') return 'status-dot status-dot--sage';
  if (status === 'processing') return 'status-dot status-dot--sand';
  if (status === 'failed') return 'status-dot status-dot--coral';
  return 'status-dot status-dot--sand';
}

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (sameDay) return locale === 'sv' ? 'Idag' : 'Today';
  if (isYesterday) return locale === 'sv' ? 'Igår' : 'Yesterday';

  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function LessonRow({
  lesson,
  locale,
  href,
}: {
  lesson: StudentLessonRow;
  locale: Locale;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 flex items-center gap-4 rounded-[12px] px-2 py-4 transition-colors hover:bg-[var(--color-surface-soft)]"
      >
        <span className={statusDotClass(lesson.status)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[1.0625rem] leading-snug text-[var(--color-ink)]">
            {lesson.title ?? lesson.courseName ?? lesson.id}
          </p>
          <p className="mt-1 truncate text-[0.8125rem] text-[var(--color-ink-muted)]">
            {[lesson.courseName, lesson.className].filter(Boolean).join(' · ')} ·{' '}
            {formatDate(lesson.recordedAt, locale)}
          </p>
        </div>
        <span className="shrink-0 text-[var(--color-ink-muted)]" aria-hidden="true">
          →
        </span>
      </Link>
    </li>
  );
}
