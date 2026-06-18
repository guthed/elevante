'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service-role';

export type LessonActionResult =
  | { ok: true }
  | { ok: false; code: 'unauthorized' | 'invalid' | 'generic'; detail?: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function revalidateLessonViews(lessonId: string): void {
  for (const locale of ['sv', 'en'] as const) {
    revalidatePath(`/${locale}/app/teacher`);
    revalidatePath(`/${locale}/app/teacher/lektioner`);
    revalidatePath(`/${locale}/app/teacher/lektioner/${lessonId}`);
  }
}

async function setArchivedAt(
  lessonId: string,
  value: string | null,
): Promise<LessonActionResult> {
  if (!UUID_RE.test(lessonId)) return { ok: false, code: 'invalid', detail: 'bad-id' };

  const lesson = await authorizeLesson(lessonId);
  if (!lesson) return { ok: false, code: 'unauthorized' };

  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin
    .from('lessons')
    .update({ archived_at: value })
    .eq('id', lessonId);
  if (error) return { ok: false, code: 'generic', detail: error.message };

  revalidateLessonViews(lessonId);
  return { ok: true };
}

/** Arkivera (mjuk radering) en lektion. */
export async function archiveLesson(lessonId: string): Promise<LessonActionResult> {
  return setArchivedAt(lessonId, new Date().toISOString());
}

/** Återställ en arkiverad lektion. */
export async function restoreLesson(lessonId: string): Promise<LessonActionResult> {
  return setArchivedAt(lessonId, null);
}
