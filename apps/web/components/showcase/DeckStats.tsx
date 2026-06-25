'use client';

import Reveal from '@/components/showcase/Reveal';
import CountUp from '@/components/showcase/CountUp';

export type DeckStat = {
  /** Stora talet som text (t.ex. "8 av 10", "50 %", "10 600"). */
  big: string;
  /** Om satt: räkna upp till detta heltal i stället för statisk text. */
  countTo?: number;
  /** Suffix vid count-up (t.ex. " %"). */
  countSuffix?: string;
  label: string;
};

export default function DeckStats({ items }: { items: DeckStat[] }) {
  return (
    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((s, i) => (
        <Reveal key={s.label} delay={i * 90}>
          <div className="h-full rounded-2xl bg-surface p-7 shadow-soft">
            <p className="font-serif text-5xl text-ink">
              {s.countTo != null ? (
                <CountUp value={s.countTo} suffix={s.countSuffix ?? ''} />
              ) : (
                s.big
              )}
            </p>
            <p className="mt-3 text-ink-muted">{s.label}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
