'use client';

import { useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n/config';
import { TRY_COPY, tr, type L } from '@/lib/try/copy';

type Msg = {
  role: 'user' | 'assistant';
  content: string;
  citation?: { ts: string; quote: string } | null;
};

type Props = {
  locale: Locale;
  lessonIds: string[];
  suggestions: L[];
  onToTest: () => void;
};

export function ChatStep({ locale, lessonIds, suggestions, onToTest }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }),
    );
  }

  async function ask(question: string, suggestionIdx?: number) {
    const q = question.trim();
    if (!q || pending) return;
    setError(null);
    setInput('');
    if (suggestionIdx !== undefined) setUsed((s) => new Set(s).add(suggestionIdx));
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setPending(true);
    scrollDown();

    try {
      const res = await fetch('/api/try/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, lessonIds }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setError(tr(locale, TRY_COPY.rateLimited));
      } else if (!res.ok || data.offline || typeof data.answer !== 'string') {
        setError(tr(locale, TRY_COPY.chatError));
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: data.answer, citation: data.citation ?? null },
        ]);
      }
    } catch {
      setError(tr(locale, TRY_COPY.chatError));
    } finally {
      setPending(false);
      scrollDown();
    }
  }

  const hasConversation = messages.length > 0 || pending || error;

  return (
    <div>
      {/* Upphöjd chatt-panel — samma familj som startsidans hjälte-kort.
          Frågefältet är stjärnan; förslagen är nedtonade till små länkar så de
          aldrig förväxlas med inmatningen. */}
      <div className="rounded-[20px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5 shadow-[0_24px_60px_-24px_rgba(26,26,46,0.16)] sm:p-7">
        {/* Liten identitetsrad — panelen känns som Elevantes chatt, utan att
            konkurrera med hjälte-rubriken (som nu bär hela budskapet). */}
        <div className="mb-4 flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--color-sage-deep)]"
            aria-hidden
          />
          <span className="text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            Elevante
          </span>
        </div>

        {/* Konversationen — ovanför frågefältet (svaret dyker upp ovanför det
            man skriver i, som i en vanlig chatt). aria-live finns alltid. */}
        <div
          ref={scrollRef}
          aria-live="polite"
          className={
            hasConversation
              ? 'mb-5 max-h-[380px] space-y-4 overflow-y-auto border-b border-[var(--color-sand)] pb-5'
              : ''
          }
        >
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <div
                className={[
                  'inline-block max-w-[85%] rounded-[14px] px-4 py-3 text-[0.9375rem] leading-relaxed',
                  m.role === 'user'
                    ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
                    : 'bg-[var(--color-canvas)] text-[var(--color-ink)]',
                ].join(' ')}
              >
                {m.content}
                {m.citation ? (
                  <span className="mt-3 block rounded-[10px] border-l-2 border-[var(--color-sage-deep)] bg-[var(--color-surface)] px-3 py-2 text-left text-[0.8125rem] text-[var(--color-ink-secondary)]">
                    <span className="mb-1 block text-[0.6875rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
                      {tr(locale, TRY_COPY.sourceLabel)} · {m.citation.ts}
                    </span>
                    “{m.citation.quote}”
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {pending ? (
            <p className="text-[0.875rem] italic text-[var(--color-ink-muted)]">
              {tr(locale, TRY_COPY.thinking)}
            </p>
          ) : null}
          {error ? <p className="text-[0.875rem] text-[var(--color-coral)]">{error}</p> : null}
        </div>

        {/* Frågefältet — sidans viktigaste interaktion, tydligt i centrum. */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={300}
            aria-label={tr(locale, TRY_COPY.chatPlaceholder)}
            placeholder={tr(locale, TRY_COPY.chatPlaceholder)}
            className="flex-1 rounded-full border border-[var(--color-ink-muted)] bg-[var(--color-canvas)] px-5 py-4 text-[1rem] text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-ink-secondary)] focus:border-[var(--color-ink)] focus:shadow-[var(--shadow-soft)]"
          />
          <button
            type="submit"
            disabled={pending || input.trim().length < 2}
            className="shrink-0 rounded-full bg-[var(--color-ink)] px-6 py-4 text-[0.9375rem] font-medium text-[var(--color-canvas)] transition hover:opacity-90 disabled:opacity-40"
          >
            {tr(locale, TRY_COPY.send)}
          </button>
        </form>

        {/* Sekundära förslag — små tags, aldrig fält-lika. Mobil: scroll-rad. */}
        {suggestions.some((_, i) => !used.has(i)) ? (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-[0.75rem] text-[var(--color-ink-muted)]">
              {tr(locale, TRY_COPY.suggestionsLabel)}
            </span>
            {suggestions.map((s, i) =>
              used.has(i) ? null : (
                <button
                  key={i}
                  type="button"
                  disabled={pending}
                  onClick={() => ask(tr(locale, s), i)}
                  className="shrink-0 whitespace-nowrap rounded-full bg-[var(--color-canvas)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-ink-secondary)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-40"
                >
                  {tr(locale, s)}
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>

      {/* Prov-inbjudan — under panelen, efter första svaret. */}
      {messages.some((m) => m.role === 'assistant') ? (
        <div className="mt-6">
          <p className="mb-3 text-[0.875rem] text-[var(--color-ink-secondary)]">
            {tr(locale, TRY_COPY.toTestHint)}
          </p>
          <button
            type="button"
            onClick={onToTest}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-ink)] px-6 py-3 text-[0.9375rem] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]"
          >
            {tr(locale, TRY_COPY.toTest)} →
          </button>
        </div>
      ) : null}
    </div>
  );
}
