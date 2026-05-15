import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getLearnerProfile } from '@/lib/data/student';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Din lärprofil' : 'Your learner profile',
    robots: { index: false, follow: false },
  };
}

export default async function LearnerProfilePage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const learnerProfile = await getLearnerProfile(profile.id);
  const base = `/${locale}/app/student`;
  const hasProfile =
    learnerProfile !== null && learnerProfile.summary.trim().length > 0;

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {sv ? 'Din lärprofil' : 'Your learner profile'}
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? 'Elevantes bild av hur just du lär dig och uttrycker dig — byggd från dina testprov. Den är bara din, och gör att feedbacken du får blir mer träffsäker.'
            : "Elevante's picture of how you learn and express yourself — built from your practice tests. It's yours alone, and makes the feedback you get more on point."}
        </p>

        <div className="mt-8">
          {!hasProfile ? (
            <div className="rounded-[16px] border border-dashed border-[var(--color-sand)] p-8 text-center">
              <p className="font-serif text-[1.0625rem] text-[var(--color-ink)]">
                {sv
                  ? 'Din profil är inte byggd ännu.'
                  : 'Your profile isn’t built yet.'}
              </p>
              <p className="mx-auto mt-2 max-w-md text-[0.875rem] leading-relaxed text-[var(--color-ink-muted)]">
                {sv
                  ? 'Gör ditt första testprov i Plugga inför prov — då börjar Elevante lära känna hur du arbetar.'
                  : 'Take your first practice test in Exam prep — then Elevante starts learning how you work.'}
              </p>
              <div className="mt-5">
                <Link
                  href={`${base}/provplugg`}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition-opacity hover:opacity-90"
                >
                  {sv ? 'Till Plugga inför prov' : 'Go to Exam prep'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sammanfattning */}
              <div className="rounded-[20px] bg-[var(--color-surface)] p-6">
                <p className="eyebrow mb-2">{sv ? 'Sammanfattning' : 'Summary'}</p>
                <p className="font-serif text-[1.125rem] leading-relaxed text-[var(--color-ink)]">
                  {learnerProfile.summary}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Styrkor */}
                <div className="rounded-[16px] border border-[var(--color-sand)] p-5">
                  <p className="mb-3 flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                    <span className="status-dot status-dot--sage" />
                    {sv ? 'Dina styrkor' : 'Your strengths'}
                  </p>
                  <ul className="space-y-2">
                    {learnerProfile.strengths.map((s, idx) => (
                      <li
                        key={idx}
                        className="text-[0.9375rem] leading-snug text-[var(--color-ink)]"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Utvecklingsområden */}
                <div className="rounded-[16px] border border-[var(--color-sand)] p-5">
                  <p className="mb-3 flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: 'var(--color-coral)' }}
                    />
                    {sv ? 'Träna på' : 'Work on'}
                  </p>
                  <ul className="space-y-2">
                    {learnerProfile.growth_areas.map((g, idx) => (
                      <li
                        key={idx}
                        className="text-[0.9375rem] leading-snug text-[var(--color-ink)]"
                      >
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-[0.75rem] text-[var(--color-ink-muted)]">
                {sv
                  ? `Byggd från dina ${learnerProfile.tests_analyzed} senaste testprov. Uppdateras varje gång du gör ett nytt.`
                  : `Built from your last ${learnerProfile.tests_analyzed} practice tests. Updated each time you take a new one.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
