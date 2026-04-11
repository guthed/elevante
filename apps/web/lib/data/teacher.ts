import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TranscriptStatus } from '@/lib/supabase/database';

export type TeacherClassRow = {
  id: string;
  name: string;
  year: number | null;
  studentsCount: number;
};

export type TeacherCourseRow = {
  id: string;
  code: string;
  name: string;
};

export type TeacherLessonRow = {
  id: string;
  title: string | null;
  recordedAt: string | null;
  status: TranscriptStatus;
  courseName: string | null;
  className: string | null;
};

export type TeacherOverview = {
  classes: TeacherClassRow[];
  courses: TeacherCourseRow[];
  recentLessons: TeacherLessonRow[];
};

/** Hämtar översiktsdata för en lärare. Använder RLS — vi behöver inte filtrera per användare manuellt. */
export async function getTeacherOverview(teacherId: string): Promise<TeacherOverview> {
  const supabase = await createSupabaseServerClient();

  const [coursesRes, lessonsRes] = await Promise.all([
    supabase
      .from('course_teachers')
      .select('course_id, courses ( id, code, name )')
      .eq('profile_id', teacherId),
    supabase
      .from('lessons')
      .select(
        'id, title, recorded_at, transcript_status, courses ( name ), classes ( id, name )',
      )
      .eq('teacher_id', teacherId)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .limit(10),
  ]);

  type CourseTeacherJoin = {
    course_id: string;
    courses: { id: string; code: string; name: string } | null;
  };
  const courses: TeacherCourseRow[] = ((coursesRes.data ?? []) as CourseTeacherJoin[])
    .filter((row): row is CourseTeacherJoin & { courses: NonNullable<CourseTeacherJoin['courses']> } => row.courses !== null)
    .map((row) => ({
      id: row.courses.id,
      code: row.courses.code,
      name: row.courses.name,
    }));

  type LessonJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    courses: { name: string } | null;
    classes: { id: string; name: string } | null;
  };
  const recentLessons: TeacherLessonRow[] = ((lessonsRes.data ?? []) as LessonJoin[]).map(
    (row) => ({
      id: row.id,
      title: row.title,
      recordedAt: row.recorded_at,
      status: row.transcript_status,
      courseName: row.courses?.name ?? null,
      className: row.classes?.name ?? null,
    }),
  );

  // Hämta klasser via klassmedlemmar i kurserna teacher undervisar
  const courseIds = courses.map((c) => c.id);
  let classes: TeacherClassRow[] = [];
  if (courseIds.length > 0) {
    // Hitta unika klasser via timeslots för dessa kurser
    const { data: timeslots } = await supabase
      .from('timeslots')
      .select('class_id, classes ( id, name, year )')
      .in('course_id', courseIds);

    type TimeslotJoin = {
      class_id: string;
      classes: { id: string; name: string; year: number | null } | null;
    };
    const seen = new Set<string>();
    const unique: { id: string; name: string; year: number | null }[] = [];
    for (const row of (timeslots ?? []) as TimeslotJoin[]) {
      if (!row.classes || seen.has(row.classes.id)) continue;
      seen.add(row.classes.id);
      unique.push(row.classes);
    }

    // Räkna elever per klass
    const counts = new Map<string, number>();
    if (unique.length > 0) {
      const { data: members } = await supabase
        .from('class_members')
        .select('class_id')
        .in(
          'class_id',
          unique.map((c) => c.id),
        );
      for (const m of (members ?? []) as { class_id: string }[]) {
        counts.set(m.class_id, (counts.get(m.class_id) ?? 0) + 1);
      }
    }

    classes = unique.map((c) => ({
      id: c.id,
      name: c.name,
      year: c.year,
      studentsCount: counts.get(c.id) ?? 0,
    }));
  }

  return { classes, courses, recentLessons };
}

export async function getTeacherClasses(teacherId: string): Promise<TeacherClassRow[]> {
  const overview = await getTeacherOverview(teacherId);
  return overview.classes;
}

export type ClassDetail = {
  id: string;
  name: string;
  year: number | null;
  members: { id: string; full_name: string | null; email: string | null }[];
  courses: TeacherCourseRow[];
  recentLessons: TeacherLessonRow[];
};

