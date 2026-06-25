'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './showcase.module.css';

/**
 * Scroll-reveal-wrapper. Progressiv förbättring: innehållet renderas synligt
 * (SSR + utan JS). Vid hydrering armas dolt läge ENBART på element som ligger
 * under vikningen — de tonar/glider in när de scrollas in. Element redan i vy,
 * och användare med prefers-reduced-motion, lämnas synliga direkt.
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Redan synligt vid laddning → animera inte (undviker flimring + hjälper LCP).
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;

    // Avsiktlig synkron setState: vi renderar synligt för SSR/utan-JS och armar
    // dolt läge först efter mätning av DOM:en — kan inte avgöras vid SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(true);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHidden(false);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const classes = [styles.reveal, hidden ? styles.hidden : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
