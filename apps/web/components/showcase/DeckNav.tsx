'use client';

import { useCallback, useEffect, useState } from 'react';

type NavItem = { id: string; label: string; el: HTMLElement };

/**
 * Diskret sektions-nav för det långa decket (~19 sektioner).
 * Auto-upptäcker `main > section`, läser etiketten ur sektionens `.eyebrow`,
 * markerar aktiv sektion via IntersectionObserver och låter en investerare
 * hoppa direkt. Dold under lg (på små skärmar räcker scroll + topp-progress).
 */
export default function DeckNav() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('main > section'),
    );
    const list: NavItem[] = sections.map((el, i) => {
      const eb = el.querySelector('.eyebrow');
      const label = (eb?.textContent ?? '').trim() || `Sektion ${i + 1}`;
      if (!el.id) el.id = `deck-sec-${i}`;
      return { id: el.id, label, el };
    });
    setItems(list);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = list.findIndex((it) => it.el === e.target);
            if (idx >= 0) setActive(idx);
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    list.forEach((it) => io.observe(it.el));
    return () => io.disconnect();
  }, []);

  const go = useCallback((el: HTMLElement) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, []);

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Sektioner i decket"
      className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block"
    >
      <ul className="flex flex-col items-end gap-2.5">
        {items.map((it, i) => {
          const isActive = i === active;
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => go(it.el)}
                aria-current={isActive ? 'true' : undefined}
                title={it.label}
                className="group flex items-center gap-2 focus:outline-none"
              >
                <span
                  className={`whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.12em] transition-opacity duration-200 ${
                    isActive
                      ? 'text-coral-deep opacity-100'
                      : 'text-ink-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                  }`}
                >
                  {it.label}
                </span>
                <span
                  aria-hidden
                  className={`h-px transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isActive
                      ? 'w-6 bg-coral-deep'
                      : 'w-3 bg-ink/25 group-hover:w-5 group-hover:bg-ink/50 group-focus-visible:w-5'
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
