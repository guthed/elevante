/**
 * Generisk schema-CSV — fallbacken för skolor utan Royal Schedule.
 *
 * Format (rubrikrad krävs):
 *   course_code, class_name, day, start_time, end_time
 *   valfritt: course_name, room, teacher_email
 *
 * Det här är samma format som `uploadSchedule` tagit sedan Fas 2, men det
 * går numera via `CanonicalSchedule` som alla andra källor. Två skillnader
 * mot förut: importen är idempotent (en omuppladdning uppdaterar i stället
 * för att dubblera) och `teacher_email` kopplar läraren till kursen, vilket
 * är det som gör att passen dyker upp i mobilappen.
 */

import { parseCsv } from '@/lib/csv';
import type { DayOfWeek } from '@/lib/supabase/database';
import type { CanonicalSchedule, CanonicalTimeslot } from './canonical';
import { looksNonRecordable } from './canonical';

const REQUIRED_COLUMNS = ['course_code', 'class_name', 'day', 'start_time', 'end_time'];

const DAY_ALIASES: Record<string, DayOfWeek> = {
  monday: 'monday',
  tuesday: 'tuesday',
  wednesday: 'wednesday',
  thursday: 'thursday',
  friday: 'friday',
  saturday: 'saturday',
  sunday: 'sunday',
  måndag: 'monday',
  tisdag: 'tuesday',
  onsdag: 'wednesday',
  torsdag: 'thursday',
  fredag: 'friday',
  lördag: 'saturday',
  söndag: 'sunday',
};

export function normalizeDay(raw: string): DayOfWeek | null {
  return DAY_ALIASES[raw.trim().toLowerCase()] ?? null;
}

/** Accepterar `HH:MM` och `HH:MM:SS`, normaliserar till `HH:MM:SS`. */
export function normalizeTime(raw: string): string | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, hour, minute, second] = match;
  if (Number(hour) > 23 || Number(minute) > 59) return null;
  return `${hour.padStart(2, '0')}:${minute}:${second ?? '00'}`;
}

export type GenericCsvParseResult =
  | { ok: true; schedule: CanonicalSchedule }
  | { ok: false; detail: string };

export function parseGenericScheduleCsv(text: string): GenericCsvParseResult {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { ok: false, detail: 'Filen är tom' };
  }

  const missing = REQUIRED_COLUMNS.filter((key) => !(key in rows[0]!));
  if (missing.length > 0) {
    return { ok: false, detail: `Rubriker saknas: ${missing.join(', ')}` };
  }

  const courses = new Map<string, CanonicalSchedule['courses'][number]>();
  const classes = new Map<string, CanonicalSchedule['classes'][number]>();
  const teachers = new Map<string, CanonicalSchedule['teachers'][number]>();
  const timeslots: CanonicalTimeslot[] = [];
  const seen = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const lineNo = index + 2; // +1 för nollindex, +1 för rubrikraden
    const courseCode = (row['course_code'] ?? '').trim();
    const className = (row['class_name'] ?? '').trim();
    const day = normalizeDay(row['day'] ?? '');
    const startTime = normalizeTime(row['start_time'] ?? '');
    const endTime = normalizeTime(row['end_time'] ?? '');

    if (!courseCode || !className) {
      return { ok: false, detail: `Rad ${lineNo}: course_code och class_name krävs` };
    }
    if (!day) {
      return { ok: false, detail: `Rad ${lineNo}: okänd veckodag "${row['day'] ?? ''}"` };
    }
    if (!startTime || !endTime) {
      return { ok: false, detail: `Rad ${lineNo}: ogiltig tid (förväntar HH:MM)` };
    }
    if (endTime <= startTime) {
      return { ok: false, detail: `Rad ${lineNo}: sluttiden ligger inte efter starttiden` };
    }

    const courseRef = `csv:course:${courseCode}`;
    const classRef = `csv:class:${className}`;
    const courseName = (row['course_name'] ?? '').trim() || courseCode;

    if (!courses.has(courseRef)) {
      courses.set(courseRef, {
        externalRef: courseRef,
        code: courseCode,
        name: courseName,
        subject: null,
        recordable: !looksNonRecordable(courseName),
      });
    }
    if (!classes.has(classRef)) {
      classes.set(classRef, { externalRef: classRef, name: className });
    }

    const teacherEmail = (row['teacher_email'] ?? '').trim().toLowerCase();
    const teacherRefs: string[] = [];
    if (teacherEmail) {
      const teacherRef = `csv:teacher:${teacherEmail}`;
      if (!teachers.has(teacherRef)) {
        teachers.set(teacherRef, {
          externalRef: teacherRef,
          displayName: teacherEmail,
          email: teacherEmail,
        });
      }
      teacherRefs.push(teacherRef);
    }

    // Deterministisk nyckel ur radens egen betydelse — det är det som gör
    // omuppladdning idempotent trots att formatet saknar externa id:n.
    const externalRef = `csv:${courseCode}|${className}|${day}|${startTime}`;
    if (seen.has(externalRef)) {
      return {
        ok: false,
        detail: `Rad ${lineNo}: dubblerat pass (${courseCode}, ${className}, ${day} ${startTime})`,
      };
    }
    seen.add(externalRef);

    timeslots.push({
      externalRef,
      courseRef,
      classRefs: [classRef],
      teacherRefs,
      day,
      startTime,
      endTime,
      room: (row['room'] ?? '').trim() || null,
      weeks: null,
    });
  }

  return {
    ok: true,
    schedule: {
      courses: [...courses.values()],
      classes: [...classes.values()],
      teachers: [...teachers.values()],
      timeslots,
    },
  };
}
