/**
 * Skriver ett `CanonicalSchedule` till databasen — idempotent.
 *
 * Det här är det enda stället som rör schematabellerna. Varje källa
 * (RS-fil, SS 12000, generisk CSV) parsas till `CanonicalSchedule` och
 * skickas hit; kör man samma schema två gånger ska andra körningen ge
 * `created: 0` och lika många rader i `timeslot_classes` som den första.
 *
 * Kopplingen till mobilappen är lätt att missa: `getTodayLessons()` i
 * apps/mobile/lib/lessons.ts filtrerar på `course_teachers`, INTE på
 * `timeslots.teacher_id`. Skriver vi inte den kopplingen står läraren med
 * en tom REC-skärm trots att schemat ligger inne. Därför skrivs båda.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Database,
  DayOfWeek,
  ScheduleImportSource,
} from '@/lib/supabase/database';
import type { CanonicalSchedule } from './canonical';
import { validateSchedule } from './canonical';

type Client = SupabaseClient<Database>;

export type CommitOptions = {
  schoolId: string;
  /** Vem som körde importen. Loggas i `schedule_imports`. */
  startedBy: string | null;
  source: ScheduleImportSource;
  /** `valid_from` på alla pass. */
  termStart: string;
  /** `valid_until` på alla pass. Null = tills vidare. */
  termEnd: string | null;
  /**
   * Klassnamn som ska importeras. Tom lista = alla. Piloten kör 2–3 av
   * skolans 19 klasser, så det här är normalfallet snarare än undantaget.
   */
  includeClasses: string[];
  /** Ta med lunch, mentorstid och liknande som pass. */
  includeNonRecordable: boolean;
};

export type CommitResult = {
  created: number;
  updated: number;
  skipped: number;
  /** Lärare i schemat som ännu inte pekar på ett Elevante-konto. */
  unmappedTeachers: { externalRef: string; displayName: string }[];
  issues: string[];
};

export class ScheduleCommitError extends Error {
  readonly issues: string[];
  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'ScheduleCommitError';
    this.issues = issues;
  }
}

/** "Matte nivå 2b" → "matte-niva-2b". Bara för att ge kurser en läsbar kod. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
}

/**
 * Kort, stabil hash av en extern nyckel. Används bara för att göra
 * kurskoder unika när två kurser delar namn — och det gör de: "Matte nivå
 * 2b" finns som fyra olika grupper i AG:s schema. Måste vara deterministisk
 * så att en omimport ger samma kod och därmed ingen ny kursrad.
 */
function shortHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 6);
}

export async function commitSchedule(
  supabase: Client,
  schedule: CanonicalSchedule,
  options: CommitOptions,
): Promise<CommitResult> {
  const issues = validateSchedule(schedule).map(
    (i) => `${i.scope} ${i.externalRef}: ${i.message}`,
  );
  if (issues.length > 0) {
    throw new ScheduleCommitError('Schemat är inte internt konsistent', issues);
  }

  const { schoolId } = options;
  const importRow = await supabase
    .from('schedule_imports')
    .insert({
      school_id: schoolId,
      source: options.source,
      started_by: options.startedBy,
    })
    .select('id')
    .single();
  const importId = importRow.data?.id ?? null;

  try {
    const result = await runCommit(supabase, schedule, options);
    if (importId) {
      await supabase
        .from('schedule_imports')
        .update({
          finished_at: new Date().toISOString(),
          created_count: result.created,
          updated_count: result.updated,
          skipped_count: result.skipped,
        })
        .eq('id', importId);
    }
    return result;
  } catch (error) {
    if (importId) {
      await supabase
        .from('schedule_imports')
        .update({
          finished_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Okänt fel',
        })
        .eq('id', importId);
    }
    throw error;
  }
}

