'use client';

import { useEffect, useState } from 'react';

const PHRASES: Record<'sv' | 'en', string[]> = {
  sv: ['vågade ställa', 'tänkte på', 'ville ställa'],
  en: ["didn't dare ask", "didn't think of", "didn't want to ask"],
};

const ROTATE_MS = 3500;

export function RotatingPhrase({ locale }: { locale: string }) {
  const phrases = locale === 'sv' ? PHRASES.sv : PHRASES.en;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % phrases.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [phrases.length]);

  const sv = locale === 'sv';

  return (
    <h1 className="font-serif text-[clamp(2.25rem,4.5vw+1rem,4.5rem)] leading-[1.05] tracking-[-0.015em] text-[var(--color-ink)]">
      {sv ? 'Ställ alla frågor du inte' : 'Ask all the questions you'}{' '}
      <span className="relative inline-flex overflow-hidden align-baseline leading-[1.15]">
        <span key={index} className="animate-sweep-down italic text-[var(--color-coral)]">
          {phrases[index]}
        </span>
      </span>{' '}
      {sv ? 'på lektionen.' : 'in class.'}
    </h1>
  );
}
