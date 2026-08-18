import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { isRole } from '@/lib/app/roles';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { getOrCreateTrainingMaterials, type KnowledgeCheckSessionItem } from '@/lib/data/training';
import type { TrainingSession } from '@/lib/supabase/database';
import { KnowledgeCheckRunner } from './KnowledgeCheckRunner';

type Props = {
  params: Promise<{ locale: string; role: string; sessionId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Kunskapskoll' : 'Knowledge check',
    robots: { index: false, follow: false },
  };
}

export default async function KnowledgeCheckSessionPage({ params }: Props) {
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
  if (!session || session.mode !== 'knowledge_checks') notFound();

  const materials = await getOrCreateTrainingMaterials(session.lesson_ids);
  const { data: lessonRows } = await supabase
    .from('lessons')
    .select('id, title')
    .in('id', session.lesson_ids);
  const titles = new Map(
    ((lessonRows ?? []) as { id: string; title: string | null }[]).map((l) => [l.id, l.title]),
  );

  const byId = new Map<string, KnowledgeCheckSessionItem>();
  for (const m of materials) {
    for (const k of m.knowledge_checks) {
      byId.set(k.id, { ...k, lessonId: m.lesson_id, lessonTitle: titles.get(m.lesson_id) ?? null });
    }
  }

  // item_ids fryses vid sessionsskapandet, så en refresh visar samma frågor —
  // de resolvas här mot det underlag som finns just nu, inte om räknas.
  const checks = session.item_ids
    .map((id) => byId.get(id))
    .filter((c): c is KnowledgeCheckSessionItem => c !== undefined);

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-[1.75rem] leading-tight text-[var(--color-ink)]">
          {sv ? 'Kunskapskoll' : 'Knowledge check'}
        </h1>

        <div className="mt-8">
          {checks.length === 0 ? (
            <p className="text-[0.9375rem] text-[var(--color-ink-muted)]">
              {sv
                ? 'Den här sessionen har inga frågor kvar.'
                : 'This session has no questions left.'}
            </p>
          ) : (
            <KnowledgeCheckRunner locale={locale} checks={checks} />
          )}
        </div>
      </div>
    </div>
  );
}
