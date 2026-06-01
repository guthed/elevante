import type { ReactNode } from 'react';
import { Container } from './Container';

export type LegalSection = { h: string; p?: string[]; list?: string[] };

type Props = {
  title: string;
  updated: string; // t.ex. "Senast uppdaterad 1 juni 2026"
  intro?: string;
  sections: LegalSection[];
  footer?: ReactNode;
};

// Enkel, läsbar layout för juridiska sidor. Återanvänder .prose-elevante-stilarna.
export function LegalDoc({ title, updated, intro, sections, footer }: Props) {
  return (
    <section className="pt-16 pb-24 md:pt-24 md:pb-32">
      <Container width="prose">
        <h1 className="font-serif text-[clamp(2.25rem,3vw+1rem,3.25rem)] leading-[1.08] tracking-[-0.01em] text-[var(--color-ink)]">
          {title}
        </h1>
        <p className="mt-4 text-sm text-[var(--color-ink-muted)]">{updated}</p>
        <div className="prose-elevante mt-10">
          {intro ? <p>{intro}</p> : null}
          {sections.map((section, i) => (
            <div key={i}>
              <h2>{section.h}</h2>
              {section.p?.map((para, j) => (
                <p key={j}>{para}</p>
              ))}
              {section.list ? (
                <ul>
                  {section.list.map((item, k) => (
                    <li key={k}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
        {footer ? <div className="mt-12">{footer}</div> : null}
      </Container>
    </section>
  );
}
