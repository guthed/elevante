/**
 * Kanoniskt mellanformat för schemaimport.
 *
 * Alla källor — Royal Schedules filexport, Royal Schedules SS 12000-API,
 * och den generiska CSV:n för skolor utan någon av delarna — producerar den
 * här strukturen. Commit-lagret (`commit.ts`) är sedan det enda som rör
 * databasen, så en ny källa innebär en ny parser och ingenting annat.
 *
 * Två designval som är värda att förstå:
 *
 * 1. `classRefs` och `teacherRefs` är arrayer. Det är inte överarbete —
 *    145 av 328 lektioner/vecka på Amerikanska Gymnasiet har flera klasser
 *    (språkval, IV-block) och 15 har flera lärare. SS 12000 modellerar det
 *    likadant (`Activity.groups[]`, `Activity.teachers[]`). En struktur med
 *    ett enda klassfält hade tvingat varje parser att slänga data.
 *
 * 2. Allt kopplas via `externalRef`, aldrig via visningsnamn. Royal
 *    Schedules gruppnamn är inte unika — "Matte nivå 2b" finns som fyra
 *    olika grupper och "HT religion 1" som tre. Namnmatchning hade slagit
 *    ihop dem tyst.
 */

import type { DayOfWeek } from '@/lib/supabase/database';

export type CanonicalCourse = {
  /** Källans stabila id. Blir `courses.external_ref`. */
  externalRef: string;
  /**
   * Explicit kurskod när källan har en. Den generiska CSV:n anger
   * `course_code` och syftar då på en kurs som redan finns — då måste vi
   * matcha på koden, inte hitta på en ny ur namnet. Schemaverktygens
   * exporter har ingen kod och sätter null; koden härleds då ur namnet.
   */
  code: string | null;
  name: string;
  /** Ämne när källan har det. Royal Schedules fil saknar det på 135 av 257 kurser. */
  subject: string | null;
  /**
   * Om passen på kursen ska gå att spela in. Lunch, mentorstid, resurstid
   * och personalmöten ska inte det — 246 av 588 rader i RS-filen är sådant.
   */
  recordable: boolean;
};

export type CanonicalClass = {
  externalRef: string;
  name: string;
};

export type CanonicalTeacher = {
  externalRef: string;
  /** Så som källan skriver läraren. RS-filen ger bara förnamn ("Alfred"). */
  displayName: string;
  /** Finns i SS 12000 (`Person.emails`), aldrig i filexporten. */
  email: string | null;
};

export type CanonicalTimeslot = {
  externalRef: string;
  courseRef: string;
  /** Minst en. Den första blir `timeslots.class_id` (primär klass). */
  classRefs: string[];
  /** Kan vara tom — luncher och biblioteksband saknar lärare i RS-filen. */
  teacherRefs: string[];
  day: DayOfWeek;
  /** `HH:MM:SS`. */
  startTime: string;
  /** `HH:MM:SS`. */
  endTime: string;
  /** Flera salar slås ihop till en sträng; kolumnen är fritext. */
  room: string | null;
  /**
   * Veckonummer passet går. Bara filvägen behöver det (`inweek` = v2–24);
   * SS 12000 ger daterade kalenderhändelser och sätter det till null.
   */
  weeks: number[] | null;
};

export type CanonicalSchedule = {
  courses: CanonicalCourse[];
  classes: CanonicalClass[];
  teachers: CanonicalTeacher[];
  timeslots: CanonicalTimeslot[];
};

/**
 * Namn/mönster som aldrig ska spelas in. Träffar på hela ord i kurs- eller
 * gruppnamnet, skiftlägesokänsligt.
 *
 * Bara filvägen behöver den här listan. SS 12000 har `activityType` som
 * enum (`Undervisning` / `Elevaktivitet` / `Provaktivitet` /
 * `Läraraktivitet` / `Övrigt`), så där kommer samma sak gratis och exakt.
 */
const NON_RECORDABLE_PATTERNS = [
  'lunch',
  'mentortid',
  'mentorstid',
  'resurstid',
  'pluggstudion',
  'personalmöte',
  'teamleader',
  'library',
] as const;

export function looksNonRecordable(name: string): boolean {
  const value = name.toLowerCase();
  return NON_RECORDABLE_PATTERNS.some((pattern) => value.includes(pattern));
}

export type ScheduleValidationIssue = {
  /** Vilken del av schemat problemet sitter i. */
  scope: 'course' | 'class' | 'teacher' | 'timeslot';
  externalRef: string;
  message: string;
};

/**
 * Kontrollerar referensintegritet innan något skrivs. Ett pass som pekar på
 * en kurs eller klass som inte finns i samma fil är en trasig export — vi
 * vill upptäcka det före första insert, inte halvvägs igenom.
 *
 * Returnerar alla problem, inte bara det första: adminen ska se hela
 * listan i ett svep i stället för att ladda upp om och om igen.
 */
export function validateSchedule(schedule: CanonicalSchedule): ScheduleValidationIssue[] {
  const issues: ScheduleValidationIssue[] = [];
  const courseRefs = new Set(schedule.courses.map((c) => c.externalRef));
  const classRefs = new Set(schedule.classes.map((c) => c.externalRef));
  const teacherRefs = new Set(schedule.teachers.map((t) => t.externalRef));

  const seenTimeslots = new Set<string>();

  for (const slot of schedule.timeslots) {
    if (seenTimeslots.has(slot.externalRef)) {
      issues.push({
        scope: 'timeslot',
        externalRef: slot.externalRef,
        message: 'Dubblerat externalRef i samma schema',
      });
    }
    seenTimeslots.add(slot.externalRef);

    if (!courseRefs.has(slot.courseRef)) {
      issues.push({
        scope: 'timeslot',
        externalRef: slot.externalRef,
        message: `Okänd kurs: ${slot.courseRef}`,
      });
    }
    if (slot.classRefs.length === 0) {
      issues.push({
        scope: 'timeslot',
        externalRef: slot.externalRef,
        message: 'Passet saknar klass',
      });
    }
    for (const ref of slot.classRefs) {
      if (!classRefs.has(ref)) {
        issues.push({
          scope: 'timeslot',
          externalRef: slot.externalRef,
          message: `Okänd klass: ${ref}`,
        });
      }
    }
    for (const ref of slot.teacherRefs) {
      if (!teacherRefs.has(ref)) {
        issues.push({
          scope: 'timeslot',
          externalRef: slot.externalRef,
          message: `Okänd lärare: ${ref}`,
        });
      }
    }
    if (slot.endTime <= slot.startTime) {
      issues.push({
        scope: 'timeslot',
        externalRef: slot.externalRef,
        message: `Sluttid ${slot.endTime} ligger inte efter starttid ${slot.startTime}`,
      });
    }
  }

  return issues;
}
