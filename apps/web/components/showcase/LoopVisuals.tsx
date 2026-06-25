import type { ReactNode } from 'react';

export function LoopStep({
  number,
  title,
  body,
  visual,
}: {
  number: string;
  title: string;
  body: string;
  visual: ReactNode;
}) {
  return (
    <article className="flex flex-col">
      <div
        className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5"
        aria-hidden="true"
      >
        {visual}
      </div>
      <p className="mt-6 font-serif text-[1.25rem] leading-none text-[var(--color-coral)]">
        {number}
      </p>
      <h3 className="mt-3 font-serif text-[1.25rem] leading-snug text-[var(--color-ink)]">
        {title}
      </h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
        {body}
      </p>
    </article>
  );
}

export function RecVisual({ sv }: { sv: boolean }) {
  return (
    <div className="rounded-[12px] bg-[var(--color-ink)] p-4">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-coral)]" aria-hidden="true" />
        <span className="text-[0.625rem] uppercase tracking-[0.1em] text-white/80">REC</span>
      </div>
      <p className="mt-3 font-serif text-[0.9375rem] leading-tight text-[var(--color-canvas)]">
        {sv ? 'Integralberäkning' : 'Integrals'}
      </p>
      <p className="mt-0.5 text-[0.6875rem] text-white/50">
        {sv ? '10:15 · Matematik 4' : '10:15 · Math 4'}
      </p>
    </div>
  );
}

export function TranscribeVisual({ sv }: { sv: boolean }) {
  const bars = [40, 70, 30, 85, 55, 25, 60, 90, 45, 35, 75, 50, 65, 30, 80, 45];
  return (
    <div className="rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] p-4">
      <div className="flex h-9 items-center gap-[3px]" aria-hidden="true">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full bg-[var(--color-coral)]/70"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-[0.75rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
        {sv
          ? '"…arean under kurvan mellan a och b…"'
          : '"…the area under the curve between a and b…"'}
      </p>
    </div>
  );
}

export function AskVisual({ sv }: { sv: boolean }) {
  return (
    <div className="rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] p-4">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[12px] bg-[var(--color-ink)] px-3 py-1.5 text-[0.6875rem] leading-snug text-[var(--color-canvas)]">
          {sv ? 'Vad menades med integral?' : 'What did integral mean?'}
        </div>
      </div>
      <div className="mt-2.5">
        <span className="source-pill">
          <span className="status-dot status-dot--sage" />
          {sv ? 'Lektion · 10:15' : 'Lesson · 10:15'}
        </span>
      </div>
    </div>
  );
}
