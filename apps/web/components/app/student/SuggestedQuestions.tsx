import { startLessonChat } from '@/app/actions/chat';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  locale: Locale;
  lessonId: string;
  questions: string[];
};

export function SuggestedQuestions({ locale, lessonId, questions }: Props) {
  if (questions.length === 0) return null;

  return (
    <section>
      <p className="eyebrow mb-3">Kom igång</p>
      <div className="flex flex-col gap-2">
        {questions.map((q, idx) => (
          <form key={idx} action={startLessonChat}>
            <input type="hidden" name="lesson_id" value={lessonId} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="question" value={q} />
            <button
              type="submit"
              className="w-full rounded-[12px] bg-[var(--color-sand)] px-4 py-3 text-left text-[0.9375rem] text-[var(--color-ink)] transition-all duration-150 hover:bg-[var(--color-sand-strong)]"
            >
              <span aria-hidden="true">→ </span>{q}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}
