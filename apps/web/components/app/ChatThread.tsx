'use client';

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendMessage, type SendMessageState } from '@/app/actions/chat';
import { Textarea } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';

// Editorial Calm — Stitch screen 03 (chat active)
// Användar-meddelande = ink-bubbla höger. AI-svar = text på canvas (ingen bubbla).
// Under svaret: citat-kort med faktiska utdrag ur transcripten, inte döda pillar.

type Source = {
  lesson_id: string;
  lesson_title: string | null;
  excerpt: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[];
  created_at: string;
};

type Props = {
  chatId: string;
  initialMessages: Message[];
  labels: Dictionary['app']['pages']['student']['chat'];
  userName: string;
};

const initialState: SendMessageState = { status: 'idle' };

/**
 * Chatten strömmar svaret via /api/chat/stream — Claude-anropet tar ~16s och
 * utan streaming stod det bara "Skickar…" hela tiden. Nu syns första ordet
 * efter ~1–2s.
 *
 * Server Action `sendMessage` finns kvar som `action` på formuläret: utan
 * JavaScript submittar formuläret som vanligt och får ett (långsamt) svar.
 * Med JavaScript tar onSubmit över och preventDefault stoppar action:en.
 */
export function ChatThread({ chatId, initialMessages, labels }: Props) {
  const [state, formAction, pending] = useActionState(sendMessage, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Meddelanden som tillkommit i den här sessionen (initialMessages kommer från servern).
  const [extra, setExtra] = useState<Message[]>([]);
  const [streamText, setStreamText] = useState<string | null>(null);
  const [streamFailed, setStreamFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const resumedRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
    }
  }, [state]);

  const run = useCallback(
    async (question: string, resume: boolean) => {
      setBusy(true);
      setStreamFailed(false);
      setStreamText('');
      let accumulated = '';
      let sources: Source[] = [];
      let failed = false;

      try {
        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, question, resume }),
        });
        if (!res.ok || !res.body) throw new Error('stream unavailable');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE-ramar separeras av blankrad; sista biten kan vara ofullständig.
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';
          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith('data:')) continue;
            let event: { type?: string; text?: string; sources?: Source[]; error?: boolean };
            try {
              event = JSON.parse(line.slice(5).trim());
            } catch {
              continue;
            }
            if (event.type === 'delta' && typeof event.text === 'string') {
              accumulated += event.text;
              setStreamText(accumulated);
            } else if (event.type === 'done') {
              if (event.error) failed = true;
              sources = event.sources ?? [];
            }
          }
        }
      } catch {
        failed = true;
      }

      if (failed || accumulated.length === 0) {
        setStreamFailed(true);
      } else {
        setExtra((prev) => [
          ...prev,
          {
            id: `streamed-${Date.now()}`,
            role: 'assistant',
            content: accumulated,
            sources,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      setStreamText(null);
      setBusy(false);
    },
    [chatId],
  );

  // Första frågan skapas av startChat, som redirectar hit direkt utan att vänta
  // på svaret. Ligger sista meddelandet obesvarat — strömma in svaret nu.
  useEffect(() => {
    if (resumedRef.current) return;
    const last = initialMessages[initialMessages.length - 1];
    if (last && last.role === 'user') {
      resumedRef.current = true;
      void run(last.content, true);
    }
  }, [initialMessages, run]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [streamText, extra.length]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = new FormData(form);
    const question = (data.get('question') ?? '').toString().trim();
    if (!question || busy) {
      event.preventDefault();
      return;
    }
    // JavaScript finns — ta över och strömma i stället för att köra Server Action.
    event.preventDefault();
    form.reset();
    setExtra((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
        role: 'user',
        content: question,
        sources: [],
        created_at: new Date().toISOString(),
      },
    ]);
    void run(question, false);
  }

  const messages = [...initialMessages, ...extra];
  const showTyping = busy && (streamText === null || streamText.length === 0);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="flex-1 space-y-10 pb-32">
        {messages.length === 0 ? (
          <p className="text-center text-[0.9375rem] text-[var(--color-ink-muted)]">
            {labels.empty}
          </p>
        ) : (
          messages.map((message) => (
            <Message key={message.id} message={message} labels={labels} />
          ))
        )}

        {streamText !== null && streamText.length > 0 ? (
          <Message
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamText,
              sources: [],
              created_at: '',
            }}
            labels={labels}
          />
        ) : null}

        {showTyping || pending ? (
          <div
            className="flex items-center gap-2 text-[0.875rem] text-[var(--color-ink-muted)]"
            aria-live="polite"
          >
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="ml-2">{labels.assistantTyping}</span>
          </div>
        ) : null}

        {streamFailed ? (
          <p role="alert" className="text-[0.875rem] text-[var(--color-error)]">
            {labels.streamError}
          </p>
        ) : null}

        <div ref={endRef} />
      </div>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        className="sticky bottom-0 -mx-4 border-t border-[var(--color-sand)] bg-[var(--color-canvas)]/95 px-4 pb-6 pt-4 backdrop-blur md:-mx-0"
      >
        <input type="hidden" name="chat_id" value={chatId} />
        <div className="rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-3 focus-within:border-[var(--color-ink-secondary)]">
          <Textarea
            id="chat-question"
            name="question"
            rows={3}
            required
            placeholder={labels.inputPlaceholder}
            className="w-full resize-none border-0 bg-transparent p-0 text-[1rem] focus:outline-none focus:ring-0"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={busy || pending}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-4 py-2 text-[0.875rem] text-[var(--color-canvas)] transition-opacity disabled:opacity-50"
            >
              {busy || pending ? labels.sending : labels.send}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
        {state.status === 'error' ? (
          <p role="alert" className="mt-2 text-[0.875rem] text-[var(--color-error)]">
            {state.detail ?? 'Error'}
          </p>
        ) : null}
      </form>
    </div>
  );
}

