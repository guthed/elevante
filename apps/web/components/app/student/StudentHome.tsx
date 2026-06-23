import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { StudentOverview, StudentLessonRow } from '@/lib/data/student';

// Editorial Calm — dashboard-omdesign Fas B (fråge-ruta + villkorat fortsätt-kort)

type Props = {
  locale: Locale;
  firstName: string;
  data: StudentOverview;
  dict: Dictionary;
  // label = chattens fråga (titel, eller första elevmeddelandet om titeln saknas).
  lastChat: { id: string; label: string } | null;
};

function greeting(locale: Locale, name: string): string {
  const h = new Date().getHours();
  if (locale === 'sv') {
    if (h < 6) return `God natt, ${name}.`;
    if (h < 11) return `God morgon, ${name}.`;
    if (h < 17) return `Hej, ${name}.`;
    if (h < 22) return `God kväll, ${name}.`;
    return `God natt, ${name}.`;
  }
  if (h < 11) return `Good morning, ${name}.`;
  if (h < 17) return `Hi, ${name}.`;
  if (h < 22) return `Good evening, ${name}.`;
  return `Good night, ${name}.`;
}

function dateSubtitle(locale: Locale): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const week = getISOWeek(now);
  const formatted = fmt.format(now);
  const cap = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  return locale === 'sv' ? `${cap} · Vecka ${week}` : `${cap} · Week ${week}`;
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function statusDotClass(status: StudentLessonRow['status']): string {
  if (status === 'ready') return 'status-dot status-dot--sage';
  if (status === 'processing') return 'status-dot status-dot--sand';
  if (status === 'failed') return 'status-dot status-dot--coral';
  return 'status-dot status-dot--sand';
}

function statusLabel(status: StudentLessonRow['status'], locale: Locale): string {
  if (locale === 'sv') {
    if (status === 'ready') return 'Redo';
    if (status === 'processing') return 'Transkriberas';
    if (status === 'failed') return 'Misslyckades';
    return 'Väntar';
  }
  if (status === 'ready') return 'Ready';
  if (status === 'processing') return 'Transcribing';
  if (status === 'failed') return 'Failed';
  return 'Waiting';
}

function formatTime(iso: string | null, locale: Locale): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function StudentHome({ locale, firstName, data, dict, lastChat }: Props) {
  const sv = locale === 'sv';
  const s = dict.app.pages.student.overview;
  const base = `/${locale}/app/student`;
  const todaysLessons = data.recentLessons.slice(0, 3);

  return (
    <div className="container-wide grid gap-12 py-10 md:grid-cols-12 md:py-14">
      {/* MAIN — 8 cols on desktop */}
      <div className="min-w-0 md:col-span-8">
        <header>
          <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
            {greeting(locale, firstName)}
          </h1>
          <p className="mt-2 text-[0.875rem] text-[var(--color-ink-muted)]">
            {dateSubtitle(locale)}
          </p>
        </header>

        {/* Hjälte — fråga Elevante */}
        <Link
          href={`${base}/chat`}
          className="mt-8 block rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-6 shadow-[0_4px_16px_-4px_rgba(26,26,46,0.06)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(26,26,46,0.12)]"
        >
          <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-accent)]">
            {s.askEyebrow}
          </p>
          <p className="mt-2 font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
            {s.askTitle}
          </p>
          <div className="mt-4 flex items-center gap-3 rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-[var(--color-ink-muted)]">
              {s.askPlaceholder}
            </span>
            <span className="shrink-0 rounded-[8px] bg-[var(--color-ink)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-canvas)]">
              {s.askCta} →
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--color-sand)] px-3 py-1 text-[0.8125rem] text-[var(--color-ink-secondary)]">
              {s.askExample1}
            </span>
            <span className="rounded-full border border-[var(--color-sand)] px-3 py-1 text-[0.8125rem] text-[var(--color-ink-secondary)]">
              {s.askExample2}
            </span>
          </div>
        </Link>

        <div className="my-10 h-px bg-[var(--color-sand)]" />

        {/* Dagens lektioner */}
        <section>
          <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
            {sv ? 'Dagens lektioner' : "Today's lessons"}
          </h2>

          {todaysLessons.length === 0 ? (
            <p className="mt-6 text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Inga lektioner än. När din lärare börjar spela in dyker de upp här.'
                : 'No lessons yet. When your teacher records, they\'ll appear here.'}
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-[var(--color-sand)]">
              {todaysLessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`${base}/lektioner/${lesson.id}`}
                    className="-mx-2 flex items-center gap-4 rounded-[12px] px-2 py-4 transition-colors hover:bg-[var(--color-surface-soft)]"
                  >
                    <span className={statusDotClass(lesson.status)} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-[1.125rem] leading-snug text-[var(--color-ink)]">
                        {lesson.title ?? lesson.courseName ?? lesson.id}
                      </p>
                      <p className="mt-1 truncate text-[0.875rem] text-[var(--color-ink-muted)]">
                        {[lesson.courseName, lesson.className].filter(Boolean).join(' · ') ||
                          '—'}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right md:block">
                      <p className="text-[0.875rem] text-[var(--color-ink-secondary)]">
                        {formatTime(lesson.recordedAt, locale)}
                      </p>
                      <p className="mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">
                        {statusLabel(lesson.status, locale)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-center text-[0.8125rem] text-[var(--color-ink-muted)]">
            {sv ? 'Inga fler lektioner idag' : 'No more lessons today'}
          </p>
        </section>

        {/* Fortsätt där du slutade — endast om en riktig chatt finns */}
        {lastChat ? (
          <section className="mt-14">
            <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
              {s.continueHeading}
            </h2>
            <Link
              href={`${base}/chat/${lastChat.id}`}
              className="mt-6 block rounded-[20px] bg-[var(--color-surface)] p-6 shadow-[0_4px_16px_-4px_rgba(26,26,46,0.06)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(26,26,46,0.12)]"
            >
              <p className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                {s.continueLabel}
              </p>
              <p className="mt-3 line-clamp-2 font-serif text-[1.125rem] italic text-[var(--color-ink)]">
                {lastChat.label}
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-[0.875rem] text-[var(--color-ink-secondary)]">
                {s.continueCta} →
              </p>
            </Link>
          </section>
        ) : null}
      </div>

      {/* RIGHT RAIL — 4 cols */}
      <aside className="min-w-0 md:col-span-4">
        <div className="sticky top-6 space-y-6">
          {data.courses.length > 0 ? (
            <div className="rounded-[20px] bg-[var(--color-surface)] p-6 shadow-[0_4px_16px_-4px_rgba(26,26,46,0.06)]">
              <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
                {sv ? 'Dina kurser' : 'Your courses'}
              </h3>
              <ul className="mt-4 space-y-3">
                {data.courses.slice(0, 5).map((course) => (
                  <li key={course.id}>
                    <Link
                      href={`${base}/bibliotek?course=${course.id}`}
                      className="group block"
                    >
                      <p className="text-[0.9375rem] font-medium text-[var(--color-ink)] group-hover:underline">
                        {course.name}
                      </p>
                      <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                        {course.code} · {course.lessonsCount}{' '}
                        {sv ? 'lektioner' : 'lessons'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-[20px] border border-[var(--color-sand)] p-6">
            <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
              {s.examQuickHeading}
            </h3>
            <Link
              href={`${base}/provplugg`}
              className="mt-3 inline-flex text-[0.9375rem] text-[var(--color-ink-secondary)] transition-colors hover:text-[var(--color-ink)] hover:underline"
            >
              {s.examQuickCta} →
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
