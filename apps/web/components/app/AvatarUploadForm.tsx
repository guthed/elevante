'use client';

import { useActionState, useRef } from 'react';
import { uploadAvatar, removeAvatar, type AvatarState } from '@/app/actions/account';
import { Avatar } from '@/components/ui/Avatar';
import type { Locale } from '@/lib/i18n/config';
import type { Role } from '@/lib/app/roles';
import type { Dictionary } from '@/lib/i18n/types';

type Labels = Dictionary['app']['account'];

type Props = {
  locale: Locale;
  role: Role;
  name: string;
  avatarUrl: string | null;
  labels: Labels;
};

const initialState: AvatarState = { status: 'idle' };

export function AvatarUploadForm({ locale, role, name, avatarUrl, labels }: Props) {
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadAvatar, initialState);
  const [removeState, removeAction, removePending] = useActionState(removeAvatar, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Rensad avatar_url om just den här inloggade rundan tagit bort/laddat
  // upp en ny bild, annars den som kom från servern.
  const currentAvatarUrl =
    uploadState.status === 'success'
      ? uploadState.avatarUrl
      : removeState.status === 'success'
        ? removeState.avatarUrl
        : avatarUrl;

  const uploadError =
    uploadState.status === 'error'
      ? uploadState.code === 'invalid'
        ? labels.avatarErrorInvalid
        : uploadState.code === 'too-large'
          ? labels.avatarErrorTooLarge
          : labels.avatarErrorGeneric
      : null;

  return (
    <div className="flex items-center gap-5">
      <Avatar name={name} size="lg" src={currentAvatarUrl} />
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <form ref={formRef} action={uploadAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="role" value={role} />
            <input
              type="file"
              name="file"
              id="avatar-file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={uploadPending}
              onChange={(e) => {
                if (e.target.files?.length) {
                  formRef.current?.requestSubmit();
                }
              }}
            />
            <label
              htmlFor="avatar-file"
              className="inline-flex cursor-pointer items-center rounded-[12px] border border-[var(--color-sand)] px-4 py-2 text-[0.875rem] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-soft)]"
            >
              {uploadPending
                ? labels.avatarUploading
                : currentAvatarUrl
                  ? labels.avatarReplace
                  : labels.avatarUpload}
            </label>
          </form>
          {currentAvatarUrl ? (
            <form action={removeAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="role" value={role} />
              <button
                type="submit"
                disabled={removePending}
                className="text-[0.875rem] text-[var(--color-error)] underline-offset-4 hover:underline disabled:opacity-50"
              >
                {removePending ? labels.avatarRemoving : labels.avatarRemove}
              </button>
            </form>
          ) : null}
        </div>
        <p className="text-[0.75rem] text-[var(--color-ink-muted)]">{labels.avatarHint}</p>
        {uploadError ? (
          <p role="alert" className="text-[0.8125rem] text-[var(--color-error)]">
            {uploadError}
          </p>
        ) : null}
        {removeState.status === 'error' ? (
          <p role="alert" className="text-[0.8125rem] text-[var(--color-error)]">
            {labels.avatarErrorGeneric}
          </p>
        ) : null}
      </div>
    </div>
  );
}
