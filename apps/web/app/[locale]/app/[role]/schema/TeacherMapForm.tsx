'use client';

import { useActionState } from 'react';
import { mapScheduleTeacher, type MapTeacherState } from '@/app/actions/schedule';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import type {
  ScheduleTeacherRow,
  SchoolTeacherOption,
} from '@/lib/data/schedule';
import type { Dictionary } from '@/lib/i18n/types';

type Labels = Dictionary['app']['pages']['admin']['schedule'];

const initialState: MapTeacherState = { status: 'idle' };

function TeacherRow({
  teacher,
  options,
  suggestion,
  labels,
}: {
  teacher: ScheduleTeacherRow;
  options: SchoolTeacherOption[];
  suggestion: string | null;
  labels: Labels;
}) {
  const [state, formAction, pending] = useActionState(mapScheduleTeacher, initialState);
  const suggested = options.find((o) => o.id === suggestion);

  return (
    <tr className="border-b border-[var(--color-border)] last:border-0 align-top">
      <td className="px-4 py-3">
        <span className="font-medium text-[var(--color-primary)]">
          {teacher.displayName}
        </span>
        {!teacher.profileId && suggested ? (
          <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
            {labels.teacherMapSuggestion.replace('{name}', suggested.name)}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-3 text-sm text-[var(--color-ink-muted)]">
        {teacher.timeslotCount}
      </td>
      <td className="px-4 py-3">
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="teacher_map_id" value={teacher.id} />
          <Select
            name="profile_id"
            aria-label={`${labels.teacherMapAccountColumn} — ${teacher.displayName}`}
            defaultValue={teacher.profileId ?? suggestion ?? ''}
            className="min-w-[14rem]"
          >
            <option value="">{labels.teacherMapPlaceholder}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? labels.teacherMapSaving : labels.teacherMapSave}
          </Button>
          {teacher.profileId ? null : (
            <Badge tone="warning">{labels.teacherMapUnmapped}</Badge>
          )}
        </form>
        {state.status === 'success' ? (
          <p role="status" className="mt-1 text-xs text-[var(--color-success)]">
            {labels.teacherMapSaved
              .replace('{slots}', String(state.linkedTimeslots))
              .replace('{courses}', String(state.linkedCourses))}
          </p>
        ) : null}
        {state.status === 'error' ? (
          <p role="alert" className="mt-1 text-xs text-[var(--color-error)]">
            {labels.teacherMapError}
            {state.detail ? ` — ${state.detail}` : ''}
          </p>
        ) : null}
      </td>
    </tr>
  );
}

export function TeacherMapForm({
  teachers,
  options,
  suggestions,
  labels,
}: {
  teachers: ScheduleTeacherRow[];
  options: SchoolTeacherOption[];
  /** externalRef → föreslaget profil-id. Beräknat på servern. */
  suggestions: Record<string, string | null>;
  labels: Labels;
}) {
  if (teachers.length === 0) {
    return (
      <p className="px-6 py-8 text-sm text-[var(--color-ink-muted)]">
        {labels.teacherMapEmpty}
      </p>
    );
  }

  return (
    <div>
      <p className="px-6 pb-4 text-sm text-[var(--color-ink-muted)]">
        {labels.teacherMapHint}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-ink-subtle)]">
            <tr>
              <th className="px-4 py-3">{labels.teacherMapNameColumn}</th>
              <th className="px-4 py-3">{labels.teacherMapSlotsColumn}</th>
              <th className="px-4 py-3">{labels.teacherMapAccountColumn}</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <TeacherRow
                key={teacher.id}
                teacher={teacher}
                options={options}
                suggestion={suggestions[teacher.externalRef] ?? null}
                labels={labels}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
