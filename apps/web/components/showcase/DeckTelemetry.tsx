'use client';

import { useEffect, useRef } from 'react';

/**
 * Mäter max scroll-%, aktiv tid (bara när fliken är synlig) och om "the ask"
 * (id="ask") nåtts. Skickar en beacon till /api/investerare/telemetry vid
 * intervall, vid the ask, och när fliken lämnas. Renderar inget.
 * Använder bara refs (ingen setState) → ingen react-hooks/set-state-in-effect.
 */
export default function DeckTelemetry({ askSelector = '#ask' }: { askSelector?: string }) {
  const maxScroll = useRef(0);
  const seconds = useRef(0);
  const reachedAsk = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const send = () => {
      if (!dirty.current) return;
      dirty.current = false;
      const body = JSON.stringify({
        maxScroll: maxScroll.current,
        seconds: seconds.current,
        reachedAsk: reachedAsk.current,
      });
      try {
        navigator.sendBeacon?.(
          '/api/investerare/telemetry',
          new Blob([body], { type: 'application/json' }),
        );
      } catch {
        // sendBeacon kan saknas/blockeras — ignorera tyst.
      }
    };

    const computeScroll = () => {
      const d = document.documentElement;
      const max = d.scrollHeight - d.clientHeight;
      const pct = max > 0 ? Math.round((d.scrollTop / max) * 100) : 0;
      if (pct > maxScroll.current) {
        maxScroll.current = pct;
        dirty.current = true;
      }
    };

    computeScroll();
    window.addEventListener('scroll', computeScroll, { passive: true });

    const timeTick = setInterval(() => {
      if (document.visibilityState === 'visible') {
        seconds.current += 1;
        dirty.current = true;
      }
    }, 1000);

    const askEl = document.querySelector(askSelector);
    let io: IntersectionObserver | null = null;
    if (askEl) {
      io = new IntersectionObserver(
        (entries) => {
          if (!reachedAsk.current && entries.some((e) => e.isIntersecting)) {
            reachedAsk.current = true;
            dirty.current = true;
            send();
          }
        },
        { threshold: 0.4 },
      );
      io.observe(askEl);
    }

    const sendTick = setInterval(send, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') send();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', send);

    return () => {
      window.removeEventListener('scroll', computeScroll);
      clearInterval(timeTick);
      clearInterval(sendTick);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', send);
      io?.disconnect();
      send();
    };
  }, [askSelector]);

  return null;
}
