'use client';

import { useEffect, useState } from 'react';

// Hjälterubriken roterar långsamt mellan tre rubriker.
// Startar alltid med den första (deterministiskt — samma varje gång, ingen hydration-mismatch).
// Auto-rotationen pausas helt för användare med prefers-reduced-motion.

type Headline = { lead: string; tail: string };

const ROTATE_MS = 7000;

const HEADLINES: Record<'sv' | 'en', Headline[]> = {
  sv: [
    { lead: 'Lektionen tar inte slut', tail: 'när det ringer ut.' },
    { lead: 'Elevante minns', tail: 'allt du missade i skolan.' },
    { lead: 'Du behöver inte minnas allt.', tail: 'Det gör Elevante.' },
  ],
  en: [
    { lead: 'The lesson doesn’t end', tail: 'when the bell rings.' },
    { lead: 'Elevante remembers', tail: 'everything you missed at school.' },
    { lead: 'You don’t need to remember.', tail: 'Elevante does.' },
  ],
};

export function RotatingHeadline({ locale }: { locale: string }) {
  const list = locale === 'sv' ? HEADLINES.sv : HEADLINES.en;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [list.length]);

  const { lead, tail } = list[index];

  return (
    <h1 className="font-serif text-[clamp(2.5rem,5vw+1rem,5rem)] leading-[1.02] tracking-[-0.01em] text-[var(--color-ink)]">
      <span key={index} className="block animate-page-in">
        {lead}{' '}
        <span className="italic text-[var(--color-coral)]">{tail}</span>
      </span>
    </h1>
  );
}
