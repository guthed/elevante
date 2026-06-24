import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionary';
import { isRole } from '@/lib/app/roles';
import { getCurrentProfile, createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeacherClasses } from '@/lib/data/teacher';
import { ClassTestBuilder } from './ClassTestBuilder';

type Props = {
  params: Promise<{ locale: string; role: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const sv = locale === 'sv';
  return {
    title: sv ? 'Nytt klassprov' : 'New class test',
    robots: { index: false, follow: false },
  };
}

type LessonJoin = {
  id: string;
  title: string | null;
  class_id: string;
};

export default async function NewClassTestPage({ params }: Props) {
  const { locale: rawLocale, role } = await params;
  if (!isLocale(rawLocale) || !isRole(role)) notFound();
  const locale: Locale = rawLocale;
  const sv = locale === 'sv';

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/${locale}/login`);
  if (role !== 'teacher' && role !== 'admin') {
    redirect(`/${locale}/app/${role}`);
  }

  const dict = await getDictionary(locale);
  const t = dict.app.klassprov;

  const classes = await getTeacherClasses(profile.id);

  // Hämta alla färdigtranskriberade lektioner för lärarens klasser i en query.
  const classIds = classes.map((c) => c.id);
  const lessonsByClass = new Map<string, { id: string; title: string | null }[]>();
  if (classIds.length > 0) {
    const supabase = await createSupabaseServerClient();
    const { data: lessonRows } = await supabase
      .from('lessons')
      .select('id, title, class_id')
      .in('class_id', classIds)
      .eq('transcript_status', 'ready')
      .not('transcript_text', 'is', null)
      .order('recorded_at', { ascending: false, nullsFirst: false });

    for (const row of (lessonRows ?? []) as LessonJoin[]) {
      const list = lessonsByClass.get(row.class_id) ?? [];
      list.push({ id: row.id, title: row.title });
      lessonsByClass.set(row.class_id, list);
    }
  }

  const classOptions = classes.map((c) => ({
    id: c.id,
    name: c.name,
    lessons: lessonsByClass.get(c.id) ?? [],
  }));

  return (
    <div className="container-wide py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-[clamp(1.75rem,2.5vw+1rem,2.5rem)] leading-tight text-[var(--color-ink)]">
          {t.newTest}
        </h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-secondary)]">
          {sv
            ? 'Välj klass och lektioner, ställ in antal frågor och fördelning — så genererar AI ett utkast.'
            : 'Pick a class and lessons, set the question count and mix — AI generates a draft.'}
        </p>

        <div className="mt-8">
          <ClassTestBuilder
            classes={classOptions}
            locale={locale}
            labels={{
              title: t.title,
              pickClass: t.pickClass,
              pickLessons: t.pickLessons,
              questionCount: t.questionCount,
              closed: t.closed,
              open: t.open,
              reasoning: t.reasoning,
              generate: t.generate,
            }}
          />
        </div>
      </div>
    </div>
  );
}
