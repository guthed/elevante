'use client';

import { useEffect } from 'react';
import type { FeedbackItemContext } from '@/lib/feedback/context';
import { useFeedback } from './FeedbackProvider';

/**
 * Registrerar vad eleven tittar på just nu, så att en rapport automatiskt får
 * med lektion, kort-/frågeid och begrepp. Vyn behöver inte städa upp vid
 * avmontering — nästa vy skriver över, och en förälderad kontext skulle bara
 * kunna följa med om eleven navigerade bort och rapporterade utan att någon
 * annan vy hunnit registrera något. Därför nollställer vi ändå vid unmount.
 *
 * Fälten serialiseras till ett beroende så att effekten kör om när kortet
 * byts men inte varje render (objektet skapas nytt i anroparen varje gång).
 */
export function useFeedbackItem(item: FeedbackItemContext | null): void {
  const feedback = useFeedback();
  const key = item ? JSON.stringify(item) : null;

  useEffect(() => {
    if (!feedback) return;
    feedback.setItem(key ? (JSON.parse(key) as FeedbackItemContext) : null);
    return () => feedback.setItem(null);
  }, [feedback, key]);
}
