'use client';

import { useActionState } from 'react';
import { sendContact, type ContactState } from '@/app/actions/contact';
import type { Dictionary } from '@/lib/i18n/types';

type FormLabels = Dictionary['contact']['form'];

type Props = {
  labels: FormLabels;
  initialTopic: 'demo' | 'pricing' | 'press' | 'other';
};

const initialState: ContactState = { status: 'idle' };

export function ContactForm({ labels, initialTopic }: Props) {
  const [state, formAction, pending] = useActionState(sendContact, initialState);

  if (state.status === 'success') {
    return (
      <div
        role="status"
        className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success)]/5 p-8 text-center text-[var(--color-primary)]"
      >
        <p className="text-lg">{labels.success}</p>
      </div>
    );
  }

  const errorMessage =
    state.status === 'error'
      ? state.code === 'missing'
        ? labels.errorMissing
        : state.code === 'rate-limit'
          ? labels.errorRateLimit
          : labels.errorGeneric
      : null;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {/* Honeypot — dolt för människor */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <Field id="name" label={labels.nameLabel}>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder={labels.namePlaceholder}
          className={inputClass}
          autoComplete="name"
        />
      </Field>

      <Field id="email" label={labels.emailLabel}>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder={labels.emailPlaceholder}
          className={inputClass}
          autoComplete="email"
        />
      </Field>

      <Field id="school" label={labels.schoolLabel}>
        <input
          id="school"
          name="school"
          type="text"
          required
          placeholder={labels.schoolPlaceholder}
          className={inputClass}
          autoComplete="organization"
        />
      </Field>

      <Field id="topic" label={labels.topicLabel}>
        <select
          id="topic"
          name="topic"
          defaultValue={initialTopic}
          className={inputClass}
        >
          <option value="demo">{labels.topicOptions.demo}</option>
          <option value="pricing">{labels.topicOptions.pricing}</option>
          <option value="press">{labels.topicOptions.press}</option>
          <option value="other">{labels.topicOptions.other}</option>
        </select>
      </Field>

      <Field id="message" label={labels.messageLabel}>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder={labels.messagePlaceholder}
          className={`${inputClass} resize-y`}
        />
      </Field>

      {errorMessage ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-7 py-3.5 text-[1rem] font-medium text-white transition-colors hover:bg-[var(--color-accent-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {pending ? labels.submitting : labels.submit}
      </button>
    </form>
  );
}

const inputClass =
  'w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-primary)] placeholder:text-[var(--color-ink-subtle)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20';

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-[var(--color-primary)]">
        {label}
      </label>
      {children}
    </div>
  );
}
