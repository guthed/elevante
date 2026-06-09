'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { updateTranscript, clearTranscript } from '@/app/actions/transcript';
import type { Dictionary } from '@/lib/i18n/types';

type Labels = Dictionary['app']['pages']['teacher']['lessonDetail'];

type Props = {
  lessonId: string;
  initialText: string;
  labels: Labels;
};

/** Startindex för alla (case-insensitive) förekomster av query i text. */
function findMatches(text: string, query: string): number[] {
  if (!query) return [];
  const out: number[] = [];
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    out.push(i);
    i = haystack.indexOf(needle, i + needle.length);
  }
  return out;
}

export function TranscriptEditor({ lessonId, initialText, labels }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [draft, setDraft] = useState(initialText);
  const [query, setQuery] = useState('');
  const [activeMatch, setActiveMatch] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const activeRef = useRef<HTMLElement | null>(null);

  const matches = useMemo(() => findMatches(initialText, query), [initialText, query]);
  const total = matches.length;

  // Håll activeMatch inom intervallet när träffmängden ändras.
  useEffect(() => {
    setActiveMatch((prev) => (total === 0 ? 0 : Math.min(prev, total - 1)));
  }, [total]);

  // Scrolla aktiv träff in i vyn.
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeMatch, query]);

  function gotoMatch(delta: number) {
    if (total === 0) return;
    setActiveMatch((prev) => (prev + delta + total) % total);
  }

  function handleSave() {
    setMessage(null);
    const next = draft.trim();
    if (!next) {
      setMessage({ kind: 'error', text: labels.editEmptyError });
      return;
    }
    startTransition(async () => {
      const res = await updateTranscript(lessonId, next);
      if (res.ok) {
        setMode('read');
        setMessage({ kind: 'ok', text: labels.saveSuccess });
        router.refresh();
      } else {
        setMessage({ kind: 'error', text: labels.saveError });
      }
    });
  }

  function handleClear() {
    setMessage(null);
    startTransition(async () => {
      const res = await clearTranscript(lessonId);
      setConfirmOpen(false);
      if (res.ok) {
        setMessage({ kind: 'ok', text: labels.clearSuccess });
        router.refresh();
      } else {
        setMessage({ kind: 'error', text: labels.saveError });
      }
    });
  }

  // Renderad läslägestext med markerade träffar.
  let body: ReactNode;
  if (total === 0) {
    body = initialText;
  } else {
    const nodes: ReactNode[] = [];
    let cursor = 0;
    matches.forEach((start, idx) => {
      const end = start + query.length;
      if (start > cursor) nodes.push(initialText.slice(cursor, start));
      const isActive = idx === activeMatch;
      nodes.push(
        <mark
          key={idx}
          ref={isActive ? (el) => { activeRef.current = el; } : undefined}
          className={
            isActive
              ? 'rounded-sm bg-[var(--color-coral)] text-white'
              : 'rounded-sm bg-[var(--color-coral)]/30 text-[var(--color-ink)]'
          }
        >
          {initialText.slice(start, end)}
        </mark>,
      );
      cursor = end;
    });
    if (cursor < initialText.length) nodes.push(initialText.slice(cursor));
    body = nodes;
  }

  return (
    <div>
      {/* Verktygsrad */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {mode === 'read' && (
          <div className="flex flex-1 items-center gap-2">
            <label className="sr-only" htmlFor="transcript-search">
              {labels.searchPlaceholder}
            </label>
            <input
              id="transcript-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.searchPlaceholder}
              className="w-full max-w-xs rounded-full border border-[var(--color-sand)] bg-[var(--color-surface)] px-4 py-2 text-[0.875rem] text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none"
            />
            {query && (
              <div className="flex items-center gap-1 text-[0.8125rem] text-[var(--color-ink-muted)]">
                <span aria-live="polite" className="tabular-nums">
                  {total === 0 ? labels.searchNoMatches : `${activeMatch + 1}/${total}`}
                </span>
                <button
                  type="button"
                  onClick={() => gotoMatch(-1)}
                  disabled={total === 0}
                  aria-label={labels.searchPrev}
                  className="rounded-full px-2 py-1 hover:bg-[var(--color-sand)] disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => gotoMatch(1)}
                  disabled={total === 0}
                  aria-label={labels.searchNext}
                  className="rounded-full px-2 py-1 hover:bg-[var(--color-sand)] disabled:opacity-40"
                >
                  ↓
                </button>
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {mode === 'read' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setDraft(initialText); setMode('edit'); setMessage(null); }}>
                {labels.editTranscript}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
                {labels.clearTranscript}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setMode('read'); setMessage(null); }} disabled={pending}>
                {labels.editCancel}
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={pending}>
                {pending ? labels.editSaving : labels.editSave}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status-/felmeddelande */}
      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={
            message.kind === 'error'
              ? 'mb-4 text-[0.875rem] text-[var(--color-coral)]'
              : 'mb-4 text-[0.875rem] text-[var(--color-ink-muted)]'
          }
        >
          {message.text}
        </p>
      )}

      {/* Transkript */}
      {mode === 'read' ? (
        <pre className="whitespace-pre-wrap font-mono text-[0.875rem] leading-[1.7] text-[var(--color-ink)]">
          {body}
        </pre>
      ) : (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={pending}
          rows={24}
          aria-label={labels.transcriptHeading}
          className="w-full resize-y rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-4 font-mono text-[0.875rem] leading-[1.7] text-[var(--color-ink)] focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
        />
      )}

      {/* Bekräftelse för töm */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={labels.clearConfirmTitle}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} disabled={pending}>
              {labels.clearConfirmCancel}
            </Button>
            <Button variant="danger" size="sm" onClick={handleClear} disabled={pending}>
              {labels.clearConfirmAction}
            </Button>
          </>
        }
      >
        <p className="text-[0.9375rem] text-[var(--color-ink-secondary)]">
          {labels.clearConfirmBody}
        </p>
      </Modal>
    </div>
  );
}
