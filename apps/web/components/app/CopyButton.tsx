'use client';

import { useState } from 'react';

type Props = {
  text: string;
  labelCopy: string;
  labelCopied: string;
};

export function CopyButton({ text, labelCopy, labelCopied }: Props) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard ej tillgängligt (t.ex. osäker kontext) — tyst no-op.
        }
      }}
      className="inline-flex shrink-0 items-center gap-2 rounded-[10px] border border-[var(--color-sand)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-ink-secondary)] transition-colors hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-ink)]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {copied ? (
          <polyline points="20 6 9 17 4 12" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
      {copied ? labelCopied : labelCopy}
    </button>
  );
}
