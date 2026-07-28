'use client';

import { useEffect, useRef } from 'react';

export type Engagement = { maxScroll: number; seconds: number };

type Options = {
  /** Anropas vid intervall, när `askSelector` syns, och när sidan lämnas. */
  send: (engagement: Engagement, final: boolean) => void;
  /** Valfritt element att observera (t.ex. "the ask" i investerardecket). */
  askSelector?: string;
  /** Körs en gång, första gången `askSelector` kommer i vy. */
  onAsk?: () => void;
};

/** Skickar en JSON-beacon. Sväljer fel — telemetri får aldrig störa sidan. */
export function sendBeaconJson(url: string, body: unknown): void {
  try {
    navigator.sendBeacon?.(url, new Blob([JSON.stringify(body)], { type: 'application/json' }));
  } catch {
    // sendBeacon kan saknas eller blockeras av en extension — ignorera tyst.
  }
}

/**
 * Mäter max scroll-% och aktiv tid (bara när fliken är synlig).
 *
 * Använder bara refs, aldrig setState → ingen omrendering och ingen
 * react-hooks/set-state-in-effect. Delas av investerardecket och säljsidornas
 * besöksspårning.
 */
export function useEngagement({ send, askSelector, onAsk }: Options): void {
  const maxScroll = useRef(0);
  const seconds = useRef(0);
  const dirty = useRef(false);
  const latest = useRef({ send, onAsk });

  // Håll callbackerna färska utan att starta om effekten nedan.
  useEffect(() => {
    latest.current = { send, onAsk };
  });

  useEffect(() => {
    const flush = (final = false) => {
      if (!dirty.current && !final) return;
      dirty.current = false;
      latest.current.send(
        { maxScroll: maxScroll.current, seconds: seconds.current },
        final,
      );
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

    let io: IntersectionObserver | null = null;
    const askEl = askSelector ? document.querySelector(askSelector) : null;
    if (askEl) {
      let fired = false;
      io = new IntersectionObserver(
        (entries) => {
          if (!fired && entries.some((e) => e.isIntersecting)) {
            fired = true;
            latest.current.onAsk?.();
            dirty.current = true;
            flush();
          }
        },
        { threshold: 0.4 },
      );
      io.observe(askEl);
    }

    const sendTick = setInterval(() => flush(), 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush(true);
    };
    const onPageHide = () => flush(true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('scroll', computeScroll);
      clearInterval(timeTick);
      clearInterval(sendTick);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      io?.disconnect();
      flush(true);
    };
  }, [askSelector]);
}
