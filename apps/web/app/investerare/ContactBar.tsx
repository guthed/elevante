import type { Lang } from './content';
import { t, CONTACTS } from './content';

/**
 * Fäst kontaktrad längst ner — följer med hela vägen medan man scrollar.
 * Visar båda kontaktpersonerna med mejl- och tel-länkar. Telefonnumret är
 * lokaliserat (svenskt format på sv, internationellt på en).
 * Kompakt: en kontakt per rad på mobil, sida vid sida från sm.
 */
export default function ContactBar({ lang }: { lang: Lang }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-canvas/15 bg-ink/90 backdrop-blur supports-[backdrop-filter]:bg-ink/80">
      <div className="container-content flex flex-col items-center gap-x-10 gap-y-0.5 px-5 py-2 text-center text-[11px] leading-tight text-canvas/75 sm:flex-row sm:justify-center sm:py-2.5 sm:text-sm">
        {CONTACTS.map((c) => (
          <span key={c.email} className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0">
            <span className="font-medium text-canvas">{c.name}</span>
            <a
              href={`mailto:${c.email}`}
              className="underline-offset-2 transition-colors hover:text-canvas hover:underline"
            >
              {c.email}
            </a>
            <a
              href={`tel:${c.tel}`}
              className="tabular-nums transition-colors hover:text-canvas"
            >
              {t(lang, c.phone)}
            </a>
          </span>
        ))}
      </div>
    </div>
  );
}
