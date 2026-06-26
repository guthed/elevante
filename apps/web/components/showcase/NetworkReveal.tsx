'use client';

import { useInView } from '@/lib/hooks/useInView';

// Dataflywheel: ett nav + två omloppsringar. Ringarna ritas in utåt från
// navet så det känns som ett svänghjul som tar fart. Deterministiska
// positioner (viewBox 0 0 440 320, centrum 220/160).
const HUB = { x: 220, y: 160, r: 12 };
const INNER = [
  { x: 220, y: 88 }, { x: 282, y: 124 }, { x: 282, y: 196 },
  { x: 220, y: 232 }, { x: 158, y: 196 }, { x: 158, y: 124 },
];
const OUTER = [
  { x: 220, y: 25 }, { x: 299, y: 51 }, { x: 348, y: 118 }, { x: 348, y: 202 },
  { x: 299, y: 269 }, { x: 220, y: 295 }, { x: 141, y: 269 }, { x: 92, y: 202 },
  { x: 92, y: 118 }, { x: 141, y: 51 },
];

type Node = { x: number; y: number; r: number; tier: 0 | 1 | 2 };
const NODES: Node[] = [
  { ...HUB, tier: 0 },
  ...INNER.map((n) => ({ ...n, r: 6, tier: 1 as const })),
  ...OUTER.map((n) => ({ ...n, r: 4.5, tier: 2 as const })),
];

// Index: 0 = nav, 1–6 = inre ring, 7–16 = yttre ring.
const EDGES: [number, number][] = [
  // nav → inre ring
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
  // inre ring runt
  [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 1],
  // inre → yttre (ekrar)
  [1, 7], [1, 16], [2, 8], [2, 9], [3, 9], [3, 10],
  [4, 11], [4, 12], [5, 13], [5, 14], [6, 15], [6, 16],
  // yttre ring runt
  [7, 8], [8, 9], [9, 10], [10, 11], [11, 12],
  [12, 13], [13, 14], [14, 15], [15, 16], [16, 7],
];

function nodeDelay(i: number): number {
  if (i === 0) return 0;
  if (i <= 6) return 320 + (i - 1) * 55;
  return 700 + (i - 7) * 45;
}

export default function NetworkReveal({ caption, ariaLabel }: { caption?: string; ariaLabel?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} role="img" aria-label={ariaLabel ?? 'Nätverksgraf: varje ny lektion och skola stärker kopplingarna i Elevantes datamodell.'}>
      <svg viewBox="0 0 440 320" className="block h-auto w-full">
        {/* omloppsbanor (svänghjulets spår) */}
        {[72, 135].map((r) => (
          <circle
            key={r}
            cx={HUB.x}
            cy={HUB.y}
            r={r}
            fill="none"
            stroke="var(--color-ink)"
            strokeOpacity={0.07}
            strokeDasharray="2 6"
            style={{ opacity: inView ? 1 : 0, transition: 'opacity .8s ease .2s' }}
          />
        ))}
        {/* mjuk gloria bakom navet */}
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r={22}
          fill="var(--color-coral)"
          fillOpacity={0.12}
          style={{ opacity: inView ? 1 : 0, transition: 'opacity .6s ease' }}
        />
        {/* kanter ritas in utåt */}
        <g stroke="var(--color-coral)" strokeWidth={1.2} fill="none">
          {EDGES.map(([a, b], i) => {
            const len = Math.hypot(NODES[a].x - NODES[b].x, NODES[a].y - NODES[b].y);
            return (
              <line
                key={i}
                x1={NODES[a].x}
                y1={NODES[a].y}
                x2={NODES[b].x}
                y2={NODES[b].y}
                strokeOpacity={0.38}
                strokeDasharray={len}
                strokeDashoffset={inView ? 0 : len}
                style={{
                  transition: `stroke-dashoffset .9s cubic-bezier(0.22,1,0.36,1) ${150 + i * 40}ms`,
                }}
              />
            );
          })}
        </g>
        {/* noder skalas in från navet och utåt */}
        {NODES.map((nd, i) => (
          <circle
            key={i}
            cx={nd.x}
            cy={nd.y}
            r={nd.r}
            fill={nd.tier === 0 ? 'var(--color-coral)' : 'var(--color-ink)'}
            stroke="var(--color-canvas)"
            strokeWidth={2}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'scale(1)' : 'scale(0)',
              transformOrigin: `${nd.x}px ${nd.y}px`,
              transition: `opacity .4s ease, transform .55s cubic-bezier(0.22,1,0.36,1) ${nodeDelay(i)}ms`,
            }}
          />
        ))}
      </svg>
      {caption && <p className="eyebrow mt-4 text-ink-muted">{caption}</p>}
    </div>
  );
}