async function runCommit(
  supabase: Client,
  schedule: CanonicalSchedule,
  options: CommitOptions,
): Promise<CommitResult> {
  const { schoolId } = options;

  // ---------------------------------------------------------------------
  // Urval: vilka pass ska med?
  // ---------------------------------------------------------------------
  const classNameByRef = new Map(schedule.classes.map((c) => [c.externalRef, c.name]));
  const includeAll = options.includeClasses.length === 0;
  const included = new Set(options.includeClasses);
  const courseByRef = new Map(schedule.courses.map((c) => [c.externalRef, c]));

  let skipped = 0;
  const selected = schedule.timeslots.filter((slot) => {
    const course = courseByRef.get(slot.courseRef);
    if (!options.includeNonRecordable && course && !course.recordable) {
      skipped += 1;
      return false;
    }
    if (includeAll) return true;
    const hit = slot.classRefs.some((ref) => {
      const name = classNameByRef.get(ref);
      return name !== undefined && included.has(name);
    });
    if (!hit) skipped += 1;
    return hit;
  });

  if (selected.length === 0) {
    return { created: 0, updated: 0, skipped, unmappedTeachers: [], issues: [] };
  }

  // Bara de kurser och klasser som faktiskt används av valda pass. Att
  // skapa 234 kurser när piloten kör tre klasser vore bara skräp.
  const usedCourseRefs = new Set(selected.map((s) => s.courseRef));
  const usedClassRefs = new Set(selected.flatMap((s) => s.classRefs));

  // ---------------------------------------------------------------------
  // Klasser — matchas på NAMN, inte externalRef.
  // ---------------------------------------------------------------------
  // Klassnamnet är bryggan mellan schemat och Joels elevlista (som anger
  // class_name). Skulle vi nyckla på schemakällans id skulle en elevimport
  // och en schemaimport skapa två olika "Ek26".
  const classIdByRef = await upsertClasses(
    supabase,
    schoolId,
    schedule.classes.filter((c) => usedClassRefs.has(c.externalRef)),
  );

  // ---------------------------------------------------------------------
  // Kurser
  // ---------------------------------------------------------------------
  const courseIdByRef = await upsertCourses(
    supabase,
    schoolId,
    schedule.courses.filter((c) => usedCourseRefs.has(c.externalRef)),
  );

  // ---------------------------------------------------------------------
  // Lärare: schemakällans id → Elevante-konto
  // ---------------------------------------------------------------------
  const { profileIdByRef, mapIdByRef, unmappedTeachers } = await syncTeacherMap(
    supabase,
    schoolId,
    schedule.teachers.filter((t) =>
      selected.some((s) => s.teacherRefs.includes(t.externalRef)),
    ),
  );

  // ---------------------------------------------------------------------
  // Pass
  // ---------------------------------------------------------------------
  const existingSlots = await supabase
    .from('timeslots')
    .select('id, external_ref')
    .eq('school_id', schoolId)
    .not('external_ref', 'is', null);
  if (existingSlots.error) throw new ScheduleCommitError(existingSlots.error.message);

  const slotIdByRef = new Map<string, string>();
  for (const row of existingSlots.data ?? []) {
    if (row.external_ref) slotIdByRef.set(row.external_ref, row.id);
  }

  let created = 0;
  let updated = 0;

  const slotRows = selected.map((slot) => {
    const existingId = slotIdByRef.get(slot.externalRef);
    if (existingId) updated += 1;
    else created += 1;

    // Primär klass = den första klassen i passet. Resten hamnar i
    // timeslot_classes; class_id finns kvar så att befintliga vyer och
    // mobilappen fungerar oförändrat.
    const primaryClassRef = slot.classRefs.find((ref) => classIdByRef.has(ref));
    const teacherRef = slot.teacherRefs.find((ref) => profileIdByRef.get(ref));

    return {
      ...(existingId ? { id: existingId } : {}),
      school_id: schoolId,
      course_id: courseIdByRef.get(slot.courseRef)!,
      class_id: classIdByRef.get(primaryClassRef ?? '')!,
      teacher_id: teacherRef ? (profileIdByRef.get(teacherRef) ?? null) : null,
      day: slot.day as DayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
      room: slot.room,
      external_ref: slot.externalRef,
      weeks: slot.weeks,
      valid_from: options.termStart,
      valid_until: options.termEnd,
    };
  });

  // Upsert på primärnyckeln: befintliga rader bär med sig sitt id, nya får
  // ett genererat. Vi kan inte upserta på (school_id, external_ref) — det
  // indexet är partiellt (where external_ref is not null) och PostgREST kan
  // inte uttrycka predikatet i sin ON CONFLICT-inferens.
  const upserted = await supabase
    .from('timeslots')
    .upsert(slotRows)
    .select('id, external_ref');
  if (upserted.error) throw new ScheduleCommitError(upserted.error.message);

  for (const row of upserted.data ?? []) {
    if (row.external_ref) slotIdByRef.set(row.external_ref, row.id);
  }

  await syncTimeslotClasses(supabase, selected, slotIdByRef, classIdByRef);
  await syncTimeslotTeachers(supabase, selected, slotIdByRef, mapIdByRef);
  await syncCourseTeachers(supabase, selected, courseIdByRef, profileIdByRef);

  return { created, updated, skipped, unmappedTeachers, issues: [] };
}

