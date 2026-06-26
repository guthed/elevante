'use client';

import { useInView } from '@/lib/hooks/useInView';

// Dataflywheel — medvetet asymmetriskt: ett nav + oregelbundet utspridda
// noder på varierande avstånd, ett par sekundärnav, organisk mesh. Inga
// perfekta ringar. Deterministiska positioner (viewBox 0 0 440 320).
const NODES: { x: number; y: number; r: number; hub?: boolean }[] = [
  { x: 205, y: 168, r: 12, hub: true },
  { x: 150, y: 90, r: 6 },
  { x: 250, y: 80, r: 5 },
  { x: 320, y: 120, r: 6 },
  { x: 355, y: 195, r: 5 },
  { x: 300, y: 250, r: 6 },
  { x: 215, y: 270, r: 5 },
  { x: 120, y: 250, r: 6 },
  { x: 70, y: 175, r: 5 },
  { x: 95, y: 110, r: 4.5 },
  { x: 190, y: 55, r: 4 },
  { x: 290, y: 160, r: 7 }, // sekundärnav (höger)
  { x: 155, y: 200, r: 6.5 }, // sekundärnav (vänster)
  { x: 255, y: 210, r: 4.5 },
  { x: 385, y: 130, r: 4 },
  { x: 40, y: 230, r: 4 },
  { x: 340, y: 270, r: 4 },
];
const EDGES: [number, number][] = [
  // nav → en delmängd (inte alla — asymmetriskt)
  [0, 1], [0, 2], [0, 8], [0, 9], [0, 11], [0, 12], [0, 13], [0, 6],
  // höger kluster runt sekundärnav 11
  [11, 3], [11, 2], [11, 13], [11, 4], [3, 14], [3, 2], [3, 4], [4, 14], [4, 5], [4, 16],
  // botten
  [5, 16], [5, 13], [5, 6], [6, 7], [6, 13], [7, 15], [7, 12],
  // vänster kluster runt sekundärnav 12
  [7, 8], [8, 9], [8, 12], [9, 1], [9, 10], [1, 10], [1, 12], [2, 10],
];

export default function NetworkReveal({ caption, ariaLabel }: { caption?: string; ariaLabel?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const hub = NODES[0];
  return (
    <div ref={ref} role="img" aria-label={ariaLabel ?? 'Nätverksgraf: varje ny lektion och skola stärker kopplingarna i Elevantes datamodell.'}>
      <svg viewBox="0 0 440 320" className="block h-auto w-full">
        {/* mjuk gloria bakom navet */}
        <circle
          cx={hub.x}
          cy={hub.y}
          r={22}
          fill="var(--color-coral)"
          fillOpacity={0.12}
          style={{ opacity: inView ? 1 : 0, transition: 'opacity .6s ease' }}
        />
        {/* kanter ritas in */}
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
                  transition: `stroke-dashoffset .9s cubic-bezier(0.22,1,0.36,1) ${150 + i * 38}ms`,
                }}
              />
            );
          })}
        </g>
        {/* noder skalas in */}
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
              transition: `opacity .4s ease, transform .55s cubic-bezier(0.22,1,0.36,1) ${nd.hub ? 0 : 280 + i * 40}ms`,
            }}
          />
        ))}
      </svg>
      {caption && <p className="eyebrow mt-4 text-ink-muted">{caption}</p>}
    </div>
  );
}
