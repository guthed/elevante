import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { PageWrapper } from '@/components/app/PageWrapper';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getChatThread } from '@/lib/data/student';
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

export default async function StudentChatThreadPage({ params }: Props) {
  const { locale, role, id } = await params;
  if (!isLocale(locale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${locale}/app/${role}`);

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.student.chat;

  const thread = await getChatThread(id);
  if (!thread) notFound();

  const base = `/${locale}/app/student`;

  return (
    <PageWrapper
      title={thread.chat.title ?? labels.title}
      subtitle={labels.subtitle}
      actions={
        <Link
          href={`${base}/chat`}
          className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-primary)]"
        >
          ← {labels.newChat}
        </Link>
      }
    >
      <ChatThread
        chatId={thread.chat.id}
        initialMessages={thread.messages}
        labels={labels}
        userName={profile.full_name ?? profile.email ?? '—'}
      />
    </PageWrapper>
  );
}
