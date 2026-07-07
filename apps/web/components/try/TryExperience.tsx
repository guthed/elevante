'use client';

import { useMemo, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { L } from '@/lib/try/copy';
import { StepRail } from './StepRail';
import { LessonPicker, type LessonCard } from './LessonPicker';
import { ChatStep } from './ChatStep';
import { TestStep } from './TestStep';

type Props = { locale: Locale; lessons: LessonCard[]; suggestionsByLesson: Record<string, L[]> };

export function TryExperience({ locale, lessons, suggestionsByLesson }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [maxReached, setMaxReached] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string[]>([]);

  function go(next: 1 | 2 | 3) {
    setStep(next);
    setMaxReached((m) => (next > m ? next : m));
  }

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  // Slå ihop förslagsfrågor från de valda lektionerna (max 6 chips).
  const suggestions = useMemo(() => {
    const out: L[] = [];
    for (const id of selected) for (const s of suggestionsByLesson[id] ?? []) out.push(s);
    return out.slice(0, 6);
  }, [selected, suggestionsByLesson]);

  return (
    <div>
      <StepRail locale={locale} current={step} maxReached={maxReached} onGo={go} />

      {step === 1 ? (
        <LessonPicker
          locale={locale}
          lessons={lessons}
          selected={selected}
          onToggle={toggle}
          onContinue={() => go(2)}
        />
      ) : null}

      {step === 2 ? (
        <ChatStep
          locale={locale}
          lessonIds={selected}
          suggestions={suggestions}
          onToTest={() => go(3)}
        />
      ) : null}

      {step === 3 ? <TestStep locale={locale} lessonIds={selected} /> : null}
    </div>
  );
}
