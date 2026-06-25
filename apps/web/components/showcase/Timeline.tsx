'use client';

import { useInView } from '@/lib/hooks/useInView';

export type Milestone = { tag: string; title: string; desc: string };

export default function Timeline({ items }: { items: Milestone[] }) {
  const [ref, inView] = useInView<HTMLOListElement>();
  return (
    <ol ref={ref} className="relative mt-12 flex flex-col gap-10 pl-8">
      <span
        aria-hidden
        className="absolute left-[7px] top-2 w-px bg-coral/50 origin-top"
        style={{
          bottom: '0.5rem',
          transform: inView ? 'scaleY(1)' : 'scaleY(0)',
          transition: 'transform 1.2s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
      {items.map((m, i) => (
        <li key={m.title} className="relative">
          <span
            aria-hidden
            className="absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-canvas bg-coral"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'scale(1)' : 'scale(0)',
              transition: `opacity .3s ease, transform .5s cubic-bezier(0.22,1,0.36,1) ${300 + i * 220}ms`,
            }}
          />
          <p className="text-sm font-semibold uppercase tracking-wider text-coral">{m.tag}</p>
          <h3 className="mt-1 font-serif text-2xl">{m.title}</h3>
          <p className="mt-1 text-ink-muted">{m.desc}</p>
        </li>
      ))}
    </ol>
  );
}
