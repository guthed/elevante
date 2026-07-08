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

  return (
    <div>
      <h2 className="font-serif text-[clamp(1.5rem,2vw+1rem,2rem)] leading-tight text-[var(--color-ink)]">
        {tr(locale, TRY_COPY.chatTitle)}
      </h2>

      {/* Tom chatt tar ingen plats på mobilen — då kommer textfältet upp direkt.
          aria-live-regionen finns kvar hela tiden så svar annonseras. */}
      <div
        ref={scrollRef}
        aria-live="polite"
        className={
          messages.length > 0 || pending || error
            ? 'mt-6 max-h-[420px] space-y-4 overflow-y-auto rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-5'
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

      {/* Förslags-chips — mobil: horisontell scroll-rad, desktop: radbryter. */}
      {suggestions.some((_, i) => !used.has(i)) ? (
        <div className="mt-4">
          <p className="mb-2 text-[0.8125rem] text-[var(--color-ink-muted)]">
            {tr(locale, TRY_COPY.suggestionsLabel)}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {suggestions.map((s, i) =>
              used.has(i) ? null : (
                <button
                  key={i}
                  type="button"
                  disabled={pending}
                  onClick={() => ask(tr(locale, s), i)}
                  className="shrink-0 whitespace-nowrap rounded-full border border-[var(--color-sand)] px-3.5 py-2 text-[0.8125rem] text-[var(--color-ink)] transition-colors hover:border-[var(--color-ink-muted)] disabled:opacity-40 sm:py-1.5"
                >
                  {tr(locale, s)}
                </button>
              ),
            )}
          </div>
        </div>
      ) : null}

      {/* Inmatning — tydligt upphöjt fält (vit yta + ram + skugga) så det poppar
          mot ivory-canvasen; det är sidans viktigaste interaktion. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="mt-5 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={300}
          placeholder={tr(locale, TRY_COPY.chatPlaceholder)}
          className="flex-1 rounded-full border border-[var(--color-ink-muted)] bg-[var(--color-surface)] px-5 py-4 text-[1rem] text-[var(--color-ink)] shadow-[var(--shadow-soft)] outline-none transition placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)] focus:shadow-[var(--shadow-lift)]"
        />
        <button
          type="submit"
          disabled={pending || input.trim().length < 2}
          className="shrink-0 rounded-full bg-[var(--color-ink)] px-6 py-4 text-[0.9375rem] font-medium text-[var(--color-canvas)] shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:opacity-40"
        >
          {tr(locale, TRY_COPY.send)}
        </button>
      </form>

      {/* Prov-inbjudan visas först när eleven ställt en fråga och fått ett
          svar — chatten ska leda, provet är ett frivilligt nästa steg. */}
      {messages.some((m) => m.role === 'assistant') ? (
        <div className="mt-8 border-t border-[var(--color-sand)] pt-6">
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