async function upsertClasses(
  supabase: Client,
  schoolId: string,
  classes: { externalRef: string; name: string }[],
): Promise<Map<string, string>> {
  const byRef = new Map<string, string>();
  if (classes.length === 0) return byRef;

  const existing = await supabase
    .from('classes')
    .select('id, name')
    .eq('school_id', schoolId);
  if (existing.error) throw new ScheduleCommitError(existing.error.message);

  const idByName = new Map((existing.data ?? []).map((c) => [c.name, c.id]));
  const missing = classes.filter((c) => !idByName.has(c.name));

  if (missing.length > 0) {
    const inserted = await supabase
      .from('classes')
      .insert(missing.map((c) => ({ school_id: schoolId, name: c.name })))
      .select('id, name');
    if (inserted.error) throw new ScheduleCommitError(inserted.error.message);
    for (const row of inserted.data ?? []) idByName.set(row.name, row.id);
  }

  for (const c of classes) {
    const id = idByName.get(c.name);
    if (id) byRef.set(c.externalRef, id);
  }
  return byRef;
}

async function upsertCourses(
  supabase: Client,
  schoolId: string,
  courses: {
    externalRef: string;
    code: string | null;
    name: string;
    recordable: boolean;
  }[],
): Promise<Map<string, string>> {
  const byRef = new Map<string, string>();
  if (courses.length === 0) return byRef;

  const existing = await supabase
    .from('courses')
    .select('id, code, external_ref')
    .eq('school_id', schoolId);
  if (existing.error) throw new ScheduleCommitError(existing.error.message);

  const idByExternalRef = new Map<string, string>();
  const idByCode = new Map<string, string>();
  const codesInUse = new Map<string, string | null>();
  for (const row of existing.data ?? []) {
    if (row.external_ref) idByExternalRef.set(row.external_ref, row.id);
    idByCode.set(row.code, row.id);
    codesInUse.set(row.code, row.external_ref);
  }

  // Kurskoder måste vara unika per skola, men kursnamn är det inte —
  // "Matte nivå 2b" finns som fyra olika grupper. Kollisioner får ett
  // deterministiskt suffix ur externalRef, så en omimport ger samma kod.
  const slugCounts = new Map<string, number>();
  for (const course of courses) {
    const slug = slugify(course.name) || 'kurs';
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
  }

  const rows = courses.map((course) => {
    // Har källan en explicit kod (generiska CSV:n) är den auktoritativ —
    // den pekar ut en kurs som skolan redan har lagt upp, och vi ska
    // uppdatera den i stället för att skapa en parallell rad.
    let code = course.code;
    if (!code) {
      const slug = slugify(course.name) || 'kurs';
      const ambiguous = (slugCounts.get(slug) ?? 0) > 1;
      // Kollision mot en befintlig kurs som INTE är den här kursen räknas
      // också som tvetydig — annars faller insert på unique(school_id, code).
      const takenByOther =
        codesInUse.has(slug) && codesInUse.get(slug) !== course.externalRef;
      code = ambiguous || takenByOther ? `${slug}-${shortHash(course.externalRef)}` : slug;
    }

    // Uppslagsordning: extern nyckel först (den är källans egen identitet),
    // därefter koden. Utan kodfallbacket skulle en skola som lagt upp sina
    // kurser för hand få dubbletter första gången ett schema importeras.
    const existingId = idByExternalRef.get(course.externalRef) ?? idByCode.get(code);

    return {
      ...(existingId ? { id: existingId } : {}),
      school_id: schoolId,
      code,
      name: course.name,
      external_ref: course.externalRef,
      recordable: course.recordable,
    };
  });

  const upserted = await supabase
    .from('courses')
    .upsert(rows)
    .select('id, external_ref');
  if (upserted.error) throw new ScheduleCommitError(upserted.error.message);

  for (const row of upserted.data ?? []) {
    if (row.external_ref) byRef.set(row.external_ref, row.id);
  }
  return byRef;
}

