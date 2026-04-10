'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentProfile } from '@/lib/supabase/server';
import { parseCsv } from '@/lib/csv';
import type { DayOfWeek } from '@/lib/supabase/database';

export type ScheduleUploadState =
  | { status: 'idle' }
  | { status: 'success'; inserted: number }
  | { status: 'error'; code: 'invalid' | 'unauthorized' | 'generic'; detail?: string };

const validDays: ReadonlySet<DayOfWeek> = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

function normalizeDay(raw: string): DayOfWeek | null {
  const value = raw.trim().toLowerCase();
  if (validDays.has(value as DayOfWeek)) return value as DayOfWeek;
  // Svenska alias
  const alias: Record<string, DayOfWeek> = {
    måndag: 'monday',
    tisdag: 'tuesday',
    onsdag: 'wednesday',
    torsdag: 'thursday',
    fredag: 'friday',
    lördag: 'saturday',
    söndag: 'sunday',
  };
  return alias[value] ?? null;
}

function normalizeTime(raw: string): string | null {
  // Accepterar HH:MM eller HH:MM:SS
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, h, mm, ss] = m;
  const hour = Number(h);
  const minute = Number(mm);
  if (hour > 23 || minute > 59) return null;
  return `${hour.toString().padStart(2, '0')}:${mm}:${ss ?? '00'}`;
}

export async function uploadSchedule(
  _prev: ScheduleUploadState,
  formData: FormData,
): Promise<ScheduleUploadState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin' || !profile.school_id) {
    return { status: 'error', code: 'unauthorized' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', code: 'invalid', detail: 'Ingen fil vald' };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { status: 'error', code: 'invalid', detail: 'Kunde inte läsa filen' };
  }

  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { status: 'error', code: 'invalid', detail: 'Filen är tom' };
  }

  const required = ['course_code', 'class_name', 'day', 'start_time', 'end_time'];
  const first = rows[0]!;
  const missing = required.filter((k) => !(k in first));
  if (missing.length > 0) {
    return {
      status: 'error',
      code: 'invalid',
      detail: `Rubriker saknas: ${missing.join(', ')}`,
    };
  }

  const supabase = await createSupabaseServerClient();

  // Hämta kurser + klasser för den här skolan för att mappa code/name → id
  const [coursesRes, classesRes] = await Promise.all([
    supabase
      .from('courses')
      .select('id, code')
      .eq('school_id', profile.school_id),
    supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', profile.school_id),
  ]);
  if (coursesRes.error || classesRes.error) {
    return { status: 'error', code: 'generic' };
  }
  const courseMap = new Map(coursesRes.data.map((c) => [c.code, c.id]));
  const classMap = new Map(classesRes.data.map((c) => [c.name, c.id]));

  type TimeslotInsert = {
    school_id: string;
    course_id: string;
    class_id: string;
    day: DayOfWeek;
    start_time: string;
    end_time: string;
    room: string | null;
    valid_from: string;
  };
  const toInsert: TimeslotInsert[] = [];
  for (const row of rows) {
    const courseCode = row['course_code'] ?? '';
    const className = row['class_name'] ?? '';
    const day = normalizeDay(row['day'] ?? '');
    const startTime = normalizeTime(row['start_time'] ?? '');
    const endTime = normalizeTime(row['end_time'] ?? '');
    const courseId = courseMap.get(courseCode);
    const classId = classMap.get(className);

    if (!day || !startTime || !endTime || !courseId || !classId) {
      return {
        status: 'error',
        code: 'invalid',
        detail: `Rad med course_code=${courseCode}, class_name=${className} kunde inte mappas`,
      };
    }

    toInsert.push({
      school_id: profile.school_id,
      course_id: courseId,
      class_id: classId,
      day,
      start_time: startTime,
      end_time: endTime,
      room: row['room'] ?? null,
      valid_from: new Date().toISOString().slice(0, 10),
    });
  }

  const { error } = await supabase.from('timeslots').insert(toInsert);
  if (error) {
    return { status: 'error', code: 'generic', detail: error.message };
  }

  revalidatePath('/sv/app/admin/schema');
  revalidatePath('/en/app/admin/schema');
  return { status: 'success', inserted: toInsert.length };
}
