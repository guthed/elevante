'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export type TranscriptActionResult =
  | { ok: true }
  | {
      ok: false;
      code: 'unauthorized' | 'invalid' | 'reindex-failed' | 'generic';
      detail?: string;
    };

const MAX_TRANSCRIPT_CHARS = 200_000;

/** Verifiera att inloggad användare får ändra lektionen. Returnerar lektionen eller null. */
async function authorizeLesson(
  lessonId: string,
): Promise<{ id: string; school_id: string } | null> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) return null;
  if (profile.role !== 'teacher' && profile.role !== 'admin') return null;

  const supabase = await createSupabaseServerClient();
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, school_id, teacher_id')
    .eq('id', lessonId)
    .maybeSingle();

  if (!lesson || lesson.school_id !== profile.school_id) return null;
  if (profile.role === 'teacher' && lesson.teacher_id !== profile.id) return null;
  return { id: lesson.id, school_id: lesson.school_id };
}

function revalidateLesson(lessonId: string): void {
  for (const locale of ['sv', 'en'] as const) {
    revalidatePath(`/${locale}/app/teacher/lektioner/${lessonId}`);
    revalidatePath(`/${locale}/app/student/lektioner/${lessonId}`);
  }
}

/**
 * Spara redigerat transkript och re-indexera RAG synkront:
 * radera gamla chunks → kör transcribe-lesson med ny text → ready.
 */
export async function updateTranscript(
  lessonId: string,
  text: string,
): Promise<TranscriptActionResult> {
  const lesson = await authorizeLesson(lessonId);
  if (!lesson) return { ok: false, code: 'unauthorized' };

  const trimmed = text.trim();
  if (!trimmed) return { ok: false, code: 'invalid', detail: 'empty' };
  if (trimmed.length > MAX_TRANSCRIPT_CHARS) {
    return { ok: false, code: 'invalid', detail: 'too-long' };
  }

  const admin = createSupabaseServiceRoleClient();

  // Markera processing + spara texten direkt.
  const { error: updErr } = await admin
    .from('lessons')
    .update({ transcript_text: trimmed, transcript_status: 'processing' })
    .eq('id', lessonId);
  if (updErr) return { ok: false, code: 'generic', detail: updErr.message };

  // Rensa gamla chunks (edge-funktionen gör det också, men vi är defensiva).
  const { error: delErr } = await admin
    .from('lesson_chunks')
    .delete()
    .eq('lesson_id', lessonId);
  if (delErr) return { ok: false, code: 'generic', detail: delErr.message };

  // Re-indexera synkront: chunk + embed + summary/frågor/koncept + status=ready.
  const { error: fnErr } = await admin.functions.invoke('transcribe-lesson', {
    body: { lesson_id: lessonId, transcript_text: trimmed },
  });
  if (fnErr) {
    await admin
      .from('lessons')
      .update({ transcript_status: 'failed' })
      .eq('id', lessonId);
    return { ok: false, code: 'reindex-failed', detail: fnErr.message };
  }

  revalidateLesson(lessonId);
  return { ok: true };
}

/** Töm hela transkriptet: radera chunks + nollställ text och härledda AI-fält. */
export async function clearTranscript(
  lessonId: string,
): Promise<TranscriptActionResult> {
  const lesson = await authorizeLesson(lessonId);
  if (!lesson) return { ok: false, code: 'unauthorized' };

  const admin = createSupabaseServiceRoleClient();

  const { error: delErr } = await admin
    .from('lesson_chunks')
    .delete()
    .eq('lesson_id', lessonId);
  if (delErr) return { ok: false, code: 'generic', detail: delErr.message };

  const { error: updErr } = await admin
    .from('lessons')
    .update({
      transcript_text: null,
      summary: null,
      // suggested_questions/concepts är `string[]` (ej nullable) i Update-typen → töm med [].
      suggested_questions: [],
      concepts: [],
      ai_generated_topic: null,
      transcript_status: 'pending',
    })
    .eq('id', lessonId);
  if (updErr) return { ok: false, code: 'generic', detail: updErr.message };

  revalidateLesson(lessonId);
  return { ok: true };
}
