'use client';

import { useRef } from 'react';
import { sendBeaconJson, useEngagement } from './useEngagement';

/**
 * Mäter max scroll-%, aktiv tid och om "the ask" (id="ask") nåtts. Skickar en
 * beacon till /api/investerare/telemetry vid intervall, vid the ask, och när
 * fliken lämnas. Sessionen identifieras av investerar-cookien. Renderar inget.
 */
export default function DeckTelemetry({ askSelector = '#ask' }: { askSelector?: string }) {
  const reachedAsk = useRef(false);

  useEngagement({
    askSelector,
    onAsk: () => {
      reachedAsk.current = true;
    },
    send: (engagement, final) => {
      sendBeaconJson('/api/investerare/telemetry', {
        ...engagement,
        reachedAsk: reachedAsk.current,
        final,
      });
    },
  });

  return null;
}
