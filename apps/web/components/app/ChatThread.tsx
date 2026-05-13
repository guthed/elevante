'use client';

import { useActionState, useEffect, useRef } from 'react';
import { sendMessage, type SendMessageState } from '@/app/actions/chat';
import { Textarea } from '@/components/ui/Input';
import type { Dictionary } from '@/lib/i18n/types';

// Editorial Calm — Stitch screen 03 (chat active)
// Användar-meddelande = ink-bubbla höger. AI-svar = text på canvas (ingen bubbla),
// med SourcePills under svaret. Inspirerad av Claude.ai men varmare.

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: { lesson_id: string; lesson_title: string | null; excerpt: string }[];
  created_at: string;
};

type Props = {
  chatId: string;
  initialMessages: Message[];
  labels: Dictionary['app']['pages']['student']['chat'];
  userName: string;
};

const initialState: SendMessageState = { status: 'idle' };

export function ChatThread({ chatId, initialMessages, labels }: Props) {
  const [state, formAction, pending] = useActionState(sendMessage, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="flex-1 space-y-10 pb-32">
        {initialMessages.length === 0 ? (
          <p className="text-center text-[0.9375rem] text-[var(--color-ink-muted)]">
            {labels.empty}
          </p>
        ) : (
          initialMessages.map((message) => (
            <Message key={message.id} message={message} labels={labels} />
          ))
        )}
        {pending ? (
          <div className="flex items-center gap-2 text-[0.875rem] text-[var(--color-ink-muted)]">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="ml-2">{labels.assistantTyping}</span>
          </div>
        ) : null}
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="sticky bottom-0 -mx-4 border-t border-[var(--color-sand)] bg-[var(--color-canvas)]/95 px-4 pb-6 pt-4 backdrop-blur md:-mx-0"
      >
        <input type="hidden" name="chat_id" value={chatId} />
        <p className="mb-2 text-center text-[0.75rem] text-[var(--color-ink-muted)]">
          {labels.mockNotice}
        </p>
        <div className="flex items-end gap-3 rounded-[16px] border border-[var(--color-sand)] bg-[var(--color-surface)] p-3 focus-within:border-[var(--color-ink-secondary)]">
          <Textarea
            id="chat-question"
            name="question"
            rows={1}
            required
            placeholder={labels.inputPlaceholder}
            className="flex-1 resize-none border-0 bg-transparent p-0 text-[1rem] focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            disabled={pending}
            aria-label={labels.send}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-[var(--color-canvas)] transition-opacity disabled:opacity-50"
          >
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
      <div className="whitespace-pre-wrap text-[1rem] leading-relaxed text-[var(--color-ink)]">
        {message.content}
      </div>
      {message.sources && message.sources.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {message.sources.map((source, idx) => (
            <span
              key={`${source.lesson_id}-${idx}`}
              className="source-pill"
              title={source.excerpt}
            >
              <span className="status-dot status-dot--sage" />
              <span className="font-medium">
                {source.lesson_title ?? labels.sourceFromLesson}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
