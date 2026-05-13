import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { TeacherOverview, TeacherLessonRow } from '@/lib/data/teacher';

// Editorial Calm — Stitch screen 10-larare-dashboard.png

type Props = {
  locale: Locale;
  firstName: string;
  data: TeacherOverview;
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

function statusDotClass(status: TeacherLessonRow['status']): string {
  if (status === 'ready') return 'status-dot status-dot--sage';
  if (status === 'processing') return 'status-dot status-dot--sand';
  if (status === 'failed') return 'status-dot status-dot--coral';
  return 'status-dot status-dot--sand';
}

function statusLabel(status: TeacherLessonRow['status'], locale: Locale): string {
  if (locale === 'sv') {
    if (status === 'ready') return 'Transkriberad';
    if (status === 'processing') return 'Transkriberas';
    if (status === 'failed') return 'Misslyckades';
    return 'Väntar';
  }
  if (status === 'ready') return 'Transcribed';
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

export function TeacherDashboard({ locale, firstName, data }: Props) {
  const sv = locale === 'sv';
  const base = `/${locale}/app/teacher`;
  const todaysLessons = data.recentLessons.slice(0, 3);
  const totalStudents = data.classes.reduce((sum, c) => sum + c.studentsCount, 0);

  return (
    <div className="container-wide grid gap-12 py-10 md:grid-cols-12 md:py-14">
      {/* MAIN — 8 cols */}
      <div className="md:col-span-8">
        <header>
          <h1 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
            {greeting(locale, firstName)}
          </h1>
          <p className="mt-2 text-[0.875rem] text-[var(--color-ink-muted)]">
            {dateSubtitle(locale)}
          </p>
        </header>

        <div className="my-10 h-px bg-[var(--color-sand)]" />

        {/* 4-stat row — vertical columns, not boxy tiles */}
        <section className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
          <Stat
            number={data.courses.length}
            label={sv ? 'Pågående kurser' : 'Active courses'}
          />
          <Stat
            number={data.recentLessons.length}
            label={sv ? 'Senaste lektioner' : 'Recent lessons'}
          />
          <Stat
            number={totalStudents}
            label={sv ? 'Elever totalt' : 'Students total'}
          />
          <Stat
            number={data.classes.length}
            label={sv ? 'Klasser' : 'Classes'}
          />
        </section>

        <div className="my-10 h-px bg-[var(--color-sand)]" />

        {/* Dagens / Senaste lektioner */}
        <section>
          <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
            {sv ? 'Idag' : 'Today'}
          </h2>

          {todaysLessons.length === 0 ? (
            <p className="mt-6 text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Du har inga inspelade lektioner än. Starta en inspelning från mobilen.'
                : 'No recorded lessons yet. Start recording from the mobile app.'}
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-[var(--color-sand)]">
              {todaysLessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`${base}/lektioner/${lesson.id}`}
                    className="-mx-2 flex items-center gap-4 rounded-[12px] px-2 py-4 transition-colors hover:bg-[var(--color-surface-soft)]"
                  >
                    <span
                      className={statusDotClass(lesson.status)}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-[1.125rem] leading-snug text-[var(--color-ink)]">
                        {lesson.title ?? lesson.courseName ?? lesson.id}
                      </p>
                      <p className="mt-1 truncate text-[0.875rem] text-[var(--color-ink-muted)]">
                        {[lesson.courseName, lesson.className]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right md:block">
                      <p className="text-[0.8125rem] uppercase tracking-[0.1em] text-[var(--color-ink-secondary)]">
                        {statusLabel(lesson.status, locale)}
                      </p>
                      <p className="mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">
                        {formatTime(lesson.recordedAt, locale)}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-[var(--color-ink-muted)]"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Senaste frågor från elever — empty state om ingen data */}
        <section className="mt-14">
          <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
            {sv ? 'Senaste frågor från elever' : 'Recent student questions'}
          </h2>
          <p className="mt-4 text-[0.9375rem] text-[var(--color-ink-muted)]">
            {sv
              ? 'När elever frågar Elevante om dina lektioner dyker frågorna upp här (anonymt).'
              : 'When students ask Elevante about your lessons, the questions appear here (anonymously).'}
          </p>
        </section>
      </div>

      {/* RIGHT RAIL — 4 cols */}
      <aside className="md:col-span-4">
        <div className="sticky top-6 space-y-6">
          {/* Klasser */}
          {data.classes.length > 0 ? (
            <div className="rounded-[20px] bg-[var(--color-surface)] p-6 shadow-[0_4px_16px_-4px_rgba(26,26,46,0.06)]">
              <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
                {sv ? 'Dina klasser' : 'Your classes'}
              </h3>
              <ul className="mt-4 space-y-3">
                {data.classes.slice(0, 5).map((cls) => (
                  <li key={cls.id}>
                    <Link
                      href={`${base}/klasser/${cls.id}`}
                      className="group block"
                    >
                      <p className="text-[0.9375rem] font-medium text-[var(--color-ink)] group-hover:underline">
                        {cls.name}
                      </p>
                      <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                        {cls.studentsCount} {sv ? 'elever' : 'students'}
                        {cls.year ? ` · År ${cls.year}` : ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Tips */}
          <div className="rounded-[20px] border border-[var(--color-sand)] p-6">
            <p className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
              {sv ? 'Tips' : 'Tip'}
            </p>
            <p className="mt-3 font-serif text-[0.9375rem] italic leading-snug text-[var(--color-ink)]">
              {sv
                ? '"Eleverna lär sig bäst när de får ställa dumma frågor utan att be om lov. Elevante gör det möjligt."'
                : '"Students learn best when they can ask dumb questions without permission. Elevante makes it possible."'}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Stat({ number, label }: { number: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-[clamp(2rem,2vw+1rem,2.5rem)] leading-none tracking-tight text-[var(--color-ink)] tabular-nums">
        {number}
      </p>
      <p className="mt-2 text-[0.8125rem] text-[var(--color-ink-secondary)]">
        {label}
      </p>
    </div>
  );
}
