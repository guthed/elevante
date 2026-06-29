'use client';

import { useRef, useState } from 'react';
import { t, type Lang } from '@/app/investerare/content';
import {
  DEMO_SEED,
  DEMO_SUGGESTIONS,
  DEMO_SUBJECT,
  DEMO_LESSON_TITLE,
  CHAT_UI,
} from '@/app/investerare/demo-transcript';

// Runtime-meddelande (upplöst till aktuellt språk). Live-svar kommer redan som strängar.
type Msg = { role: 'user' | 'assistant'; content: string; citation?: { ts: string; quote: string } };

export default function InvestorChatDemo({ lang }: { lang: Lang }) {
  const [messages, setMessages] = useState<Msg[]>(() =>
    DEMO_SEED.map((m) => ({
      role: m.role,
      content: t(lang, m.content),
      citation: m.citation ? { ts: m.citation.ts, quote: t(lang, m.citation.quote) } : undefined,
    })),
  );
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setError(false);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setPending(true);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }),
    );

    try {
      const res = await fetch('/api/investerare/demo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok || data.offline || typeof data.answer !== 'string') {
        setError(true);
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: data.answer, citation: data.citation ?? undefined },
        ]);
      }
    } catch {
      setError(true);
    } finally {
      setPending(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }),
      );
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-canvas shadow-lift">
      {/* Produktfönster-chrome */}
      <div className="flex items-center gap-2 border-b border-ink/10 px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-coral/70" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-sand-strong" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-sage" aria-hidden />
        <span className="eyebrow ml-2">{t(lang, CHAT_UI.chrome)}</span>
        <span className="eyebrow ml-auto flex items-center gap-1.5 text-coral-deep">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden />
          {t(lang, CHAT_UI.badge)}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        {/* Ämnesbanner — tydligt vilket ämne */}
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{t(lang, CHAT_UI.subjectLabel)}: {t(lang, DEMO_SUBJECT)}</span>
          {' · '}
          {t(lang, DEMO_LESSON_TITLE)}
        </p>
        <p className="mt-2 text-sm text-ink-secondary">{t(lang, CHAT_UI.lede)}</p>

        {/* Konversation */}
        <div
          ref={scrollRef}
          className="mt-4 flex max-h-80 flex-col gap-3 overflow-y-auto pr-1"
          aria-live="polite"
        >
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <span className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-canvas">
                  {m.content}
                </span>
              </div>
            ) : (
              <div key={i} className="flex flex-col items-start gap-2">
                <span className="max-w-[92%] rounded-2xl rounded-bl-sm bg-surface px-4 py-3 text-sm leading-relaxed text-ink shadow-soft">
                  {m.content}
                </span>
                {m.citation && (
                  <div className="max-w-[92%] rounded-lg border-l-2 border-coral bg-surface px-3.5 py-2">
                    <p className="eyebrow text-ink-muted">
                      {t(lang, CHAT_UI.sourceLabel)} · {m.citation.ts}
                    </p>
                    <p className="mt-1 text-xs italic leading-relaxed text-ink-secondary">
                      &ldquo;{m.citation.quote}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ),
          )}

          {pending && (
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
              {t(lang, CHAT_UI.thinking)}
            </div>
          )}

          {error && (
            <p className="text-sm text-coral-deep">{t(lang, CHAT_UI.error)}</p>
          )}
        </div>

        {/* Inmatning */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="mt-4 flex items-center gap-2"
        >
          <label htmlFor="demo-chat-input" className="sr-only">
            {t(lang, CHAT_UI.placeholder)}
          </label>
          <input
            id="demo-chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t(lang, CHAT_UI.placeholder)}
            maxLength={300}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full border border-ink/15 bg-surface px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-coral"
          />
          <button
            type="submit"
            disabled={pending || input.trim().length < 2}
            className="flex-none rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {t(lang, CHAT_UI.send)}
          </button>
        </form>

        {/* Förslag */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-muted">{t(lang, CHAT_UI.suggestionsLabel)}</span>
          {DEMO_SUGGESTIONS.map((s) => {
            const text = t(lang, s);
            return (
              <button
                key={text}
                type="button"
                onClick={() => ask(text)}
                disabled={pending}
                className="rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink-secondary transition-colors hover:border-coral hover:text-ink disabled:opacity-40"
              >
                {text}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-ink-muted">{t(lang, CHAT_UI.note)}</p>
      </div>
    </div>
  );
}
