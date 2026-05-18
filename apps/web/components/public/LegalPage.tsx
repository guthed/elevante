import { Container } from './Container';

export type LegalSection = { heading: string; body: string[] };

type Props = {
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export function LegalPage({ eyebrow, title, intro, lastUpdated, sections }: Props) {
  return (
    <>
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <Container width="content">
          <p className="eyebrow mb-6">{eyebrow}</p>
          <h1 className="font-serif text-[clamp(2.5rem,4.5vw+1rem,4.5rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
            {title}
          </h1>
          <p className="mt-8 max-w-xl text-[1.125rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {intro}
          </p>
          <p className="mt-6 text-[0.8125rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            {lastUpdated}
          </p>
        </Container>
      </section>

      <section className="pb-24 md:pb-32">
        <Container width="content">
          <div className="space-y-12">
            {sections.map((section, i) => (
              <div key={i} className="border-t border-[var(--color-sand)] pt-8">
                <h2 className="font-serif text-[clamp(1.5rem,1.5vw+1rem,2rem)] leading-tight text-[var(--color-ink)]">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.body.map((paragraph, j) => (
                    <p
                      key={j}
                      className="text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