async function syncTeacherMap(
  supabase: Client,
  schoolId: string,
  teachers: { externalRef: string; displayName: string; email: string | null }[],
): Promise<{
  profileIdByRef: Map<string, string | null>;
  mapIdByRef: Map<string, string>;
  unmappedTeachers: { externalRef: string; displayName: string }[];
}> {
  const profileIdByRef = new Map<string, string | null>();
  const mapIdByRef = new Map<string, string>();
  const unmappedTeachers: { externalRef: string; displayName: string }[] = [];
  if (teachers.length === 0) return { profileIdByRef, mapIdByRef, unmappedTeachers };

  const existing = await supabase
    .from('schedule_teacher_map')
    .select('external_ref, profile_id')
    .eq('school_id', schoolId);
  if (existing.error) throw new ScheduleCommitError(existing.error.message);

  const mapped = new Map(
    (existing.data ?? []).map((r) => [r.external_ref, r.profile_id]),
  );

  // Har källan mejladresser (SS 12000 kan ha det, filexporten aldrig) kan
  // vi matcha automatiskt mot befintliga konton och slippa handpåläggning.
  const emails = teachers
    .map((t) => t.email)
    .filter((e): e is string => Boolean(e));
  const profileIdByEmail = new Map<string, string>();
  if (emails.length > 0) {
    const profiles = await supabase
      .from('profiles')
      .select('id, email')
      .eq('school_id', schoolId)
      .in('email', emails);
    if (profiles.error) throw new ScheduleCommitError(profiles.error.message);
    for (const row of profiles.data ?? []) {
      if (row.email) profileIdByEmail.set(row.email.toLowerCase(), row.id);
    }
  }

  const rows = teachers.map((teacher) => {
    const fromEmail = teacher.email
      ? (profileIdByEmail.get(teacher.email.toLowerCase()) ?? null)
      : null;
    // En befintlig, manuellt satt mappning vinner alltid över en gissning
    // ur mejladressen — adminen ska inte få sitt val överskrivet av en
    // omimport.
    const profileId = mapped.get(teacher.externalRef) ?? fromEmail;
    profileIdByRef.set(teacher.externalRef, profileId);
    if (!profileId) {
      unmappedTeachers.push({
        externalRef: teacher.externalRef,
        displayName: teacher.displayName,
      });
    }
    return {
      school_id: schoolId,
      external_ref: teacher.externalRef,
      display_name: teacher.displayName,
      profile_id: profileId,
      updated_at: new Date().toISOString(),
    };
  });

  const upserted = await supabase
    .from('schedule_teacher_map')
    .upsert(rows, { onConflict: 'school_id,external_ref' })
    .select('id, external_ref');
  if (upserted.error) throw new ScheduleCommitError(upserted.error.message);
  for (const row of upserted.data ?? []) mapIdByRef.set(row.external_ref, row.id);

  return { profileIdByRef, mapIdByRef, unmappedTeachers };
}

