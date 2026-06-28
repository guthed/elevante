'use client';

import { useEffect, useState } from 'react';
import { useInView } from '@/lib/hooks/useInView';

// Datamoat-fält — ~100 deterministiska noder som visar de två sakerna som
// driver moaten: transkriberade lektioner (coral, större) och elevfrågor (ink,
// små) som klustrar runt den lektion de handlar om. Kanter = "frågan handlar om
// lektionen"; en svag coral ryggrad knyter närliggande lektioner.
// Deterministisk PRNG → identiska positioner på server och klient (ingen
// hydration-miss; inget Math.random i render).

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 440;
const H = 320;
const M = 10; // marginal så cirklarna inte klipps mot kanten

type Node = { x: number; y: number; r: number };
type QNode = Node & { host: number };

function buildField() {
  const rnd = mulberry32(20260628);

  // Lektioner (transkriberingar) — jittrat 5×3-rutnät så de täcker hela ytan
  // kant till kant utan att klumpa ihop sig.
  const lessons: Node[] = [];
  const cols = 5;
  const rows = 3;
  const cellW = (W - 2 * M) / cols;
  const cellH = (H - 2 * M) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = M + (c + 0.5) * cellW + (rnd() - 0.5) * cellW * 0.72;
      const y = M + (r + 0.5) * cellH + (rnd() - 0.5) * cellH * 0.72;
      lessons.push({
        x: Math.max(M, Math.min(W - M, x)),
        y: Math.max(M, Math.min(H - M, y)),
        r: 5 + rnd() * 2.4,
      });
    }
  }

  // Elevfrågor — 70 % klustrar runt en lektion, 30 % är utspridda. Varje fråga
  // kopplas till sin lektion (host).
  const questions: QNode[] = [];
  for (let i = 0; i < 85; i++) {
    let x: number;
    let y: number;
    let host: number;
    if (rnd() < 0.62) {
      host = Math.floor(rnd() * lessons.length);
      const l = lessons[host];
      const ang = rnd() * Math.PI * 2;
      const dist = 12 + rnd() * 56;
      x = Math.max(M, Math.min(W - M, l.x + Math.cos(ang) * dist));
      y = Math.max(M, Math.min(H - M, l.y + Math.sin(ang) * dist));
    } else {
      x = M + rnd() * (W - 2 * M);
      y = M + rnd() * (H - 2 * M);
      host = 0;
      let best = Infinity;
      lessons.forEach((l, k) => {
        const d = Math.hypot(l.x - x, l.y - y);
        if (d < best) {
          best = d;
          host = k;
        }
      });
    }
    questions.push({ x, y, r: 1.7 + rnd() * 1.5, host });
  }

  // Ryggrad: varje lektion → närmaste andra lektion.
  const backbone: [number, number][] = lessons.map((l, k) => {
    let best = Infinity;
    let j = k;
    lessons.forEach((o, m) => {
      if (m === k) return;
      const d = Math.hypot(l.x - o.x, l.y - o.y);
      if (d < best) {
        best = d;
        j = m;
      }
    });
    return [k, j];
  });

  return { lessons, questions, backbone };
}

const { lessons: LESSONS, questions: QUESTIONS, backbone: BACKBONE } = buildField();

// En ny nod (med sin kant) som poppar in efter laddning — visar att fältet
// fortsätter växa. q = elevfråga (ink), l = ny transkriberad lektion (coral).
type ExtraItem = { id: number; x: number; y: number; r: number; ax: number; ay: number; type: 'q' | 'l' };

