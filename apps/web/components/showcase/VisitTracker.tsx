'use client';

import { useEffect, useRef } from 'react';
import { sendBeaconJson, useEngagement } from './useEngagement';

/**
 * Besöksspårning för säljsidorna. Läser den personliga koden ur ?k=, växlar in
 * den mot en signerad sessions-token och rapporterar sedan scroll och tid.
 *
 * Utan ?k= (eller med en kod som inte matchar) händer ingenting alls — sidan
 * fungerar precis som vanligt och mätningen skickas aldrig iväg. Token bor i en
 * ref, inte i state: komponenten renderar ingenting och ska inte rendera om.
 */
export default function VisitTracker({ page }: { page: 'rektor' | 'larare' }) {
  const token = useRef<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('k');
    if (!code) return;

    const controller = new AbortController();
    fetch('/api/skolbesok/oppna', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, page }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { token?: string } | null) => {
        if (data?.token) token.current = data.token;
      })
      .catch(() => {
        // Okänd kod, offline eller avbrutet — sidan bryr sig inte.
      });

    return () => controller.abort();
  }, [page]);

  useEngagement({
    send: (engagement, final) => {
      if (!token.current) return;
      sendBeaconJson('/api/skolbesok/telemetry', {
        token: token.current,
        ...engagement,
        final,
      });
    },
  });

  return null;
}
