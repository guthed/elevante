'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Räknar upp 0 → target när active blir true (ease-out cubic).
 * prefers-reduced-motion → hoppar direkt till target (deferrat en frame).
 */
export function useCountUp(target: number, active: boolean, durationMs = 1400) {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      raf.current = requestAnimationFrame(() => setValue(target));
      return () => {
        if (raf.current) cancelAnimationFrame(raf.current);
      };
    }
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(eased * target);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, active, durationMs]);

  return value;
}
