import type { LessonInsightStudent } from '@/lib/data/teacher';

type Props = {
  student: LessonInsightStudent;
  concepts: string[];
  aiInsight: string;
  onClose: () => void;
};

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'nu';
  if (hours < 24) return `${hours}h sen`;
  const days = Math.floor(hours / 24);
  return `${days}d sen`;
}

function barColor(count: number): string {
  if (count >= 3) return 'var(--color-coral)';
  if (count >= 1) return 'var(--color-sand-strong)';
  return 'var(--color-sage)';
}

function barWidth(count: number, max: number): number {
  if (max === 0) return 0;
  return Math.max(8, (count / max) * 100);
}

export function StudentProfileCard({ student, concepts, aiInsight, onClose }: Props) {
  const maxCount = Math.max(1, ...concepts.map((c) => student.conceptQuestionCounts[c] ?? 0));
  const recentQuestions = [...student.questions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between border-b border-[var(--color-sand)] bg-[var(--color-surface)] px-6 py-4">
        <div>
          <h2 className="font-serif text-[1.25rem] text-[var(--color-ink)]">
            {student.fullName}
          </h2>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-muted)]">
            NA1A · Biologi 1
          </p>
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

      <div className="grid grid-cols-3 gap-2 border-b border-[var(--color-sand)] px-6 py-6">
        <Stat number={student.totalQuestions} label="frågor" />
        <Stat number={student.viewCount} label="visningar" />
        <Stat text={timeAgo(student.lastViewedAt)} label="senast" />
      </div>

      <div className="border-b border-[var(--color-sand)] px-6 py-6">
        <p className="eyebrow mb-4">Koncept-förståelse</p>
        <div className="space-y-3">
          {concepts.map((c) => {
            const count = student.conceptQuestionCounts[c] ?? 0;
            return (
              <div key={c} className="grid grid-cols-[100px_1fr_30px] items-center gap-3 text-[0.8125rem]">
                <span className={count === 0 ? 'text-[var(--color-ink-muted)]' : 'text-[var(--color-ink)]'}>
                  {c}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-sand)]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${barWidth(count, maxCount)}%`,
                      background: count === 0 ? 'transparent' : barColor(count),
                    }}
                  />
                </div>
                <span className="text-right text-[0.75rem] text-[var(--color-ink-muted)] tabular-nums">
                  {count === 0 ? '—' : `${count} fr`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-b border-[var(--color-sand)] px-6 py-6">
        <p className="eyebrow mb-4">Senaste frågor</p>
        {recentQuestions.length === 0 ? (
          <p className="text-[0.875rem] italic text-[var(--color-ink-muted)]">
            Inga frågor ännu.
          </p>
        ) : (
          <ul className="space-y-3">
            {recentQuestions.map((q) => (
              <li
                key={q.id}
                className="border-l-2 border-[var(--color-sand)] pl-3 text-[0.875rem] italic text-[var(--color-ink-secondary)]"
              >
                &ldquo;{q.content}&rdquo;
              </li>
            ))}
          </ul>
        )}
      </div>

      {aiInsight && (
        <div className="px-6 py-6">
          <div className="rounded-[12px] border-l-2 border-[var(--color-sand-strong)] bg-[var(--color-surface)] p-4 text-[0.875rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
            {aiInsight}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  number,
  text,
  label,
}: {
  number?: number;
  text?: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="font-serif text-[1.5rem] leading-none text-[var(--color-ink)] tabular-nums">
        {number !== undefined ? number : text}
      </div>
      <div className="mt-1 text-[0.625rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
        {label}
      </div>
    </div>
  );
}
