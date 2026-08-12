'use client';

import { startTransition, useActionState, useEffect, useRef } from 'react';
import { requestFormReset } from 'react-dom';
import { inviteUser, type InviteUserState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  schoolId: string;
  locale: Locale;
  labels: Dictionary['app']['pages']['admin']['users']['invite'];
};

const initialState: InviteUserState = { status: 'idle' };

export function InviteUserForm({ schoolId, locale, labels }: Props) {
  const [state, formAction, pending] = useActionState(inviteUser, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Admins bjuder ofta in flera personer i följd. React 19 återställer
  // inte formuläret automatiskt när en Server Action landar — utan detta
  // riskerar nästa invite att av misstag återanvända föregående e-post
  // (t.ex. nytt namn skrivs in men gamla e-postfältet glöms).
  //
  // requestFormReset måste köras inuti en transition/action — annars
  // loggar React 19.2 "requestFormReset was called outside a transition
  // or action" (verifierat mot react-dom-client.development.js). Vår
  // useEffect körs efter att Server Action-transitionen redan avslutats,
  // så vi öppnar en egen med startTransition.
  useEffect(() => {
    if (state.status !== 'success') return;
    const form = formRef.current;
    if (!form) return;
    startTransition(() => {
      requestFormReset(form);
    });
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
    >
      <input type="hidden" name="school_id" value={schoolId} />
      <input type="hidden" name="locale" value={locale} />
      <Field id="invite-name" label={labels.nameLabel}>
        <Input id="invite-name" name="full_name" type="text" required />
      </Field>
      <Field id="invite-email" label={labels.emailLabel}>
        <Input id="invite-email" name="email" type="email" required />
      </Field>
      <Field id="invite-role" label={labels.roleLabel}>
        <Select id="invite-role" name="role" defaultValue="student">
          <option value="student">{labels.roleStudent}</option>
          <option value="teacher">{labels.roleTeacher}</option>
          <option value="admin">{labels.roleAdmin}</option>
        </Select>
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? labels.sending : labels.submit}
      </Button>
      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)] sm:col-span-4">
          {labels.success.replace('{email}', state.email)}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)] sm:col-span-4">
          {state.code === 'already-exists' ? labels.errorExists : labels.errorGeneric}
        </p>
      ) : null}
    </form>
  );
}
