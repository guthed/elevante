'use client';

import { useInView } from '@/lib/hooks/useInView';

export type MarketRing = {
  /** Radie i px inom viewBox 0..320 (störst sist). */
  radius: number;
  color: string;
  label: string;
  value: string;
  sub: string;
  /** Jämförelse-multipel mot hemmamarknaden (t.ex. "≈ 58×"). Valfri. */
  multiple?: string;
  /** Fyllnadsopacitet per ring — låter färgerna differentieras tydligare. */
  fillOpacity?: number;
};

export default function ConcentricMarket({ rings, ariaLabel }: { rings: MarketRing[]; ariaLabel?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const ordered = [...rings].sort((a, b) => b.radius - a.radius);
  return (
    <div ref={ref} className="grid items-center gap-10 md:grid-cols-2">
      <div role="img" aria-label={ariaLabel ?? 'Koncentriska ringar: marknaden växer från Sverige till Norden till EU.'}>
        <svg viewBox="0 0 320 320" className="block h-auto w-full">
          {ordered.map((r, i) => (
            <circle
              key={r.label}
              cx={160}
              cy={160}
              r={r.radius}
              fill={r.color}
              fillOpacity={r.fillOpacity ?? 0.18}
              stroke={r.color}
              strokeWidth={2.5}
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'scale(1)' : 'scale(0.2)',
                transformOrigin: '160px 160px',
                transition: `opacity .5s ease, transform .8s cubic-bezier(0.22,1,0.36,1) ${i * 220}ms`,
              }}
            />
          ))}
        </svg>
      </div>
      <ul className="flex flex-col gap-5">
        {rings.map((r) => (
          <li key={r.label} className="border-t border-ink/10 pt-4">
            <div className="flex items-baseline gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: r.color }} aria-hidden />
              <span className="font-serif text-3xl text-ink">{r.value}</span>
              {r.multiple && (
                <span className="font-serif text-xl text-coral-deep">{r.multiple}</span>
              )}
            </div>
            <p className="mt-1 font-medium text-ink">{r.label}</p>
            <p className="text-sm text-ink-muted">{r.sub}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
