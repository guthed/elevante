'use client';

import { useInView } from '@/lib/hooks/useInView';
import { useCountUp } from '@/lib/hooks/useCountUp';

export type CurveSeries = { label: string; color: string; values: number[] };

type Props = {
  series: CurveSeries[];
  categories: string[];
  unit?: string;
  /** Tillgänglig beskrivning av hela diagrammet. */
  ariaLabel: string;
  caption?: string;
};

const W = 560;
const H = 300;
const PAD = { l: 38, r: 24, t: 26, b: 34 };

function smooth(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export default function StackedCurve({ series, categories, unit, ariaLabel, caption }: Props) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const n = categories.length;
  const cumulative = categories.map((_, i) =>
    series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0),
  );
  const max = Math.max(...cumulative, 1);
  const total = cumulative[cumulative.length - 1] ?? 0;
  const animatedTotal = useCountUp(total, inView);

  const px = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(n - 1, 1);
  const py = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);

  const bands: { d: string; color: string }[] = [];
  const lower = new Array(n).fill(0);
  for (const s of series) {
    const upper = lower.map((lo, i) => lo + (s.values[i] ?? 0));
    const upPts = upper.map((v, i) => ({ x: px(i), y: py(v) }));
    const loPtsRev = lower.map((v, i) => ({ x: px(i), y: py(v) })).reverse();
    const d = `${smooth(upPts)} L ${loPtsRev[0].x.toFixed(1)} ${loPtsRev[0].y.toFixed(1)} ${smooth(loPtsRev).replace(/^M[^C]*/, '')} Z`;
    bands.push({ d, color: s.color });
    for (let i = 0; i < n; i++) lower[i] = upper[i];
  }
  const topLine = smooth(cumulative.map((v, i) => ({ x: px(i), y: py(v) })));

  return (
    <div ref={ref} role="img" aria-label={ariaLabel}>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="font-serif text-4xl text-ink">
          {Math.round(animatedTotal).toLocaleString('sv-SE')}
        </span>
        {unit && <span className="text-sm text-ink-muted">{unit}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible">
        {[0, 1, 2, 3].map((k) => {
          const y = PAD.t + (k * (H - PAD.t - PAD.b)) / 3;
          return <line key={k} x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(26,26,46,.07)" />;
        })}
        <g
          style={{
            clipPath: inView ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
            transition: 'clip-path 1.7s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {bands.map((b, i) => (
            <path key={i} d={b.d} fill={b.color} />
          ))}
          <path d={topLine} fill="none" stroke="var(--color-coral)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {categories.map((c, i) => (
          <text key={c} x={px(i)} y={H - 10} textAnchor="middle" className="fill-ink-muted" fontSize={11}>
            {c}
          </text>
        ))}
      </svg>
      {series.length > 1 && (
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
          {series.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      {caption && <p className="eyebrow mt-4 text-ink-muted">{caption}</p>}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th>Kategori</th>
            {series.map((s) => (
              <th key={s.label}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((c, i) => (
            <tr key={c}>
              <th>{c}</th>
              {series.map((s) => (
                <td key={s.label}>{s.values[i] ?? 0}{unit ? ` ${unit}` : ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