function Message({
  message,
  labels,
}: {
  message: Message;
  labels: Props['labels'];
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[16px] bg-[var(--color-ink)] px-5 py-3 text-[1rem] text-[var(--color-canvas)]">
          {message.content}
        </div>
      </div>
    );
  }

  // AI message — no bubble, just text on canvas
  return (
    <article>
      <div className="ai-prose text-[1rem] leading-relaxed text-[var(--color-ink)]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
            ul: ({ children }) => (
              <ul className="mb-4 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
            ),
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => (
              <strong className="font-semibold text-[var(--color-ink)]">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
            h1: ({ children }) => (
              <h3 className="mb-3 mt-5 font-serif text-[1.25rem] text-[var(--color-ink)] first:mt-0">
                {children}
              </h3>
            ),
            h2: ({ children }) => (
              <h3 className="mb-3 mt-5 font-serif text-[1.125rem] text-[var(--color-ink)] first:mt-0">
                {children}
              </h3>
            ),
            h3: ({ children }) => (
              <h4 className="mb-2 mt-4 font-serif text-[1rem] text-[var(--color-ink)] first:mt-0">
                {children}
              </h4>
            ),
            code: ({ children }) => (
              <code className="rounded bg-[var(--color-sand)] px-1.5 py-0.5 font-mono text-[0.875em]">
                {children}
              </code>
            ),
            blockquote: ({ children }) => (
              <blockquote className="mb-4 border-l-2 border-[var(--color-sand-strong)] pl-4 italic text-[var(--color-ink-secondary)]">
                {children}
              </blockquote>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      {message.sources && message.sources.length > 0 ? (
        <MessageSources sources={message.sources} labels={labels} />
      ) : null}
    </article>
  );
}

function MessageSources({
  sources,
  labels,
}: {
  sources: Source[];
  labels: Props['labels'];
}) {
  const unique = dedupeSources(sources);
  const [expanded, setExpanded] = useState(false);
  const initial = 2;
  const visible = expanded ? unique : unique.slice(0, initial);
  const hidden = unique.length - initial;

  return (
    <div className="mt-5 space-y-2">
      <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
        {labels.sourcesHeading}
      </p>
      <ul className="space-y-2">
        {visible.map((source, idx) => (
          <li
            key={`${source.lesson_id}-${idx}`}
            className="rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-surface)] px-4 py-3"
          >
            <p className="mb-1 text-[0.75rem] text-[var(--color-ink-muted)]">
              {source.lesson_title ?? labels.sourceFromLesson}
            </p>
            <p className="text-[0.875rem] italic leading-relaxed text-[var(--color-ink-secondary)]">
              &ldquo;{truncate(source.excerpt, 180)}&rdquo;
            </p>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[0.8125rem] text-[var(--color-ink-secondary)] underline-offset-2 hover:text-[var(--color-ink)] hover:underline"
        >
          {expanded ? labels.sourcesShowLess : `${labels.sourcesShowMore} (${hidden})`}
        </button>
      ) : null}
    </div>
  );
}

function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of sources) {
    const key = s.excerpt.slice(0, 60).toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function truncate(text: string, max: number): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/[\s,.;:!?-]+$/, '') + '…';
}