export async function getClassDetail(classId: string): Promise<ClassDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: cls } = await supabase
    .from('classes')
    .select('id, name, year')
    .eq('id', classId)
    .maybeSingle();
  if (!cls) return null;

  const [membersRes, timeslotsRes, lessonsRes] = await Promise.all([
    supabase
      .from('class_members')
      .select('profile_id, profiles ( id, full_name, email )')
      .eq('class_id', classId),
    supabase
      .from('timeslots')
      .select('course_id, courses ( id, code, name )')
      .eq('class_id', classId),
    supabase
      .from('lessons')
      .select(
        'id, title, recorded_at, transcript_status, courses ( name ), classes ( id, name )',
      )
      .eq('class_id', classId)
      .order('recorded_at', { ascending: false, nullsFirst: false })
      .limit(10),
  ]);

  type MemberJoin = {
    profile_id: string;
    profiles: { id: string; full_name: string | null; email: string | null } | null;
  };
  const members = ((membersRes.data ?? []) as MemberJoin[])
    .filter((row): row is MemberJoin & { profiles: NonNullable<MemberJoin['profiles']> } => row.profiles !== null)
    .map((row) => row.profiles);

  type TimeslotCourseJoin = {
    course_id: string;
    courses: { id: string; code: string; name: string } | null;
  };
  const seen = new Set<string>();
  const courses: TeacherCourseRow[] = [];
  for (const row of (timeslotsRes.data ?? []) as TimeslotCourseJoin[]) {
    if (!row.courses || seen.has(row.courses.id)) continue;
    seen.add(row.courses.id);
    courses.push(row.courses);
  }

  type LessonJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    courses: { name: string } | null;
    classes: { id: string; name: string } | null;
  };
  const recentLessons: TeacherLessonRow[] = ((lessonsRes.data ?? []) as LessonJoin[]).map(
    (row) => ({
      id: row.id,
      title: row.title,
      recordedAt: row.recorded_at,
      status: row.transcript_status,
      courseName: row.courses?.name ?? null,
      className: row.classes?.name ?? null,
    }),
  );

  return {
    id: cls.id,
    name: cls.name,
    year: cls.year,
    members,
    courses,
    recentLessons,
  };
}

export async function getTeacherLessons(teacherId: string): Promise<TeacherLessonRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('lessons')
    .select(
      'id, title, recorded_at, transcript_status, courses ( name ), classes ( id, name )',
    )
    .eq('teacher_id', teacherId)
    .order('recorded_at', { ascending: false, nullsFirst: false })
    .limit(100);

  type LessonJoin = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    courses: { name: string } | null;
    classes: { id: string; name: string } | null;
  };

  return ((data ?? []) as LessonJoin[]).map((row) => ({
    id: row.id,
    title: row.title,
    recordedAt: row.recorded_at,
    status: row.transcript_status,
    courseName: row.courses?.name ?? null,
    className: row.classes?.name ?? null,
  }));
}

export type LessonDetail = {
  id: string;
  title: string | null;
  recordedAt: string | null;
  status: TranscriptStatus;
  transcriptText: string | null;
  course: { id: string; code: string; name: string } | null;
  class: { id: string; name: string } | null;
  teacher: { id: string; full_name: string | null } | null;
  materials: {
    id: string;
    name: string;
    storage_path: string;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string;
  }[];
};

export async function getLessonDetail(lessonId: string): Promise<LessonDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: lesson } = await supabase
    .from('lessons')
    .select(
      'id, title, recorded_at, transcript_status, transcript_text, courses ( id, code, name ), classes ( id, name ), profiles ( id, full_name )',
    )
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) return null;

  const { data: materialsRows } = await supabase
    .from('materials')
    .select('id, name, storage_path, mime_type, size_bytes, created_at')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false });

  type LessonRow = {
    id: string;
    title: string | null;
    recorded_at: string | null;
    transcript_status: TranscriptStatus;
    transcript_text: string | null;
    courses: { id: string; code: string; name: string } | null;
    classes: { id: string; name: string } | null;
    profiles: { id: string; full_name: string | null } | null;
  };
  const typed = lesson as LessonRow;

  return {
    id: typed.id,
    title: typed.title,
    recordedAt: typed.recorded_at,
    status: typed.transcript_status,
    transcriptText: typed.transcript_text,
    course: typed.courses,
    class: typed.classes,
    teacher: typed.profiles,
    materials: (materialsRows ?? []) as LessonDetail['materials'],
  };
}
