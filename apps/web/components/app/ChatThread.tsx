'use client';

import { useActionState, useEffect, useRef } from 'react';
import { sendMessage, type SendMessageState } from '@/app/actions/chat';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import type { Dictionary } from '@/lib/i18n/types';

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

export function ChatThread({ chatId, initialMessages, labels, userName }: Props) {
  const [state, formAction, pending] = useActionState(sendMessage, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-6">
      {initialMessages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-8 py-12 text-center text-sm text-[var(--color-ink-muted)]">
          {labels.empty}
        </div>
      ) : (
        <ul className="space-y-6">
          {initialMessages.map((message) => (
            <li key={message.id}>
              <Message message={message} labels={labels} userName={userName} />
            </li>
          ))}
          {pending ? (
            <li className="flex items-start gap-3 text-sm text-[var(--color-ink-subtle)]">
              <span className="font-mono">•••</span>
              {labels.assistantTyping}
            </li>
          ) : null}
        </ul>
      )}

      <form
        ref={formRef}
        action={formAction}
        className="sticky bottom-0 flex flex-col gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg)] pt-4"
      >
        <input type="hidden" name="chat_id" value={chatId} />
        <Textarea
          id="chat-question"
          name="question"
          rows={3}
          required
          placeholder={labels.inputPlaceholder}
        />
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-ink-subtle)]">{labels.mockNotice}</p>
          <Button type="submit" disabled={pending}>
            {pending ? labels.sending : labels.send}
          </Button>
        </div>
        {state.status === 'error' ? (
          <p role="alert" className="text-sm text-[var(--color-error)]">
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
  userName,
}: {
  message: Message;
  labels: Props['labels'];
  userName: string;
}) {
  const isUser = message.role === 'user';
  return (
    <article className="flex items-start gap-4">
      <Avatar name={isUser ? userName : 'Elevante'} size="md" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-subtle)]">
          {isUser ? userName : 'Elevante'}
        </div>
        <div
          className={
            isUser
              ? 'mt-2 whitespace-pre-wrap text-[var(--color-primary)]'
              : 'mt-2 whitespace-pre-wrap rounded-2xl bg-[var(--color-bg-subtle)] p-4 text-[var(--color-primary)]'
          }
        >
          {message.content}
        </div>
        {!isUser && message.sources && message.sources.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-subtle)]">
              {labels.sourcesHeading}
            </div>
            {message.sources.map((source, idx) => (
              <div
                key={`${source.lesson_id}-${idx}`}
                className="rounded-lg border border-[var(--color-border)] bg-white p-3 text-xs text-[var(--color-ink-muted)]"
              >
                <div className="font-medium text-[var(--color-primary)]">
                  {source.lesson_title ?? labels.sourceFromLesson}
                </div>
                <p className="mt-1">{source.excerpt}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
