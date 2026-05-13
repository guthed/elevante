import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile } from '@/lib/supabase/server';
import { getStudentOverview, getUserChatHistory } from '@/lib/data/student';
import { CourseChatStarter } from './CourseChatStarter';

type Props = {
  params: Promise<{ locale: string; role: string }>;
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

// Editorial Calm — Stitch screen 03 (chat empty/landing state)

export default async function StudentChatLandingPage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const labels = dict.app.pages.student.chat;
  const sv = locale === 'sv';

  const [{ courses }, history] = await Promise.all([
    getStudentOverview(profile.id),
    getUserChatHistory(),
  ]);

  const base = `/${locale}/app/student`;

  return (
    <div className="container-wide grid gap-12 py-10 md:grid-cols-12 md:py-14">
      {/* HISTORY SIDEBAR — 4 cols */}
      <aside className="md:col-span-3">
        <h2 className="font-serif text-[1.125rem] text-[var(--color-ink)]">
          {sv ? 'Senaste' : 'Recent'}
        </h2>
        {history.length === 0 ? (
          <p className="mt-4 text-[0.875rem] text-[var(--color-ink-muted)]">
            {labels.noHistory}
          </p>
        ) : (
          <ul className="mt-4 space-y-1">
            {history.map((chat) => (
              <li key={chat.id}>
                <Link
                  href={`${base}/chat/${chat.id}`}
                  className="-mx-3 block rounded-[12px] px-3 py-2.5 transition-colors hover:bg-[var(--color-surface-soft)]"
                >
                  <p className="truncate font-serif text-[0.9375rem] leading-snug text-[var(--color-ink)]">
                    {chat.title ?? (sv ? 'Ny chat' : 'New chat')}
                  </p>
                  <p className="mt-0.5 text-[0.75rem] text-[var(--color-ink-muted)]">
                    {new Date(chat.updated_at).toLocaleDateString(
                      locale === 'sv' ? 'sv-SE' : 'en-GB',
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* MAIN — 9 cols, centered prompt */}
      <main className="md:col-span-9">
        <div className="mx-auto max-w-2xl py-8 md:py-16">
          <h1 className="font-serif text-[clamp(2rem,3vw+1rem,3rem)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]">
            {sv ? 'Vad undrar du om?' : 'What are you wondering about?'}
          </h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-[var(--color-ink-secondary)]">
            {sv
              ? 'Välj en kurs och ställ en fråga. Elevante svarar med det som faktiskt sas på lektionen.'
              : 'Pick a course and ask. Elevante answers with what was actually said in class.'}
          </p>

          <div className="mt-10">
            {courses.length === 0 ? (
              <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
                {sv
                  ? 'Du är inte tilldelad någon kurs än. Be din lärare lägga till dig.'
                  : 'You aren\'t assigned to a course yet. Ask your teacher to add you.'}
              </p>
            ) : (
              <CourseChatStarter
                locale={locale}
                courses={courses.map((c) => ({
                  id: c.id,
                  label: c.name,
                }))}
                labels={labels}
              />
            )}
          </div>

          <p className="mt-6 text-[0.75rem] text-[var(--color-ink-muted)]">
            {sv
              ? 'Elevante svarar bara med det som togs upp på lektionen.'
              : 'Elevante only answers from what was covered in class.'}
          </p>
        </div>
      </main>
    </div>
  );
}
