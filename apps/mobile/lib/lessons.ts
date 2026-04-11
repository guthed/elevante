import { supabase } from './supabase';

export type UpcomingLesson = {
  id: string;
  course_id: string;
  class_id: string;
  course_name: string;
  course_code: string;
  class_name: string;
  start_time: string;
  end_time: string;
  room: string | null;
};

const dayNames = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

function todayName(): (typeof dayNames)[number] {
  return dayNames[new Date().getDay()]!;
}

/**
 * Hämta dagens lektioner för aktuell lärare via timeslots-tabellen.
 * RLS säkerställer att läraren bara ser sin egen skolas data, men vi
 * filtrerar manuellt på course_teachers så bara läraren egna lektioner
 * visas i mobilappen.
 */
export async function getTodayLessons(teacherId: string): Promise<UpcomingLesson[]> {
  // Steg 1: hitta vilka kurser läraren undervisar
  const { data: courseLinks } = await supabase
    .from('course_teachers')
    .select('course_id')
    .eq('profile_id', teacherId);

  const courseIds = ((courseLinks ?? []) as { course_id: string }[]).map(
    (l) => l.course_id,
  );
  if (courseIds.length === 0) return [];

  // Steg 2: timeslots för dessa kurser idag
  const { data: slots } = await supabase
    .from('timeslots')
    .select(
      'id, course_id, class_id, start_time, end_time, room, courses ( name, code ), classes ( name )',
    )
    .in('course_id', courseIds)
    .eq('day', todayName())
    .order('start_time', { ascending: true });

  // Supabase joins blir array eller objekt beroende på FK-arity. Vi
  // läser första elementet om det är en array och annars som objekt.
  type TimeslotJoin = {
    id: string;
    course_id: string;
    class_id: string;
    start_time: string;
    end_time: string;
    room: string | null;
    courses: { name: string; code: string } | { name: string; code: string }[] | null;
    classes: { name: string } | { name: string }[] | null;
  };

  function pickOne<T>(value: T | T[] | null): T | null {
    if (value == null) return null;
    if (Array.isArray(value)) return value[0] ?? null;
    return value;
  }

  return ((slots ?? []) as unknown as TimeslotJoin[]).map((slot) => {
    const course = pickOne(slot.courses);
    const klass = pickOne(slot.classes);
    return {
      id: slot.id,
      course_id: slot.course_id,
      class_id: slot.class_id,
      course_name: course?.name ?? '—',
      course_code: course?.code ?? '',
      class_name: klass?.name ?? '—',
      start_time: slot.start_time,
      end_time: slot.end_time,
      room: slot.room,
    };
  });
}

/**
 * Skapa en ny lektionsrad innan inspelning startar. Mobilappen behöver ett
 * lesson_id för att sedan kunna ladda upp ljudet till rätt nyckel i Storage.
 */
export async function createLesson(input: {
  schoolId: string;
  courseId: string;
  classId: string;
  teacherId: string;
  timeslotId: string | null;
  title?: string | null;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      school_id: input.schoolId,
      course_id: input.courseId,
      class_id: input.classId,
      teacher_id: input.teacherId,
      timeslot_id: input.timeslotId,
      title: input.title ?? null,
      transcript_status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) return null;
  return data.id;
}
