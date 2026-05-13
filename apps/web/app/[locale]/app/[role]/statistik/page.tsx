import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getAdminStats } from '@/lib/data/admin';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.admin.stats.title,
    robots: { index: false, follow: false },
  };
}

// Editorial Calm — Stitch screen 14-admin-statistik.png

export default async function AdminStatsPage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'admin') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') redirect(`/${locale}/app`);

  const dict = await getDictionary(locale);
  const stats = await getAdminStats();
  const sv = locale === 'sv';

  const maxCount = Math.max(...stats.weeklyLessons.map((d) => d.count), 1);
  const totalLessons = stats.weeklyLessons.reduce((sum, d) => sum + d.count, 0);
  const transcribed =
    stats.statusBreakdown.find((s) => s.status === 'ready')?.count ?? 0;
  const transcribedPct =
    totalLessons > 0 ? Math.round((transcribed / totalLessons) * 100) : 0;
  const failedCount =
    stats.statusBreakdown.find((s) => s.status === 'failed')?.count ?? 0;
  const processingCount =
    stats.statusBreakdown.find((s) => s.status === 'processing')?.count ?? 0;

  const statusLabels = dict.app.pages.teacher.statuses;
  const fmtNumber = (n: number) =>
    new Intl.NumberFormat(locale === 'sv' ? 'sv-SE' : 'en-GB').format(n);

  return (
    <div className="container-wide py-10 md:py-14">
      <header>
        <h1 className="font-serif text-[clamp(2rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {sv ? 'Statistik' : 'Statistics'}
        </h1>
        <p className="mt-2 text-[0.875rem] text-[var(--color-ink-muted)]">
          {sv ? 'Senaste 7 dagarna' : 'Last 7 days'}
        </p>
      </header>

      {/* Filter chips */}
      <nav className="mt-8 flex flex-wrap gap-2">
        <Chip label={sv ? '7 dagar' : '7 days'} active />
        <Chip label={sv ? '30 dagar' : '30 days'} />
        <Chip label={sv ? '90 dagar' : '90 days'} />
        <Chip label={sv ? 'Termin' : 'Term'} />
      </nav>

      {/* 4-stat row */}
      <section className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-[var(--color-sand)] py-8 md:grid-cols-4">
        <Stat
          number={fmtNumber(totalLessons)}
          label={sv ? 'Lektioner senaste veckan' : 'Lessons last week'}
        />
        <Stat
          number={fmtNumber(transcribed)}
          label={sv ? 'Transkriberade' : 'Transcribed'}
        />
        <Stat
          text={`${transcribedPct}%`}
          label={sv ? 'Andel klara' : 'Completion rate'}
        />
        <Stat
          number={fmtNumber(stats.totals.students + stats.totals.teachers)}
          label={sv ? 'Aktiva användare' : 'Active users'}
        />
      </section>

      {/* Frågor / Lektioner per dag — bar chart */}
      <section className="mt-12">
        <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
          {sv ? 'Lektioner per dag' : 'Lessons per day'}
        </h2>

        {totalLessons === 0 ? (
          <p className="mt-6 text-[0.9375rem] text-[var(--color-ink-muted)]">
            {sv ? 'Ingen data än.' : 'No data yet.'}
          </p>
        ) : (
          <article className="mt-6 rounded-[20px] bg-[var(--color-surface)] p-6 md:p-8">
            <div className="grid grid-cols-7 items-end gap-2 md:gap-4" style={{ minHeight: '160px' }}>
              {stats.weeklyLessons.map((day) => {
                const pct = (day.count / maxCount) * 100;
                const date = new Date(day.day);
                return (
                  <div
                    key={day.day}
                    className="flex h-full flex-col items-center justify-end gap-2"
                  >
                    <span className="text-[0.75rem] tabular-nums text-[var(--color-ink-muted)]">
                      {day.count}
                    </span>
                    <div
                      className="w-full rounded-t-[6px] bg-[var(--color-ink)]"
                      style={{
                        height: `${Math.max(pct, 4)}%`,
                        minHeight: day.count === 0 ? '2px' : '6px',
                      }}
                    />
                    <span className="text-[0.6875rem] uppercase tracking-[0.05em] text-[var(--color-ink-muted)]">
                      {date.toLocaleDateString(
                        locale === 'sv' ? 'sv-SE' : 'en-GB',
                        { weekday: 'short' },
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>
        )}
      </section>

      {/* 2-col split */}
      <div className="mt-12 grid gap-10 md:grid-cols-2">
        {/* Status breakdown */}
        <section>
          <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
            {sv ? 'Statusfördelning' : 'Status breakdown'}
          </h2>
          <ul className="mt-6 space-y-3">
            {stats.statusBreakdown.map((row) => {
              const dotClass =
                row.status === 'ready'
                  ? 'status-dot status-dot--sage'
                  : row.status === 'processing'
                    ? 'status-dot status-dot--sand'
                    : row.status === 'failed'
                      ? 'status-dot status-dot--coral'
                      : 'status-dot status-dot--sand';
              return (
                <li
                  key={row.status}
                  className="flex items-center justify-between border-b border-[var(--color-sand)] pb-3"
                >
                  <span className="flex items-center gap-3">
                    <span className={dotClass} aria-hidden="true" />
                    <span className="text-[0.9375rem] text-[var(--color-ink)]">
                      {statusLabels[row.status as keyof typeof statusLabels] ??
                        row.status}
                    </span>
                  </span>
                  <span className="font-serif text-[1.125rem] text-[var(--color-ink)] tabular-nums">
                    {fmtNumber(row.count)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Användarfördelning */}
        <section>
          <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
            {sv ? 'Användarfördelning' : 'User distribution'}
          </h2>
          <ul className="mt-6 space-y-3">
            <UserDist
              label={sv ? 'Elever' : 'Students'}
              value={stats.totals.students}
              fmt={fmtNumber}
            />
            <UserDist
              label={sv ? 'Lärare' : 'Teachers'}
              value={stats.totals.teachers}
              fmt={fmtNumber}
            />
            <UserDist
              label="Admin"
              value={stats.totals.admins}
              fmt={fmtNumber}
            />
          </ul>
        </section>
      </div>

      {/* Vad fungerar inte */}
      <section className="mt-14">
        <h2 className="font-serif text-[1.5rem] leading-tight text-[var(--color-ink)]">
          {sv ? 'Vad fungerar inte' : 'What\'s not working'}
        </h2>
        <ul className="mt-6 space-y-3">
          {failedCount > 0 ? (
            <Warning
              text={
                sv
                  ? `${failedCount} lektion${failedCount === 1 ? '' : 'er'} med misslyckad transkribering.`
                  : `${failedCount} lesson${failedCount === 1 ? '' : 's'} with failed transcription.`
              }
            />
          ) : null}
          {processingCount > 5 ? (
            <Warning
              text={
                sv
                  ? `${processingCount} lektioner är i transkriberingskö. Kontrollera Berget AI-status.`
                  : `${processingCount} lessons are queued for transcription. Check Berget AI status.`
              }
            />
          ) : null}
          {failedCount === 0 && processingCount <= 5 ? (
            <li className="text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Inga aktiva problem just nu.'
                : 'No active issues right now.'}
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function Chip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-[12px] border px-3.5 py-1.5 text-[0.875rem]',
        active
          ? 'border-transparent bg-[var(--color-sand)]/50 text-[var(--color-ink)]'
          : 'border-[var(--color-sand)] bg-[var(--color-canvas)] text-[var(--color-ink-secondary)]',
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function Stat({
  number,
  text,
  label,
}: {
  number?: string;
  text?: string;
  label: string;
}) {
  return (
    <div>
      <p className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-none tracking-tight text-[var(--color-ink)] tabular-nums">
        {number !== undefined ? number : text}
      </p>
      <p className="mt-2 text-[0.8125rem] text-[var(--color-ink-secondary)]">
        {label}
      </p>
    </div>
  );
}

function UserDist({
  label,
  value,
  fmt,
}: {
  label: string;
  value: number;
  fmt: (n: number) => string;
}) {
  return (
    <li className="flex items-center justify-between border-b border-[var(--color-sand)] pb-3">
      <span className="text-[0.9375rem] text-[var(--color-ink)]">{label}</span>
      <span className="font-serif text-[1.125rem] text-[var(--color-ink)] tabular-nums">
        {fmt(value)}
      </span>
    </li>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 border-l-2 border-[var(--color-coral)] pl-4">
      <span className="status-dot status-dot--coral mt-2" aria-hidden="true" />
      <span className="text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
        {text}
      </span>
    </li>
  );
}
