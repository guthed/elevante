'use client';

import { useState, useTransition } from 'react';
import { startLessonChat } from '@/app/actions/chat';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';

type Props = {
  locale: Locale;
  lessonId: string;
  labels: Dictionary['app']['pages']['student']['chat'];
  placeholderOverride?: string;
};

export function LessonChatForm({ locale, lessonId, labels, placeholderOverride }: Props) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState('');

  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      startLessonChat(formData);
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="lesson_id" value={lessonId} />
      <Textarea
        id="lesson-chat-question"
        name="question"
        rows={4}
        required
        placeholder={placeholderOverride ?? labels.inputPlaceholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={pending || value.trim().length === 0}
      >
        {pending ? labels.sending : labels.send}
      </Button>
      <p className="text-xs text-[var(--color-ink-subtle)]">{labels.mockNotice}</p>
    </form>
  );
}
