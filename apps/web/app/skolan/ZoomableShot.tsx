'use client';

import Image, { type StaticImageData } from 'next/image';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { createPortal } from 'react-dom';

type Props = {
  src: StaticImageData;
  alt: string;
  sizes?: string;
  className?: string;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Produktskärmdump som öppnas i en fullskärms-lightbox vid tryck/klick.
 * I lightboxen: nyp för att zooma (touch), scroll-zoom (desktop), dubbeltryck
 * för att växla zoom, dra för att panorera. Stäng med knapp eller Esc.
 */
export default function ZoomableShot({ src, alt, sizes, className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Förstora skärmdump: ${alt}`}
        className="group relative block w-full cursor-zoom-in"
      >
        <Image src={src} alt={alt} sizes={sizes} placeholder="blur" className={className} />
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-medium text-canvas backdrop-blur-sm transition-opacity group-hover:bg-ink/85"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
          </svg>
          Zooma
        </span>
      </button>
      {open && createPortal(<Lightbox src={src.src} alt={alt} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [t, setT] = useState({ s: 1, x: 0, y: 0 });
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number } | null>(null);
  const pan = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const [gesturing, setGesturing] = useState(false);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  function rect() {
    const r = surfaceRef.current!.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
  }

  function clampT(s: number, x: number, y: number) {
    const { w, h } = rect();
    const maxX = (w * (s - 1)) / 2;
    const maxY = (h * (s - 1)) / 2;
    return { s, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }

  function zoomTo(newScaleRaw: number, clientX: number, clientY: number) {
    const cur = tRef.current;
    const newS = clamp(newScaleRaw, MIN_SCALE, MAX_SCALE);
    const { cx, cy } = rect();
    const px = clientX - cx;
    const py = clientY - cy;
    const ratio = newS / cur.s;
    setT(clampT(newS, px - (px - cur.x) * ratio, py - (py - cur.y) * ratio));
  }

  function toggleZoom(clientX: number, clientY: number) {
    if (tRef.current.s > 1) setT({ s: 1, x: 0, y: 0 });
    else zoomTo(2.5, clientX, clientY);
  }

  function dist() {
    const pts = [...pointers.current.values()];
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return { d: Math.hypot(dx, dy), mx: (pts[0].x + pts[1].x) / 2, my: (pts[0].y + pts[1].y) / 2 };
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGesturing(true);
    if (pointers.current.size === 1) {
      pan.current = { x: e.clientX, y: e.clientY };
      const now = Date.now();
      if (now - lastTap.current < 300) {
        toggleZoom(e.clientX, e.clientY);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    } else if (pointers.current.size === 2) {
      pinch.current = { dist: dist().d };
      pan.current = null;
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const { d, mx, my } = dist();
      const factor = d / pinch.current.dist;
      zoomTo(tRef.current.s * factor, mx, my);
      pinch.current = { dist: d };
    } else if (pointers.current.size === 1 && pan.current && tRef.current.s > 1) {
      const dx = e.clientX - pan.current.x;
      const dy = e.clientY - pan.current.y;
      pan.current = { x: e.clientX, y: e.clientY };
      const cur = tRef.current;
      setT(clampT(cur.s, cur.x + dx, cur.y + dy));
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      const p = [...pointers.current.values()][0];
      pan.current = { x: p.x, y: p.y };
    } else if (pointers.current.size === 0) {
      pan.current = null;
      setGesturing(false);
    }
  }

  function onWheel(e: ReactWheelEvent<HTMLDivElement>) {
    zoomTo(tRef.current.s * (e.deltaY < 0 ? 1.15 : 0.87), e.clientX, e.clientY);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="animate-page-in fixed inset-0 z-[100] bg-ink/95 backdrop-blur-sm"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Stäng"
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-canvas/10 text-2xl leading-none text-canvas transition-colors hover:bg-canvas/20"
      >
        ×
      </button>

      <div
        ref={surfaceRef}
        className="absolute inset-0 z-10 flex touch-none select-none items-center justify-center overflow-hidden"
        style={{ cursor: t.s > 1 ? 'grab' : 'zoom-in', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={(e) => toggleZoom(e.clientX, e.clientY)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-[92vh] max-w-[94vw] select-none"
          style={{
            transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})`,
            transformOrigin: 'center',
            transition: gesturing ? 'none' : 'transform 0.18s ease-out',
          }}
        />
      </div>

      <p className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 px-4 text-center text-xs text-canvas/55">
        Nyp eller dubbeltryck för att zooma · dra för att panorera
      </p>
    </div>
  );
}
