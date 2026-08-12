'use client';

import { useActionState, useState } from 'react';
import { massInvite, type MassInviteState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Input';
import { HelpHint } from '@/components/ui/Tooltip';
import type { AdminClassRow } from '@/lib/data/admin';
import type { Dictionary } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  locale: Locale;
  classes: AdminClassRow[];
  labels: Dictionary['app']['pages']['admin']['users']['massInvite'];
};

const initialState: MassInviteState = { status: 'idle' };

export function MassInviteForm({ locale, classes, labels }: Props) {
  const [state, formAction, pending] = useActionState(massInvite, initialState);
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');

  const reasonLabel: Record<string, string> = {
    'invalid-row': labels.reasonInvalidRow,
    'already-exists': labels.reasonAlreadyExists,
    'class-link-failed': labels.reasonClassLinkFailed,
  };

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="mass-invite-role" label={labels.roleLabel}>
          <Select
            id="mass-invite-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
          >
            <option value="student">{labels.roleStudent}</option>
            <option value="teacher">{labels.roleTeacher}</option>
            <option value="admin">{labels.roleAdmin}</option>
          </Select>
        </Field>
        {role === 'student' ? (
          <Field id="mass-invite-class" label={labels.classLabel}>
            <Select id="mass-invite-class" name="class_id" required>
              <option value="">{labels.classPlaceholder}</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <Field
        id="mass-invite-entries"
        label={
          <>
            {labels.entriesLabel}
            <HelpHint label={labels.entriesHint} />
          </>
        }
        hint={labels.entriesFormatHint}
      >
        <textarea
          id="mass-invite-entries"
          name="entries"
          required
          rows={6}
          placeholder={labels.entriesPlaceholder}
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-primary)] placeholder:text-[var(--color-ink-subtle)] transition-colors focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
      </Field>

      {state.status === 'success' ? (
        <div role="status" className="space-y-2 text-sm">
          <p className="text-[var(--color-success)]">
            {labels.successCount.replace('{count}', String(state.invited))}
          </p>
          {state.skipped.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-[var(--color-error)]">
              {state.skipped.map((row, index) => (
                <li key={`${row.email}-${index}`}>
                  {row.email} — {reasonLabel[row.reason] ?? labels.reasonGeneric}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {labels.errorGeneric}
          {state.detail ? ` — ${state.detail}` : ''}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? labels.sending : labels.submit}
      </Button>
    </form>
  );
}
