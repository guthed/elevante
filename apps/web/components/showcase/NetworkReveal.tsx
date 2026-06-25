'use client';

import { useInView } from '@/lib/hooks/useInView';

const NODES: { x: number; y: number; r: number; hub?: boolean }[] = [
  { x: 180, y: 120, r: 9, hub: true },
  { x: 70, y: 60, r: 5 },
  { x: 95, y: 175, r: 5 },
  { x: 250, y: 55, r: 5 },
  { x: 290, y: 150, r: 5 },
  { x: 200, y: 205, r: 5 },
  { x: 45, y: 120, r: 4 },
  { x: 320, y: 95, r: 4 },
  { x: 140, y: 40, r: 4 },
];
const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
  [1, 6], [1, 8], [3, 8], [4, 7], [2, 5],
];

export default function NetworkReveal({ caption, ariaLabel }: { caption?: string; ariaLabel?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} role="img" aria-label={ariaLabel ?? 'Nätverksgraf: varje ny lektion och skola stärker kopplingarna i Elevantes datamodell.'}>
      <svg viewBox="0 0 360 240" className="block h-auto w-full">
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
                strokeOpacity={0.4}
                strokeDasharray={len}
                strokeDashoffset={inView ? 0 : len}
                style={{
                  transition: `stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1) ${200 + i * 70}ms`,
                }}
              />
            );
          })}
        </g>
        {NODES.map((nd, i) => (
          <circle
            key={i}
            cx={nd.x}
            cy={nd.y}
            r={nd.r}
            fill={nd.hub ? 'var(--color-coral)' : 'var(--color-ink)'}
            stroke="var(--color-canvas)"
            strokeWidth={2}
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'scale(1)' : 'scale(0)',
              transformOrigin: `${nd.x}px ${nd.y}px`,
              transition: `opacity .4s ease, transform .5s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms`,
            }}
          />
        ))}
      </svg>
      {caption && <p className="eyebrow mt-4 text-ink-muted">{caption}</p>}
    </div>
  );
}
