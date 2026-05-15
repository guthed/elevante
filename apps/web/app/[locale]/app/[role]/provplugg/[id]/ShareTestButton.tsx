'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { sharePracticeTest } from '@/app/actions/practice-test';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  testId: string;
  initiallyShared: boolean;
  locale: Locale;
};

export function ShareTestButton({ testId, initiallyShared, locale }: Props) {
  const sv = locale === 'sv';
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shared, setShared] = useState(initiallyShared);

  if (shared) {
    return (
      <p className="inline-flex items-center gap-2 text-[0.875rem] text-[var(--color-ink-secondary)]">
        <span className="status-dot status-dot--sage" />
        {sv ? 'Delat med din lärare' : 'Shared with your teacher'}
      </p>
    );
  }

  function handleShare() {
    startTransition(async () => {
      const result = await sharePracticeTest(testId);
      if (result.ok) {
        setShared(true);
        router.refresh();
      }
    });
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleShare}
      disabled={pending}
    >
      {pending
        ? sv
          ? 'Delar…'
          : 'Sharing…'
        : sv
          ? 'Dela med din lärare'
          : 'Share with your teacher'}
    </Button>
  );
}
