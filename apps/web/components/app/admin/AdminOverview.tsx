import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { AdminOverview as AdminOverviewData } from '@/lib/data/admin';

// Editorial Calm — Stitch screen 13-admin-oversikt.png

type Props = {
  locale: Locale;
  data: AdminOverviewData;
};

function dateSubtitle(locale: Locale): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formatted = fmt.format(now);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-GB').format(n);
}

function statusDotClass(status: string): string {
  if (status === 'ready') return 'status-dot status-dot--sage';
  if (status === 'processing') return 'status-dot status-dot--sand';
  if (status === 'failed') return 'status-dot status-dot--coral';
  return 'status-dot status-dot--sand';
}

function formatTime(iso: string | null, locale: Locale): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function AdminOverview({ locale, data }: Props) {
  const sv = locale === 'sv';
  const base = `/${locale}/app/admin`;

  return (
    <div className="container-wide grid gap-12 py-10 md:grid-cols-12 md:py-14">
      <div className="md:col-span-9">
        <header>
          <h1 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
            {sv ? 'Översikt' : 'Overview'}
          </h1>
          <p className="mt-2 text-[0.875rem] text-[var(--color-ink-muted)]">
            {dateSubtitle(locale)}
          </p>
        </header>

        {/* 5-stat row */}
        <section className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-[var(--color-sand)] py-8 md:grid-cols-5">
          <Stat
            number={formatNumber(data.studentsCount, locale)}
            label={sv ? 'Elever' : 'Students'}
            href={`${base}/anvandare`}
          />
          <Stat
            number={formatNumber(data.teachersCount, locale)}
            label={sv ? 'Lärare' : 'Teachers'}
            href={`${base}/anvandare`}
          />
          <Stat
            number={formatNumber(data.schoolsCount, locale)}
            label={sv ? 'Skolor' : 'Schools'}
            href={`${base}/skolor`}
          />
          <Stat
            number={formatNumber(data.lessonsCount, locale)}
            label={sv ? 'Lektioner totalt' : 'Lessons total'}
            href={`${base}/statistik`}
          />
          <Stat
            number={formatNumber(data.transcribedCount, locale)}
            label={sv ? 'Transkriberade' : 'Transcribed'}
            href={`${base}/statistik`}
          />
        </section>

        {/* Senaste händelser */}
        <section className="mt-12">
          <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
            {sv ? 'Senaste händelser' : 'Recent activity'}
          </h2>
          {data.recentLessons.length === 0 ? (
            <p className="mt-6 text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv ? 'Inga händelser än.' : 'No activity yet.'}
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-[var(--color-sand)]">
              {data.recentLessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex items-center gap-4 py-4"
                >
                  <span
                    className={statusDotClass(lesson.status)}
                    aria-hidden="true"
                  />
                  <span className="w-16 shrink-0 text-[0.8125rem] tabular-nums text-[var(--color-ink-muted)]">
                    {formatTime(lesson.recordedAt, locale)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] text-[var(--color-ink)]">
                      {lesson.title ?? lesson.courseName ?? lesson.id}
                    </p>
                    <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--color-ink-muted)]">
                      {[lesson.courseName, lesson.className]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* RIGHT RAIL */}
      <aside className="md:col-span-3">
        <div className="sticky top-6">
          <div className="rounded-[20px] bg-[var(--color-surface)] p-6 shadow-[0_4px_16px_-4px_rgba(26,26,46,0.06)]">
            <h3 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
              {sv ? 'Status' : 'Status'}
            </h3>
            <ul className="mt-4 space-y-3 text-[0.875rem]">
              <StatusRow name="Supabase EU" state="ok" />
              <StatusRow
                name="Anthropic API"
                state={process.env.ANTHROPIC_API_KEY ? 'ok' : 'pending'}
              />
              <StatusRow
                name="Berget AI"
                state={process.env.BERGET_AI_API_KEY ? 'ok' : 'pending'}
                detail={sv ? 'Whisper' : 'Whisper'}
              />
            </ul>
          </div>

          <div className="mt-6 rounded-[20px] border border-[var(--color-sand)] p-6">
            <p className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
              {sv ? 'Snabbåtgärder' : 'Quick actions'}
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href={`${base}/schema`}
                  className="text-[0.9375rem] text-[var(--color-ink)] hover:underline"
                >
                  {sv ? 'Ladda upp schema →' : 'Upload schedule →'}
                </Link>
              </li>
              <li>
                <Link
                  href={`${base}/anvandare`}
                  className="text-[0.9375rem] text-[var(--color-ink)] hover:underline"
                >
                  {sv ? 'Bjud in användare →' : 'Invite users →'}
                </Link>
              </li>
              <li>
                <Link
                  href={`${base}/skolor`}
                  className="text-[0.9375rem] text-[var(--color-ink)] hover:underline"
                >
                  {sv ? 'Hantera skolor →' : 'Manage schools →'}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Stat({
  number,
  label,
  href,
}: {
  number: string;
  label: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <p className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-none tracking-tight text-[var(--color-ink)] tabular-nums">
        {number}
      </p>
      <p className="mt-2 text-[0.8125rem] text-[var(--color-ink-secondary)] group-hover:text-[var(--color-ink)]">
        {label}
      </p>
    </Link>
  );
}

function StatusRow({
  name,
  state,
  detail,
}: {
  name: string;
  state: 'ok' | 'pending' | 'error';
  detail?: string;
}) {
  const dotClass =
    state === 'ok'
      ? 'status-dot status-dot--sage'
      : state === 'pending'
        ? 'status-dot status-dot--sand'
        : 'status-dot status-dot--coral';
  const stateLabel =
    state === 'ok' ? 'OK' : state === 'pending' ? 'Pending' : 'Error';
  return (
    <li className="flex items-center gap-3">
      <span className={dotClass} aria-hidden="true" />
      <span className="flex-1 text-[var(--color-ink)]">
        {name}
        {detail ? (
          <span className="ml-1 text-[var(--color-ink-muted)]">({detail})</span>
        ) : null}
      </span>
      <span className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
        {stateLabel}
      </span>
    </li>
  );
}
