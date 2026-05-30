'use client';

import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import styles from './deck.module.css';

const DESIGN_W = 1920;
const DESIGN_H = 1080;
const OVERLAY_HIDE_MS = 1800;
const INTERACTIVE_SEL =
  'a[href], button, input, select, textarea, summary, label, [role="button"], [tabindex]:not([tabindex^="-"])';

/**
 * Full-screen deck stage: renders a fixed 1920×1080 canvas scaled to fit the
 * viewport (letterboxed), with keyboard + click navigation. Faithful port of
 * the design bundle's <deck-stage> web component behaviour.
 */
export default function DeckStage({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const total = slides.length;

  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (next: number) => {
      setIndex((prev) => {
        const clamped = Math.max(0, Math.min(total - 1, next));
        return clamped === prev ? prev : clamped;
      });
    },
    [total],
  );

  const flashOverlay = useCallback(() => {
    setOverlayVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOverlayVisible(false), OVERLAY_HIDE_MS);
  }, []);

  // Scale the canvas to fit the viewport, letterboxed.
  useLayoutEffect(() => {
    const resize = () => {
      const s = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
      setScale(s);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      let handled = true;
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          go(index + 1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          go(index - 1);
          break;
        case 'Home':
          go(0);
          break;
        case 'End':
          go(total - 1);
          break;
        case 'r':
        case 'R':
          go(0);
          break;
        case 'p':
        case 'P':
          window.print();
          break;
        default:
          if (/^[1-9]$/.test(e.key)) {
            go(Number(e.key) - 1);
          } else {
            handled = false;
          }
      }
      if (handled) {
        e.preventDefault();
        flashOverlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, total, go, flashOverlay]);

  // Show overlay briefly on mount and on pointer move.
  useEffect(() => {
    flashOverlay();
    const onMove = () => flashOverlay();
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [flashOverlay]);

  // Click left/right half to navigate — but leave interactive elements alone.
  const onStageClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest(INTERACTIVE_SEL)) return;
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (e.clientX < rect.left + rect.width / 2) go(index - 1);
      else go(index + 1);
      flashOverlay();
    },
    [index, go, flashOverlay],
  );

  return (
    <div className={styles.host}>
      <div
        ref={stageRef}
        className={styles.canvas}
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
        onClick={onStageClick}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className={styles.slot}
            aria-hidden={i !== index}
            style={{
              visibility: i === index ? 'visible' : 'hidden',
              opacity: i === index ? 1 : 0,
            }}
          >
            {slide}
          </div>
        ))}
      </div>

      <div
        className={styles.overlay}
        style={{ opacity: overlayVisible ? 1 : 0 }}
        aria-hidden
      >
        <span className={styles.overlayCount}>
          {index + 1} / {total}
        </span>
        <span className={styles.overlayHint}>← → för att bläddra · P för PDF</span>
      </div>
    </div>
  );
}
