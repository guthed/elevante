'use client';

import { useMemo, useState } from 'react';
import { createClassTestDraft } from '@/app/actions/class-test';
import { Button } from '@/components/ui/Button';
import type { Locale } from '@/lib/i18n/config';

type ClassOption = {
  id: string;
  name: string;
  lessons: { id: string; title: string | null }[];
};

type Props = {
  classes: ClassOption[];
  locale: Locale;
  labels: {
    title: string;
    pickClass: string;
    pickLessons: string;
    questionCount: string;
    closed: string;
    open: string;
    reasoning: string;
    generate: string;
  };
};

export function ClassTestBuilder({ classes, locale, labels }: Props) {
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [total, setTotal] = useState(8);
  const [closedPct, setClosedPct] = useState(50);
  const [openPct, setOpenPct] = useState(30);
  const [reasoningPct, setReasoningPct] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  const lessons = useMemo(
    () => classes.find((c) => c.id === classId)?.lessons ?? [],
    [classes, classId],
  );

  const counts = useMemo(() => {
    const sum = closedPct + openPct + reasoningPct || 1;
    const raw = {
      closed: (closedPct / sum) * total,
      open: (openPct / sum) * total,
      reasoning: (reasoningPct / sum) * total,
    };
    const floored = {
      closed: Math.floor(raw.closed),
      open: Math.floor(raw.open),
      reasoning: Math.floor(raw.reasoning),
    };
    let rem = total - (floored.closed + floored.open + floored.reasoning);
    const order = (['closed', 'open', 'reasoning'] as Array<keyof typeof floored>).sort(
      (a, b) => raw[b] - floored[b] - (raw[a] - floored[a]),
    );
    for (const k of order) {
      if (rem <= 0) break;
      floored[k] += 1;
      rem -= 1;
    }
    return floored;
  }, [total, closedPct, openPct, reasoningPct]);

  const canSubmit = classId && selectedLessons.length > 0 && !submitting;

  function toggleLesson(id: string) {
    setSelectedLessons((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <form
      action={createClassTestDraft}
      onSubmit={() => setSubmitting(true)}
      className="space-y-8"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="total" value={total} />
      <input type="hidden" name="closed_pct" value={closedPct} />
      <input type="hidden" name="open_pct" value={openPct} />
      <input type="hidden" name="reasoning_pct" value={reasoningPct} />
      {selectedLessons.map((id) => (
        <input key={id} type="hidden" name="lesson_ids" value={id} />
      ))}

      <label className="block">
        <span className="text-sm font-medium">{labels.title}</span>
        <input
          name="title"
          required
          className="mt-1 w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">{labels.pickClass}</span>
        <select
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setSelectedLessons([]);
          }}
          className="mt-1 w-full rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-3 py-2"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-medium">{labels.pickLessons}</legend>
        <div className="mt-2 space-y-2">
          {lessons.map((l) => (
            <label key={l.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedLessons.includes(l.id)}
                onChange={() => toggleLesson(l.id)}
              />
              <span>{l.title ?? l.id}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">
            {labels.questionCount}: {total}
          </span>
          <input
            type="range" min={3} max={20} value={total}
            onChange={(e) => setTotal(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <Slider label={`${labels.closed} (${counts.closed})`} value={closedPct} onChange={setClosedPct} />
        <Slider label={`${labels.open} (${counts.open})`} value={openPct} onChange={setOpenPct} />
        <Slider label={`${labels.reasoning} (${counts.reasoning})`} value={reasoningPct} onChange={setReasoningPct} />
      </div>

      <Button type="submit" disabled={!canSubmit}>
        {labels.generate}
      </Button>
    </form>
  );
}

function Slider({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label} — {value}%</span>
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full"
        aria-label={label}
      />
    </label>
  );
}
