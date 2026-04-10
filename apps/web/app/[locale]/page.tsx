import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { LinkButton } from '@/components/public/Button';
import { Container, Section } from '@/components/public/Container';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: `${dict.meta.siteName} — ${dict.meta.tagline}`,
    description: dict.home.hero.subtitle,
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const base = `/${locale}`;
  const home = dict.home;

  return (
    <>
      {/* HERO */}
      <section className="pt-16 pb-24 md:pt-28 md:pb-36">
        <Container>
          <div className="max-w-4xl">
            <h1>{home.hero.title}</h1>
            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-[var(--color-ink-muted)] md:text-2xl">
              {home.hero.subtitle}
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                {home.hero.ctaPrimary}
              </LinkButton>
              <LinkButton href="#losning" variant="ghost" size="lg">
                {home.hero.ctaSecondary}
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>

      {/* PROBLEM */}
      <Section background="subtle">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              {home.problem.eyebrow}
            </p>
            <h2>{home.problem.title}</h2>
          </div>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {home.problem.items.map((item) => (
              <article key={item.title}>
                <h3 className="text-xl">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed">{item.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </Section>

      {/* LÖSNING */}
      <Section id="losning">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              {home.solution.eyebrow}
            </p>
            <h2>{home.solution.title}</h2>
            <p className="mt-6 text-lg leading-relaxed text-[var(--color-ink-muted)]">
              {home.solution.subtitle}
            </p>
          </div>
          <ol className="mt-16 grid gap-10 md:grid-cols-3">
            {home.solution.steps.map((step) => (
              <li key={step.number} className="border-t border-[var(--color-border)] pt-6">
                <div className="font-serif text-4xl text-[var(--color-accent)]">
                  {step.number}
                </div>
                <h3 className="mt-4 text-xl">{step.title}</h3>
                <p className="mt-3 leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* FÖR VEM */}
      <Section background="subtle">
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              {home.audiences.eyebrow}
            </p>
            <h2>{home.audiences.title}</h2>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            <AudienceCard
              href={`${base}/for-elever`}
              title={home.audiences.student.title}
              body={home.audiences.student.body}
              cta={home.audiences.student.cta}
            />
            <AudienceCard
              href={`${base}/for-skolor`}
              title={home.audiences.teacher.title}
              body={home.audiences.teacher.body}
              cta={home.audiences.teacher.cta}
            />
          </div>
        </Container>
      </Section>

      {/* SIFFROR */}
      <Section>
        <Container>
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              {home.stats.eyebrow}
            </p>
            <h2>{home.stats.title}</h2>
          </div>
          <dl className="mt-16 grid gap-10 md:grid-cols-3">
            {home.stats.items.map((stat) => (
              <div
                key={stat.label}
                className="border-l-2 border-[var(--color-accent)] pl-6"
              >
                <dt className="font-serif text-5xl text-[var(--color-primary)]">
                  {stat.value}
                </dt>
                <dd className="mt-3 text-sm text-[var(--color-ink-muted)]">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </Container>
      </Section>

      {/* FINAL CTA */}
      <Section background="primary">
        <Container width="prose">
          <div className="text-center">
            <h2 className="text-white">{home.finalCta.title}</h2>
            <p className="mt-6 text-lg leading-relaxed text-white/80">
              {home.finalCta.subtitle}
            </p>
            <div className="mt-10">
              <LinkButton href={`${base}/kontakt?topic=demo`} size="lg">
                {home.finalCta.cta}
              </LinkButton>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

function AudienceCard({
  href,
  title,
  body,
  cta,
}: {
  href: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[var(--color-border)] bg-white p-10 transition-colors hover:border-[var(--color-accent)]"
    >
      <h3 className="text-2xl">{title}</h3>
      <p className="mt-4 leading-relaxed">{body}</p>
      <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
        {cta}
        <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}
