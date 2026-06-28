'use client';

import { useInView } from '@/lib/hooks/useInView';

export type FundSeg = {
  label: string;
  amount: string;
  pct: number;
  color: string;
};

/**
 * Horisontell allokeringsstapel för §18 (mörk ink-sektion). Segmenten växer in
 * när stapeln scrollas in; reduced-motion fryser transitionerna globalt.
 */
export default function AllocationBar({
  segments,
  ariaLabel,
}: {
  segments: FundSeg[];
  ariaLabel?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div ref={ref}>
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex h-11 w-full overflow-hidden rounded-full bg-canvas/10"
      >
        {segments.map((s, i) => (
          <div
            key={s.label}
            className="h-full"
            style={{
              width: inView ? `${s.pct}%` : '0%',
              background: s.color,
              boxShadow: 'inset -1px 0 0 rgba(26,26,46,0.35)',
              transition: `width .8s cubic-bezier(0.22,1,0.36,1) ${i * 80}ms`,
            }}
          />
        ))}
      </div>

      <ul className="mt-7 grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-baseline gap-3 text-sm">
            <span
              className="mt-1 h-2.5 w-2.5 flex-none rounded-sm"
              style={{ background: s.color }}
              aria-hidden
            />
            <span className="flex-1 text-canvas/80">{s.label}</span>
            <span className="flex-none tabular-nums text-canvas/55">
              {s.amount} · {s.pct}&thinsp;%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
