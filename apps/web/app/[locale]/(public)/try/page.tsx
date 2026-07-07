import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { alternatesFor } from '@/lib/site';
import { Container } from '@/components/public/Container';
import { LinkButton } from '@/components/public/Button';
import { TRY_LESSONS } from '@/lib/try/lessons';
import { TRY_COPY, tr } from '@/lib/try/copy';
import { TryExperience } from '@/components/try/TryExperience';
import type { L } from '@/lib/try/copy';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sv = locale === 'sv';
  return {
    title: sv ? 'Prova Elevante — utan inloggning' : 'Try Elevante — no sign-in',
    description: sv
      ? 'Välj lektioner, chatta med innehållet och låt Elevante skapa och rätta ett prov åt dig. Riktiga svar, med källa.'
      : 'Pick lessons, chat with the content, and let Elevante build and grade a test for you. Real answers, with sources.',
    alternates: alternatesFor(locale, '/try'),
  };
}

export default async function TryPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const base = `/${locale}`;

  // Skicka bara lättviktig metadata till klienten — inga transkript.
  const lessons = TRY_LESSONS.map((l) => ({
    id: l.id,
    title: l.title,
    summary: l.summary,
    concepts: l.concepts,
  }));
  const suggestionsByLesson: Record<string, L[]> = Object.fromEntries(
    TRY_LESSONS.map((l) => [l.id, l.suggestions]),
  );

  return (
    <>
      <section className="pt-12 pb-8 md:pt-20 md:pb-10">
        <Container width="wide">
          <p className="eyebrow mb-6">{tr(locale, TRY_COPY.eyebrow)}</p>
          <div className="grid items-end gap-6 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-7">
              <h1 className="font-serif text-[clamp(2.5rem,4.5vw+1rem,4.5rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
                {tr(locale, TRY_COPY.heroTitle)}
              </h1>
            </div>
            <div className="md:col-span-5">
              <p className="text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {tr(locale, TRY_COPY.heroLede)}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-20 md:pb-28">
        <Container width="content">
          <TryExperience
            locale={locale}
            lessons={lessons}
            suggestionsByLesson={suggestionsByLesson}
          />
        </Container>
      </section>

      <section className="border-t border-[var(--color-sand)] py-16 md:py-20">
        <Container width="content">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-tight text-[var(--color-ink)]">
              {tr(locale, TRY_COPY.outroTitle)}
            </h2>
            <p className="mt-4 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {tr(locale, TRY_COPY.outroLede)}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                {tr(locale, TRY_COPY.bookDemo)}
              </LinkButton>
              <Link
                href={`${base}/for-skolor`}
                className="inline-flex items-center gap-2 px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] underline-offset-4 hover:underline"
              >
                {tr(locale, TRY_COPY.forSchools)} →
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
