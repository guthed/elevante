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
import { ShareTeaser } from '@/components/try/ShareTeaser';
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
                {/* Coral, kursiv — samma accent-stil som startsidans rubrik
                    (RotatingHeadline). Konsekvent orange-accent för poängen. */}
                <span className="italic text-[var(--color-coral)]">
                  {tr(locale, TRY_COPY.heroTitleAccent)}
                </span>
              </h1>
              <p className="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
                {tr(locale, TRY_COPY.heroLede)}
              </p>
              {/* Mjuk trust-strip — trygghet utan att ljuga om kundreferenser. */}
              <ul className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.75rem] text-[var(--color-ink-muted)]">
                {[TRY_COPY.trust1, TRY_COPY.trust2, TRY_COPY.trust3].map((t, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span
                      className="h-1 w-1 rounded-full bg-[var(--color-sage-deep)]"
                      aria-hidden
                    />
                    {tr(locale, t)}
                  </li>
                ))}
              </ul>
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
              {/* Dela-vidare först (matchar avslutets nya rubrik) — scrollar till
                  delnings-formuläret precis nedanför. Boka demo som andrahandsväg
                  (demo har redan en primär-CTA i provresultatet). */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <LinkButton href="#dela" size="lg">
                  {tr(locale, TRY_COPY.outroShareCta)} ↓
                </LinkButton>
                <Link
                  href={`${base}/kontakt?topic=demo`}
                  className="inline-flex items-center gap-2 px-4 py-3 text-[0.9375rem] text-[var(--color-ink)] underline-offset-4 hover:underline"
                >
                  {tr(locale, TRY_COPY.bookDemo)} →
                </Link>
              </div>
            </div>
          </div>

          {/* Tipsa en kollega — alltid synligt, spänner full bredd under CTA-bandet.
              id="dela" är scroll-mål för peak-delight-CTA:n i provresultatet. */}
          <div id="dela" className="mt-12 scroll-mt-24 border-t border-[var(--color-sand)] pt-10">
            <h3 className="font-serif text-[clamp(1.375rem,1.5vw+1rem,1.75rem)] leading-tight text-[var(--color-ink)]">
              {tr(locale, TRY_COPY.shareTitle)}
            </h3>
            <p className="mb-5 mt-2 max-w-md text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {tr(locale, TRY_COPY.shareHint)}
            </p>
            <div className="max-w-xl">
              <ShareTeaser locale={locale} />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
