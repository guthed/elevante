'use client';

import { useState } from 'react';
import type { LessonInsight, LessonInsightStudent } from '@/lib/data/teacher';
import { InsightDrawer } from './InsightDrawer';
import { StudentProfileCard } from './StudentProfileCard';
import { ConceptQuestionList } from './ConceptQuestionList';

type Props = {
  insight: LessonInsight;
  aiInsight: string;
};

type DrawerState =
  | { type: 'closed' }
  | { type: 'student'; student: LessonInsightStudent }
  | { type: 'concept'; concept: string };

function cellColor(student: LessonInsightStudent, concept: string): string {
  if (!student.hasViewed) return 'var(--color-sand)';
  const count = student.conceptQuestionCounts[concept] ?? 0;
  if (count >= 3) return 'var(--color-coral)';
  if (count >= 1) return 'var(--color-sand-strong)';
  if (student.totalQuestions > 0) return 'var(--color-sage)';
  return 'var(--color-surface)';
}

function cellBorder(student: LessonInsightStudent): string {
  if (!student.hasViewed) return '1px dashed var(--color-sand-strong)';
  return '1px solid transparent';
}

export function InsightHeatmap({ insight, aiInsight }: Props) {
  const [drawer, setDrawer] = useState<DrawerState>({ type: 'closed' });

  if (insight.concepts.length === 0) {
    return (
      <div className="rounded-[20px] border border-[var(--color-sand)] p-6">
        <p className="eyebrow mb-2">Insikt</p>
        <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
          Koncept har inte extraherats för denna lektion ännu.
        </p>
      </div>
    );
  }

  return (
    <section>
      <p className="eyebrow mb-4">Förståelse-karta · {insight.students.length} elever</p>

      <div className="overflow-x-auto rounded-[20px] bg-[var(--color-surface)] p-6">
        <div
          className="grid gap-1 text-[0.75rem]"
          style={{
            gridTemplateColumns: `120px repeat(${insight.concepts.length}, minmax(70px, 1fr))`,
          }}
        >
          <div />
          {insight.concepts.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDrawer({ type: 'concept', concept: c })}
              className="text-center text-[0.75rem] text-[var(--color-ink-secondary)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
            >
              {c}
            </button>
          ))}

          {insight.students.map((s) => (
            <Row
              key={s.id}
              student={s}
              concepts={insight.concepts}
              onClick={() => setDrawer({ type: 'student', student: s })}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.75rem] text-[var(--color-ink-muted)]">
        <Legend color="var(--color-coral)" label="3+ frågor" />
        <Legend color="var(--color-sand-strong)" label="1-2 frågor" />
        <Legend color="var(--color-sage)" label="Öppnat utan att fråga" />
        <Legend color="var(--color-surface)" label="Inget engagemang" border />
        <Legend color="var(--color-sand)" label="Ej öppnat" dashed />
      </div>

      {aiInsight && (
        <div className="mt-6 rounded-[12px] border-l-2 border-[var(--color-coral)] bg-[var(--color-surface)] p-4 text-[0.875rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
          {aiInsight}
        </div>
      )}

      <InsightDrawer
        open={drawer.type === 'student'}
        onClose={() => setDrawer({ type: 'closed' })}
        title="Elev"
      >
        {drawer.type === 'student' && (
          <StudentProfileCard
            student={drawer.student}
            concepts={insight.concepts}
            aiInsight={buildStudentInsightText(drawer.student)}
            onClose={() => setDrawer({ type: 'closed' })}
          />
        )}
      </InsightDrawer>

      <InsightDrawer
        open={drawer.type === 'concept'}
        onClose={() => setDrawer({ type: 'closed' })}
        title="Koncept"
      >
        {drawer.type === 'concept' && (
          <ConceptQuestionList
            concept={drawer.concept}
            students={insight.students}
            onClose={() => setDrawer({ type: 'closed' })}
          />
        )}
      </InsightDrawer>
    </section>
  );
}

function buildStudentInsightText(student: LessonInsightStudent): string {
  if (!student.hasViewed) {
    return `${student.fullName} har inte öppnat lektionen ännu.`;
  }
  if (student.totalQuestions === 0) {
    return `${student.fullName} har öppnat lektionen men ställt inga frågor.`;
  }
  const top = Object.entries(student.conceptQuestionCounts).sort(([, a], [, b]) => b - a)[0];
  if (top && top[1] >= 2) {
    return `${student.fullName} har fastnat på ${top[0]} (${top[1]} frågor).`;
  }
  return `${student.fullName} är engagerad — ${student.totalQuestions} frågor totalt.`;
}

function Row({
  student,
  concepts,
  onClick,
}: {
  student: LessonInsightStudent;
  concepts: string[];
  onClick: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="truncate text-left text-[0.8125rem] text-[var(--color-ink)] underline-offset-2 hover:underline"
      >
        {student.fullName}
      </button>
      {concepts.map((c) => (
        <button
          key={c}
          type="button"
          onClick={onClick}
          aria-label={`${student.fullName}: ${c}, ${student.conceptQuestionCounts[c] ?? 0} frågor`}
          className="aspect-[2/1] min-h-[22px] rounded-sm transition-transform hover:scale-105"
          style={{
            background: cellColor(student, c),
            border: cellBorder(student),
          }}
        />
      ))}
    </>
  );
}

function Legend({
  color,
  label,
  border,
  dashed,
}: {
  color: string;
  label: string;
  border?: boolean;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{
          background: color,
          border: border
            ? '1px solid var(--color-sand)'
            : dashed
              ? '1px dashed var(--color-sand-strong)'
              : 'none',
        }}
      />
      {label}
    </span>
  );
}
