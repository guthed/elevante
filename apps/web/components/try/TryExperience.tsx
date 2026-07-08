'use client';

import { useMemo, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr, type L } from '@/lib/try/copy';
import { LessonScope } from './LessonScope';
import { ChatStep } from './ChatStep';
import { TestStep } from './TestStep';

// Lättviktig lektionsvy till klienten (ingen transkripttext skickas hit).
export type LessonCard = { id: string; title: L; summary: L; concepts: string[] };

type Props = { locale: Locale; lessons: LessonCard[]; suggestionsByLesson: Record<string, L[]> };

export function TryExperience({ locale, lessons, suggestionsByLesson }: Props) {
  const allIds = useMemo(() => lessons.map((l) => l.id), [lessons]);
  // Chatt-först: man landar direkt i chatten med alla lektioner i scope.
  const [selected, setSelected] = useState<string[]>(allIds);
  const [mode, setMode] = useState<'chat' | 'test'>('chat');

  // Förslagsfrågor från de valda lektionerna (max 6 chips).
  const suggestions = useMemo(() => {
    const out: L[] = [];
    for (const id of selected) for (const s of suggestionsByLesson[id] ?? []) out.push(s);
    return out.slice(0, 6);
  }, [selected, suggestionsByLesson]);

  if (mode === 'test') {
    return (
      <div>
        <button
          type="button"
          onClick={() => setMode('chat')}
          className="mb-6 text-[0.875rem] text-[var(--color-ink)] underline-offset-4 hover:underline"
        >
          {tr(locale, TRY_COPY.backToChat)}
        </button>
        <TestStep locale={locale} lessonIds={selected} />
      </div>
    );
  }

  return (
    <div>
      <LessonScope
        locale={locale}
        lessons={lessons}
        selected={selected}
        onChange={setSelected}
      />
      {locale === 'en' ? (
        <p className="-mt-3 mb-6 text-[0.8125rem] italic text-[var(--color-ink-muted)]">
          {tr(locale, TRY_COPY.swedishNote)}
        </p>
      ) : null}
      <ChatStep
        locale={locale}
        lessonIds={selected}
        suggestions={suggestions}
        onToTest={() => setMode('test')}
      />
    </div>
  );
}
