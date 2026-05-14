import Link from 'next/link';
import type { Locale } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/types';
import type { LessonDetail, LessonInsight } from '@/lib/data/teacher';
import { MaterialList } from '@/app/[locale]/app/[role]/lektioner/[id]/MaterialList';
import { MaterialUploadForm } from '@/app/[locale]/app/[role]/lektioner/[id]/MaterialUploadForm';
import { InsightHeatmap } from '@/components/app/teacher/InsightHeatmap';

// Editorial Calm — Stitch screen 11 + 12 (Lärare Lektionsdetalj + Material upload)

type Props = {
  locale: Locale;
  lesson: LessonDetail;
  dict: Dictionary;
  insight: LessonInsight | null;
  aiInsight: string;
};

function statusDotClass(status: LessonDetail['status']): string {
  if (status === 'ready') return 'status-dot status-dot--sage';
  if (status === 'processing') return 'status-dot status-dot--sand';
  if (status === 'failed') return 'status-dot status-dot--coral';
  return 'status-dot status-dot--sand';
}

function statusLabel(status: LessonDetail['status'], dict: Dictionary): string {
  const map = dict.app.pages.teacher.statuses;
  return map[status as keyof typeof map] ?? status;
}

function wordCount(text: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}

function transcriptSize(text: string | null): string {
  if (!text) return '—';
  const bytes = new Blob([text]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function TeacherLessonDetail({ locale, lesson, dict, insight, aiInsight }: Props) {
  const sv = locale === 'sv';
  const labels = dict.app.pages.teacher.lessonDetail;
  const base = `/${locale}/app/teacher`;

  const recordedLabel = lesson.recordedAt
    ? new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(lesson.recordedAt))
    : labels.notRecorded;

  return (
    <div className="container-wide py-10 md:py-14">
      {/* Breadcrumb */}
      <nav className="mb-8 text-[0.8125rem] text-[var(--color-ink-muted)]">
        <Link href={`${base}/lektioner`} className="hover:text-[var(--color-ink)]">
          {sv ? 'Lektioner' : 'Lessons'}
        </Link>
        <span className="px-2 text-[var(--color-sand-strong)]">/</span>
        {lesson.course?.name ? (
          <span className="text-[var(--color-ink-secondary)]">
            {lesson.course.name}
          </span>
        ) : null}
        <span className="px-2 text-[var(--color-sand-strong)]">/</span>
        <span className="text-[var(--color-ink-secondary)]">
          {lesson.title ?? lesson.id}
        </span>
      </nav>

      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <span className={statusDotClass(lesson.status)} aria-hidden="true" />
          <span className="text-[0.8125rem] uppercase tracking-[0.1em] text-[var(--color-ink-secondary)]">
            {statusLabel(lesson.status, dict)}
          </span>
        </div>
        <h1 className="mt-3 font-serif text-[clamp(2rem,3.5vw+1rem,3rem)] leading-tight text-[var(--color-ink)]">
          {lesson.title ?? lesson.course?.name ?? lesson.id}
        </h1>
        <p className="mt-3 text-[0.9375rem] text-[var(--color-ink-secondary)]">
          {[lesson.course?.name, lesson.class?.name, recordedLabel]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {/* Quick stats — 4 inline */}
        <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 border-t border-[var(--color-sand)] pt-8 md:grid-cols-4">
          <QuickStat
            number={lesson.materials.length}
            label={sv ? 'Material' : 'Materials'}
          />
          <QuickStat
            number={wordCount(lesson.transcriptText)}
            label={sv ? 'Ord i transkript' : 'Words in transcript'}
          />
          <QuickStat
            text={transcriptSize(lesson.transcriptText)}
            label={sv ? 'Storlek' : 'Size'}
          />
          <QuickStat
            text={lesson.teacher?.full_name ?? '—'}
            label={sv ? 'Lärare' : 'Teacher'}
          />
        </dl>
      </header>

      {/* 2-col layout */}
      <div className="mt-10 grid gap-10 md:grid-cols-12">
        {/* LEFT — Transcript (65%) */}
        <div className="md:col-span-8">
          <p className="eyebrow mb-4">{labels.transcriptHeading}</p>
          <article className="rounded-[20px] bg-[var(--color-surface)] p-6 md:p-8">
            {lesson.status === 'ready' && lesson.transcriptText ? (
              <pre className="whitespace-pre-wrap font-mono text-[0.875rem] leading-[1.7] text-[var(--color-ink)]">
                {lesson.transcriptText}
              </pre>
            ) : (
              <div className="rounded-[12px] border border-dashed border-[var(--color-sand)] p-8 text-center">
                <p className="font-serif text-[1rem] text-[var(--color-ink)]">
                  {labels[
                    `transcript${capitalize(lesson.status)}` as
                      | 'transcriptPending'
                      | 'transcriptProcessing'
                      | 'transcriptReady'
                      | 'transcriptFailed'
                  ]}
                </p>
                <p className="mt-2 text-[0.875rem] text-[var(--color-ink-muted)]">
                  {labels.transcriptComingSoon}
                </p>
              </div>
            )}
          </article>
        </div>

        {/* RIGHT — Material + upload zone (35%) */}
        <aside className="space-y-6 md:col-span-4">
          {/* Material card */}
          <div className="rounded-[20px] bg-[var(--color-surface)] p-6">
            <h2 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
              {labels.materialsHeading}
            </h2>
            <div className="mt-4">
              <MaterialList
                materials={lesson.materials}
                emptyText={labels.materialsEmpty}
              />
            </div>
            <div className="mt-6 border-t border-[var(--color-sand)] pt-6">
              <p className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                {sv ? 'Ladda upp nytt' : 'Upload new'}
              </p>
              <div className="mt-3">
                <MaterialUploadForm lessonId={lesson.id} labels={labels} />
              </div>
            </div>
          </div>

        </aside>
      </div>

      {/* Insikt — full-bredd heatmap under transcript-layouten */}
      {insight && (
        <section className="mt-14">
          <InsightHeatmap insight={insight} aiInsight={aiInsight} />
        </section>
      )}
    </div>
  );
}

function QuickStat({
  number,
  text,
  label,
}: {
  number?: number;
  text?: string;
  label: string;
}) {
  return (
    <div>
      <dt className="text-[0.75rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="mt-1.5 font-serif text-[1.5rem] leading-tight text-[var(--color-ink)] tabular-nums">
        {number !== undefined ? number : text}
      </dd>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