function PopNode({ item }: { item: ExtraItem }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setOn(true), 20);
    return () => clearTimeout(id);
  }, []);
  const len = Math.hypot(item.x - item.ax, item.y - item.ay);
  const isLesson = item.type === 'l';
  return (
    <>
      <line
        x1={item.x}
        y1={item.y}
        x2={item.ax}
        y2={item.ay}
        fill="none"
        stroke={isLesson ? 'var(--color-coral)' : 'var(--color-ink)'}
        strokeWidth={isLesson ? 1 : 0.7}
        strokeOpacity={isLesson ? 0.32 : 0.13}
        strokeDasharray={len}
        strokeDashoffset={on ? 0 : len}
        style={{ transition: 'stroke-dashoffset .6s ease' }}
      />
      <circle
        cx={item.x}
        cy={item.y}
        r={item.r}
        fill={isLesson ? 'var(--color-coral)' : 'var(--color-ink)'}
        stroke="var(--color-canvas)"
        strokeWidth={isLesson ? 2 : 1}
        style={{
          opacity: on ? (isLesson ? 1 : 0.82) : 0,
          transform: on ? 'scale(1)' : 'scale(0)',
          transformOrigin: `${item.x}px ${item.y}px`,
          transition: 'opacity .4s ease, transform .55s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
    </>
  );
}

export default function NetworkReveal({
  caption,
  ariaLabel,
  legend,
}: {
  caption?: string;
  ariaLabel?: string;
  legend?: { lesson: string; question: string };
}) {
  const [ref, inView] = useInView<HTMLDivElement>();

  // Efter laddningen fortsätter fältet växa: nya prickar poppar in med några
  // sekunders mellanrum (mest elevfrågor, ibland en ny lektion) — upp till ett
  // tak. Respekterar prefers-reduced-motion.
  const [extra, setExtra] = useState<ExtraItem[]>([]);
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const MAX = 30;
    let count = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const makeItem = (id: number): ExtraItem => {
      if (Math.random() < 0.17) {
        // ny transkriberad lektion — kopplas till närmaste befintliga lektion
        const x = M + Math.random() * (W - 2 * M);
        const y = M + Math.random() * (H - 2 * M);
        let ax = LESSONS[0].x;
        let ay = LESSONS[0].y;
        let best = Infinity;
        for (const l of LESSONS) {
          const d = Math.hypot(l.x - x, l.y - y);
          if (d < best) {
            best = d;
            ax = l.x;
            ay = l.y;
          }
        }
        return { id, x, y, r: 4.6 + Math.random() * 1.8, ax, ay, type: 'l' };
      }
      // ny elevfråga nära en slumpad lektion
      const l = LESSONS[Math.floor(Math.random() * LESSONS.length)];
      const ang = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 52;
      const x = Math.max(M, Math.min(W - M, l.x + Math.cos(ang) * dist));
      const y = Math.max(M, Math.min(H - M, l.y + Math.sin(ang) * dist));
      return { id, x, y, r: 1.7 + Math.random() * 1.5, ax: l.x, ay: l.y, type: 'q' };
    };

    // Slumpad kadens (~2,5–4,7 s) så det känns organiskt — "då och då", inte metronomiskt.
    const tick = () => {
      if (count >= MAX) return;
      const item = makeItem(count);
      count += 1;
      setExtra((prev) => [...prev, item]);
      timer = setTimeout(tick, 2500 + Math.random() * 2200);
    };

    // starta först efter att draw-in-animationen hunnit klart
    const start = setTimeout(tick, 2600);

    return () => {
      clearTimeout(start);
      if (timer) clearTimeout(timer);
    };
  }, [inView]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={
        ariaLabel ??
        'Nätverksfält: transkriberade lektioner som var och en samlar ett kluster av elevfrågor.'
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
        <g
          style={
            inView
              ? {
                  transformBox: 'view-box',
                  transformOrigin: `${W / 2}px ${H / 2}px`,
                  animation: 'flywheel-sway 14s ease-in-out 1.6s infinite',
                }
              : undefined
          }
        >
          {/* fråge-kanter (ink, svaga) */}
          <g stroke="var(--color-ink)" strokeWidth={0.7} fill="none">
            {QUESTIONS.map((q, i) => {
              const l = LESSONS[q.host];
              const len = Math.hypot(q.x - l.x, q.y - l.y);
              return (
                <line
                  key={i}
                  x1={q.x}
                  y1={q.y}
                  x2={l.x}
                  y2={l.y}
                  strokeOpacity={0.13}
                  strokeDasharray={len}
                  strokeDashoffset={inView ? 0 : len}
                  style={{ transition: `stroke-dashoffset .7s ease ${120 + i * 6}ms` }}
                />
              );
            })}
          </g>

          {/* ryggrad lektion→lektion (coral, svag) */}
          <g stroke="var(--color-coral)" strokeWidth={1} fill="none">
            {BACKBONE.map(([a, b], i) => {
              const len = Math.hypot(LESSONS[a].x - LESSONS[b].x, LESSONS[a].y - LESSONS[b].y);
              return (
                <line
                  key={i}
                  x1={LESSONS[a].x}
                  y1={LESSONS[a].y}
                  x2={LESSONS[b].x}
                  y2={LESSONS[b].y}
                  strokeOpacity={0.32}
                  strokeDasharray={len}
                  strokeDashoffset={inView ? 0 : len}
                  style={{ transition: `stroke-dashoffset .8s ease ${200 + i * 28}ms` }}
                />
              );
            })}
          </g>

          {/* elevfrågor (ink, små) */}
          {QUESTIONS.map((q, i) => (
            <circle
              key={i}
              cx={q.x}
              cy={q.y}
              r={q.r}
              fill="var(--color-ink)"
              stroke="var(--color-canvas)"
              strokeWidth={1}
              style={{
                opacity: inView ? 0.82 : 0,
                transform: inView ? 'scale(1)' : 'scale(0)',
                transformOrigin: `${q.x}px ${q.y}px`,
                transition: `opacity .35s ease, transform .5s cubic-bezier(0.22,1,0.36,1) ${260 + i * 6}ms`,
              }}
            />
          ))}

          {/* transkriberade lektioner (coral, större) */}
          {LESSONS.map((l, i) => (
            <circle
              key={i}
              cx={l.x}
              cy={l.y}
              r={l.r}
              fill="var(--color-coral)"
              stroke="var(--color-canvas)"
              strokeWidth={2}
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'scale(1)' : 'scale(0)',
                transformOrigin: `${l.x}px ${l.y}px`,
                transition: `opacity .4s ease, transform .55s cubic-bezier(0.22,1,0.36,1) ${i * 35}ms`,
              }}
            />
          ))}

          {/* nya prickar som poppar in efter laddning (fältet växer) */}
          {extra.map((item) => (
            <PopNode key={item.id} item={item} />
          ))}
        </g>
      </svg>

      {legend && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: 'var(--color-coral)' }} aria-hidden />
            {legend.lesson}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: 'var(--color-ink)' }} aria-hidden />
            {legend.question}
          </span>
        </div>
      )}
      {caption && <p className="eyebrow mt-3 text-ink-muted">{caption}</p>}
    </div>
  );
}
