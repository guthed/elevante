'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { closeClassTest } from '@/app/actions/class-test';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  testId: string;
  locale: Locale;
};

export function CloseTestButton({ testId, locale }: Props) {
  const sv = locale === 'sv';
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClose() {
    startTransition(async () => {
      const res = await closeClassTest(testId);
      if (res.ok) router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClose}
      disabled={pending}
    >
      {pending
        ? sv
          ? 'Stänger…'
          : 'Closing…'
        : sv
          ? 'Stäng provet'
          : 'Close test'}
    </Button>
  );
}
