'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';

export type MaterialUploadState =
  | { status: 'idle' }
  | { status: 'success' }
  | {
      status: 'error';
      code: 'unauthorized' | 'too-large' | 'bad-type' | 'generic';
      detail?: string;
    };

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const MAX_BYTES = 524_288_000; // 500 MB
const BUCKET = 'elevante-materials';

function safeFilename(name: string): string {
  // Behåll endpunkten, sanera resten
  const dot = name.lastIndexOf('.');
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
  return `${base || 'file'}${ext}`;
}

export async function uploadMaterial(
  _prev: MaterialUploadState,
  formData: FormData,
): Promise<MaterialUploadState> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }
  if (profile.role !== 'teacher' && profile.role !== 'admin') {
    return { status: 'error', code: 'unauthorized' };
  }

  const lessonId = (formData.get('lesson_id') ?? '').toString();
  const file = formData.get('file');
  if (!lessonId || !(file instanceof File) || file.size === 0) {
    return { status: 'error', code: 'generic', detail: 'Ingen fil vald' };
  }
  if (file.size > MAX_BYTES) {
    return { status: 'error', code: 'too-large' };
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return { status: 'error', code: 'bad-type' };
  }

  const supabase = await createSupabaseServerClient();

  // Verifiera att lektionen tillhör samma skola och att läraren äger den
  // (RLS gör samma check, men vi vill ge ett tydligt felmeddelande).
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, school_id, teacher_id')
    .eq('id', lessonId)
    .maybeSingle();

  if (!lesson || lesson.school_id !== profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }
  if (profile.role === 'teacher' && lesson.teacher_id !== profile.id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const filename = safeFilename(file.name);
  const storagePath = `${profile.school_id}/${lessonId}/${Date.now()}-${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    return { status: 'error', code: 'generic', detail: uploadError.message };
  }

  const { error: insertError } = await supabase.from('materials').insert({
    lesson_id: lessonId,
    school_id: profile.school_id,
    uploaded_by: profile.id,
    name: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    size_bytes: file.size,
  });

  if (insertError) {
    // Försök städa upp filen om DB-insert misslyckas
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { status: 'error', code: 'generic', detail: insertError.message };
  }

  revalidatePath(`/sv/app/teacher/lektioner/${lessonId}`);
  revalidatePath(`/en/app/teacher/lektioner/${lessonId}`);

  return { status: 'success' };
}

/** Generera en signerad URL för att ladda ner ett material. */
export async function getMaterialDownloadUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}
