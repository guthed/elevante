'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lang } from './content';
import { t, CONTACTS } from './content';

/**
 * Fäst kontaktrad längst ner. Tidigare alltid synlig — den åt ~7 % höjd på
 * varje skärm. Nu glider den undan vid scroll nedåt (läsläge) och kommer
 * tillbaka direkt vid scroll uppåt eller nära toppen. Transitionen fryses av
 * den globala prefers-reduced-motion-regeln.
 */
export default function ContactBar({ lang }: { lang: Lang }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      if (Math.abs(dy) > 6) {
        setHidden(dy > 0 && y > 240);
        lastY.current = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-canvas/15 bg-ink/90 backdrop-blur transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] supports-[backdrop-filter]:bg-ink/80 ${
        hidden ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
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
