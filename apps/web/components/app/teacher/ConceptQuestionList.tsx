import type { LessonInsightStudent } from '@/lib/data/teacher';

type Props = {
  concept: string;
  students: LessonInsightStudent[];
  onClose: () => void;
};

export function ConceptQuestionList({ concept, students, onClose }: Props) {
  const rows = students
    .flatMap((s) =>
      s.questions
        .filter((q) => q.concepts.includes(concept))
        .map((q) => ({ studentName: s.fullName, ...q })),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const uniqueStudents = new Set(rows.map((r) => r.studentName)).size;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--color-sand)] bg-[var(--color-surface)] px-6 py-4">
        <div>
          <p className="eyebrow">Koncept</p>
          <h2 className="mt-1 font-serif text-[1.25rem] text-[var(--color-ink)]">
            {concept}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Stäng"
          className="rounded-full p-2 text-[var(--color-ink-muted)] hover:bg-[var(--color-sand)]"
        >
          ✕
        </button>
      </div>

      <div className="px-6 py-6">
        <p className="mb-4 text-[0.8125rem] text-[var(--color-ink-muted)]">
          {rows.length === 0
            ? 'Inga frågor om detta koncept ännu.'
            : `${rows.length} fråg${rows.length === 1 ? 'a' : 'or'} från ${uniqueStudents} elev${uniqueStudents === 1 ? '' : 'er'}`}
        </p>

        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="border-l-2 border-[var(--color-sand)] pl-3">
              <p className="text-[0.875rem] italic leading-relaxed text-[var(--color-ink)]">
                &ldquo;{row.content}&rdquo;
              </p>
              <p className="mt-1 text-[0.75rem] text-[var(--color-ink-muted)]">
                {row.studentName} ·{' '}
                {new Date(row.createdAt).toLocaleDateString('sv-SE', {
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
