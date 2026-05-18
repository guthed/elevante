'use client';

import { useEffect, useState } from 'react';

// Hjälterubriken varvar mellan tre rubriker — en slumpas fram per sidladdning.
// Server renderar alltid första rubriken (deterministiskt, ingen hydration-mismatch),
// klienten väljer slumpmässigt vid mount.

type Headline = { lead: string; tail: string };

const HEADLINES: Record<'sv' | 'en', Headline[]> = {
  sv: [
    { lead: 'Lektionen tar inte slut', tail: 'när det ringer ut.' },
    { lead: 'Elevante minns', tail: 'allt du missade i skolan.' },
    { lead: 'Du behöver inte komma ihåg allt.', tail: 'Det gör Elevante.' },
  ],
  en: [
    { lead: 'The lesson doesn’t end', tail: 'when the bell rings.' },
    { lead: 'Elevante remembers', tail: 'everything you missed at school.' },
    { lead: 'You don’t have to remember everything.', tail: 'Elevante does.' },
  ],
};

export function RotatingHeadline({ locale }: { locale: string }) {
  const list = locale === 'sv' ? HEADLINES.sv : HEADLINES.en;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * list.length));
  }, [list.length]);

  const { lead, tail } = list[index];

  return (
    <h1 className="font-serif text-[clamp(2.5rem,5vw+1rem,5rem)] leading-[1.02] tracking-[-0.01em] text-[var(--color-ink)]">
      {lead}{' '}
      <span className="italic text-[var(--color-coral)]">{tail}</span>
    </h1>
  );
}
