import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { StudentOverview, StudentLessonRow } from '@/lib/data/student';

// Editorial Calm — Stitch screen 02-student-home.png

type Props = {
  locale: Locale;
  firstName: string;
  data: StudentOverview;
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

export function StudentHome({ locale, firstName, data }: Props) {
  const sv = locale === 'sv';
  const base = `/${locale}/app/student`;
  const todaysLessons = data.recentLessons.slice(0, 3);

  return (
    <div className="container-wide grid gap-12 py-10 md:grid-cols-12 md:py-14">
      {/* MAIN — 8 cols on desktop */}
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

        {/* Fortsätt där du slutade */}
        <section className="mt-14">
          <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
            {sv ? 'Fortsätt där du slutade' : 'Pick up where you left off'}
          </h2>
          <Link
            href={`${base}/chat`}
            className="mt-6 block rounded-[20px] bg-[var(--color-surface)] p-6 shadow-[0_8px_24px_-8px_rgba(26,26,46,0.08)] transition-shadow hover:shadow-[0_12px_32px_-8px_rgba(26,26,46,0.12)]"
          >
            <p className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
              {sv ? 'Senaste chatten' : 'Last chat'}
            </p>
            <p className="mt-3 font-serif text-[1.125rem] italic text-[var(--color-ink)]">
              {sv
                ? '"Vad var poängen med integralerna idag?"'
                : '"What was the point of integrals today?"'}
            </p>
            <div className="mt-4 rounded-[12px] bg-[var(--color-sage)]/25 p-4">
              <p className="text-[0.9375rem] leading-relaxed text-[var(--color-ink)]">
                {sv
                  ? 'En integral räknar ihop små bitar till en helhet. På dagens lektion räknade ni…'
                  : 'An integral sums tiny pieces into a whole. Today you computed…'}
              </p>
            </div>
            <p className="mt-3 inline-flex items-center gap-2 text-[0.875rem] text-[var(--color-ink-secondary)]">
              {sv ? 'Öppna chatten' : 'Open chat'} →
            </p>
          </Link>
        </section>
      </div>

      {/* RIGHT RAIL — 4 cols */}
      <aside className="md:col-span-4">
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
            <p className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
              {sv ? 'Tips för veckan' : 'Tip of the week'}
            </p>
            <p className="mt-3 font-serif text-[1rem] italic leading-snug text-[var(--color-ink)]">
              {sv
                ? '"Skriv frågan så som du faktiskt undrar — Elevante svarar bäst när du är dig själv."'
                : '"Write the question the way you actually wonder it — Elevante answers best when you\'re yourself."'}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
