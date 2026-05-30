'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './skolan.module.css';

type QA = {
  q: string;
  a: string;
  sources: string[];
};

// Scriptad demo — inget backend. Svaren är fördefinierade och tydligt grundade
// i en (exempel-)lektion, precis som riktiga Elevante.
const CONVERSATIONS: QA[] = [
  {
    q: 'Vad var poängen med integraler?',
    a: 'En integral räknar ihop många små bitar till en helhet — precis som arean under kurvan ni räknade på dagens lektion.',
    sources: ['Lektion 12 · 23:14', '28:47'],
  },
  {
    q: 'Vad missade jag när jag var sjuk?',
    a: 'Förra lektionen handlade om energiflöde i ekosystem — hur energin förs vidare led för led i näringskedjan, och varför lite går förlorat i varje steg.',
    sources: ['Lektion 9 · 11:20'],
  },
  {
    q: 'Förklara fotosyntesen enkelt',
    a: 'Växten fångar solljus och gör om koldioxid och vatten till socker, som blir dess energi — och släpper ut syre på köpet.',
    sources: ['Lektion 6 · 04:48'],
  },
];

type Phase = 'idle' | 'typing' | 'answered';

export default function ChatDemo() {
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function ask(index: number) {
    if (timer.current) clearTimeout(timer.current);
    setSelected(index);

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      setPhase('answered');
      return;
    }
    setPhase('typing');
    timer.current = setTimeout(() => setPhase('answered'), 900);
  }

  const current = selected !== null ? CONVERSATIONS[selected] : null;

  return (
    <div className="mx-auto w-full max-w-xl rounded-[1.75rem] bg-ink p-6 text-canvas shadow-lift sm:p-8">
      <p className="eyebrow text-coral">Prova själv</p>
      <h3 className="mt-2 font-serif text-2xl text-canvas sm:text-3xl">
        Ställ en fråga till Elevante
      </h3>
      <p className="mt-2 text-sm text-canvas/60">
        Tappa en fråga — så svarar Elevante med källa ur lektionen.
      </p>

      {/* Konversation */}
      <div
        className="mt-6 min-h-[7.5rem]"
        aria-live="polite"
        aria-atomic="false"
      >
        {current && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <span className="max-w-[85%] rounded-2xl rounded-br-sm bg-canvas px-4 py-2.5 text-sm text-ink">
                {current.q}
              </span>
            </div>

            {phase === 'typing' && (
              <div className="flex justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-canvas/10 px-4 py-3">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              </div>
            )}

            {phase === 'answered' && (
              <div className={`flex flex-col gap-3 ${styles.answerIn}`}>
                <span className="max-w-[92%] rounded-2xl rounded-bl-sm bg-canvas/10 px-4 py-3 text-sm leading-relaxed text-canvas">
                  {current.a}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-canvas/40">
                    Källor
                  </span>
                  {current.sources.map((src, i) => (
                    <span
                      key={src}
                      className={`rounded-full px-3 py-1 text-xs font-medium text-ink ${
                        i === 0 ? 'bg-sage' : 'bg-sand'
                      }`}
                    >
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!current && (
          <p className="flex h-full min-h-[6rem] items-center text-sm text-canvas/40">
            Välj en fråga nedan för att se hur ett svar ser ut.
          </p>
        )}
      </div>

      {/* Frågeförslag */}
      <div className="mt-6 flex flex-col gap-2.5">
        {CONVERSATIONS.map((c, i) => (
          <button
            key={c.q}
            type="button"
            onClick={() => ask(i)}
            aria-pressed={selected === i}
            className={`min-h-[44px] rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
              selected === i
                ? 'border-coral/60 bg-canvas/15 text-canvas'
                : 'border-canvas/15 bg-canvas/[0.06] text-canvas/90 hover:bg-canvas/10'
            }`}
          >
            {c.q}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-canvas/35">
        Exempelsvar för demo. I appen hämtas svaret ur din egen inspelade lektion.
      </p>
    </div>
  );
}
