type Props = {
  summary: string;
};

export function LessonSummary({ summary }: Props) {
  return (
    <section className="rounded-[20px] bg-[var(--color-surface)] p-6 md:p-8">
      <p className="eyebrow mb-3">Sammanfattning</p>
      <p className="font-serif text-[1rem] italic leading-[1.7] text-[var(--color-ink)]">
        {summary}
      </p>
    </section>
  );
}
