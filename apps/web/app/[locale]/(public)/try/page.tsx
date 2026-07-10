import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
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
      {/* Tvåspalts-hjälte som startsidan: pitch vänster, den interaktiva panelen
          höger. Fyller ytan och lägger interaktionen bredvid budskapet.
          Staplar på mobil (pitch → panel). */}
      <section className="pt-8 pb-16 md:pt-16 md:pb-24">
        <Container width="wide">
          <div className="grid gap-8 md:grid-cols-12 md:gap-x-12 md:gap-y-6 lg:gap-x-16">
            <div className="min-w-0 md:col-span-5 md:self-center">
              <p className="eyebrow mb-4">{tr(locale, TRY_COPY.eyebrow)}</p>
              <h1 className="font-serif text-[clamp(2rem,2.6vw+1rem,3.25rem)] leading-[1.06] tracking-[-0.01em] text-[var(--color-ink)]">
                {tr(locale, TRY_COPY.heroTitle)}{' '}
                <span className="text-[var(--color-sage-deep)]">
                  {tr(locale, TRY_COPY.heroTitleAccent)}
                </span>
              </h1>
              <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {tr(locale, TRY_COPY.heroLede)}
              </p>
            </div>
            <div className="min-w-0 md:col-span-7">
              <TryExperience
                locale={locale}
                lessons={lessons}
                suggestionsByLesson={suggestionsByLesson}
              />
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-[var(--color-sand)] py-16 md:py-24">
        <Container width="wide">
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
            {/* Foto — eleverna man säljer in till, i konverterings-ögonblicket. */}
            <div className="relative h-64 overflow-hidden rounded-[20px] sm:h-80 md:h-[420px]">
              <Image
                src="/images/javier-trueba-unsplash.jpg"
                alt={locale === 'sv' ? 'Elever som pluggar tillsammans' : 'Students studying together'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            {/* CTA */}
            <div>
              <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-tight text-[var(--color-ink)]">
                {tr(locale, TRY_COPY.outroTitle)}
              </h2>
              <p className="mt-4 max-w-md text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {tr(locale, TRY_COPY.outroLede)}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
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
          </div>
        </Container>
      </section>
    </>
  );
}
