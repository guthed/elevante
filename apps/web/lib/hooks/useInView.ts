'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Returnerar [ref, inView]. inView blir true första gången elementet syns.
 * once=false → togglar fram och tillbaka. SSR/utan IO → true direkt.
 */
export function useInView<T extends Element = HTMLDivElement>(
  opts: { once?: boolean; rootMargin?: string; threshold?: number } = {},
) {
  const { once = true, rootMargin = '0px 0px -12% 0px', threshold = 0.2 } = opts;
  const ref = useRef<T>(null);
  // Assume true on SSR or if IntersectionObserver unavailable
  const [inView, setInView] = useState(
    typeof window === 'undefined' || typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, rootMargin, threshold]);

  return [ref, inView] as const;
}
