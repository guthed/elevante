import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { getOrCreateTrainingMaterials, type FlashcardSessionItem } from '@/lib/data/training';
import type { TrainingSession } from '@/lib/supabase/database';
import { FlashcardRunner } from './FlashcardRunner';

type Props = {
  params: Promise<{ locale: string; role: string; sessionId: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Flashcards',
    robots: { index: false, follow: false },
  };
}

export default async function FlashcardSessionPage({ params }: Props) {
  const { locale: rawLocale, role, sessionId } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  if (role !== 'student') redirect(`/${rawLocale}/app/${role}`);
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  const session = data as TrainingSession | null;
  if (!session || session.mode !== 'flashcards') notFound();

  const materials = await getOrCreateTrainingMaterials(session.lesson_ids);
  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('id, title')
    .in('id', session.lesson_ids);
  const titles = new Map(
    ((lessonRows ?? []) as { id: string; title: string | null }[]).map((l) => [l.id, l.title]),
  );

  const byId = new Map<string, FlashcardSessionItem>();
  for (const m of materials) {
    for (const f of m.flashcards) {
      byId.set(f.id, { ...f, lessonId: m.lesson_id, lessonTitle: titles.get(m.lesson_id) ?? null });
    }
  }

  // item_ids fryses vid sessionsskapandet, så en refresh visar samma kort —
  // de resolvas här mot det underlag som finns just nu, inte om räknas.
  const cards = session.item_ids
    .map((id) => byId.get(id))
    .filter((c): c is FlashcardSessionItem => c !== undefined);

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-[1.75rem] leading-tight text-[var(--color-ink)]">
          Flashcards
        </h1>

        <div className="mt-8">
          {cards.length === 0 ? (
            <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Den här sessionen har inga kort kvar.'
                : 'This session has no cards left.'}
            </p>
          ) : (
            <FlashcardRunner locale={locale} cards={cards} />
          )}
        </div>
      </div>
    </div>
  );
}
