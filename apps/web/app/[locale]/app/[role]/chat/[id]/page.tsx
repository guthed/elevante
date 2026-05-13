import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getChatThread, getUserChatHistory } from '@/lib/data/student';
import { ChatThread } from '@/components/app/ChatThread';

type Props = {
  params: Promise<{ locale: string; role: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.app.pages.student.chat.title,
    robots: { index: false, follow: false },
  };
}

// Editorial Calm — Stitch screen 03 (chat active)

export default async function StudentChatThreadPage({ params }: Props) {
  const { locale: rawLocale, role, id } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.student.chat;
  const sv = locale === 'sv';

  const [thread, history] = await Promise.all([
    getChatThread(id),
    getUserChatHistory(),
  ]);
  if (!thread) notFound();

  const base = `/${locale}/app/student`;

  return (
    <div className="container-wide grid gap-12 py-10 md:grid-cols-12 md:py-14">
      {/* History sidebar — 3 cols */}
      <aside className="md:col-span-3">
        <Link
          href={`${base}/chat`}
          className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--color-ink)] px-4 py-2 text-[0.875rem] font-medium text-[var(--color-canvas)] transition-opacity hover:opacity-90"
        >
          + {sv ? 'Ny chat' : 'New chat'}
        </Link>

        <h2 className="mt-8 font-serif text-[1rem] text-[var(--color-ink-secondary)]">
          {sv ? 'Senaste' : 'Recent'}
        </h2>
        <ul className="mt-3 space-y-0.5">
          {history.map((chat) => {
            const isActive = chat.id === id;
            return (
              <li key={chat.id}>
                <Link
                  href={`${base}/chat/${chat.id}`}
                  className={[
                    '-mx-3 block rounded-[12px] px-3 py-2.5 transition-colors',
                    isActive
                      ? 'bg-[var(--color-sand)]/45'
                      : 'hover:bg-[var(--color-surface-soft)]',
                  ].join(' ')}
                >
                  <p className="truncate font-serif text-[0.9375rem] leading-snug text-[var(--color-ink)]">
                    {chat.title ?? (sv ? 'Ny chat' : 'New chat')}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Chat main — 9 cols, max-w-2xl centered */}
      <main className="md:col-span-9">
        <div className="mx-auto max-w-3xl px-2">
          {thread.chat.title ? (
            <p className="mb-8 inline-flex items-center gap-2 rounded-[12px] border border-[var(--color-sand)] bg-[var(--color-canvas)] px-3 py-1.5 text-[0.8125rem] text-[var(--color-ink-secondary)]">
              {thread.chat.title}
            </p>
          ) : null}
          <ChatThread
            chatId={thread.chat.id}
            initialMessages={thread.messages}
            labels={labels}
            userName={profile.full_name ?? profile.email ?? '—'}
          />
        </div>
      </main>
    </div>
  );
}
