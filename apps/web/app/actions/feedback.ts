'use server';

import { randomUUID } from 'node:crypto';
import { after } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';
import { getAppContext } from '@/lib/data/context';
import { FEEDBACK_SURFACES } from '@/lib/feedback/surface';
import { logFeedbackToNotion } from '@/lib/feedback/notion';
import { studentReference } from '@/lib/feedback/student-ref';
import type { FeedbackContext } from '@/lib/feedback/context';

export type FeedbackResult =
  | { ok: true }
  | { ok: false; code: 'missing' | 'rate-limit' | 'generic' };

const MAX_MESSAGE = 2000;
const MAX_PER_HOUR = 20;

const schema = z.object({
  category: z.enum(['not_working', 'confused', 'looks_wrong']),
  surface: z.enum(FEEDBACK_SURFACES),
  message: z.string().max(MAX_MESSAGE).optional(),
  path: z.string().max(300),
  locale: z.enum(['sv', 'en']),
  lessonId: z.string().uuid().optional(),
  lessonTitle: z.string().max(300).optional(),
  itemType: z.enum(['flashcard', 'knowledge_check']).optional(),
  itemId: z.string().uuid().optional(),
  itemLabel: z.string().max(500).optional(),
  conceptName: z.string().max(200).optional(),
});

/** Tomma formulärfält kommer som '' — de ska bli undefined, inte valideringsfel. */
function opt(formData: FormData, key: string): string | undefined {
  const v = formData.get(key);
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Antal rapporter från eleven senaste timmen. Kräver service-role eftersom
 * eleven medvetet SAKNAR select-policy på sina egna rader (en rapport är
 * inget man ska kunna läsa tillbaka). Saknas nyckeln — som lokalt — släpper
 * vi igenom: spärren är en artighet, rapporten är poängen.
 */
async function reportsLastHour(studentId: string): Promise<number> {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('feedback_reports')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .gte('created_at', since);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Tar emot en elevrapport om appen.
 *
 * Supabase är sanningen, Notion är arbetsytan: raden skrivs först och fäller
 * anropet om den misslyckas. Notion-synken körs i `after()` — best-effort,
 * efter att eleven redan fått sitt kvitto. Under piloten är det här den enda
 * veckan feedbacken verkligen räknas, så en trasig Notion-integration får
 * aldrig kosta oss en rapport.
 *
 * VIKTIGT: allt cookie-beroende (profil, skola, klass) läses FÖRE `after()`.
 * Inuti callbacken finns ingen request-scope att hämta cookies ur.
 */
export async function submitFeedback(formData: FormData): Promise<FeedbackResult> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return { ok: false, code: 'generic' };
  // Rapporteringen är elevernas väg in. Lärare har sitt Notion-formulär, och
  // en lärarrad i en tabell som heter student_id vore en lögn i datamodellen.
  if (profile.role !== 'student') return { ok: false, code: 'generic' };

  const parsed = schema.safeParse({
    category: opt(formData, 'category'),
    surface: opt(formData, 'surface'),
    message: opt(formData, 'message'),
    path: opt(formData, 'path') ?? '/',
    locale: opt(formData, 'locale') ?? 'sv',
    lessonId: opt(formData, 'lesson_id'),
    lessonTitle: opt(formData, 'lesson_title'),
    itemType: opt(formData, 'item_type'),
    itemId: opt(formData, 'item_id'),
    itemLabel: opt(formData, 'item_label'),
    conceptName: opt(formData, 'concept_name'),
  });
  if (!parsed.success) return { ok: false, code: 'missing' };
  const input = parsed.data;

  if ((await reportsLastHour(profile.id)) >= MAX_PER_HOUR) {
    return { ok: false, code: 'rate-limit' };
  }

  const context: FeedbackContext = {
    surface: input.surface,
    path: input.path,
    locale: input.locale,
    lessonId: input.lessonId ?? null,
    lessonTitle: input.lessonTitle ?? null,
    itemType: input.itemType,
    itemId: input.itemId ?? null,
    itemLabel: input.itemLabel ?? null,
    conceptName: input.conceptName ?? null,
  };

  // Sanningen. Skrivs som eleven själv — RLS-policyn feedback_reports_own_insert
  // är det som gör att raden inte kan sättas på någon annan.
  //
  // Id:t genereras HÄR i stället för att läsas tillbaka med .select(): en
  // INSERT ... RETURNING kräver även SELECT-behörighet i Postgres, och eleven
  // saknar medvetet select-policy på tabellen. Med .select('id') föll varje
  // rapport på "new row violates row-level security policy" — ett fel som
  // varken bygge, typer eller lint kan se, eftersom det uppstår först i
  // databasen. Verifierat mot prod 2026-08-19.
  const reportId = randomUUID();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('feedback_reports').insert({
    id: reportId,
    school_id: profile.school_id,
    student_id: profile.id,
    category: input.category,
    message: input.message ?? null,
    surface: input.surface,
    lesson_id: input.lessonId ?? null,
    context,
  });

  if (error) {
    console.error('[feedback] insert error:', error.message);
    return { ok: false, code: 'generic' };
  }

  // Läses här, inte i after(): cookies finns bara i request-scopet.
  const { schoolName, className } = await getAppContext({
    id: profile.id,
    role: 'student',
    school_id: profile.school_id,
  });
  const studentRef = studentReference(profile.id);

  after(async () => {
    const pageId = await logFeedbackToNotion({
      category: input.category,
      surface: input.surface,
      message: input.message ?? null,
      context,
      schoolName,
      className,
      studentRef,
    });
    if (!pageId) return;
    try {
      // Eleven har medvetet ingen update-policy — service-role är enda vägen.
      // Saknas nyckeln blir notion_page_id null; raden och Notion-sidan finns
      // ändå, bara utan länken mellan dem.
      const service = createSupabaseServiceRoleClient();
      const { error: updateError } = await service
        .from('feedback_reports')
        .update({ notion_page_id: pageId })
        .eq('id', reportId);
      if (updateError) {
        console.error('[feedback] kunde inte spara notion_page_id:', updateError.message);
      }
    } catch (err) {
      console.warn('[feedback] notion_page_id sparades inte:', err);
    }
  });

  return { ok: true };
}
