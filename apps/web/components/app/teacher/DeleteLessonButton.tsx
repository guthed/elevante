'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { archiveLesson, restoreLesson } from '@/app/actions/lesson';

type Labels = {
  delete: string;
  deleted: string;
  undo: string;
  deleteError: string;
};

export function DeleteLessonButton({
  lessonId,
  locale,
  labels,
}: {
  lessonId: string;
  locale: string;
  labels: Labels;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const onDelete = () => {
    startTransition(async () => {
      const res = await archiveLesson(lessonId);
      if (!res.ok) {
        show({ title: labels.deleteError, tone: 'error' });
        return;
      }
      setDone(true);
      show({
        title: labels.deleted,
        tone: 'neutral',
        duration: 8000,
        action: {
          label: labels.undo,
          onClick: () => {
            restoreLesson(lessonId).then(() => router.refresh());
          },
        },
      });
      router.push(`/${locale}/app/teacher/lektioner`);
    });
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={isPending || done}
      className="text-[0.8125rem] font-medium text-red-700 underline underline-offset-2 hover:text-red-800 disabled:opacity-50"
    >
      {labels.delete}
    </button>
  );
}
