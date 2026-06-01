import { JsonLd } from './JsonLd';
import { SITE_URL } from '@/lib/site';

export type FaqItem = { q: string; a: string };

type Props = {
  heading: string;
  items: FaqItem[];
  intro?: string;
  // Berikar FAQPage-schemat. Skicka med på sidor där FAQ:n är central så att
  // AI-motorer kan knyta frågorna till rätt sida och språk.
  locale?: 'sv' | 'en';
  pageUrl?: string;
};

// AEO-motorn: renderar accordion + FAQPage-strukturerad data så att
// AI-sökmotorer kan extrahera fråga/svar-par direkt. Detta är den ENDA
// källan till FAQPage-schema per sida — bygg inte ett parallellt schema i
// sidan, då får sidan två FAQPage-block.
export function Faq({ heading, items, intro, locale, pageUrl }: Props) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    ...(pageUrl ? { '@id': `${pageUrl}#faq` } : {}),
    ...(locale ? { inLanguage: locale === 'sv' ? 'sv-SE' : 'en-US' } : {}),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  return (
    <>
      <JsonLd data={schema} />
      <h2 className="font-serif text-[clamp(1.75rem,2vw+1rem,2.25rem)] leading-tight text-[var(--color-ink)]">
        {heading}
      </h2>
      {intro ? (
        <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {intro}
        </p>
      ) : null}
      <div className="mt-12">
        {items.map((faq, i) => (
          <details
            key={i}
            className="group border-t border-[var(--color-sand)] last:border-b"
            open={i === 0}
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5">
              <span className="font-serif text-[1.25rem] text-[var(--color-ink)]">
                {faq.q}
              </span>
              <span
                aria-hidden="true"
                className="mt-1 text-[var(--color-ink-muted)] transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-6 pr-10 text-[1rem] leading-relaxed text-[var(--color-ink-secondary)]">
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </>
  );
}
