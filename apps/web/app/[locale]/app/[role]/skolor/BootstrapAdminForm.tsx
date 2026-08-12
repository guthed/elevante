'use client';

import { useActionState, useEffect } from 'react';
import { inviteUser, type InviteUserState } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import type { Dictionary } from '@/lib/i18n/types';
import type { Locale } from '@/lib/i18n/config';

type Props = {
  schoolId: string;
  locale: Locale;
  labels: Dictionary['app']['pages']['admin']['schools']['bootstrapAdmin'];
};

const initialState: InviteUserState = { status: 'idle' };

export function BootstrapAdminForm({ schoolId, locale, labels }: Props) {
  const [state, formAction, pending] = useActionState(inviteUser, initialState);
  const { show } = useToast();

  // Framgångsmeddelandet nedan hinner ofta aldrig målas: inviteUser
  // revaliderar /admin/skolor, adminCount går 0 → 1, och page.tsx slutar
  // rendera denna komponent i samma uppdatering som skulle visat texten.
  // Toasten överlever att trädet monteras ur och blir den pålitliga kanalen;
  // inline-meddelandet nedan får stå kvar som en ofarlig fallback för de
  // (sällsynta) fall revalideringen dröjer.
  useEffect(() => {
    if (state.status === 'success') {
      show({ title: labels.success.replace('{email}', state.email), tone: 'success' });
    }
  }, [state, labels.success, show]);

  if (state.status === 'success') {
    return (
      <p role="status" className="text-sm text-[var(--color-success)]">
        {labels.success.replace('{email}', state.email)}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
      <input type="hidden" name="school_id" value={schoolId} />
      <input type="hidden" name="role" value="admin" />
      <input type="hidden" name="locale" value={locale} />
      <p className="text-sm font-medium text-[var(--color-primary)]">{labels.heading}</p>
      <Field id={`bootstrap-name-${schoolId}`} label={labels.nameLabel}>
        <Input id={`bootstrap-name-${schoolId}`} name="full_name" type="text" required />
      </Field>
      <Field id={`bootstrap-email-${schoolId}`} label={labels.emailLabel}>
        <Input id={`bootstrap-email-${schoolId}`} name="email" type="email" required />
      </Field>
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {state.code === 'already-exists' ? labels.errorExists : labels.errorGeneric}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? labels.sending : labels.submit}
      </Button>
    </form>
  );
}
