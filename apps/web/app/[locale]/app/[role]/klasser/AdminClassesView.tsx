'use client';

import { startTransition, useActionState, useEffect, useRef } from 'react';
import { requestFormReset } from 'react-dom';
import {
  createClass,
  deleteClass,
  type CreateClassState,
  type DeleteClassState,
} from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input } from '@/components/ui/Input';
import type { AdminClassRow } from '@/lib/data/admin';
import type { Dictionary } from '@/lib/i18n/types';

type Labels = Dictionary['app']['pages']['admin']['classes'];

type Props = {
  classes: AdminClassRow[];
  labels: Labels;
};

export function AdminClassesView({ classes, labels }: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {classes.length === 0 ? (
          <EmptyState title={labels.empty} />
        ) : (
          classes.map((cls) => <ClassRow key={cls.id} cls={cls} labels={labels} />)
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.createTitle}</CardTitle>
        </CardHeader>
        <CardBody>
          <CreateClassForm labels={labels} />
        </CardBody>
      </Card>
    </div>
  );
}

function ClassRow({ cls, labels }: { cls: AdminClassRow; labels: Labels }) {
  const [state, formAction, pending] = useActionState<DeleteClassState, FormData>(deleteClass, {
    status: 'idle',
  });

  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-serif text-2xl text-[var(--color-primary)]">{cls.name}</div>
            <div className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {cls.studentsCount} {labels.studentsLabel} · {cls.lessonsCount} {labels.lessonsLabel}
            </div>
          </div>
          <form action={formAction}>
            <input type="hidden" name="class_id" value={cls.id} />
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              {pending ? labels.deleting : labels.delete}
            </Button>
          </form>
        </div>
        {state.status === 'error' ? (
          <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">
            {state.code === 'has-lessons' ? labels.deleteErrorHasLessons : labels.deleteErrorGeneric}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}

function CreateClassForm({ labels }: { labels: Labels }) {
  const [state, formAction, pending] = useActionState<CreateClassState, FormData>(createClass, {
    status: 'idle',
  });
  const formRef = useRef<HTMLFormElement>(null);

  // Admins skapar ofta flera klasser i följd (NA23a, NA23b, NA23c …).
  // React 19 återställer inte formuläret automatiskt när en Server Action
  // landar — utan detta riskerar nästa klass att av misstag återanvända
  // föregående namn.
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
    <form ref={formRef} action={formAction} className="space-y-4">
      <Field id="class-name" label={labels.nameLabel}>
        <Input id="class-name" name="name" type="text" required placeholder="NA23a" />
      </Field>
      <Field id="class-year" label={labels.yearLabel} hint={labels.yearHint}>
        <Input id="class-year" name="year" type="number" min={1} max={12} />
      </Field>
      {state.status === 'success' ? (
        <p role="status" className="text-sm text-[var(--color-success)]">
          {labels.createSuccess}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-[var(--color-error)]">
          {state.code === 'duplicate' ? labels.createErrorDuplicate : labels.createErrorGeneric}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? labels.creating : labels.createSubmit}
      </Button>
    </form>
  );
}