async function syncTimeslotClasses(
  supabase: Client,
  slots: CanonicalSchedule['timeslots'],
  slotIdByRef: Map<string, string>,
  classIdByRef: Map<string, string>,
): Promise<void> {
  const rows: { timeslot_id: string; class_id: string }[] = [];
  const touchedSlotIds: string[] = [];

  for (const slot of slots) {
    const slotId = slotIdByRef.get(slot.externalRef);
    if (!slotId) continue;
    touchedSlotIds.push(slotId);
    for (const ref of slot.classRefs) {
      const classId = classIdByRef.get(ref);
      // Klasser utanför urvalet (piloten kör 3 av 19) hoppas över — passet
      // finns kvar, men vi kopplar inte in klasser vi inte importerat.
      if (classId) rows.push({ timeslot_id: slotId, class_id: classId });
    }
  }

  if (touchedSlotIds.length === 0) return;

  // Ersätt hela mängden per pass: en klass som tagits bort ur schemat ska
  // försvinna, inte ligga kvar för att den fanns vid förra importen.
  const cleared = await supabase
    .from('timeslot_classes')
    .delete()
    .in('timeslot_id', touchedSlotIds);
  if (cleared.error) throw new ScheduleCommitError(cleared.error.message);

  if (rows.length === 0) return;
  const inserted = await supabase
    .from('timeslot_classes')
    .upsert(rows, { onConflict: 'timeslot_id,class_id' });
  if (inserted.error) throw new ScheduleCommitError(inserted.error.message);
}

/**
 * Kopplar passet till schemakällans lärare (inte till kontot).
 *
 * Utan den här raden finns inget spår av vilken schemalärare ett pass hörde
 * till när läraren ännu är omappad — och en mappning som görs efteråt kan
 * inte appliceras på någonting. Här ligger också alla lärare på ett pass,
 * inte bara den första; `timeslots.teacher_id` är fortsatt primär lärare.
 */
async function syncTimeslotTeachers(
  supabase: Client,
  slots: CanonicalSchedule['timeslots'],
  slotIdByRef: Map<string, string>,
  mapIdByRef: Map<string, string>,
): Promise<void> {
  const rows: { timeslot_id: string; teacher_map_id: string }[] = [];
  const touchedSlotIds: string[] = [];

  for (const slot of slots) {
    const slotId = slotIdByRef.get(slot.externalRef);
    if (!slotId) continue;
    touchedSlotIds.push(slotId);
    for (const ref of slot.teacherRefs) {
      const mapId = mapIdByRef.get(ref);
      if (mapId) rows.push({ timeslot_id: slotId, teacher_map_id: mapId });
    }
  }

  if (touchedSlotIds.length === 0) return;

  // Ersätt hela mängden per pass, precis som timeslot_classes: en lärare
  // som tagits bort ur schemat ska inte ligga kvar från förra importen.
  const cleared = await supabase
    .from('timeslot_teachers')
    .delete()
    .in('timeslot_id', touchedSlotIds);
  if (cleared.error) throw new ScheduleCommitError(cleared.error.message);

  if (rows.length === 0) return;
  const inserted = await supabase
    .from('timeslot_teachers')
    .upsert(rows, { onConflict: 'timeslot_id,teacher_map_id' });
  if (inserted.error) throw new ScheduleCommitError(inserted.error.message);
}

async function syncCourseTeachers(
  supabase: Client,
  slots: CanonicalSchedule['timeslots'],
  courseIdByRef: Map<string, string>,
  profileIdByRef: Map<string, string | null>,
): Promise<void> {
  // Utan den här kopplingen ser läraren ingenting i mobilappen —
  // getTodayLessons() slår upp kurser via course_teachers.
  const pairs = new Map<string, { course_id: string; profile_id: string }>();
  for (const slot of slots) {
    const courseId = courseIdByRef.get(slot.courseRef);
    if (!courseId) continue;
    for (const ref of slot.teacherRefs) {
      const profileId = profileIdByRef.get(ref);
      if (!profileId) continue;
      pairs.set(`${courseId}:${profileId}`, {
        course_id: courseId,
        profile_id: profileId,
      });
    }
  }
  if (pairs.size === 0) return;

  // Upsert, inte delete-and-insert: en lärare kan ha kopplats till kursen
  // för hand på /admin/kurser och den kopplingen ska överleva en omimport.
  const inserted = await supabase
    .from('course_teachers')
    .upsert([...pairs.values()], { onConflict: 'course_id,profile_id' });
  if (inserted.error) throw new ScheduleCommitError(inserted.error.message);
}
